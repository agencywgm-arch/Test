// Wegemo — Edge Function: upsert a CRM customer profile server-side.
//
// WHY THIS EXISTS: the app used to write to `customers` directly from the
// customer's browser with the anon key, which meant it depended entirely on
// the `customers` RLS insert/update policies being configured correctly in
// each restaurant's Supabase project. That dependency kept silently failing
// in production (policy never applied / re-reverted), and the failure was
// only ever visible in a browser devtools console nobody was looking at —
// so the CRM looked "stuck" with no visible cause. Running the upsert here
// with the service role key removes RLS from the equation entirely: this
// path always works regardless of what policies exist on `customers`.
//
// Deploy with:
//   cd velvetguest
//   supabase functions deploy upsert-customer --use-api

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { restaurant_id, email, first_name, phone, nif, total } = await req.json();
    if (!restaurant_id || !email) return json({ error: "restaurant_id and email are required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sHeaders = { "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey, "Content-Type": "application/json" };

    const custEmail = String(email).trim().toLowerCase();

    // Never let a repeat order with a blank optional field (phone, NIF) erase
    // what a previous order already captured — merge onto the existing row.
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/customers?restaurant_id=eq.${restaurant_id}&email=eq.${encodeURIComponent(custEmail)}&select=phone,nif`,
      { headers: sHeaders }
    );
    const existingRows = await existingRes.json().catch(() => []);
    const existing = Array.isArray(existingRows) ? existingRows[0] : null;

    const payload: Record<string, unknown> = {
      restaurant_id,
      email: custEmail,
      first_name: (first_name || "").trim() || "Client",
      phone: (phone || "").trim() || existing?.phone || "",
      nif: nif || existing?.nif || null,
      last_visit: new Date().toISOString().split("T")[0],
      last_order_total: total ?? null,
    };

    let res = await fetch(`${supabaseUrl}/rest/v1/customers?on_conflict=restaurant_id,email`, {
      method: "POST",
      headers: { ...sHeaders, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(payload),
    });

    // Fallback if the `nif` column hasn't been migrated on this project yet.
    if (!res.ok) {
      const errText = await res.text();
      if (/nif/i.test(errText)) {
        const { nif: _nif, ...withoutNif } = payload;
        res = await fetch(`${supabaseUrl}/rest/v1/customers?on_conflict=restaurant_id,email`, {
          method: "POST",
          headers: { ...sHeaders, "Prefer": "resolution=merge-duplicates" },
          body: JSON.stringify(withoutNif),
        });
      } else {
        return json({ ok: false, error: errText }, 502);
      }
    }
    if (!res.ok) {
      const errText = await res.text();
      return json({ ok: false, error: errText }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
