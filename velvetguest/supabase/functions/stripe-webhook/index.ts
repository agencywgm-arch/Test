// Wegemo — Stripe webhook: last-resort safety net for redirect-based payment
// methods (MB WAY, Multibanco...).
//
// WHY THIS EXISTS: those methods send the customer's browser away entirely to
// confirm payment. The app's normal flow only creates the `orders` row AFTER
// the browser comes back with a successful payment — if it never comes back
// (the customer closes the MB WAY app, kills the tab, loses signal), Stripe
// still captured the money but no order ever gets created on our side. This
// function is the backstop: whenever Stripe confirms a payment succeeded, it
// checks whether an order already exists for it (the normal flow usually
// wins the race) and, if not, builds the order itself from what was saved to
// `stripe_pending_orders` right before the payment started.
//
// SETUP (per restaurant, since each has its own Stripe account):
//   1. In that restaurant's Stripe Dashboard → Developers → Webhooks → Add endpoint
//   2. Endpoint URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook?restaurant_id=<restaurant uuid>
//   3. Event to send: payment_intent.succeeded
//   4. Copy the signing secret it gives you, save it as
//      restaurant_settings.stripe_webhook_secret for that restaurant_id
//   5. Deploy this function: supabase functions deploy stripe-webhook --use-api --no-verify-jwt
//      (--no-verify-jwt is required — Stripe calls this directly, with no Supabase auth header)

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get("restaurant_id");
    if (!restaurantId) return json({ error: "missing restaurant_id query param" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: settings } = await supabase
      .from("restaurant_settings")
      .select("stripe_webhook_secret")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    const webhookSecret = settings?.stripe_webhook_secret;
    if (!webhookSecret) return json({ error: "stripe_webhook_secret not configured for this restaurant" }, 400);

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    if (!signature) return json({ error: "missing stripe-signature header" }, 400);

    // Deno doesn't have Node's crypto module the Stripe SDK normally uses for
    // signature verification, so it needs the Web Crypto ("subtle") provider
    // explicitly and the async variant of constructEvent.
    const stripe = new Stripe("sk_dummy_not_used_for_verification", { apiVersion: "2024-06-20" });
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body, signature, webhookSecret, undefined, Stripe.createSubtleCryptoProvider()
      );
    } catch (err) {
      return json({ error: `signature verification failed: ${String(err)}` }, 400);
    }

    if (event.type !== "payment_intent.succeeded") {
      return json({ ok: true, ignored: event.type });
    }

    const pi = event.data.object as any;
    const piId = pi.id as string;

    // The normal browser-side flow usually wins this race and already created
    // the order — nothing to do beyond marking our fallback row as handled so
    // it doesn't get reprocessed if Stripe retries the webhook delivery.
    const { data: existingOrder } = await supabase
      .from("orders").select("id").eq("stripe_payment_intent_id", piId).maybeSingle();
    if (existingOrder) {
      await supabase.from("stripe_pending_orders").update({ fulfilled: true }).eq("id", piId);
      return json({ ok: true, already_handled: true, order_id: existingOrder.id });
    }

    const { data: pending } = await supabase
      .from("stripe_pending_orders").select("*").eq("id", piId).maybeSingle();
    if (!pending || pending.fulfilled) {
      return json({ ok: true, nothing_to_do: true });
    }

    // Find or create the table, same upsert-then-lookup pattern as the
    // client-side flow (see CustomerPage.confirm()) to survive two payments
    // for the same shared/no-fixed-table QR racing each other.
    let tableId: string | null = null;
    if (pending.table_number != null) {
      const { data: upserted } = await supabase.from("tables")
        .upsert(
          { restaurant_id: pending.restaurant_id, number: pending.table_number },
          { onConflict: "restaurant_id,number", ignoreDuplicates: true }
        )
        .select("id");
      tableId = upserted?.[0]?.id ?? null;
      if (!tableId) {
        const { data: existingTbl } = await supabase.from("tables")
          .select("id").eq("restaurant_id", pending.restaurant_id).eq("number", pending.table_number).maybeSingle();
        tableId = existingTbl?.id ?? null;
      }
    }

    const { data: order, error: orderErr } = await supabase.from("orders").insert({
      restaurant_id: pending.restaurant_id,
      table_id: tableId,
      note: pending.note,
      total: pending.total,
      status: "PENDING",
      payment_method: "card",
      customer_name: pending.customer_name,
      customer_email: pending.customer_email,
      customer_nif: pending.customer_nif,
      paid: true,
      order_type: pending.order_type || "dine_in",
      stripe_payment_intent_id: piId,
    }).select("id").single();

    if (orderErr || !order) {
      console.error("[stripe-webhook] fallback order insert failed:", orderErr?.message);
      return json({ ok: false, error: orderErr?.message || "order insert failed" }, 500);
    }

    const cart = Array.isArray(pending.cart) ? pending.cart : [];
    if (cart.length) {
      const orderItems = cart.map((it: any) => {
        const choices = it._choices || {};
        const parts = Object.entries(choices)
          .filter(([, v]: any) => v.length > 0)
          .map(([k, v]: any) => k === "__extras__" ? "+" + v.map((o: any) => o.name).join(", ") : v.map((o: any) => o.name).join(", "));
        return { order_id: order.id, menu_item_id: it.id, quantity: it.qty, detail: parts.join(" · ") };
      });
      await supabase.from("order_items").insert(orderItems);
    }

    await supabase.from("stripe_pending_orders").update({ fulfilled: true }).eq("id", piId);

    // Best-effort parity with the normal flow — never fail the webhook over these.
    try { await supabase.functions.invoke("create-vendus-invoice", { body: { order_id: order.id } }); } catch { /* ignore */ }

    return json({ ok: true, order_id: order.id, recovered_via_webhook: true });
  } catch (err) {
    console.error("[stripe-webhook] unexpected error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
