import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const mockParsedHabits = [
  { id: "1", name: "Morning Workout", goal: "15 min walk", aiSuggested: true, confidence: "high", notes: "You mentioned doing a full walk today." },
  { id: "2", name: "Reading", goal: "20 pages", aiSuggested: false, confidence: "low", notes: "Nova wasn't sure — did you do this?" },
];

const PostCallPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, boolean>>(
    Object.fromEntries(mockParsedHabits.map((h) => [h.id, h.aiSuggested]))
  );

  const toggle = (id: string, value: boolean) => {
    setSelections((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
        Here's what Nova heard today
      </h1>

      {/* Nova's summary */}
      <Card className="shadow-warm mb-6 border-l-4 border-l-primary">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-body mb-1">
            Nova's notes from your call
          </p>
          <p className="text-sm font-body italic text-foreground">
            "Great energy today! You talked about completing your walk and wanting to get back into reading tonight."
          </p>
        </CardContent>
      </Card>

      {/* Habit confirmations */}
      <div className="space-y-3 mb-8">
        {mockParsedHabits.map((habit) => (
          <Card key={habit.id} className="shadow-warm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-heading font-semibold">
                    {habit.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-body">
                    Today's goal: {habit.goal}
                  </p>
                </div>
              </div>
              {habit.notes && (
                <p className="text-xs text-muted-foreground font-body italic mb-3">
                  {habit.notes}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(habit.id, true)}
                  className={`flex-1 h-10 rounded-lg font-body text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    selections[habit.id]
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Check className="h-4 w-4" /> Done
                </button>
                <button
                  onClick={() => toggle(habit.id, false)}
                  className={`flex-1 h-10 rounded-lg font-body text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    !selections[habit.id]
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

      <Button
        className="w-full h-12 font-body text-base"
        onClick={() => {
          // TODO: save to Supabase
          navigate("/");
        }}
      >
        Save to my log
      </Button>
    </div>
  );
};

export default PostCallPage;
