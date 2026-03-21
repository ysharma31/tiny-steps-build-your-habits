import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const predefinedHabits = [
  { id: "workout", name: "Workout", emoji: "🏃" },
  { id: "reading", name: "Reading", emoji: "📚" },
  { id: "screen-time", name: "Screen Time", emoji: "📵" },
  { id: "singing", name: "Singing Practice", emoji: "🎵" },
  { id: "ai-tools", name: "AI Tools", emoji: "🤖" },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);

  const toggleHabit = (id: string) => {
    setSelectedHabits((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    // Save to React state (no Supabase yet)
    const onboardingData = { phone, selectedHabits };
    // Store in sessionStorage so dashboard can read it if needed
    sessionStorage.setItem("onboarding", JSON.stringify(onboardingData));
    navigate("/");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#FAF7F2" }}
    >
      <div className="w-full max-w-md">
        {step === 1 && (
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-8">
              Start tiny. Change everything.
            </h1>

            <div className="text-left mb-6">
              <Label
                htmlFor="phone"
                className="font-body text-sm font-medium text-foreground mb-2 block"
              >
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
              onClick={() => setStep(2)}
              disabled={!phone.trim()}
              className="w-full h-12 font-body text-base bg-primary hover:bg-primary/90"
            >
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-2">
              Which habits are you building?
            </h2>
            <p className="font-body text-muted-foreground text-center mb-6">
              Pick the ones that matter to you
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {predefinedHabits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-body ${
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
