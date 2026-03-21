import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const [displayName, setDisplayName] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleHabit = (id: string) => {
    setSelectedHabits((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth", { replace: true });
      return;
    }

    const userId = session.user.id;
    const nameToSave = displayName.trim() || session.user.email?.split("@")[0] || "";

    // Upsert profile (creates if trigger didn't fire, updates if it did)
    await supabase
      .from("profiles")
      .upsert(
        { user_id: userId, phone_number: phone, display_name: nameToSave },
        { onConflict: "user_id" }
      );

    // Get predefined categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .is("user_id", null);

    // Map selected habits to category IDs and insert
    const categoryMap = new Map(
      (categories ?? []).map((c) => [c.name.toLowerCase(), c.id])
    );

    const habitNameMap: Record<string, string> = {
      workout: "Workout",
      reading: "Reading",
      "screen-time": "Screen Time",
      singing: "Singing Practice",
      "ai-tools": "AI Tools",
    };

    const habitsToInsert = selectedHabits.map((habitId) => {
      const name = habitNameMap[habitId] || habitId;
      const categoryId = categoryMap.get(name.toLowerCase()) || null;
      return {
        user_id: userId,
        name,
        category_id: categoryId,
        habit_stages: [{ goal: `Daily ${name.toLowerCase()}`, advanceAfterDays: 5, isFinal: false }],
      };
    });

    if (habitsToInsert.length > 0) {
      await supabase.from("habits").insert(habitsToInsert);
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        {step === 1 && (
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-8">
              Start tiny. Change everything.
            </h1>

            <div className="text-left mb-4">
              <Label
                htmlFor="displayName"
                className="font-body text-sm font-medium text-foreground mb-2 block"
              >
                Nova, your habits coach, is waiting to see you! What should Nova call you?
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder="e.g. Yoshita"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12 text-base font-body"
              />
            </div>

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
              disabled={!displayName.trim() || !phone.trim()}
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
              disabled={selectedHabits.length === 0 || saving}
              className="w-full h-12 font-body text-base bg-primary hover:bg-primary/90"
            >
              {saving ? "Saving…" : "Let's go 🌱"}
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
