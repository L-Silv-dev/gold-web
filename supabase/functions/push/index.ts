import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const fcmServerKey = Deno.env.get("FCM_SERVER_KEY") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

type PushBody = {
  targetUserIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

async function getTokens(userIds: string[]) {
  const { data, error } = await supabase
    .from("profiles")
    .select("fcm_token, expo_push_token, id")
    .in("id", userIds);
  if (error) return [];
  const tokens = [];
  for (const row of data ?? []) {
    if (row?.fcm_token) {
      tokens.push(String(row.fcm_token));
    }
    // Ignorar expo_push_token para garantir envio direto pelo app via FCM
  }
  return tokens;
}

async function sendToFcm(tokens: string[], title: string, body: string, data: Record<string, unknown>) {
  if (!fcmServerKey) return { ok: false, status: 500, message: "FCM_SERVER_KEY missing" };
  if (tokens.length === 0) return { ok: true, status: 200, message: "no tokens" };
  const payload: Record<string, unknown> = {
    registration_ids: tokens,
    notification: { title, body, sound: "message" },
    android: {
      notification: {
        channel_id: "message-channel",
        sound: "message",
        priority: "max"
      }
    },
    data: {
      ...data,
      source: "app", // marcação para confirmar origem
    },
    priority: "high"
  };
  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `key=${fcmServerKey}`
    },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, response: json };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  let body: PushBody | null = null;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  if (!body || !Array.isArray(body.targetUserIds) || !body.title || !body.body) {
    return new Response("invalid payload", { status: 400 });
  }
  const tokens = await getTokens(body.targetUserIds);
  const result = await sendToFcm(tokens, body.title, body.body, body.data ?? {});
  const resBody = JSON.stringify({ sent: tokens.length, result });
  return new Response(resBody, { status: result.status, headers: { "Content-Type": "application/json" } });
});
