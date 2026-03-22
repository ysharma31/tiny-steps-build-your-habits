import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import HabitCard from "@/components/HabitCard";
import AddHabitForm from "@/components/AddHabitForm";
import { processHabitProgression, checkAllHabitsProgression, localDateStr } from "@/lib/progression";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HabitRow {
  id: string;
  name: string;
  current_stage: number;
  streak: number;
  habit_stages: { goal: string; advanceAfterDays: number | null; isFinal: boolean }[];
}

interface CelebrationInfo {
  habitId: string;
  habitName: string;
  newStage: number;
  newGoal: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [displayName, setDisplayName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [celebrations, setCelebrations] = useState<CelebrationInfo[]>([]);
  const [weekLogs, setWeekLogs] = useState<{ habit_id: string; date: string; completed: boolean }[]>([]);
  const [weekDates, setWeekDates] = useState<string[]>([]);

  const loadHabits = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const profileName = profile?.display_name?.trim() || "";
    const metadataName =
      typeof session.user.user_metadata?.display_name === "string"
        ? session.user.user_metadata.display_name.trim()
        : "";
    const resolvedDisplayName = profileName || metadataName || session.user.email?.split("@")[0] || "there";
    setDisplayName(resolvedDisplayName);

    if (!profileName && metadataName) {
      await supabase
        .from("profiles")
        .update({ display_name: metadataName })
        .eq("user_id", userId);
    }

    // Load habits
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false);
    const habitsTyped = (habitsData as unknown as HabitRow[]) || [];

    // Run progression check on load (handles regression for missed days)
    await checkAllHabitsProgression(
      userId,
      habitsTyped.map((h) => ({
        id: h.id,
        current_stage: h.current_stage,
        streak: h.streak,
        habit_stages: h.habit_stages,
      }))
    );

    // Re-fetch habits after progression updates
    const { data: updatedHabits } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false);
    setHabits((updatedHabits as unknown as HabitRow[]) || []);

    // Compute current week Mon–Sun
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(localDateStr(d));
    }

    // Load week logs for all habits
    const { data: weekLogs } = await supabase
      .from("habit_logs")
      .select("habit_id, date, completed")
      .eq("user_id", userId)
      .gte("date", weekDates[0])
      .lte("date", weekDates[6]);

    setWeekLogs(weekLogs ?? []);
    setWeekDates(weekDates);

    // Load today's logs
    const today = localDateStr(now);
    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id")
      .eq("user_id", userId)
      .eq("date", today)
      .eq("completed", true);
    setLoggedIds(new Set((logs ?? []).map((l) => l.habit_id)));

    setLoading(false);
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const handleLog = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const today = localDateStr(new Date());
    await supabase.from("habit_logs").upsert(
      { habit_id: id, user_id: session.user.id, date: today, completed: true },
      { onConflict: "habit_id,date" }
    );
    setLoggedIds((prev) => new Set(prev).add(id));

    // Run progression after logging
    const habit = habits.find((h) => h.id === id);
    if (habit) {
      const result = await processHabitProgression(
        id,
        session.user.id,
        habit.current_stage,
        habit.habit_stages
      );

      // Update local state with new streak/stage
      setHabits((prev) =>
        prev.map((h) =>
          h.id === id
            ? { ...h, streak: result.streak, current_stage: result.currentStage }
            : h
        )
      );

      // Show celebration if advanced
      if (result.advanced && result.celebration) {
        setCelebrations((prev) => [
          ...prev,
          {
            habitId: id,
            habitName: habit.name,
            newStage: result.celebration!.newStage,
            newGoal: result.celebration!.newGoal,
          },
        ]);
      }
    }
  };

  const dismissCelebration = (habitId: string) => {
    setCelebrations((prev) => prev.filter((c) => c.habitId !== habitId));
  };

  const completedToday = loggedIds.size;
  const progressPercent = habits.length > 0 ? (completedToday / habits.length) * 100 : 0;

  // Build display data for HabitCard
  const habitCards = habits.map((h) => {
    const stage = h.habit_stages?.[h.current_stage];
    const stageLabel = stage ? `Stage ${h.current_stage + 1} · ${stage.goal}` : "";
    const isFinal = stage?.isFinal ?? false;
    const advDays = stage?.advanceAfterDays ?? 5;
    const pct = isFinal ? 100 : Math.min(100, Math.round((h.streak / advDays) * 100));

    return {
      id: h.id,
      name: h.name,
      goalText: stage ? `Today: ${stage.goal}` : "",
      stageLabel,
      streak: h.streak,
      progressPercent: pct,
      progressLabel: isFinal
        ? "You've mastered this level! Keep it up."
        : `${Math.min(h.streak, advDays)} of ${advDays} days — ${pct}% to Stage ${h.current_stage + 2}`,
      isFinal,
      loggedToday: loggedIds.has(h.id),
      weekDays: weekDates.map((date) => {
        const today = localDateStr(new Date());
        if (date > today) return null; // future
        const log = weekLogs.find((l) => l.habit_id === h.id && l.date === date);
        return log?.completed ?? false;
      }),
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-body text-muted-foreground">Loading habits…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-heading font-bold text-foreground">
          {getGreeting()}, {displayName} 👋
        </h1>
        <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-5 w-5" />
        </Link>
      </div>
      <p className="text-muted-foreground font-body text-sm mb-6">
        {completedToday} of {habits.length} habits done today
      </p>

      {/* Daily progress */}
      <Progress value={progressPercent} className="h-3 mb-8" />

      {/* Celebration banners */}
      {celebrations.map((c) => (
        <Alert
          key={c.habitId}
          className="mb-4 border-primary/30 bg-primary/5 cursor-pointer"
          onClick={() => dismissCelebration(c.habitId)}
        >
          <AlertDescription className="font-body text-sm text-foreground">
            🎉 You've unlocked Stage {c.newStage} for <strong>{c.habitName}</strong>. Your new goal: {c.newGoal}. Nova will tell you all about it on your next call.
          </AlertDescription>
        </Alert>
      ))}

      {/* Habit cards */}
      <div className="space-y-4 mb-6">
        {habitCards.map((habit) => (
          <HabitCard key={habit.id} habit={habit} onLog={handleLog} />
        ))}
      </div>

      {/* Add habit */}
      {showAddForm ? (
        <AddHabitForm onClose={() => { setShowAddForm(false); loadHabits(); }} />
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
