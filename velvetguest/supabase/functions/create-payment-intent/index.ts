const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { amount, currency = "eur", restaurant_id } = await req.json();

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0 || amountNum > 10000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let secretKey = null;
    let publishableKey = null;

    if (restaurant_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sHeaders = { "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey };

      const readKeys = async (rid: string) => {
        const r = await fetch(
          `${supabaseUrl}/rest/v1/restaurant_settings?restaurant_id=eq.${rid}&select=stripe_secret_key,stripe_publishable_key`,
          { headers: sHeaders }
        );
        const rows = await r.json();
        if (Array.isArray(rows) && rows[0]) {
          return { secret: rows[0].stripe_secret_key || null, pub: rows[0].stripe_publishable_key || null };
        }
        return { secret: null, pub: null };
      };

      // 1) Try the restaurant's own Stripe config.
      let keys = await readKeys(restaurant_id);

      // 2) Fallback: if this restaurant isn't configured, use the account's
      //    "payment master" restaurant (same owner, is_payment_master = true).
      //    This lets every restaurant in a franchise share one Stripe setup.
      if (!keys.secret || !keys.pub) {
        const rr = await fetch(
          `${supabaseUrl}/rest/v1/restaurants?id=eq.${restaurant_id}&select=owner_id`,
          { headers: sHeaders }
        );
        const rrows = await rr.json();
        const ownerId = Array.isArray(rrows) && rrows[0] ? rrows[0].owner_id : null;
        if (ownerId) {
          const mr = await fetch(
            `${supabaseUrl}/rest/v1/restaurants?owner_id=eq.${ownerId}&is_payment_master=eq.true&select=id&limit=1`,
            { headers: sHeaders }
          );
          const mrows = await mr.json();
          const masterId = Array.isArray(mrows) && mrows[0] ? mrows[0].id : null;
          if (masterId && masterId !== restaurant_id) {
            keys = await readKeys(masterId);
          }
        }
      }

      secretKey = keys.secret;
      publishableKey = keys.pub;
    }

    if (!secretKey || !publishableKey) {
      return new Response(JSON.stringify({ error: "stripe_not_configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(Math.round(amountNum * 100)),
        currency,
        "automatic_payment_methods[enabled]": "true",
      }),
    });

    const intent = await stripeRes.json();
    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: intent?.error?.message || "Stripe error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({ client_secret: intent.client_secret, publishable_key: publishableKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
