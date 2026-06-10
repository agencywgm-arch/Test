import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require a valid Supabase anon/user token to prevent abuse
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { amount, currency = "eur", restaurant_id } = await req.json();

    // Validate amount: must be positive and capped at 10 000 €
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0 || amountNum > 10000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Resolve Stripe keys: per-restaurant keys from DB (service role bypasses
    // RLS so anonymous customers can pay), falling back to project-level env.
    let secretKey = Deno.env.get("STRIPE_SECRET_KEY") || null
    let publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY") || null

    if (restaurant_id) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      )
      const { data } = await admin
        .from("restaurant_settings")
        .select("stripe_secret_key, stripe_publishable_key")
        .eq("restaurant_id", restaurant_id)
        .maybeSingle()
      if (data?.stripe_secret_key) secretKey = data.stripe_secret_key
      if (data?.stripe_publishable_key) publishableKey = data.stripe_publishable_key
    }

    if (!secretKey || !publishableKey) {
      return new Response(JSON.stringify({ error: "stripe_not_configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2024-04-10",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountNum * 100),
      currency,
      automatic_payment_methods: { enabled: true },
    });
    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret, publishable_key: publishableKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
