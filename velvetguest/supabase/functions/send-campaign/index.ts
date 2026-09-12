import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const body = await req.json()
    const { restaurant_id, restaurant_name, subject, html_body, recipients } = body

    if (!subject || !html_body || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject, html_body, recipients" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (recipients.length > 500) {
      return new Response(JSON.stringify({ error: "Too many recipients (max 500)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Verify restaurant ownership (non-blocking if restaurant_id missing)
    if (restaurant_id) {
      const { data: resto } = await supabase
        .from("restaurants")
        .select("id")
        .eq("id", restaurant_id)
        .eq("owner_id", user.id)
        .maybeSingle()
      if (!resto) {
        return new Response(JSON.stringify({ error: "Forbidden: restaurant not owned by user" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    // Load restaurant-level API keys — maybeSingle() won't throw if row missing
    let rSettings: { resend_api_key?: string; resend_from?: string } | null = null
    if (restaurant_id) {
      const { data } = await supabase
        .from("restaurant_settings")
        .select("resend_api_key, resend_from")
        .eq("restaurant_id", restaurant_id)
        .maybeSingle()
      rSettings = data
    }

    const RESEND_API_KEY = rSettings?.resend_api_key || Deno.env.get("RESEND_API_KEY")
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured. Add it in Wegemo Settings → Email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const fromEmail = rSettings?.resend_from || Deno.env.get("RESEND_FROM") || "onboarding@resend.dev"
    const from = `${restaurant_name || "Wegemo"} <${fromEmail}>`

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const to of recipients) {
      try {
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
      } catch (fetchErr) {
        failed++
        errors.push(`${to}: network error`)
      }
    }

    // Log campaign (ignore if table doesn't exist)
    if (restaurant_id) {
      await supabase.from("campaign_logs").insert({
        restaurant_id,
        subject,
        sent_count: sent,
        failed_count: failed,
      }).catch(() => {})
    }

    return new Response(
      JSON.stringify({ sent, failed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
