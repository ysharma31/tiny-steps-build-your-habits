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

export function localDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
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
  const now = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = localDateStr(d);

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
  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const dayBefore = new Date(now);
  dayBefore.setDate(now.getDate() - 2);

  const yStr = localDateStr(yesterday);
  const dbStr = localDateStr(dayBefore);
  const todayStr = localDateStr(now);

  const yLog = logs.find((l) => l.date === yStr);
  const dbLog = logs.find((l) => l.date === dbStr);
  const todayLog = logs.find((l) => l.date === todayStr);

  const yMissed = !yLog || !yLog.completed;
  const dbMissed = !dbLog || !dbLog.completed;
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
    .eq("user_id", userId)
    .select();

  return {
    streak: newStreak,
    currentStage: newStage,
    advanced,
    regressed,
    celebration,
  };
}

/**
 * Run regression check for all habits of a user (on dashboard load).
 * Only writes to the DB if a habit has regressed (2 consecutive missed days).
 * Does NOT recalculate or overwrite streaks for habits that are fine.
 */
export async function checkAllHabitsProgression(
  userId: string,
  habits: { id: string; current_stage: number; streak: number; habit_stages: HabitStage[] }[]
): Promise<Map<string, ProgressionResult>> {
  const results = new Map<string, ProgressionResult>();

  for (const habit of habits) {
    const { data: recentLogs } = await supabase
      .from("habit_logs")
      .select("date, completed")
      .eq("habit_id", habit.id)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7);

    if (!checkRegression(recentLogs ?? [])) continue;
    if (habit.current_stage === 0) continue;

    const newStage = habit.current_stage - 1;
    await supabase
      .from("habits")
      .update({ streak: 0, current_stage: newStage })
      .eq("id", habit.id)
      .eq("user_id", userId)
      .select();

    results.set(habit.id, {
      streak: 0,
      currentStage: newStage,
      advanced: false,
      regressed: true,
    });
  }

  return results;
}
