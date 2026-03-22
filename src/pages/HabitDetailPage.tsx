import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Flame, Trophy } from "lucide-react";

interface HabitStage {
  goal: string;
  advanceAfterDays: number | null;
  isFinal: boolean;
}

interface HabitRow {
  id: string;
  name: string;
  current_stage: number;
  streak: number;
  habit_stages: HabitStage[];
  created_at: string;
}

interface LogRow {
  date: string;
  completed: boolean;
  notes: string | null;
}

// ── Calendar heatmap ─────────────────────────────────────────────────────────

const CalendarHeatmap = ({ logs }: { logs: LogRow[] }) => {
  const logMap = new Map(logs.map((l) => [l.date, l.completed]));

  // Build last 12 weeks (84 days), Sunday-anchored
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Find the most recent Sunday
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - today.getDay() - 7 * 11); // go back 11 more weeks

  const weeks: (string | null)[][] = [];
  for (let w = 0; w < 12; w++) {
    const week: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + w * 7 + d);
      const dateStr = date.toISOString().split("T")[0];
      week.push(dateStr > todayStr ? null : dateStr);
    }
    weeks.push(week);
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="flex gap-1">
        {/* Day labels column */}
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((l, i) => (
            <span key={i} className="text-[9px] text-muted-foreground font-body h-4 w-3 flex items-center">
              {i % 2 === 1 ? l : ""}
            </span>
          ))}
        </div>
        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((dateStr, di) => {
              if (dateStr === null) {
                return <div key={di} className="h-4 w-4 rounded-sm bg-muted/20" />;
              }
              const completed = logMap.get(dateStr);
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={di}
                  title={dateStr}
                  className={`h-4 w-4 rounded-sm transition-colors ${
                    completed
                      ? "bg-primary"
                      : dateStr
                      ? "bg-muted"
                      : "bg-transparent"
                  } ${isToday ? "ring-1 ring-primary ring-offset-1" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="h-3 w-3 rounded-sm bg-muted" />
        <span className="text-[10px] text-muted-foreground font-body">Missed</span>
        <div className="h-3 w-3 rounded-sm bg-primary ml-2" />
        <span className="text-[10px] text-muted-foreground font-body">Completed</span>
      </div>
    </div>
  );
};

// ── Habit detail view ─────────────────────────────────────────────────────────

const HabitDetail = ({ habitId }: { habitId: string }) => {
  const navigate = useNavigate();
  const [habit, setHabit] = useState<HabitRow | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [{ data: habitData }, { data: logData }] = await Promise.all([
        supabase
          .from("habits")
          .select("*")
          .eq("id", habitId)
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("habit_logs")
          .select("date, completed, notes")
          .eq("habit_id", habitId)
          .eq("user_id", session.user.id)
          .order("date", { ascending: false })
          .limit(365),
      ]);

      if (!habitData) { navigate("/history"); return; }
      setHabit(habitData as unknown as HabitRow);

      const logsTyped = (logData ?? []) as LogRow[];
      setLogs(logsTyped);

      // Calculate best streak from logs
      const sorted = [...logsTyped].sort((a, b) => a.date.localeCompare(b.date));
      let best = 0, cur = 0;
      for (let i = 0; i < sorted.length; i++) {
        if (!sorted[i].completed) { cur = 0; continue; }
        if (i === 0) { cur = 1; }
        else {
          const prev = new Date(sorted[i - 1].date);
          const curr = new Date(sorted[i].date);
          prev.setDate(prev.getDate() + 1);
          cur = prev.toISOString().split("T")[0] === sorted[i].date ? cur + 1 : 1;
        }
        if (cur > best) best = cur;
      }
      setBestStreak(best);
      setLoading(false);
    };
    load();
  }, [habitId, navigate]);

  if (loading) return <p className="font-body text-muted-foreground py-10 text-center">Loading…</p>;
  if (!habit) return null;

  const stage = habit.habit_stages?.[habit.current_stage];
  const isFinal = stage?.isFinal ?? false;
  const advDays = stage?.advanceAfterDays ?? 5;
  const pct = isFinal ? 100 : Math.min(100, Math.round((habit.streak / advDays) * 100));

  const recentNotes = logs.filter((l) => l.completed && l.notes).slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back + title */}
      <div>
        <button
          onClick={() => navigate("/history")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-body mb-3 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> All habits
        </button>
        <h1 className="text-2xl font-heading font-bold text-foreground">{habit.name}</h1>
        {stage && (
          <p className="text-sm text-muted-foreground font-body mt-1">
            Stage {habit.current_stage + 1} · {stage.goal}
          </p>
        )}
      </div>

      {/* Streak stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-warm">
          <CardContent className="p-4 flex items-center gap-3">
            <Flame className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{habit.streak}</p>
              <p className="text-xs text-muted-foreground font-body">Current streak</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-warm">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{bestStreak}</p>
              <p className="text-xs text-muted-foreground font-body">Best streak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress toward next stage */}
      {!isFinal && (
        <Card className="shadow-warm">
          <CardContent className="p-4">
            <p className="text-sm font-body font-medium text-foreground mb-2">
              Progress to Stage {habit.current_stage + 2}
            </p>
            <div className="relative mb-1.5">
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div
                className="absolute top-0 left-0 h-2.5 rounded-full opacity-40 blur-sm bg-primary pointer-events-none"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground font-body">
              {Math.min(habit.streak, advDays)} of {advDays} days — {pct}%
            </p>
          </CardContent>
        </Card>
      )}
      {isFinal && (
        <Card className="shadow-warm">
          <CardContent className="p-4">
            <p className="text-sm font-body text-muted-foreground italic">
              You've mastered this habit. Keep the streak going! 🏆
            </p>
          </CardContent>
        </Card>
      )}

      {/* Calendar heatmap */}
      <Card className="shadow-warm">
        <CardContent className="p-4">
          <p className="text-sm font-body font-medium text-foreground mb-3">Last 12 weeks</p>
          <CalendarHeatmap logs={logs} />
        </CardContent>
      </Card>

      {/* Stage progression */}
      <Card className="shadow-warm">
        <CardContent className="p-4">
          <p className="text-sm font-body font-medium text-foreground mb-3">Stages</p>
          <div className="space-y-2">
            {habit.habit_stages.map((s, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  i === habit.current_stage ? "bg-primary/10 border border-primary/20" : "bg-muted/40"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-body font-bold ${
                    i < habit.current_stage
                      ? "bg-primary text-primary-foreground"
                      : i === habit.current_stage
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < habit.current_stage ? "✓" : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-body ${i <= habit.current_stage ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.goal || <span className="italic">No goal set</span>}
                  </p>
                  {!s.isFinal && s.advanceAfterDays && (
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      Advance after {s.advanceAfterDays} days
                    </p>
                  )}
                  {s.isFinal && (
                    <p className="text-xs text-muted-foreground font-body mt-0.5 italic">Final stage</p>
                  )}
                </div>
                {i === habit.current_stage && (
                  <span className="text-xs font-body text-primary font-medium whitespace-nowrap">Current</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent call notes */}
      {recentNotes.length > 0 && (
        <Card className="shadow-warm">
          <CardContent className="p-4">
            <p className="text-sm font-body font-medium text-foreground mb-3">Recent call notes</p>
            <div className="space-y-3">
              {recentNotes.map((l, i) => (
                <div key={i} className="text-sm font-body text-muted-foreground border-l-2 border-primary/30 pl-3">
                  <p className="text-xs text-muted-foreground/70 mb-0.5">{l.date}</p>
                  <p>{l.notes}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ── Habit history list ────────────────────────────────────────────────────────

const HistoryList = () => {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("archived", false)
        .order("created_at", { ascending: true });
      setHabits((data as unknown as HabitRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="font-body text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Habit History</h1>
      {habits.length === 0 ? (
        <p className="text-muted-foreground font-body">
          No habits yet.{" "}
          <Link to="/" className="text-primary underline">Add one on the dashboard.</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {habits.map((h) => {
            const stage = h.habit_stages?.[h.current_stage];
            return (
              <button
                key={h.id}
                onClick={() => navigate(`/habit/${h.id}`)}
                className="w-full text-left"
              >
                <Card className="shadow-warm hover:border-primary/40 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-heading font-semibold text-foreground">{h.name}</p>
                      {stage && (
                        <p className="text-xs text-muted-foreground font-body mt-0.5">
                          Stage {h.current_stage + 1} · {stage.goal}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-primary font-body text-sm font-medium">
                      <Flame className="h-4 w-4" />
                      {h.streak}
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Page router ───────────────────────────────────────────────────────────────

const HabitDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  return id ? <HabitDetail habitId={id} /> : <HistoryList />;
};

export default HabitDetailPage;
