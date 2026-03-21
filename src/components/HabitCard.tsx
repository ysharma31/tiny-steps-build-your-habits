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
];

interface HabitProps {
  habit: {
    id: string;
    name: string;
    goalText: string;
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
  const [animating, setAnimating] = useState(false);

  const handleLog = () => {
    setAnimating(true);
    setTimeout(() => {
      onLog(habit.id);
      const random = affirmations[Math.floor(Math.random() * affirmations.length)];
      setAffirmation(random);
      setShowAffirmation(true);
      setAnimating(false);
    }, 400);
  };

  // Determine today's index in the week (0=Mon, 6=Sun)
  const todayDow = new Date().getDay();
  const todayIndex = todayDow === 0 ? 6 : todayDow - 1;

  return (
    <Card className="shadow-warm overflow-hidden rounded-2xl">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-heading font-semibold text-foreground" style={{ fontSize: "18px" }}>
            {habit.name}
          </h3>
          {habit.streak > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-body font-medium whitespace-nowrap">
              🔥 {habit.streak} day streak
            </span>
          )}
        </div>

        {/* Today's goal */}
        <p className="text-sm text-muted-foreground font-body italic mb-4">
          {habit.goalText}
        </p>

        {/* Progress bar with warm glow */}
        <div className="mb-4">
          <div className="relative">
            <Progress value={habit.progressPercent} className="h-2.5 mb-1.5" />
            <div
              className="absolute top-0 left-0 h-2.5 rounded-full opacity-40 blur-sm bg-primary pointer-events-none"
              style={{ width: `${habit.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground font-body">
            {habit.progressLabel}
          </p>
        </div>

        {/* 7-day week strip */}
        <div className="flex items-center justify-between mb-5 px-1">
          {dayLabels.map((label, i) => {
            const val = habit.weekDays[i];
            // If today was just logged, override to show completed
            const isToday = i === todayIndex;
            const effectiveVal = isToday && habit.loggedToday ? true : val;

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-body uppercase">
                  {label}
                </span>
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-body transition-colors ${
                    effectiveVal === true
                      ? "bg-primary text-primary-foreground"
                      : effectiveVal === false
                      ? "bg-[#D3D1C7] text-muted-foreground"
                      : "border-2 border-border"
                  }`}
                >
                  {effectiveVal === true && <Check className="h-3.5 w-3.5" />}
                  {effectiveVal === false && <span className="text-[10px] opacity-60">—</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Log button / Logged state */}
        {habit.loggedToday ? (
          <div className="text-center">
            <div className="w-full h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center gap-2 font-body font-semibold text-base">
              <Check className="h-5 w-5" /> Logged ✓
            </div>
            {showAffirmation && (
              <p className="text-sm text-muted-foreground font-body italic mt-2.5 animate-fade-in">
                {affirmation}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={handleLog}
            disabled={animating}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-base hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {animating ? (
              <Check className="h-5 w-5 animate-scale-in" />
            ) : (
              "Log Today ✓"
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default HabitCard;
