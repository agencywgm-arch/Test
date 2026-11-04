// Wegemo — Edge Function: send a Web Push notification to a customer
// when their order is marked "ready" by the kitchen/dashboard.
//
// Deploy with:
//   supabase functions deploy send-ready-push
//
// Required secrets (set once with `supabase secrets set ...`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
//   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are already injected automatically.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { order_id, restaurant_name } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), { status: 400, headers: CORS_HEADERS });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("order_id", order_id);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: CORS_HEADERS });
    }

    const payload = JSON.stringify({
      title: "✅ Votre commande est prête !",
      body: `${restaurant_name || "Le restaurant"} — vous pouvez venir la récupérer.`,
      tag: `order-ready-${order_id}`,
    });

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    // Drop subscriptions the push service rejected as permanently gone
    // (expired/unsubscribed) so they stop being retried forever.
    const deadIds = results
      .map((r, i) => (r.status === "rejected" && [404, 410].includes(r.reason?.statusCode) ? subs[i].id : null))
      .filter(Boolean);
    if (deadIds.length) {
      await supabase.from("push_subscriptions").delete().in("id", deadIds);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, total: subs.length }), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS_HEADERS });
  }
});
