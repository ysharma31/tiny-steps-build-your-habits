import { supabase } from "@/integrations/supabase/client";

interface HabitStage {
  goal: string;
  advanceAfterDays: number | null;
  isFinal: boolean;
}

interface ProgressionResult {
  streak: number;
  currentStage: number;
  advanced: boolean;
  regressed: boolean;
  celebration?: {
    newStage: number;
    newGoal: string;
  };
}

/**
 * Calculate the consecutive completed-day streak for a habit up to today.
 */
async function calculateStreak(habitId: string, userId: string): Promise<number> {
  // Fetch logs ordered by date descending
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("date, completed")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(365);

  if (!logs || logs.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];

    const log = logs.find((l) => l.date === dateStr);
    if (log && log.completed) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Check if the user missed 2 consecutive days (yesterday and day before).
 */
function checkRegression(logs: { date: string; completed: boolean }[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBefore = new Date(today);
  dayBefore.setDate(today.getDate() - 2);

  const yStr = yesterday.toISOString().split("T")[0];
  const dbStr = dayBefore.toISOString().split("T")[0];

  const yLog = logs.find((l) => l.date === yStr);
  const dbLog = logs.find((l) => l.date === dbStr);

  const yMissed = !yLog || !yLog.completed;
  const dbMissed = !dbLog || !dbLog.completed;

  // Also check today wasn't logged (if today is logged, no regression)
  const todayStr = today.toISOString().split("T")[0];
  const todayLog = logs.find((l) => l.date === todayStr);
  const todayLogged = todayLog && todayLog.completed;

  return yMissed && dbMissed && !todayLogged;
}

/**
 * Run full progression logic for a single habit after a log is recorded.
 * Returns the result including whether the user advanced or regressed.
 */
export async function processHabitProgression(
  habitId: string,
  userId: string,
  currentStage: number,
  habitStages: HabitStage[]
): Promise<ProgressionResult> {
  const streak = await calculateStreak(habitId, userId);

  // Fetch recent logs for regression check
  const { data: recentLogs } = await supabase
    .from("habit_logs")
    .select("date, completed")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(7);

  const stage = habitStages[currentStage];
  const isFinal = stage?.isFinal ?? false;
  const advanceAfterDays = stage?.advanceAfterDays ?? null;

  let newStage = currentStage;
  let newStreak = streak;
  let advanced = false;
  let regressed = false;
  let celebration: ProgressionResult["celebration"] = undefined;

  // Check regression: 2 consecutive missed days → drop stage
  if (checkRegression(recentLogs ?? [])) {
    if (currentStage > 0) {
      newStage = currentStage - 1;
      newStreak = 0;
      regressed = true;
    }
  }
  // Check advancement (only if not final and not regressed)
  else if (!isFinal && advanceAfterDays && streak >= advanceAfterDays) {
    const nextStageIndex = currentStage + 1;
    if (nextStageIndex < habitStages.length) {
      newStage = nextStageIndex;
      newStreak = 0;
      advanced = true;
      celebration = {
        newStage: nextStageIndex + 1, // 1-indexed for display
        newGoal: habitStages[nextStageIndex].goal,
      };
    }
  }

  // Update the habit record
  await supabase
    .from("habits")
    .update({ streak: newStreak, current_stage: newStage })
    .eq("id", habitId)
    .eq("user_id", userId);

  return {
    streak: newStreak,
    currentStage: newStage,
    advanced,
    regressed,
    celebration,
  };
}

/**
 * Run progression check for all habits of a user (on dashboard load).
 * Returns a map of habitId → ProgressionResult for any that changed.
 */
export async function checkAllHabitsProgression(
  userId: string,
  habits: { id: string; current_stage: number; habit_stages: HabitStage[] }[]
): Promise<Map<string, ProgressionResult>> {
  const results = new Map<string, ProgressionResult>();

  for (const habit of habits) {
    const result = await processHabitProgression(
      habit.id,
      userId,
      habit.current_stage,
      habit.habit_stages
    );
    // Only track if something changed
    if (result.advanced || result.regressed || result.streak !== habit.current_stage) {
      results.set(habit.id, result);
    }
  }

  return results;
}
