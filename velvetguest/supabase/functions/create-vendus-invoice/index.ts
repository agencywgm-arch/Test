// Wegemo — Edge Function: emit a certified Portuguese fiscal receipt for a
// paid order by calling the Vendus API (https://www.vendus.pt/ws/v1.1/).
//
// Deploy with:
//   cd velvetguest
//   supabase functions deploy create-vendus-invoice --use-api
//
// Required secrets:
//   VENDUS_API_KEY  (already set via `supabase secrets set VENDUS_API_KEY=...`)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected by Supabase)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VENDUS_API_KEY = Deno.env.get("VENDUS_API_KEY")!;

const VENDUS_BASE = "https://www.vendus.pt/ws/v1.1";
// Vendus uses HTTP Basic Auth: the API key is the username, password is empty.
const VENDUS_AUTH = "Basic " + btoa(VENDUS_API_KEY + ":");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return json({ error: "order_id is required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Idempotency: if the invoice already exists, just return it. Avoids a
    // double fiscal emission if this function is triggered twice (Stripe retry,
    // cashier double-click, etc.) — which would be a legal problem in Portugal.
    const { data: existing } = await supabase
      .from("orders")
      .select("id, vendus_invoice_id, vendus_invoice_number, vendus_invoice_url, restaurant_id, total, customer_name, customer_email, payment_method")
      .eq("id", order_id)
      .single();
    if (!existing) return json({ error: "order not found" }, 404);
    if (existing.vendus_invoice_id) {
      return json({
        ok: true,
        already_existed: true,
        invoice_id: existing.vendus_invoice_id,
        invoice_number: existing.vendus_invoice_number,
        invoice_url: existing.vendus_invoice_url,
      });
    }

    // Load restaurant → must have vendus_enabled + a NIF configured
    const { data: resto } = await supabase
      .from("restaurants")
      .select("id, name, nif, vendus_enabled")
      .eq("id", existing.restaurant_id)
      .single();
    if (!resto) return json({ error: "restaurant not found" }, 404);
    if (!resto.vendus_enabled) {
      return json({ ok: false, skipped: "vendus not enabled for this restaurant" });
    }

    // Load order items with their menu snapshot (name + price at order time)
    const { data: items } = await supabase
      .from("order_items")
      .select("quantity, detail, menu_items(name, price)")
      .eq("order_id", order_id);
    if (!items?.length) return json({ error: "no items on order" }, 400);

    // Build Vendus document payload.
    // - "FS" = Fatura Simplificada, legally sufficient for retail sales under
    //   1000€ to consumers (with or without NIF). Perfect for fast-food orders.
    // - We include the customer email so Vendus auto-emails them the PDF.
    // - "Consumidor Final" NIF is the standard placeholder for anonymous customers.
    const payload = {
      type: "FS",
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      client: {
        name: existing.customer_name || "Consumidor Final",
        fiscal_id: "999999990", // NIF genérico for final consumer (standard Portugal)
        email: existing.customer_email || undefined,
        send_email: existing.customer_email ? "yes" : "no",
      },
      items: items.map((it: any) => {
        const name = it.menu_items?.name || "Artigo";
        const unitPrice = Number(it.menu_items?.price || 0);
        const title = it.detail ? `${name} (${it.detail})` : name;
        return {
          title: title.substring(0, 100),
          gross_price: unitPrice,
          qty: it.quantity,
          // 23% VAT is the standard Portuguese rate for restaurant takeaway food.
          // Vendus lets us pass the rate directly; it resolves the tax_id server-side.
          tax_id: 0, // 0 = use default IVA config from the store's product tax settings
        };
      }),
      // Payment method mapping — Vendus needs at least one payment line
      // matching the document total so it can close the fiscal document.
      payments: [
        {
          id: 0, // 0 = use default payment type ("Numerário" or "Multibanco")
          amount: Number(existing.total),
        },
      ],
      output: "escpos", // ask Vendus to also return an ESC/POS payload we can push to the printer later
    };

    const vendusRes = await fetch(`${VENDUS_BASE}/documents`, {
      method: "POST",
      headers: { "Authorization": VENDUS_AUTH, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const vendusJson: any = await vendusRes.json().catch(() => ({}));

    if (!vendusRes.ok) {
      return json({
        ok: false,
        error: "vendus API error",
        status: vendusRes.status,
        vendus_response: vendusJson,
      }, 502);
    }

    // Persist the invoice reference on the order so the customer/staff pages
    // can show the download link and so we never re-emit the same invoice.
    await supabase.from("orders").update({
      vendus_invoice_id: String(vendusJson.id ?? vendusJson.document_id ?? ""),
      vendus_invoice_number: vendusJson.number || vendusJson.document_number || "",
      vendus_invoice_url: vendusJson.link || vendusJson.pdf_url || vendusJson.url || "",
      vendus_invoice_created_at: new Date().toISOString(),
    }).eq("id", order_id);

    return json({
      ok: true,
      invoice_id: vendusJson.id,
      invoice_number: vendusJson.number,
      invoice_url: vendusJson.link,
      escpos: vendusJson.escpos || null,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}
