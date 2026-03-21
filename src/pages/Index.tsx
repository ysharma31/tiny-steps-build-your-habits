import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import HabitCard from "@/components/HabitCard";
import AddHabitForm from "@/components/AddHabitForm";

interface HabitRow {
  id: string;
  name: string;
  current_stage: number;
  streak: number;
  habit_stages: { goal: string; advanceAfterDays: number | null; isFinal: boolean }[];
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

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .single();
      setDisplayName(profile?.display_name || session.user.email?.split("@")[0] || "");

      // Load habits
      const { data: habitsData } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false);
      setHabits((habitsData as unknown as HabitRow[]) || []);

      // Load today's logs
      const today = new Date().toISOString().split("T")[0];
      const { data: logs } = await supabase
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", userId)
        .eq("date", today)
        .eq("completed", true);
      setLoggedIds(new Set((logs ?? []).map((l) => l.habit_id)));

      setLoading(false);
    };
    load();
  }, []);

  const handleLog = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("habit_logs").upsert(
      { habit_id: id, user_id: session.user.id, date: today, completed: true },
      { onConflict: "habit_id,date" }
    );
    setLoggedIds((prev) => new Set(prev).add(id));
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
      weekDays: [null, null, null, null, null, null, null] as (boolean | null)[],
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
      <h1 className="text-2xl font-heading font-bold text-foreground mb-1">
        {getGreeting()}, {displayName} 👋
      </h1>
      <p className="text-muted-foreground font-body text-sm mb-6">
        {completedToday} of {habits.length} habits done today
      </p>

      {/* Daily progress */}
      <Progress value={progressPercent} className="h-3 mb-8" />

      {/* Habit cards */}
      <div className="space-y-4 mb-6">
        {habitCards.map((habit) => (
          <HabitCard key={habit.id} habit={habit} onLog={handleLog} />
        ))}
      </div>

      {/* Add habit */}
      {showAddForm ? (
        <AddHabitForm onClose={() => setShowAddForm(false)} />
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
