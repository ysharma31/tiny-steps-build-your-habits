import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPECTED_API_KEY = "iamhabitualiamspiritual2026";

serve(async (req) => {
  const apiKey = req.headers.get("X-Api-Key");
  if (apiKey !== EXPECTED_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let userId: string;
  let date: string;
  let habits: Array<{
    habitId?: string;
    habit_id?: string;
    completed: boolean;
    notes?: string;
  }>;

  try {
    const body = await req.json();
    userId = body.userId;
    date = body.date;
    habits = body.habits;
    if (!userId || !date || !Array.isArray(habits)) {
      throw new Error("Missing userId, date, or habits");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Calculate yesterday's date string
  const dateObj = new Date(date);
  const yesterday = new Date(dateObj);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const results: Array<{
    habitId: string;
    logged: boolean;
    streak: number;
    error?: string;
  }> = [];

  for (const habit of habits) {
    try {
      const habitId = habit.habitId || habit.habit_id || "";
      const { completed, notes = "" } = habit;
      if (!habitId) throw new Error("Missing habitId");

      // Insert or upsert the habit log for this date
      const { error: logError } = await supabase
        .from("habit_logs")
        .upsert(
          {
            habit_id: habitId,
            user_id: userId,
            date,
            completed,
            notes,
          },
          { onConflict: "habit_id,user_id,date" }
        );

      if (logError) throw logError;

      let newStreak = 0;

      if (completed) {
        // Check if yesterday was completed
        const { data: yesterdayLog } = await supabase
          .from("habit_logs")
          .select("completed")
          .eq("habit_id", habitId)
          .eq("user_id", userId)
          .eq("date", yesterdayStr)
          .maybeSingle();

        if (yesterdayLog?.completed) {
          // Get current streak and increment
          const { data: currentHabit } = await supabase
            .from("habits")
            .select("streak")
            .eq("id", habitId)
            .eq("user_id", userId)
            .maybeSingle();

          newStreak = (currentHabit?.streak || 0) + 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 0;
      }

      // Update streak on habits table
      const { error: updateError } = await supabase
        .from("habits")
        .update({ streak: newStreak })
        .eq("id", habitId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      results.push({ habitId, logged: true, streak: newStreak });
    } catch (err) {
      results.push({
        habitId: habit.habitId || habit.habit_id || "",
        logged: false,
        streak: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return new Response(
    JSON.stringify({ results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
