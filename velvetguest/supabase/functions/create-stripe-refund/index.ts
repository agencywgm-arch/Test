// Wegemo — Edge Function: refund a card-paid order via the Stripe API, so a
// restaurateur can undo a billing mistake straight from the admin dashboard.
//
// Deploy with:
//   cd velvetguest
//   supabase functions deploy create-stripe-refund --use-api

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sHeaders = { "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey, "Content-Type": "application/json" };

    const orderRes = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${order_id}&select=id,restaurant_id,total,payment_method,stripe_payment_intent_id,refunded`,
      { headers: sHeaders }
    );
    const orderRows = await orderRes.json();
    const order = Array.isArray(orderRows) ? orderRows[0] : null;
    if (!order) return json({ error: "order not found" }, 404);
    if (order.refunded) return json({ ok: true, already_refunded: true });
    if (!order.stripe_payment_intent_id) {
      return json({ ok: false, error: "Cette commande n'a pas de paiement Stripe associé (paiement espèces ou commande créée avant l'activation du remboursement)." }, 400);
    }

    // Same "own config, else franchise payment-master" lookup as create-payment-intent.
    const readKeys = async (rid: string) => {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/restaurant_settings?restaurant_id=eq.${rid}&select=stripe_secret_key`,
        { headers: sHeaders }
      );
      const rows = await r.json();
      return Array.isArray(rows) && rows[0] ? rows[0].stripe_secret_key || null : null;
    };

    let secretKey = await readKeys(order.restaurant_id);
    if (!secretKey) {
      const rr = await fetch(`${supabaseUrl}/rest/v1/restaurants?id=eq.${order.restaurant_id}&select=owner_id`, { headers: sHeaders });
      const rrows = await rr.json();
      const ownerId = Array.isArray(rrows) && rrows[0] ? rrows[0].owner_id : null;
      if (ownerId) {
        const mr = await fetch(
          `${supabaseUrl}/rest/v1/restaurants?owner_id=eq.${ownerId}&is_payment_master=eq.true&select=id&limit=1`,
          { headers: sHeaders }
        );
        const mrows = await mr.json();
        const masterId = Array.isArray(mrows) && mrows[0] ? mrows[0].id : null;
        if (masterId && masterId !== order.restaurant_id) secretKey = await readKeys(masterId);
      }
    }
    if (!secretKey) return json({ error: "stripe_not_configured" }, 500);

    const stripeRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { "Authorization": `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ payment_intent: order.stripe_payment_intent_id }),
    });
    const refund = await stripeRes.json();
    if (!stripeRes.ok) {
      return json({ ok: false, error: refund?.error?.message || "Stripe error", stripe_response: refund }, 502);
    }

    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order_id}`, {
      method: "PATCH",
      headers: sHeaders,
      body: JSON.stringify({
        refunded: true,
        refund_amount: order.total,
        refunded_at: new Date().toISOString(),
        paid: false,
      }),
    });

    return json({ ok: true, refund_id: refund.id, amount: order.total });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
