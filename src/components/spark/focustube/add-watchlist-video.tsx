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
import { getLocalData, setLocalAndSyncData } from "@/lib/storage-sync";
import { supabase } from "@/integrations/supabase/client";

export interface WatchlistVideoItem {
  id: string;
  video_id: string;
  video_url: string;
  title: string;
  thumbnail: string;
  category?: string | null;
  added_at: string;
}

export function parseVideoInput(input: string): { source: "youtube" | "x"; videoId: string; videoUrl: string } | null {
  const trimmed = input.trim();

  // X/Twitter
  const xMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/);
  if (xMatch) {
    return {
      source: "x",
      videoId: `x-${xMatch[2]}`,
      videoUrl: `https://x.com/${xMatch[1]}/status/${xMatch[2]}`,
    };
  }

  // youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) return { source: "youtube", videoId: watchMatch[1], videoUrl: `https://www.youtube.com/watch?v=${watchMatch[1]}` };

  // youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return { source: "youtube", videoId: shortMatch[1], videoUrl: `https://www.youtube.com/watch?v=${shortMatch[1]}` };

  // youtube.com/embed/ID
  const embedMatch = trimmed.match(/embed\/([A-Za-z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return { source: "youtube", videoId: embedMatch[1], videoUrl: `https://www.youtube.com/watch?v=${embedMatch[1]}` };

  // Raw 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return { source: "youtube", videoId: trimmed, videoUrl: `https://www.youtube.com/watch?v=${trimmed}` };
  }

  return null;
}

interface AddWatchlistVideoProps {
  onVideoAdded?: (video: WatchlistVideoItem) => void;
}

export const AddWatchlistVideo = ({ onVideoAdded }: AddWatchlistVideoProps) => {
  const [open, setOpen] = useState(false);
  const [videoInput, setVideoInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;

    const parsed = parseVideoInput(videoInput);
    if (!parsed) {
      toast.error("Ungültiger YouTube- oder X-Link");
      return;
    }

    setIsSubmitting(true);
    let title = `Video ${parsed.videoId}`;
    let thumbnail = `https://img.youtube.com/vi/${parsed.videoId}/mqdefault.jpg`;

    if (parsed.source === "youtube") {
      try {
        const resp = await fetch(`https://www.youtube.com/oembed?url=${parsed.videoUrl}&format=json`);
        if (resp.ok) {
          const data = await resp.json();
          title = data.title || title;
          thumbnail = data.thumbnail_url || thumbnail;
        }
      } catch {
        // use fallback thumbnail
      }
    } else if (parsed.source === "x") {
      thumbnail = "";
      title = "X / Twitter Post";
    }

    const newItem: WatchlistVideoItem = {
      id: crypto.randomUUID(),
      video_id: parsed.videoId,
      video_url: parsed.videoUrl,
      title,
      thumbnail,
      category: null,
      added_at: new Date().toISOString(),
    };

    // Save locally
    const existing = getLocalData<WatchlistVideoItem[]>("spark_watchlist" as any, []);
    const updated = [newItem, ...existing];
    setLocalAndSyncData("spark_watchlist" as any, updated);

    // Try Supabase if available
    try {
      await (supabase as any).from("watchlist_videos").insert({
        video_id: parsed.videoId,
        video_url: parsed.videoUrl,
        title,
        thumbnail,
      });
    } catch {
      // offline fallback
    }

    onVideoAdded?.(newItem);
    setVideoInput("");
    setOpen(false);
    setIsSubmitting(false);
    toast.success(`"${title}" zur Watchlist hinzugefügt!`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" /> Video zur Watchlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Video zur Watchlist hinzufügen</DialogTitle>
          <DialogDescription>
            Gib einen YouTube- oder X-Link ein, um das Video konzentriert und werbefrei zu speichern.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="video-url">YouTube- oder X-URL</Label>
            <Input
              id="video-url"
              placeholder="https://www.youtube.com/watch?v=... oder https://youtu.be/..."
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || !videoInput.trim()}>
              {isSubmitting ? "Wird geladen..." : "Hinzufügen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
