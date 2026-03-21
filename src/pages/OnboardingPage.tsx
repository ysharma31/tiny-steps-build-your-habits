import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const predefinedHabits = [
  { id: "workout", name: "Workout", emoji: "🏃" },
  { id: "reading", name: "Reading", emoji: "📚" },
  { id: "screen-time", name: "Screen Time", emoji: "📵" },
  { id: "singing", name: "Singing Practice", emoji: "🎵" },
  { id: "ai-tools", name: "AI Tools", emoji: "🤖" },
];

const OnboardingPage = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);

  const toggleHabit = (id: string) => {
    setSelectedHabits((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {step === 1 && (
          <div className="text-center">
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Start tiny. Change everything.
            </h1>
            <p className="text-muted-foreground font-body mb-8">
              Nova will call you here
            </p>
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mb-6 h-12 text-center text-lg font-body"
            />
            <Button
              onClick={() => setStep(2)}
              disabled={!phone.trim()}
              className="w-full h-12 font-body text-base"
            >
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground text-center mb-2">
              Which habits are you building?
            </h2>
            <p className="text-muted-foreground font-body text-center mb-6">
              Pick the ones that matter to you
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {predefinedHabits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all font-body ${
                    selectedHabits.includes(habit.id)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="text-3xl">{habit.emoji}</span>
                  <span className="text-sm font-medium">{habit.name}</span>
                </button>
              ))}
            </div>
            <Button
              onClick={() => {/* TODO: save and navigate */}}
              disabled={selectedHabits.length === 0}
              className="w-full h-12 font-body text-base"
            >
              Let's go 🌱
            </Button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {[1, 2].map((s) => (
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
