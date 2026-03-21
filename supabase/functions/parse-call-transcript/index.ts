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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's active habits
    const { data: habits } = await supabase
      .from("habits")
      .select("id, name, habit_stages, current_stage")
      .eq("user_id", user.id)
      .eq("archived", false);

    const activeHabits = habits || [];

    // STEP 1: Fetch transcript from ClawdTalk
    const CLAWDTALK_API_KEY = Deno.env.get("CLAWDTALK_API_KEY");
    if (!CLAWDTALK_API_KEY) {
      throw new Error("CLAWDTALK_API_KEY not configured");
    }

    let transcript = "";
    let conversationId = "";
    let clawdtalkFailed = false;

    try {
      // Get latest conversation
      const convRes = await fetch("https://clawdtalk.com/v1/conversations", {
        headers: { Authorization: `Bearer ${CLAWDTALK_API_KEY}` },
      });

      if (!convRes.ok) throw new Error(`ClawdTalk conversations: ${convRes.status}`);

      const convData = await convRes.json();
      const conversations = Array.isArray(convData) ? convData : convData.data || convData.conversations || [];
      
      if (conversations.length === 0) throw new Error("No conversations found");

      conversationId = conversations[0].id || conversations[0].conversation_id;

      // Get messages for that conversation
      const msgRes = await fetch(
        `https://clawdtalk.com/v1/conversations/${conversationId}/messages`,
        { headers: { Authorization: `Bearer ${CLAWDTALK_API_KEY}` } }
      );

      if (!msgRes.ok) throw new Error(`ClawdTalk messages: ${msgRes.status}`);

      const msgData = await msgRes.json();
      const messages = Array.isArray(msgData) ? msgData : msgData.data || msgData.messages || [];

      transcript = messages
        .map((m: any) => `${m.role || m.speaker || "unknown"}: ${m.content || m.text || ""}`)
        .join("\n");

      if (!transcript.trim()) throw new Error("Empty transcript");
    } catch (e) {
      console.error("ClawdTalk fetch failed:", e);
      clawdtalkFailed = true;
    }

    // If ClawdTalk failed, return fallback
    if (clawdtalkFailed) {
      return new Response(
        JSON.stringify({
          fallback: true,
          habits: activeHabits.map((h: any) => ({
            habit_id: h.id,
            habit_name: h.name,
            completed: false,
            partial: false,
            notes: "",
            confidence: "low",
          })),
          summary: "",
          tomorrows_goals: "",
          mood: "neutral",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 2: Parse with Anthropic
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const habitList = activeHabits
      .map((h: any) => {
        const stage = Array.isArray(h.habit_stages) ? h.habit_stages[h.current_stage] : null;
        return `- ${h.name} (id: ${h.id}, current goal: ${stage?.goal || "unknown"})`;
      })
      .join("\n");

    const systemPrompt = `You are a habit tracking assistant. Read this conversation transcript between a user and their habit coach Nova.

The user's active habits are:
${habitList}

Based on the transcript, identify:
1. Which habits the user completed today
2. Any partial completions or context
3. What Nova recommended for tomorrow
4. The user's overall mood and energy level

Return ONLY valid JSON in this exact format, no other text:
{
  "habits": [
    {
      "habit_id": "...",
      "habit_name": "...",
      "completed": true,
      "partial": false,
      "notes": "...",
      "confidence": "high"
    }
  ],
  "tomorrows_goals": "...",
  "mood": "positive",
  "summary": "one sentence summary"
}`;

    let aiResult;
    try {
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: transcript }],
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        throw new Error(`Anthropic API error ${aiRes.status}: ${errText}`);
      }

      const aiData = await aiRes.json();
      const content = aiData.content?.[0]?.text || "";
      
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in AI response");
      
      aiResult = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("AI parsing failed:", e);
      // Fallback
      return new Response(
        JSON.stringify({
          fallback: true,
          habits: activeHabits.map((h: any) => ({
            habit_id: h.id,
            habit_name: h.name,
            completed: false,
            partial: false,
            notes: "",
            confidence: "low",
          })),
          summary: "",
          tomorrows_goals: "",
          mood: "neutral",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Merge AI results with full habit list (ensure all habits appear)
    const aiHabits = aiResult.habits || [];
    const mergedHabits = activeHabits.map((h: any) => {
      const aiHabit = aiHabits.find((a: any) => a.habit_id === h.id);
      return aiHabit || {
        habit_id: h.id,
        habit_name: h.name,
        completed: false,
        partial: false,
        notes: "",
        confidence: "low",
      };
    });

    // Save to pending_confirmations
    await supabase.from("pending_confirmations").insert({
      user_id: user.id,
      conversation_id: conversationId,
      parsed_habits: mergedHabits,
      confirmed: false,
    });

    return new Response(
      JSON.stringify({
        fallback: false,
        habits: mergedHabits,
        summary: aiResult.summary || "",
        tomorrows_goals: aiResult.tomorrows_goals || "",
        mood: aiResult.mood || "neutral",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
