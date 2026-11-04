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
    // `use_backlog_register`: only the backlog-regularization flows (single
    // test button, bulk "missing invoices" button) pass this. Live orders
    // paid right now still go through the account's normal/default register,
    // so day-to-day invoicing isn't permanently rerouted just because a
    // second register exists for catching up on old orders.
    const { order_id, use_backlog_register } = await req.json();
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
      .select("id, vendus_invoice_id, vendus_invoice_number, vendus_invoice_url, restaurant_id, total, customer_name, customer_email, customer_nif, payment_method, created_at")
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
      .select("id, name, nif, vendus_enabled, vendus_tax_id, vendus_cash_payment_id, vendus_card_payment_id, vendus_register_id")
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
    // An empty order (deleted items, corrupted historical row) has nothing to
    // put on an invoice — that's a data fact, not a Vendus/API problem, so it
    // gets its own code the frontend can treat as an expected skip rather
    // than a failure that should ever halt the backlog run.
    if (!items?.length) return json({ ok: false, code: "no_items", error: "no items on order" }, 400);

    // Default to NOR (23%): over-declaring VAT is recoverable, under-declaring
    // is a tax liability. Override per restaurant once validated with the accountant.
    const ALLOWED_TAX = ["NOR", "INT", "RED", "ISE", "OUT", "NS"];
    const taxCode = ALLOWED_TAX.includes(String(resto.vendus_tax_id || "").toUpperCase())
      ? String(resto.vendus_tax_id).toUpperCase() : "NOR";

    // Resolve a real Vendus payment-method id. Their ids are account-specific,
    // so we fetch the list and match it to how the customer paid, rather than
    // hardcoding a number that would differ from one account to another.
    // Probing showed only "/payment_types/" is a real endpoint on this account
    // (the other 3 paths 404 as unknown endpoints) — but it 400s when sent
    // BOTH the Authorization header and the api_key query param together, so
    // try each auth style on its own instead of combining them.
    const isCard = existing.payment_method && existing.payment_method !== "cash";

    // Configured explicitly on the restaurant? Use that first — the lookup
    // endpoint below 400s regardless of auth style on every account we've
    // tested, and Vendus payment-type ids are per-account generated numbers,
    // not small sequential ones, so there's no safe generic guess.
    let paymentId: number | undefined =
      (isCard ? resto.vendus_card_payment_id : resto.vendus_cash_payment_id) ?? undefined;
    const pmDebug: any = {};
    const authVariants: Array<[string, RequestInit]> = paymentId ? [] : [
      [`${VENDUS_BASE}/payment_types/?api_key=${encodeURIComponent(VENDUS_API_KEY)}`, { headers: { "Accept": "application/json" } }],
      [`${VENDUS_BASE}/payment_types/`, { headers: { "Authorization": VENDUS_AUTH, "Accept": "application/json" } }],
    ];
    for (const [url, opts] of authVariants) {
      try {
        const pmRes = await fetch(url, opts);
        const raw = await pmRes.text();
        let parsed: any = null;
        try { parsed = JSON.parse(raw); } catch { /* keep raw for debugging */ }
        pmDebug[url] = { status: pmRes.status, body: parsed ?? raw.slice(0, 400) };
        const list = Array.isArray(parsed) ? parsed
          : Array.isArray(parsed?.data) ? parsed.data
          : Array.isArray(parsed?.paymentmethods) ? parsed.paymentmethods
          : null;
        if (list?.length) {
          const wanted = isCard ? /multibanco|cart|card|tpa/i : /numer|dinheiro|cash|esp/i;
          const match = list.find((p: any) => wanted.test(String(p.title || p.name || p.description || "")));
          const chosen = match || list[0];
          if (chosen?.id != null) { paymentId = Number(chosen.id); break; }
        }
      } catch (e) { pmDebug[url] = { error: String(e) }; }
    }

    // Last-resort fallback: La Gratinade's own ids (Definições → Tipos de
    // Pagamento → editar → id in the URL — these numbers are per-account, not
    // small sequential ones like "1"/"2", so this is NOT a safe generic
    // default for a different restaurant's Vendus account). Every restaurant
    // should really have vendus_cash_payment_id/vendus_card_payment_id set —
    // this only prevents a total block if that configuration is missing.
    if (paymentId == null) {
      paymentId = isCard ? 356589027 : 356589025;
      pmDebug["fallback"] = `no vendus_${isCard ? "card" : "cash"}_payment_id configured and lookup failed — defaulted to La Gratinade's known id (${paymentId})`;
    }

    // No usable payment-method endpoint on this account/API version: emit the
    // document WITHOUT a payments block and let the register apply its default,
    // rather than blocking the invoice entirely over a lookup detail.

    // Build Vendus document payload.
    // - "FS" = Fatura Simplificada, legally sufficient for retail sales under
    //   1000€ to consumers (with or without NIF). Perfect for fast-food orders.
    // - We include the customer email so Vendus auto-emails them the PDF.
    // - "Consumidor Final" NIF is the standard placeholder for anonymous customers.
    const payload = {
      type: "FS",
      // The order's own date, not "today" — this function is also used to
      // backfill invoices for orders that are days/weeks old (regularize
      // missing-invoices flow), and dating every one of them "today" would
      // misstate when that revenue actually happened for VAT/SAF-T purposes.
      date: new Date(existing.created_at).toISOString().split("T")[0], // YYYY-MM-DD
      // Vendus doesn't let a series/mode be picked directly — each REGISTER
      // ("caixa") gets its own auto-assigned series, with its own independent
      // date history. The default register's series got "stuck" at
      // 2026-08-21 by an early test document, so backdated/backlog invoices
      // route through a second register created for this purpose (its series
      // is only registered with the AT the first time a document is actually
      // issued through it, so it has no date constraint yet).
      // NOTE: "register_id" is our best guess at Vendus's field name for
      // targeting a specific register on document creation — unconfirmed. If
      // it's wrong, the fn_version-tagged error banner from the test button
      // will show Vendus's real complaint and we fix the key name from that.
      ...(use_backlog_register && resto.vendus_register_id ? { register_id: resto.vendus_register_id } : {}),
      // Adding "country: PT" alongside the generic 999999990 placeholder
      // still got "NIF português inválido" from Vendus — the field/value it
      // actually wants for that combination isn't documented consistently
      // enough to keep guessing. Simplest fix that can't fail this way: only
      // send a fiscal_id at all when we have a REAL, checksum-valid customer
      // NIF. For everyone else, omit `client` entirely and let Vendus apply
      // its own default "Consumidor Final" handling — that's exactly what
      // it's built to do when no client is specified.
      //
      // Vendus turned out to reject the client object for other reasons the
      // backlog surfaced in bulk: a `client` with only a `name` and neither
      // fiscal_id/email/id/external_reference is rejected outright ("must
      // have an id, a fiscal_id, an external_reference or an email"); a name
      // under 3 characters is rejected too short; and a malformed email
      // (typo'd at checkout, where it's free-text and unvalidated) is
      // rejected as invalid. None of these are our data to fix retroactively
      // for old orders, so validate each field and drop the whole client
      // object rather than send Vendus something it will bounce.
      ...(() => {
        const hasRealNif = typeof existing.customer_nif === "string" && isValidPortugueseNif(existing.customer_nif);
        const rawName = typeof existing.customer_name === "string" ? existing.customer_name.trim() : "";
        const hasValidName = rawName.length >= 3;
        const rawEmail = typeof existing.customer_email === "string" ? existing.customer_email.trim() : "";
        const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

        // Nothing that would let Vendus identify a client at all — omit the
        // field entirely (this is the exact case that produced the "must
        // have an id/fiscal_id/external_reference/email" error).
        if (!hasRealNif && !hasValidEmail) return {};

        return {
          client: {
            name: hasValidName ? rawName : "Consumidor Final",
            ...(hasRealNif ? { fiscal_id: existing.customer_nif, country: "PT" } : {}),
            ...(hasValidEmail ? { email: rawEmail, send_email: "yes" } : {}),
          },
        };
      })(),
      items: (() => {
        const lines = items.map((it: any) => {
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
        });
        // gross_price only reflects the base menu item — extras/toppings
        // chosen on the order (priced separately, only recorded as free text
        // in `detail`) and promo discounts aren't in that number, so the item
        // lines can legitimately sum to less (or more) than the order's real
        // total. Vendus rejects a document whose payment doesn't reconcile
        // with its lines ("Faltam X euros"), so add one adjustment line for
        // the gap instead of forcing a wrong per-item price.
        // Vendus treats `title` as a catalog product lookup, not a free-text
        // label — a synthetic "Desconto"/"Extras" line fails with "product
        // doesn't have a price" because no such product exists in the
        // restaurant's Vendus catalog. Absorb the gap into the last real
        // item's unit price instead of inventing a line item.
        const linesTotal = lines.reduce((s: number, l: any) => s + l.gross_price * l.qty, 0);
        const diff = Math.round((Number(existing.total) - linesTotal) * 100) / 100;
        if (Math.abs(diff) >= 0.01 && lines.length) {
          const last = lines[lines.length - 1];
          last.gross_price = Math.round((last.gross_price + diff / last.qty) * 100) / 100;
        }
        return lines;
      })(),
      // Only sent when we actually resolved a real payment-method id — Vendus
      // rejects a placeholder ("Missing payment ID"), but accepts the document
      // with no payments block at all and falls back to the register default.
      ...(paymentId ? { payments: [{ id: paymentId, amount: Number(existing.total) }] } : {}),
      output: "escpos", // ask Vendus to also return an ESC/POS payload we can push to the printer later
    };

    const postDocument = async (p: Record<string, unknown>) => {
      const res = await fetch(`${VENDUS_BASE}/documents/?api_key=${encodeURIComponent(VENDUS_API_KEY)}`, {
        method: "POST",
        headers: { "Authorization": VENDUS_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, api_key: VENDUS_API_KEY }),
      });
      const j: any = await res.json().catch(() => ({}));
      return { res, j };
    };

    let { res: vendusRes, j: vendusJson } = await postDocument(payload);
    let dateWasAdjusted = false;
    let clientWasDropped = false;

    // Old backlog orders keep surfacing new client-data quirks Vendus itself
    // can't resolve — an invalid email format their validator is stricter
    // about than ours, or (surprising but real) an account with two existing
    // "client" records sharing the same email, which Vendus can't
    // disambiguate on its own. There's no reliable way to predict every such
    // case from our side (or even reliably pattern-match every message shape
    // Vendus might use for it), so this is unconditional: any failure at all
    // when we sent a client gets ONE retry with the client omitted entirely —
    // a fully anonymous "Consumidor Final" invoice always succeeds where a
    // specific client can't be resolved, and if the client wasn't the actual
    // problem, this retry just fails again with the real underlying error
    // (which the response still reports).
    const errText = () => JSON.stringify(vendusJson?.errors || vendusJson);
    if (!vendusRes.ok && (payload as any).client) {
      const { client, ...withoutClient } = payload as any;
      ({ res: vendusRes, j: vendusJson } = await postDocument(withoutClient));
      clientWasDropped = vendusRes.ok;
    }

    // A backlog order can get skipped past on a run (a transient error, a
    // data issue since fixed) while later, correctly-dated orders on the
    // same register go through and advance its date floor. Retrying the
    // skipped one afterwards then hits this exact "date antérieure" error
    // even on the backlog register — there is no way left to give it its
    // true original date. Rather than block it forever, fall back once to
    // today's date so the legally-required invoice still gets issued; the
    // response flags this so it's never silently misrepresented as a clean
    // backdate.
    if (!vendusRes.ok && /não pode ser anterior/i.test(errText())) {
      const basePayload = clientWasDropped ? (() => { const { client, ...rest } = payload as any; return rest; })() : payload;
      const retryPayload = { ...basePayload, date: new Date().toISOString().split("T")[0] };
      ({ res: vendusRes, j: vendusJson } = await postDocument(retryPayload));
      dateWasAdjusted = vendusRes.ok;
    }

    if (!vendusRes.ok) {
      return json({
        ok: false,
        error: "vendus API error",
        // Bump this string on every deploy — the only reliable way to confirm
        // from the app's own error banner (no Supabase dashboard needed) that
        // this exact revision, not a stale cached one, is what actually ran.
        fn_version: "v14-unconditional-client-drop",
        status: vendusRes.status,
        vendus_response: vendusJson,
        // Helps tell "wrong key" apart from "key not transmitted".
        key_len: VENDUS_API_KEY.length,
        payment_id_used: paymentId ?? null,
        vendus_paymentmethods_debug: pmDebug,
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
      // Vendus's create-document response doesn't include a hosted PDF link —
      // only raw ESC/POS printer bytes (`output`). The invoice is still fully
      // valid and viewable from the Vendus dashboard under Documentos; there's
      // just no URL to show here.
      invoice_url: vendusJson.link || vendusJson.pdf_url || vendusJson.url || "",
      escpos: vendusJson.escpos || null,
      // True when this specific order's real date was already unreachable on
      // this register (an earlier order skipped it, later ones advanced the
      // date floor past it) and the invoice had to be dated today instead.
      date_adjusted_to_today: dateWasAdjusted,
      // True when Vendus couldn't be given this order's customer info (bad
      // email format, ambiguous duplicate client record, etc.) and the
      // invoice had to be issued anonymously ("Consumidor Final") instead.
      client_dropped: clientWasDropped,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

// A Portuguese NIF isn't just "9 digits" — the 9th digit is a checksum over
// the first 8 (mod 11). We used to only check length/digits, so a customer
// typo'd or made-up 9-digit number (common — the field is optional at
// checkout and unvalidated there) would pass our check but get rejected by
// Vendus as "NIF português inválido", blocking the whole invoice instead of
// just falling back to the generic consumer NIF like it should.
function isValidPortugueseNif(nif: string): boolean {
  if (!/^\d{9}$/.test(nif)) return false;
  const digits = nif.split("").map(Number);
  const sum = digits.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0);
  const checkDigit = 11 - (sum % 11);
  const expected = checkDigit >= 10 ? 0 : checkDigit;
  return expected === digits[8];
}
