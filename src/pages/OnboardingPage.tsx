import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HABITS, { type HabitKey } from "@/lib/habits";

const HABIT_TILES: { id: HabitKey; emoji: string }[] = [
  { id: "workout",    emoji: "🏃" },
  { id: "reading",    emoji: "📚" },
  { id: "screenTime", emoji: "📵" },
  { id: "singing",    emoji: "🎵" },
  { id: "aiTools",    emoji: "🤖" },
];

const TOTAL_STEPS = 3;

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<HabitKey[]>([]);

  const toggleHabit = (id: HabitKey) => {
    setSelectedHabits((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    // Save to React state via sessionStorage — no Supabase yet
    sessionStorage.setItem(
      "onboarding",
      JSON.stringify({ name, phone, selectedHabits })
    );
    navigate("/");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#FAF7F2" }}
    >
      <div className="w-full max-w-md">

        {/* Step 1 — Name */}
        {step === 1 && (
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground text-center mb-8">
              Start tiny. Change everything.
            </h1>
            <div className="flex flex-col gap-1.5 mb-6">
              <Label htmlFor="name" className="font-body text-sm font-medium text-foreground">
                What should Nova call you?
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Your first name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base font-body"
              />
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="w-full h-12 font-body text-base bg-primary hover:bg-primary/90"
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 2 — Phone */}
        {step === 2 && (
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground text-center mb-2">
              Start tiny. Change everything.
            </h1>
            <p className="font-body text-muted-foreground text-center mb-8">
              Hey {name} 👋
            </p>
            <div className="flex flex-col gap-1.5 mb-6">
              <Label htmlFor="phone" className="font-body text-sm font-medium text-foreground">
                Nova will call you here
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-base font-body"
              />
            </div>
            <Button
              onClick={() => setStep(3)}
              disabled={!phone.trim()}
              className="w-full h-12 font-body text-base bg-primary hover:bg-primary/90"
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 3 — Habit selection */}
        {step === 3 && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-2">
              Which habits are you building?
            </h2>
            <p className="font-body text-muted-foreground text-center mb-6">
              Pick the ones that matter to you
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {HABIT_TILES.map(({ id, emoji }) => (
                <button
                  key={id}
                  onClick={() => toggleHabit(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-body ${
                    selectedHabits.includes(id)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-sm font-medium">{HABITS[id].label}</span>
                </button>
              ))}
            </div>
            <Button
              onClick={handleFinish}
              disabled={selectedHabits.length === 0}
              className="w-full h-12 font-body text-base bg-primary hover:bg-primary/90"
            >
              Let's go 🌱
            </Button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors ${
                s === step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default OnboardingPage;
