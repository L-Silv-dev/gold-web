import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
      },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let userId: string | null = null;
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    userId = data?.user?.id ?? null;
  }
  const ipHeader =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "";
  let ip = ipHeader.split(",")[0].trim();
  if (!ip) {
    const fwd = req.headers.get("forwarded") || "";
    const m = fwd.match(/for="?([^;"]+)"?/i);
    ip = m?.[1] ?? "";
  }
  const userAgent = req.headers.get("user-agent") ?? "";
  const url = new URL(req.url);
  let event = "";
  try {
    const body = await req.json();
    if (body && typeof body.event === "string") event = body.event;
  } catch {}
  const { error } = await supabase
    .from("access_audit_logs")
    .insert({ user_id: userId, ip_address: ip, user_agent: userAgent, path: url.pathname, event });
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
  if (error) {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers });
  }
  return new Response(JSON.stringify({ ok: true }), { headers });
});
