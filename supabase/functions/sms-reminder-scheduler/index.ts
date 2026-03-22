import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read ClawdTalk config from app_config table
    const { data: configRows } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["clawdtalk_api_key", "clawdtalk_assistant_id", "nova_phone_number"]);

    const config: Record<string, string> = {};
    for (const row of configRows ?? []) config[row.key] = row.value;

    const clawdtalkApiKey = Deno.env.get("CLAWDTALK_API_KEY") || config["clawdtalk_api_key"];
    const assistantId = Deno.env.get("CLAWDTALK_ASSISTANT_ID") || config["clawdtalk_assistant_id"];
    const novaPhone = Deno.env.get("NOVA_PHONE_NUMBER") || config["nova_phone_number"] || "+15096925293";

    if (!clawdtalkApiKey || !assistantId) {
      return new Response(JSON.stringify({ error: "Missing ClawdTalk config" }), { status: 500 });
    }

    // Find all users with SMS reminders enabled and a phone number
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, phone_number")
      .eq("notif_sms", true)
      .not("phone_number", "is", null);

    if (error) {
      console.error("DB error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      console.log("No users with SMS reminders enabled.");
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    console.log(`Sending SMS reminders to ${profiles.length} user(s).`);

    const results = [];
    for (const profile of profiles) {
      const name = profile.display_name || "there";
      const userPhone = toE164(profile.phone_number);
      const message = `Hey ${name}! 🌿 Don't forget to log your habits in the app today. Nova's rooting for you!`;

      try {
        const res = await fetch(
          `https://clawdtalk.com/v1/assistants/${assistantId}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${clawdtalkApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              channel: "sms",
              to: userPhone,
              from: novaPhone,
              text_body: message,
              scheduled_at: new Date().toISOString(),
            }),
          }
        );

        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          console.log(`SMS sent to ${name} (${userPhone})`);
          results.push({ user_id: profile.user_id, status: "sent" });
        } else {
          console.error(`Failed for ${name}: ${res.status}`, body);
          results.push({ user_id: profile.user_id, status: "failed", error: body });
        }
      } catch (e) {
        console.error(`Exception for ${name}:`, e);
        results.push({ user_id: profile.user_id, status: "error", error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        sent: results.filter(r => r.status === "sent").length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("SMS scheduler error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
