import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    const { phone_number, scheduled_at } = await req.json();

    const CLAWDTALK_API_KEY = Deno.env.get("CLAWDTALK_API_KEY");
    if (!CLAWDTALK_API_KEY) {
      throw new Error("CLAWDTALK_API_KEY not configured");
    }

    const ASSISTANT_ID = "253ec8ef-4702-4bfd-b433-5f7f1a4718ec";
    const NOVA_PHONE = "+15096925293";

    // Normalize phone to E.164
    const digits = phone_number.replace(/\D/g, "");
    const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

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
          to: e164,
          from: NOVA_PHONE,
          scheduled_at,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ClawdTalk error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("schedule-call error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
