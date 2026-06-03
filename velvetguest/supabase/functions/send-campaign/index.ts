import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { restaurant_id, restaurant_name, subject, html_body, recipients } = await req.json()

    if (!subject || !html_body || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject, html_body, recipients" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const fromName = restaurant_name || "VelvetGuest"
    const fromEmail = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev"
    const from = `${fromName} <${fromEmail}>`

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const to of recipients) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html: html_body }),
      })

      if (res.ok) {
        sent++
      } else {
        failed++
        const err = await res.json().catch(() => ({}))
        errors.push(`${to}: ${err?.message || `HTTP ${res.status}`}`)
      }
    }

    // Log campaign in DB if restaurant_id provided
    if (restaurant_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      )
      await supabase.from("campaign_logs").insert({
        restaurant_id,
        subject,
        sent_count: sent,
        failed_count: failed,
      }).throwOnError().catch(() => {}) // table optional — ignore if not migrated
    }

    return new Response(
      JSON.stringify({ sent, failed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
