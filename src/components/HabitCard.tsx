import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

const affirmations = [
  "Small steps, big change.",
  "You showed up today.",
  "Nova would be proud.",
  "Every rep counts.",
  "Consistency is everything.",
];

interface HabitProps {
  habit: {
    id: string;
    name: string;
    stageLabel: string;
    streak: number;
    progressPercent: number;
    progressLabel: string;
    isFinal: boolean;
    loggedToday: boolean;
    weekDays: (boolean | null)[];
  };
  onLog: (id: string) => void;
}

const HabitCard = ({ habit, onLog }: HabitProps) => {
  const [showAffirmation, setShowAffirmation] = useState(false);
  const [affirmation, setAffirmation] = useState("");

  const handleLog = () => {
    onLog(habit.id);
    const random = affirmations[Math.floor(Math.random() * affirmations.length)];
    setAffirmation(random);
    setShowAffirmation(true);
  };

  return (
    <Card className="shadow-warm overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground">
              {habit.name}
            </h3>
            <p className="text-xs text-muted-foreground font-body">
              {habit.stageLabel}
            </p>
          </div>
          {habit.streak > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-medium">
              🔥 {habit.streak} day streak
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <Progress value={habit.progressPercent} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground font-body">
            {habit.progressLabel}
          </p>
        </div>

        {/* Week strip */}
        <div className="flex items-center justify-between mb-4 px-2">
          {dayLabels.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-body">
                {label}
              </span>
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                  habit.weekDays[i] === true
                    ? "bg-primary text-primary-foreground"
                    : habit.weekDays[i] === false
                    ? "bg-muted text-muted-foreground"
                    : "border-2 border-border"
                }`}
              >
                {habit.weekDays[i] === true && <Check className="h-3 w-3" />}
              </div>
            </div>
          ))}
        </div>

        {/* Log button */}
        {habit.loggedToday ? (
          <div className="text-center">
            <div className="w-full h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center gap-2 font-body font-medium">
              <Check className="h-5 w-5" /> Logged ✓
            </div>
            {showAffirmation && (
              <p className="text-sm text-muted-foreground font-body italic mt-2">
                {affirmation}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={handleLog}
            className="w-full h-14 rounded-lg bg-primary text-primary-foreground font-body font-medium text-base hover:bg-primary/90 transition-colors"
          >
            Log Today ✓
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default HabitCard;
