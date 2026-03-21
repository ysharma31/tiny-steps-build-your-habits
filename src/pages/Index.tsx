import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import HabitCard from "@/components/HabitCard";
import AddHabitForm from "@/components/AddHabitForm";

// Temporary mock data — will be replaced with Supabase
const mockHabits = [
  {
    id: "1",
    name: "Morning Workout",
    stageLabel: "Stage 1 · 15 min walk",
    streak: 5,
    progressPercent: 60,
    progressLabel: "3 of 5 days — 60% to Stage 2",
    isFinal: false,
    loggedToday: false,
    weekDays: [true, true, false, true, true, false, null] as (boolean | null)[],
  },
  {
    id: "2",
    name: "Reading",
    stageLabel: "Stage 2 · 20 pages",
    streak: 12,
    progressPercent: 100,
    progressLabel: "You've mastered this level! Keep it up.",
    isFinal: true,
    loggedToday: true,
    weekDays: [true, true, true, true, true, true, null] as (boolean | null)[],
  },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const DashboardPage = () => {
  const [habits, setHabits] = useState(mockHabits);
  const [showAddForm, setShowAddForm] = useState(false);
  const name = "Yoshita"; // TODO: from profile

  const completedToday = habits.filter((h) => h.loggedToday).length;
  const progressPercent = habits.length > 0 ? (completedToday / habits.length) * 100 : 0;

  const handleLog = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, loggedToday: true } : h))
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Greeting */}
      <h1 className="text-2xl font-heading font-bold text-foreground mb-1">
        {getGreeting()}, {name} 👋
      </h1>
      <p className="text-muted-foreground font-body text-sm mb-6">
        {completedToday} of {habits.length} habits done today
      </p>

      {/* Daily progress */}
      <Progress value={progressPercent} className="h-3 mb-8" />

      {/* Habit cards */}
      <div className="space-y-4 mb-6">
        {habits.map((habit) => (
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
        onClick={() => {/* TODO: navigate to calling */}}
      >
        📞 Call me now — Nova is ready
      </Button>
    </div>
  );
};

export default DashboardPage;
