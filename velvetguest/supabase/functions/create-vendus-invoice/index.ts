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
// Secrets set via CLI/dashboard often keep surrounding quotes or a trailing
// newline. Vendus then receives `"key"` instead of `key` and answers 401/A001,
// so normalise the value here rather than depending on how it was pasted.
const VENDUS_API_KEY = (Deno.env.get("VENDUS_API_KEY") || "").trim().replace(/^["']+|["']+$/g, "").trim();

const VENDUS_BASE = "https://www.vendus.pt/ws/v1.1";
// Vendus accepts the API key either as HTTP Basic Auth (key as username, empty
// password) OR as an `api_key` query parameter, depending on the endpoint and
// account. Sending both covers either convention — a mismatch here is what
// produced the opaque "401 / A001 / AUTH" response.
const VENDUS_AUTH = "Basic " + btoa((VENDUS_API_KEY || "") + ":");

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

    // Fail loudly and unambiguously if the secret was never set, instead of
    // letting Vendus answer with a generic 401 that looks like a bad key.
    if (!VENDUS_API_KEY) {
      return json({
        ok: false,
        error: "VENDUS_API_KEY secret is not set on this Supabase project",
        fix: "Supabase → Edge Functions → Secrets → add VENDUS_API_KEY",
      }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Idempotency: if the invoice already exists, just return it. Avoids a
    // double fiscal emission if this function is triggered twice (Stripe retry,
    // cashier double-click, etc.) — which would be a legal problem in Portugal.
    const { data: existing } = await supabase
      .from("orders")
      .select("id, vendus_invoice_id, vendus_invoice_number, vendus_invoice_url, restaurant_id, total, customer_name, customer_email, customer_nif, payment_method")
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
      .select("id, name, nif, vendus_enabled, vendus_tax_id")
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

    // Default to NOR (23%): over-declaring VAT is recoverable, under-declaring
    // is a tax liability. Override per restaurant once validated with the accountant.
    const ALLOWED_TAX = ["NOR", "INT", "RED", "ISE", "OUT", "NS"];
    const taxCode = ALLOWED_TAX.includes(String(resto.vendus_tax_id || "").toUpperCase())
      ? String(resto.vendus_tax_id).toUpperCase() : "NOR";

    // Resolve a real Vendus payment-method id. Their ids are account-specific,
    // so we fetch the list and match it to how the customer paid, rather than
    // hardcoding a number that would differ from one account to another.
    // Vendus has shipped this list under a few different shapes/paths over time,
    // so probe the known ones and keep the raw answer for diagnostics rather than
    // failing with an opaque "not found".
    let paymentId: number | undefined;
    const pmDebug: any = {};
    for (const path of ["/paymentmethods/", "/paymentmethods", "/payment_methods/"]) {
      try {
        const pmRes = await fetch(`${VENDUS_BASE}${path}?api_key=${encodeURIComponent(VENDUS_API_KEY)}`, {
          headers: { "Authorization": VENDUS_AUTH, "Accept": "application/json" },
        });
        const raw = await pmRes.text();
        let parsed: any = null;
        try { parsed = JSON.parse(raw); } catch { /* keep raw for debugging */ }
        pmDebug[path] = { status: pmRes.status, body: parsed ?? raw.slice(0, 400) };
        const list = Array.isArray(parsed) ? parsed
          : Array.isArray(parsed?.data) ? parsed.data
          : Array.isArray(parsed?.paymentmethods) ? parsed.paymentmethods
          : null;
        if (list?.length) {
          const isCard = existing.payment_method && existing.payment_method !== "cash";
          const wanted = isCard ? /multibanco|cart|card|tpa/i : /numer|dinheiro|cash|esp/i;
          const match = list.find((p: any) => wanted.test(String(p.title || p.name || p.description || "")));
          const chosen = match || list[0];
          if (chosen?.id != null) { paymentId = Number(chosen.id); break; }
        }
      } catch (e) { pmDebug[path] = { error: String(e) }; }
    }

    if (!paymentId) {
      return json({
        ok: false,
        error: "no Vendus payment method found",
        fix: "Vendus → Configurações → Tipos de Pagamento",
        vendus_paymentmethods_debug: pmDebug,
      }, 502);
    }

    // Build Vendus document payload.
    // - "FS" = Fatura Simplificada, legally sufficient for retail sales under
    //   1000€ to consumers (with or without NIF). Perfect for fast-food orders.
    // - We include the customer email so Vendus auto-emails them the PDF.
    // - "Consumidor Final" NIF is the standard placeholder for anonymous customers.
    const payload = {
      type: "FS",
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      client: (() => {
        // Use the customer's real NIF when they provided a valid 9-digit one
        // (fatura "com contribuinte"); otherwise fall back to the generic final
        // consumer NIF (999999990).
        const nif = typeof existing.customer_nif === "string" && /^\d{9}$/.test(existing.customer_nif)
          ? existing.customer_nif : "999999990";
        return {
          name: existing.customer_name || "Consumidor Final",
          fiscal_id: nif,
          email: existing.customer_email || undefined,
          send_email: existing.customer_email ? "yes" : "no",
        };
      })(),
      items: items.map((it: any) => {
        const name = it.menu_items?.name || "Artigo";
        const unitPrice = Number(it.menu_items?.price || 0);
        const title = it.detail ? `${name} (${it.detail})` : name;
        return {
          title: title.substring(0, 100),
          gross_price: unitPrice,
          qty: it.quantity,
          // Vendus expects a Portuguese VAT code, not a numeric id:
          //   NOR = normal (23%) · INT = intermédia (13%) · RED = reduzida (6%)
          //   ISE = isenta · OUT = outra · NS = não sujeito
          // Configurable per restaurant because the correct rate is a fiscal
          // decision (dine-in vs takeaway vs drinks), not a technical one.
          tax_id: taxCode,
        };
      }),
      // Payment method mapping — Vendus needs a REAL payment-method id from the
      // account (there is no generic "0"), so we look it up from their API and
      // match it to how the customer actually paid.
      payments: [
        {
          id: paymentId,
          amount: Number(existing.total),
        },
      ],
      output: "escpos", // ask Vendus to also return an ESC/POS payload we can push to the printer later
    };

    const vendusRes = await fetch(`${VENDUS_BASE}/documents/?api_key=${encodeURIComponent(VENDUS_API_KEY)}`, {
      method: "POST",
      headers: { "Authorization": VENDUS_AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, api_key: VENDUS_API_KEY }),
    });
    const vendusJson: any = await vendusRes.json().catch(() => ({}));

    if (!vendusRes.ok) {
      return json({
        ok: false,
        error: "vendus API error",
        status: vendusRes.status,
        vendus_response: vendusJson,
        // Helps tell "wrong key" apart from "key not transmitted".
        key_len: VENDUS_API_KEY.length,
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
