import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { categorizeSkill, SKILL_CATEGORIES, type YouTubeChannel } from "@/lib/youtube-pipeline";

interface AddChannelDialogProps {
  onChannelAdded: (channel: YouTubeChannel) => void;
}

export const AddChannelDialog = ({ onChannelAdded }: AddChannelDialogProps) => {
  const [open, setOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelHandle, setChannelHandle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    const cat = selectedCategory || categorizeSkill(channelName, channelHandle);
    const newChan: YouTubeChannel = {
      id: crypto.randomUUID(),
      name: channelName.trim(),
      handle: channelHandle.trim().startsWith("@") ? channelHandle.trim() : channelHandle ? `@${channelHandle.trim()}` : undefined,
      category: cat,
      addedAt: new Date().toISOString(),
      dailyGoal: 1,
    };

    onChannelAdded(newChan);
    setChannelName("");
    setChannelHandle("");
    setSelectedCategory("");
    setOpen(false);
    toast.success(`Kanal "${newChan.name}" hinzugefügt (${cat})!`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 border-dashed">
          <Plus className="h-3.5 w-3.5" /> Kanal abonnieren
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen YouTube-Fokuskanal hinzufügen</DialogTitle>
          <DialogDescription>
            Abonniere Kanäle für gezieltes Lernen ohne Ablenkung und Shorts-Strudel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="chan-name">Kanalname *</Label>
            <Input
              id="chan-name"
              placeholder="z. B. Fireship, Lex Fridman, Theo - t3.gg"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chan-handle">Handle oder URL (optional)</Label>
            <Input
              id="chan-handle"
              placeholder="@fireship_dev oder URL"
              value={channelHandle}
              onChange={(e) => setChannelHandle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Kategorie (optional, sonst KI-Auto-Klassifizierung)</Label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Automatisch erkennen</option>
              {SKILL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!channelName.trim()}>
              Kanal speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
