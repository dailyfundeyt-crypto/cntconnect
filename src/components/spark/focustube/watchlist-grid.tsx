import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Play, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { getLocalData, setLocalAndSyncData } from "@/lib/storage-sync";
import { AddWatchlistVideo, type WatchlistVideoItem } from "./add-watchlist-video";
import { EmbeddedVideoPlayer } from "./embedded-video-player";

interface WatchlistGridProps {
  onVideoWatched?: (video: WatchlistVideoItem) => void;
}

export const WatchlistGrid = ({ onVideoWatched }: WatchlistGridProps) => {
  const queryClient = useQueryClient();
  const [activePlayerVideo, setActivePlayerVideo] = useState<{ id: string; title: string } | null>(null);

  const { data: videos, isLoading } = useQuery({
    queryKey: ["spark-watchlist-videos"],
    queryFn: async () => {
      const items = getLocalData<WatchlistVideoItem[]>("spark_watchlist" as any, [
        {
          id: "w1",
          video_id: "dQw4w9WgXcQ",
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "Introduction to Agentic AI Architecture & Local Models",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
          category: "KI & Agenten",
          added_at: new Date().toISOString(),
        },
      ]);
      return items;
    },
  });

  const handleDelete = (id: string) => {
    const current = videos || [];
    const updated = current.filter((v) => v.id !== id);
    setLocalAndSyncData("spark_watchlist" as any, updated);
    queryClient.invalidateQueries({ queryKey: ["spark-watchlist-videos"] });
    toast.success("Video aus Watchlist entfernt");
  };

  const handleMarkAsWatched = (video: WatchlistVideoItem) => {
    // 1. Remove from watchlist
    handleDelete(video.id);

    // 2. Add to watched list
    const watched = getLocalData<any[]>("spark_watched_videos" as any, []);
    const newWatched = [
      {
        id: crypto.randomUUID(),
        video_id: video.video_id,
        video_url: video.video_url,
        title: video.title,
        thumbnail: video.thumbnail,
        category: video.category || "Allgemein",
        watched_at: new Date().toISOString(),
      },
      ...watched,
    ];
    setLocalAndSyncData("spark_watched_videos" as any, newWatched);
    queryClient.invalidateQueries({ queryKey: ["spark-watched-videos"] });
    queryClient.invalidateQueries({ queryKey: ["year-activity"] });
    onVideoWatched?.(video);
    toast.success("Als angesehen markiert!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            📌 Später ansehen (Watchlist)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {videos?.length || 0} {(videos?.length || 0) === 1 ? "gespeichertes Video" : "gespeicherte Videos"}
          </p>
        </div>
        <AddWatchlistVideo
          onVideoAdded={() => {
            queryClient.invalidateQueries({ queryKey: ["spark-watchlist-videos"] });
          }}
        />
      </div>

      {!videos || videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-12 text-center text-muted-foreground">
          <p className="text-sm font-medium">Deine Watchlist ist aktuell leer.</p>
          <p className="text-xs mt-1 text-muted-foreground/80">
            Füge YouTube-Links hinzu, um sie fokussiert und ohne Ablenkung anzuschauen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="group overflow-hidden border-border/70 bg-card/60 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div
                  className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setActivePlayerVideo({ id: video.video_id, title: video.title })}
                >
                  <img
                    src={video.thumbnail || `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3
                    className="font-medium text-sm line-clamp-2 text-foreground hover:text-primary cursor-pointer transition-colors"
                    onClick={() => setActivePlayerVideo({ id: video.video_id, title: video.title })}
                  >
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>{new Date(video.added_at).toLocaleDateString("de-DE")}</span>
                    {video.category && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        {video.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
                  onClick={() => handleMarkAsWatched(video)}
                >
                  <BookmarkCheck className="h-3.5 w-3.5" /> Gesehen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(video.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Löschen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Embedded Distraction-Free Modal Player */}
      <EmbeddedVideoPlayer
        videoId={activePlayerVideo?.id || null}
        videoTitle={activePlayerVideo?.title || ""}
        onClose={() => setActivePlayerVideo(null)}
      />
    </div>
  );
};
