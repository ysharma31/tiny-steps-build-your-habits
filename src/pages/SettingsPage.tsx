import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface HabitStage {
  goal: string;
  advanceAfterDays: number | null;
  isFinal: boolean;
}

interface HabitWithStages {
  id: string;
  name: string;
  current_stage: number;
  habit_stages: HabitStage[];
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [callTime, setCallTime] = useState("21:00");
  const [habits, setHabits] = useState<HabitWithStages[]>([]);
  const [editedStages, setEditedStages] = useState<Record<string, HabitStage[]>>({});
  const [saving, setSaving] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, phone_number, preferred_call_time, notif_browser, notif_sms, notif_inapp")
        .eq("user_id", session.user.id)
        .single();
      if (profile) {
        setDisplayName(profile.display_name || "");
        setPhone(profile.phone_number || "");
        if (profile.preferred_call_time) {
          setCallTime(profile.preferred_call_time.slice(0, 5));
        }
        setBrowserEnabled(profile.notif_browser ?? false);
        setSmsEnabled(profile.notif_sms ?? false);
        setInAppEnabled(profile.notif_inapp ?? false);
      }

      const { data: habitsData } = await supabase
        .from("habits")
        .select("id, name, current_stage, habit_stages")
        .eq("user_id", session.user.id)
        .eq("archived", false);

      const typed = (habitsData as unknown as HabitWithStages[]) || [];
      setHabits(typed);

      const initial: Record<string, HabitStage[]> = {};
      typed.forEach((h) => {
        initial[h.id] = h.habit_stages.map((s) => ({ ...s }));
      });
      setEditedStages(initial);
    };
    load();
  }, []);

  const handleStageChange = (habitId: string, stageIndex: number, value: number) => {
    setEditedStages((prev) => {
      const stages = [...(prev[habitId] || [])];
      stages[stageIndex] = { ...stages[stageIndex], advanceAfterDays: value };
      return { ...prev, [habitId]: stages };
    });
  };

  const handleSaveStages = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    let failed = false;
    for (const habit of habits) {
      const stages = editedStages[habit.id];
      if (!stages) continue;

      const { error } = await supabase
        .from("habits")
        .update({ habit_stages: stages as unknown as any })
        .eq("id", habit.id)
        .eq("user_id", session.user.id)
        .select();

      if (error) failed = true;
    }

    setSaving(false);
    if (failed) {
      toast({ title: "Error", description: "Couldn't save changes — please try again.", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Got it — Nova will adjust your pace." });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const sendSmsReminder = async () => {
    const apiKey = import.meta.env.VITE_CLAWDTALK_API_KEY;
    const assistantId = import.meta.env.VITE_CLAWDTALK_ASSISTANT_ID;
    const scheduledAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const res = await fetch(
      `https://clawdtalk.com/v1/assistants/${assistantId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "sms",
          to: phone,
          from: "+15096925293",
          text_body: `Hey ${displayName}, Nova will check in with you in 15 minutes. How's your day going? 🌿`,
          scheduled_at: scheduledAt,
        }),
      }
    );
    if (res.ok) {
      toast({ title: "SMS scheduled", description: "Nova will text you 15 minutes before your call." });
    } else {
      toast({ title: "Couldn't schedule SMS", description: "Try again in a moment.", variant: "destructive" });
      setSmsEnabled(false);
    }
  };

  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-body transition-colors w-fit">
        <ChevronLeft className="h-4 w-4" /> Return to Dashboard
      </Link>

      <h1 className="text-2xl font-heading font-bold text-foreground">
        Settings
      </h1>

      {/* Profile */}
      <Card className="shadow-warm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-heading font-semibold">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-xl font-heading font-bold text-primary-foreground shrink-0">
              {initial}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Display name"
                className="font-body"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  const { error } = await supabase
                    .from("profiles")
                    .update({ display_name: displayName.trim() || null })
                    .eq("user_id", session.user.id)
                    .select();
                  if (!error) {
                    toast({ title: "Saved", description: "Display name updated." });
                  }
                }}
              />
              <Input
                placeholder="Phone number"
                type="tel"
                className="font-body"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  const { error } = await supabase
                    .from("profiles")
                    .update({ phone_number: phone.trim() || null })
                    .eq("user_id", session.user.id)
                    .select();
                  if (!error) {
                    toast({ title: "Saved", description: "Phone number updated." });
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Habit Stages Editor */}
      {habits.length > 0 && (
        <Card className="shadow-warm">
          <CardContent className="p-5 space-y-5">
            <h2 className="text-lg font-heading font-semibold">Habit Stages</h2>
            <p className="text-xs text-muted-foreground font-body">
              Adjust how many days each stage takes before advancing.
            </p>

            {habits.map((habit) => (
              <div key={habit.id} className="space-y-2">
                <h3 className="text-sm font-heading font-semibold text-foreground">{habit.name}</h3>
                <div className="space-y-1.5 pl-2">
                  {(editedStages[habit.id] || habit.habit_stages).map((stage, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-body text-muted-foreground w-16 shrink-0">
                        Stage {idx + 1}
                      </span>
                      <span className="text-sm font-body text-foreground flex-1 truncate">
                        {stage.goal}
                      </span>
                      {stage.isFinal ? (
                        <span className="text-xs font-body text-muted-foreground italic whitespace-nowrap">
                          Final stage — no advancement
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Input
                            type="number"
                            min={1}
                            className="w-16 h-8 text-sm font-body text-center"
                            value={stage.advanceAfterDays ?? ""}
                            onChange={(e) =>
                              handleStageChange(habit.id, idx, parseInt(e.target.value) || 1)
                            }
                          />
                          <span className="text-xs font-body text-muted-foreground">days</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button
              className="w-full font-body"
              onClick={handleSaveStages}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save stage settings"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Daily check-in */}
      <Card className="shadow-warm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-heading font-semibold">Daily Check-in</h2>
          <div className="flex items-center justify-between">
            <Label className="font-body text-sm">Nova calls me every day at</Label>
            <Input
              type="time"
              value={callTime}
              onChange={async (e) => {
                const newTime = e.target.value;
                setCallTime(newTime);
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const { error } = await supabase
                  .from("profiles")
                  .update({ preferred_call_time: newTime + ":00" })
                  .eq("user_id", session.user.id)
                  .select();
                if (!error) {
                  toast({ title: "Saved", description: "Call time updated." });
                }
              }}
              className="w-32 font-body text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground font-body">
            Nova will call you daily at the selected time
          </p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="shadow-warm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-heading font-semibold">Notifications</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-body text-sm">Browser notifications</Label>
              <Switch
                checked={browserEnabled}
                onCheckedChange={async (checked) => {
                  setBrowserEnabled(checked);
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    const { error } = await supabase
                      .from("profiles")
                      .update({ notif_browser: checked })
                      .eq("user_id", session.user.id)
                      .select();
                    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-body text-sm">SMS reminder from Nova</Label>
              <Switch
                checked={smsEnabled}
                onCheckedChange={async (checked) => {
                  setSmsEnabled(checked);
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    const { error } = await supabase
                      .from("profiles")
                      .update({ notif_sms: checked })
                      .eq("user_id", session.user.id)
                      .select();
                    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
                  }
                  if (checked) sendSmsReminder();
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-body text-sm">In-app reminder</Label>
              <Switch
                checked={inAppEnabled}
                onCheckedChange={async (checked) => {
                  setInAppEnabled(checked);
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    const { error } = await supabase
                      .from("profiles")
                      .update({ notif_inapp: checked })
                      .eq("user_id", session.user.id)
                      .select();
                    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button variant="outline" className="w-full font-body" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
};

export default SettingsPage;
