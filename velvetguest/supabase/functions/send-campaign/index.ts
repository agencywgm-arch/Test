import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!
  const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  })
  return res.json()
}

function buildRfc2822(from: string, to: string, subject: string, htmlBody: string): string {
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    htmlBody,
  ].join("\r\n")
}

function encodeBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

async function sendGmailMessage(accessToken: string, from: string, to: string, subject: string, htmlBody: string): Promise<{ ok: boolean; error?: string }> {
  const raw = encodeBase64Url(buildRfc2822(from, to, subject, htmlBody))

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "unknown" } }))
    return { ok: false, error: err?.error?.message || `HTTP ${res.status}` }
  }
  return { ok: true }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { restaurant_id, subject, html_body, recipients } = await req.json()

    if (!restaurant_id || !subject || !html_body || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: restaurant_id, subject, html_body, recipients" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Fetch email connection for this restaurant
    const { data: conn, error: connError } = await supabase
      .from("email_connections")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .single()

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ error: "No Gmail connection found for this restaurant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let accessToken = conn.access_token

    // Refresh token if expired (with 60s buffer)
    const expiry = conn.token_expiry ? new Date(conn.token_expiry).getTime() : 0
    if (Date.now() + 60000 > expiry) {
      const refreshed = await refreshAccessToken(conn.refresh_token)
      if (!refreshed.access_token) {
        return new Response(
          JSON.stringify({ error: "Failed to refresh access token — please reconnect Gmail" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      accessToken = refreshed.access_token
      // Update token in DB
      await supabase.from("email_connections").update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq("restaurant_id", restaurant_id)
    }

    // Send one email per recipient
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const recipient of recipients) {
      const result = await sendGmailMessage(accessToken, conn.email, recipient, subject, html_body)
      if (result.ok) {
        sent++
      } else {
        failed++
        errors.push(`${recipient}: ${result.error}`)
      }
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
