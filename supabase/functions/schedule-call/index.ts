import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASSISTANT_ID = "253ec8ef-4702-4bfd-b433-5f7f1a4718ec";
const NOVA_PHONE = "+15096925293";

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawPhone = body.phone_number;
    if (!rawPhone) {
      return new Response(
        JSON.stringify({ error: "phone_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPhone = toE164(rawPhone);
    const scheduledAt = body.scheduled_at ?? new Date(Date.now() + 2 * 60 * 1000).toISOString();
    console.log(`Scheduling call: raw=${rawPhone} e164=${userPhone} at=${scheduledAt}`);

    const CLAWDTALK_API_KEY = Deno.env.get("CLAWDTALK_API_KEY");
    if (!CLAWDTALK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CLAWDTALK_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(
      `https://clawdtalk.com/v1/assistants/${ASSISTANT_ID}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLAWDTALK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "call",
          to: userPhone,
          from: NOVA_PHONE,
          scheduled_at: scheduledAt,
        }),
      }
    );

    const responseText = await res.text();
    console.log(`ClawdTalk response ${res.status}: ${responseText}`);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `ClawdTalk error ${res.status}: ${responseText}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(responseText);
    const eventId = data.id || data.event_id || data.eventId || data.event?.id || "";
    console.log(`Extracted event_id: ${eventId} from keys: ${Object.keys(data).join(", ")} raw: ${responseText}`);

    return new Response(
      JSON.stringify({ event_id: eventId, _debug_keys: Object.keys(data), _debug_raw: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("schedule-call error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
