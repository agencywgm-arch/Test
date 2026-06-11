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

      const r = await fetch(
        `${supabaseUrl}/rest/v1/restaurant_settings?restaurant_id=eq.${restaurant_id}&select=stripe_secret_key,stripe_publishable_key`,
        { headers: { "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey } }
      );
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]) {
        secretKey = rows[0].stripe_secret_key || null;
        publishableKey = rows[0].stripe_publishable_key || null;
      }
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
