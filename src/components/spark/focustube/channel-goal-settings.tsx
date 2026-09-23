import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";
import { toast } from "sonner";

interface ChannelGoalSettingsProps {
  channelId: string;
  channelName: string;
  currentGoal: number;
  onGoalUpdate: (newGoal: number) => void;
}

export function ChannelGoalSettings({
  channelName,
  currentGoal,
  onGoalUpdate,
}: ChannelGoalSettingsProps) {
  const [goal, setGoal] = useState(currentGoal);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onGoalUpdate(goal);
    toast.success(`Tagesziel für ${channelName} auf ${goal} Video${goal > 1 ? "s" : ""}/Tag gesetzt!`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Tagesziel für {channelName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label>Tägliches Video-Ziel</Label>
              <span className="font-semibold text-primary">
                {goal} Video{goal > 1 ? "s" : ""} / Tag
              </span>
            </div>
            <Slider
              value={[goal]}
              onValueChange={(val) => setGoal(val[0] || 1)}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={handleSave}>
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
