import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import HabitCard from "@/components/HabitCard";
import AddHabitForm from "@/components/AddHabitForm";
import { supabase } from "@/integrations/supabase/client";

// Shape expected by HabitCard
interface HabitCardData {
  id: string;
  name: string;
  goalText: string;
  stageLabel: string;
  streak: number;
  progressPercent: number;
  progressLabel: string;
  isFinal: boolean;
  loggedToday: boolean;
  weekDays: (boolean | null)[];
}

// Shape of a stage in habit_stages jsonb
interface HabitStage {
  goal: string;
  advanceAfterDays: number | null;
  isFinal?: boolean;
}

const TODAY = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

// Build the 7-element weekDays array (Mon–Sun of current week)
function buildWeekDays(logs: { date: string; completed: boolean }[]): (boolean | null)[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat
  // Shift so week starts on Monday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    if (dateStr > TODAY) return null; // future
    const log = logs.find((l) => l.date === dateStr);
    return log ? log.completed : false;
  });
}

function toCardData(
  habit: {
    id: string;
    name: string;
    current_stage: number;
    streak: number;
    habit_stages: unknown;
  },
  logs: { date: string; completed: boolean }[]
): HabitCardData {
  const stages = (habit.habit_stages as HabitStage[]) ?? [];
  const stageIndex = Math.min(habit.current_stage, stages.length - 1);
  const stage = stages[stageIndex] ?? { goal: "", advanceAfterDays: null };
  const isFinal = !!stage.isFinal || stageIndex === stages.length - 1;

  const loggedToday = logs.some((l) => l.date === TODAY && l.completed);

  // Progress within current stage
  const advanceDays = stage.advanceAfterDays ?? null;
  // Count completed logs since stage started (approximate: last N days)
  const recentLogs = logs.filter((l) => l.completed).length;
  const progressPercent =
    advanceDays != null ? Math.min(100, Math.round((recentLogs / advanceDays) * 100)) : 100;
  const progressLabel = isFinal
    ? "You've mastered this level! Keep it up."
    : `${recentLogs} of ${advanceDays} days — ${progressPercent}% to Stage ${stageIndex + 2}`;

  return {
    id: habit.id,
    name: habit.name,
    goalText: `Today: ${stage.goal}`,
    stageLabel: `Stage ${stageIndex + 1} · ${stage.goal}`,
    streak: habit.streak,
    progressPercent,
    progressLabel,
    isFinal,
    loggedToday,
    weekDays: buildWeekDays(logs),
  };
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<HabitCardData[]>([]);
  const [displayName, setDisplayName] = useState("there");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Load profile for display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    if (profile?.display_name) setDisplayName(profile.display_name);

    // Load active habits
    const { data: habits } = await supabase
      .from("habits")
      .select("id, name, current_stage, streak, habit_stages")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true });

    if (!habits || habits.length === 0) { setLoading(false); return; }

    // Load habit_logs for this week for all habits
    const habitIds = habits.map((h) => h.id);
    const monday = (() => {
      const d = new Date();
      const offset = d.getDay() === 0 ? -6 : 1 - d.getDay();
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    })();

    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id, date, completed")
      .in("habit_id", habitIds)
      .gte("date", monday)
      .lte("date", TODAY);

    const logsByHabit: Record<string, { date: string; completed: boolean }[]> = {};
    for (const log of logs ?? []) {
      if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = [];
      logsByHabit[log.habit_id].push({ date: log.date, completed: log.completed });
    }

    setCards(habits.map((h) => toCardData(h, logsByHabit[h.id] ?? [])));
    setLoading(false);
  };

  const handleLog = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert a completed log for today (ignore duplicate errors)
    await supabase.from("habit_logs").upsert(
      { habit_id: id, user_id: user.id, date: TODAY, completed: true },
      { onConflict: "habit_id,date" }
    );

    // Optimistically mark as logged in UI
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, loggedToday: true } : c))
    );
  };

  const completedToday = cards.filter((c) => c.loggedToday).length;
  const progressPercent = cards.length > 0 ? (completedToday / cards.length) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Greeting */}
      <h1 className="text-2xl font-heading font-bold text-foreground mb-1">
        {getGreeting()}, {displayName} 👋
      </h1>
      <p className="text-muted-foreground font-body text-sm mb-6">
        {completedToday} of {cards.length} habits done today
      </p>

      {/* Daily progress */}
      <Progress value={progressPercent} className="h-3 mb-8" />

      {/* Habit cards */}
      {loading ? (
        <p className="font-body text-muted-foreground text-center py-12">Loading habits…</p>
      ) : cards.length === 0 ? (
        <p className="font-body text-muted-foreground text-center py-12">
          No habits yet — add one below.
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {cards.map((card) => (
            <HabitCard key={card.id} habit={card} onLog={handleLog} />
          ))}
        </div>
      )}

      {/* Add habit */}
      {showAddForm ? (
        <AddHabitForm onClose={() => { setShowAddForm(false); loadDashboard(); }} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors font-body"
        >
          <Plus className="h-4 w-4" />
          Add a new habit
        </button>
      )}

      {/* Nova CTA */}
      <Button
        className="w-full h-14 mt-8 text-base font-body animate-pulse-soft"
        onClick={() => navigate("/calling")}
      >
        📞 Call me now — Nova is ready
      </Button>
    </div>
  );
};

export default DashboardPage;
