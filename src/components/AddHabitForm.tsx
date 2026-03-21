import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface Stage {
  goal: string;
  advanceAfterDays: number;
  isFinal: boolean;
}

interface AddHabitFormProps {
  onClose: () => void;
}

const AddHabitForm = ({ onClose }: AddHabitFormProps) => {
  const [name, setName] = useState("");
  const [stages, setStages] = useState<Stage[]>([
    { goal: "", advanceAfterDays: 5, isFinal: false },
  ]);
  const [startingStage, setStartingStage] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState(false);
  const addStage = () => {
    setStages([...stages, { goal: "", advanceAfterDays: 5, isFinal: false }]);
  };

  const updateStage = (index: number, updates: Partial<Stage>) => {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const removeStage = (index: number) => {
    if (stages.length > 1) {
      setStages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Habit name cannot be empty");
    if (stages.length === 0) errs.push("At least one stage required");
    stages.forEach((s, i) => {
      if (!s.isFinal && s.advanceAfterDays <= 0)
        errs.push(`Stage ${i + 1}: days to advance must be > 0`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveError(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("habits").insert({
      user_id: session.user.id,
      name: name.trim(),
      habit_stages: stages.map((s) => ({
        goal: s.goal,
        advanceAfterDays: s.isFinal ? null : s.advanceAfterDays,
        isFinal: s.isFinal,
      })),
      current_stage: startingStage,
      streak: 0,
    });

    if (error) {
      setSaveError(true);
      return;
    }

    onClose();
  };

  return (
    <Card className="shadow-warm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-semibold">New Habit</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Input
          placeholder="e.g. Meditation, Cold shower, Journaling"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-body"
        />

        <div className="space-y-3">
          <Label className="font-body text-sm font-medium">Stages</Label>
          {stages.map((stage, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-body font-medium text-muted-foreground">
                  Stage {i + 1}
                </span>
                {stages.length > 1 && (
                  <button
                    onClick={() => removeStage(i)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Input
                placeholder="e.g. 5 minutes of meditation"
                value={stage.goal}
                onChange={(e) => updateStage(i, { goal: e.target.value })}
                className="font-body text-sm"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={stage.isFinal}
                    onCheckedChange={(checked) =>
                      updateStage(i, { isFinal: checked })
                    }
                  />
                  <span className="text-xs font-body text-muted-foreground">
                    Final stage
                  </span>
                </div>
                {!stage.isFinal && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-body text-muted-foreground">
                      Advance after
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={stage.advanceAfterDays}
                      onChange={(e) =>
                        updateStage(i, {
                          advanceAfterDays: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-16 h-8 text-center text-sm font-body"
                    />
                    <span className="text-xs font-body text-muted-foreground">
                      days
                    </span>
                  </div>
                )}
              </div>
              {stage.isFinal && (
                <p className="text-xs text-muted-foreground font-body italic">
                  Final stage — streak tracked, no advancement
                </p>
              )}
            </div>
          ))}
          <button
            onClick={addStage}
            className="flex items-center gap-1 text-sm text-primary font-body font-medium hover:underline"
          >
            <Plus className="h-3 w-3" /> Add another stage
          </button>
        </div>

        {stages.length > 1 && (
          <div className="space-y-2">
            <Label className="font-body text-sm font-medium">Starting stage</Label>
            <Select
              value={String(startingStage)}
              onValueChange={(v) => setStartingStage(parseInt(v))}
            >
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((_, i) => (
                  <SelectItem key={i} value={String(i)} className="font-body">
                    Stage {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-accent font-body">
                {err}
              </p>
            ))}
          </div>
        )}

        {saveError && (
          <p className="text-xs font-body" style={{ color: "#D4A843" }}>
            Couldn't save your habit — please try again.
          </p>
        )}

        <Button onClick={handleSave} className="w-full h-11 font-body">
          Save Habit
        </Button>
      </CardContent>
    </Card>
  );
};

export default AddHabitForm;
