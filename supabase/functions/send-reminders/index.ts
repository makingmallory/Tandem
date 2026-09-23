import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "";
const cronSecret = Deno.env.get("REMINDER_CRON_SECRET") ?? "";
const pushTitle = Deno.env.get("PUSH_APP_NAME") ?? "Shared home";
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };
type Claim = {
  delivery_id: string; reminder_id: string; occurrence_id: string; user_id: string;
  chore_id: string; chore_name: string; scheduled_date: string; scheduled_for: string;
  offset_value: number; offset_unit: "day" | "week" | "month";
};

function reminderBody(claim: Claim) {
  if (claim.offset_value === 0) return `${claim.chore_name} is due today`;
  const unit = `${claim.offset_unit}${claim.offset_value === 1 ? "" : "s"}`;
  return `${claim.chore_name} is due in ${claim.offset_value} ${unit}`;
}

async function sendToSubscriptions(userId: string, payload: Record<string, string>) {
  const { data, error } = await admin.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (error) throw error;
  let sent = 0;
  for (const subscription of (data ?? []) as Subscription[]) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(payload), { TTL: 300 });
      sent += 1;
    } catch (pushError) {
      const statusCode = (pushError as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }
  return sent;
}

async function processClaim(claim: Claim) {
  const [{ data: reminder }, { data: occurrence }, { data: chore }] = await Promise.all([
    admin.from("chore_reminders").select("enabled").eq("id", claim.reminder_id).maybeSingle(),
    admin.from("chore_occurrences").select("status").eq("id", claim.occurrence_id).maybeSingle(),
    admin.from("chores").select("is_active").eq("id", claim.chore_id).maybeSingle(),
  ]);
  if (!reminder?.enabled || occurrence?.status !== "scheduled" || !chore?.is_active) {
    await admin.rpc("finish_reminder_delivery", {
      p_delivery_id: claim.delivery_id, p_status: "suppressed", p_error_message: "Occurrence no longer needs a reminder",
    });
    return "suppressed";
  }
  const sent = await sendToSubscriptions(claim.user_id, {
    title: pushTitle,
    body: reminderBody(claim),
    url: `/chores/${claim.chore_id}`,
    tag: `reminder-${claim.reminder_id}-${claim.occurrence_id}`,
  });
  await admin.rpc("finish_reminder_delivery", {
    p_delivery_id: claim.delivery_id,
    p_status: sent > 0 ? "sent" : "failed",
    p_error_message: sent > 0 ? null : "No active push subscriptions",
  });
  return sent > 0 ? "sent" : "failed";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json({ error: "Push secrets are not configured" }, 500);
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const body = await request.json().catch(() => ({})) as { mode?: string };

  if (body.mode === "test") {
    const authorization = request.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const sent = await sendToSubscriptions(user.id, {
      title: pushTitle,
      body: "Notifications are working — nice!",
      url: "/settings/notifications",
      tag: `test-${user.id}-${Date.now()}`,
    });
    return sent > 0 ? json({ sent }) : json({ error: "No active subscription" }, 409);
  }

  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) return json({ error: "Unauthorized" }, 401);
  const { data, error } = await admin.rpc("claim_due_reminder_deliveries", { p_now: new Date().toISOString() });
  if (error) return json({ error: error.message }, 500);
  const results = [];
  for (const claim of (data ?? []) as Claim[]) results.push(await processClaim(claim));
  return json({ claimed: results.length, sent: results.filter((result) => result === "sent").length });
});
