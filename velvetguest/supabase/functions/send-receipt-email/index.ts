import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { restaurant_id, to_email, subject, html_body } = await req.json()

    if (!restaurant_id || !to_email || !subject || !html_body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const [settRes, restoRes] = await Promise.all([
      supabase.from("restaurant_settings").select("resend_api_key, resend_from").eq("restaurant_id", restaurant_id).maybeSingle(),
      supabase.from("restaurants").select("name").eq("id", restaurant_id).single(),
    ])

    const RESEND_API_KEY = settRes.data?.resend_api_key || Deno.env.get("RESEND_API_KEY")
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const fromEmail = settRes.data?.resend_from || Deno.env.get("RESEND_FROM") || "onboarding@resend.dev"
    const from = `${restoRes.data?.name || "Wegemo"} <${fromEmail}>`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: to_email, subject, html: html_body }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: err?.message || `HTTP ${res.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
