import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getLocalData, setLocalAndSyncData } from "@/lib/storage-sync";
import { EmbeddedVideoPlayer } from "./embedded-video-player";

export interface WatchedVideoItem {
  id: string;
  video_id: string;
  video_url: string;
  title: string;
  thumbnail: string;
  category?: string;
  watched_at: string;
}

export const WatchedVideosTab = () => {
  const queryClient = useQueryClient();
  const [activePlayerVideo, setActivePlayerVideo] = useState<{ id: string; title: string } | null>(null);

  const { data: videos } = useQuery({
    queryKey: ["spark-watched-videos"],
    queryFn: async () => {
      const items = getLocalData<WatchedVideoItem[]>("spark_watched_videos" as any, [
        {
          id: "w-old-1",
          video_id: "dQw4w9WgXcQ",
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "Building Production Multi-Agent Systems in TypeScript",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
          category: "KI & Agenten",
          watched_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
      return items;
    },
  });

  const handleDelete = (id: string) => {
    const current = videos || [];
    const updated = current.filter((v) => v.id !== id);
    setLocalAndSyncData("spark_watched_videos" as any, updated);
    queryClient.invalidateQueries({ queryKey: ["spark-watched-videos"] });
    toast.success("Aus Historie gelöscht");
  };

  const handleMoveBackToWatchlist = (video: WatchedVideoItem) => {
    handleDelete(video.id);

    const watchlist = getLocalData<any[]>("spark_watchlist" as any, []);
    const updatedWatchlist = [
      {
        id: crypto.randomUUID(),
        video_id: video.video_id,
        video_url: video.video_url,
        title: video.title,
        thumbnail: video.thumbnail,
        category: video.category,
        added_at: new Date().toISOString(),
      },
      ...watchlist,
    ];
    setLocalAndSyncData("spark_watchlist" as any, updatedWatchlist);
    queryClient.invalidateQueries({ queryKey: ["spark-watchlist-videos"] });
    toast.success("Wieder zur Watchlist hinzugefügt");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Bereits gesehene Videos
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {videos?.length || 0} {(videos?.length || 0) === 1 ? "Video" : "Videos"} erfolgreich abgeschlossen
        </p>
      </div>

      {!videos || videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-12 text-center text-muted-foreground">
          <p className="text-sm font-medium">Noch keine angesehenen Videos in deiner Historie.</p>
          <p className="text-xs mt-1 text-muted-foreground/80">
            Wenn du ein Video anschaust oder als erledigt markierst, wird es hier und in deiner Jahresaktivität aufgeführt.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="group overflow-hidden border-border/70 bg-card/60 backdrop-blur-sm transition-all hover:border-emerald-500/40 flex flex-col justify-between"
            >
              <div>
                <div
                  className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setActivePlayerVideo({ id: video.video_id, title: video.title })}
                >
                  <img
                    src={video.thumbnail || `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-500/90 text-white rounded-full p-1 shadow">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg">
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
                    <span>Gesehen am {new Date(video.watched_at).toLocaleDateString("de-DE")}</span>
                    {video.category && (
                      <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium">
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
                  className="h-8 text-xs gap-1"
                  onClick={() => handleMoveBackToWatchlist(video)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Watchlist
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(video.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Löschen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Embedded Player */}
      <EmbeddedVideoPlayer
        videoId={activePlayerVideo?.id || null}
        videoTitle={activePlayerVideo?.title || ""}
        onClose={() => setActivePlayerVideo(null)}
      />
    </div>
  );
};
