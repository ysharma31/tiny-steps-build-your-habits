import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EXPECTED_API_KEY = "iamhabitualiamspiritual2026";

serve(async (req) => {
  const apiKey = req.headers.get("X-Api-Key");
  if (apiKey !== EXPECTED_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let transcript: string;
  let habits: Array<{ id: string; name: string }>;
  let userId: string;
  let date: string;

  try {
    const body = await req.json();
    transcript = body.transcript;
    habits = body.habits;
    userId = body.userId;
    date = body.date;
    if (!transcript || !Array.isArray(habits) || !userId || !date) {
      throw new Error("Missing transcript, habits, userId, or date");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const habitList = habits
    .map((h) => `- ${h.name} (id: ${h.id})`)
    .join("\n");

  const systemPrompt = `Parse this conversation for habit completions. Return JSON.

The user's active habits are:
${habitList}

For each habit, determine if it was completed based on the conversation.
Default to completed: false if a habit is not mentioned or unclear.

Return ONLY valid JSON in this exact format, no other text:
{
  "habits": [
    {
      "habit_id": "...",
      "habit_name": "...",
      "completed": true,
      "notes": "...",
      "confidence": "high"
    }
  ],
  "summary": "one sentence summary",
  "mood": "positive"
}`;

  let aiResult: {
    habits: Array<{
      habit_id: string;
      habit_name: string;
      completed: boolean;
      notes: string;
      confidence: string;
    }>;
    summary: string;
    mood: string;
  };

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
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

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    aiResult = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("AI parsing failed:", err);
    // Fallback: default all habits to not completed
    return new Response(
      JSON.stringify({
        habits: habits.map((h) => ({
          habit_id: h.id,
          habit_name: h.name,
          completed: false,
          notes: "",
          confidence: "low",
        })),
        summary: "",
        mood: "neutral",
        userId,
        date,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Merge AI results with full habit list — ensure every habit appears,
  // defaulting to completed: false for any not mentioned
  const aiHabits = aiResult.habits || [];
  const mergedHabits = habits.map((h) => {
    const match = aiHabits.find((a) => a.habit_id === h.id);
    return (
      match || {
        habit_id: h.id,
        habit_name: h.name,
        completed: false,
        notes: "",
        confidence: "low",
      }
    );
  });

  return new Response(
    JSON.stringify({
      habits: mergedHabits,
      summary: aiResult.summary || "",
      mood: aiResult.mood || "neutral",
      userId,
      date,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
