import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPECTED_API_KEY = Deno.env.get("CHECK_HABITS_API_KEY") || "";

serve(async (req) => {
  // Auth check
  const apiKey = req.headers.get("X-Api-Key");
  if (!EXPECTED_API_KEY || apiKey !== EXPECTED_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let date: string;
  let userId: string;
  try {
    const body = await req.json();
    date = body.date;
    userId = body.userId;
    if (!date || !userId) throw new Error("Missing date or userId");
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

  // Fetch all active habits for this user
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("name");

  if (habitsError) {
    return new Response(JSON.stringify({ error: habitsError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const allHabits = habits || [];

  // Fetch logged habits for this date
  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("habit_id, completed")
    .eq("user_id", userId)
    .eq("date", date);

  if (logsError) {
    return new Response(JSON.stringify({ error: logsError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build set of habit_ids that were logged as completed
  const completedIds = new Set(
    (logs || []).filter((l) => l.completed).map((l) => l.habit_id)
  );

  const unloggedHabits = allHabits
    .filter((h) => !completedIds.has(h.id))
    .map((h) => h.name);

  const hasLoggedAll = unloggedHabits.length === 0;

  let message = "";
  if (!hasLoggedAll) {
    if (unloggedHabits.length === allHabits.length) {
      message = `You haven't logged any habits today! Open the app to track: ${unloggedHabits.join(", ")}. 📱`;
    } else {
      message = `You haven't logged: ${unloggedHabits.join(", ")}. Open the app to track your progress! 📱`;
    }
  }

  return new Response(
    JSON.stringify({ hasLoggedAll, unloggedHabits, message }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
