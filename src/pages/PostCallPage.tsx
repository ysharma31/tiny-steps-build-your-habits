import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { processHabitProgression } from "@/lib/progression";

interface ParsedHabit {
  habit_id: string;
  habit_name: string;
  completed: boolean;
  partial: boolean;
  notes: string;
  confidence: "high" | "medium" | "low";
}

interface PostCallData {
  fallback: boolean;
  habits: ParsedHabit[];
  summary: string;
  tomorrows_goals: string;
  mood: string;
}

const PostCallPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PostCallData | null>(null);
  const [selections, setSelections] = useState<Record<string, boolean>>({});
  const [habitStages, setHabitStages] = useState<Record<string, { current_stage: number; habit_stages: any[] }>>({});

  useEffect(() => {
    fetchPostCallData();
  }, []);

  const fetchPostCallData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const response = await supabase.functions.invoke("parse-call-transcript");

      if (response.error) throw new Error(response.error.message);

      const result = response.data as PostCallData;
      setData(result);

      // Pre-select based on AI confidence
      const initialSelections: Record<string, boolean> = {};
      result.habits.forEach((h) => {
        initialSelections[h.habit_id] = h.completed;
      });
      setSelections(initialSelections);

      // Load habit stages for progression
      const { data: habits } = await supabase
        .from("habits")
        .select("id, current_stage, habit_stages")
        .eq("user_id", session.user.id)
        .eq("archived", false);

      if (habits) {
        const stagesMap: Record<string, { current_stage: number; habit_stages: any[] }> = {};
        habits.forEach((h: any) => {
          stagesMap[h.id] = {
            current_stage: h.current_stage,
            habit_stages: h.habit_stages as any[],
          };
        });
        setHabitStages(stagesMap);
      }
    } catch (e) {
      console.error("Post-call fetch error:", e);
      // Load habits manually as fallback
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: habits } = await supabase
          .from("habits")
          .select("id, name, current_stage, habit_stages")
          .eq("user_id", session.user.id)
          .eq("archived", false);

        if (habits) {
          const fallbackHabits: ParsedHabit[] = habits.map((h: any) => ({
            habit_id: h.id,
            habit_name: h.name,
            completed: false,
            partial: false,
            notes: "",
            confidence: "low" as const,
          }));

          setData({
            fallback: true,
            habits: fallbackHabits,
            summary: "",
            tomorrows_goals: "",
            mood: "neutral",
          });

          const initialSelections: Record<string, boolean> = {};
          fallbackHabits.forEach((h) => {
            initialSelections[h.habit_id] = false;
          });
          setSelections(initialSelections);

          const stagesMap: Record<string, { current_stage: number; habit_stages: any[] }> = {};
          habits.forEach((h: any) => {
            stagesMap[h.id] = {
              current_stage: h.current_stage,
              habit_stages: h.habit_stages as any[],
            };
          });
          setHabitStages(stagesMap);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string, value: boolean) => {
    setSelections((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = new Date().toISOString().split("T")[0];

      // Save each habit log
      for (const habit of data.habits) {
        const completed = selections[habit.habit_id] ?? false;

        await supabase.from("habit_logs").upsert(
          {
            habit_id: habit.habit_id,
            user_id: session.user.id,
            date: today,
            completed,
            notes: habit.notes || null,
          },
          { onConflict: "habit_id,date" }
        );

        // Run progression for completed habits
        if (completed && habitStages[habit.habit_id]) {
          const { current_stage, habit_stages } = habitStages[habit.habit_id];
          await processHabitProgression(
            habit.habit_id,
            session.user.id,
            current_stage,
            habit_stages
          );
        }
      }

      navigate("/");
    } catch (e) {
      console.error("Save error:", e);
      setError("Couldn't save your habits — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="animate-pulse-soft">
          <span className="text-4xl mb-4 block">🎧</span>
          <p className="font-heading text-lg font-semibold text-foreground mb-2">
            Nova is reviewing your conversation...
          </p>
          <p className="font-body text-sm text-muted-foreground">
            This usually takes a few seconds
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="font-body text-muted-foreground">Something went wrong. Please try again.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/calling")}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
        Here's what Nova heard today
      </h1>

      {/* Fallback message */}
      {data.fallback && (
        <Card className="shadow-warm mb-6 border-l-4 border-l-accent">
          <CardContent className="p-4">
            <p className="text-sm font-body text-foreground">
              Couldn't reach Nova's notes — just tell us what you did today.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Nova's summary */}
      {!data.fallback && data.summary && (
        <Card className="shadow-warm mb-6 border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-body mb-1">
              Nova's notes from your call
            </p>
            <p className="text-sm font-body italic text-foreground">
              "{data.summary}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Habit confirmations */}
      <div className="space-y-3 mb-8">
        {data.habits.map((habit) => (
          <Card key={habit.habit_id} className="shadow-warm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-heading font-semibold">
                    {habit.habit_name}
                  </h3>
                  {habit.completed && habit.confidence !== "high" && (
                    <p className="text-xs text-accent font-body">
                      Nova wasn't completely sure — confirm?
                    </p>
                  )}
                </div>
              </div>
              {habit.notes && (
                <p className="text-xs text-muted-foreground font-body italic mb-3">
                  {habit.notes}
                </p>
              )}
              {habit.partial && (
                <p className="text-xs text-accent font-body mb-3">
                  ⚡ Partially done
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(habit.habit_id, true)}
                  className={`flex-1 h-10 rounded-lg font-body text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    selections[habit.habit_id]
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Check className="h-4 w-4" /> Done
                </button>
                <button
                  onClick={() => toggle(habit.habit_id, false)}
                  className={`flex-1 h-10 rounded-lg font-body text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    !selections[habit.habit_id]
                      ? "bg-muted text-foreground"
                      : "border border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <X className="h-4 w-4" /> Not today
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="text-sm font-body text-accent mb-4 text-center">{error}</p>
      )}

      <Button
        className="w-full h-12 font-body text-base"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? "Saving..." : "Save to my log"}
      </Button>
    </div>
  );
};

export default PostCallPage;
