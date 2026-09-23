import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EmbeddedVideoPlayerProps {
  videoId: string | null;
  videoTitle: string;
  onClose: () => void;
}

export const EmbeddedVideoPlayer = ({ videoId, videoTitle, onClose }: EmbeddedVideoPlayerProps) => {
  if (!videoId) return null;

  return (
    <Dialog open={!!videoId} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border">
        <DialogHeader className="p-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold truncate pr-6 text-foreground">{videoTitle}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full bg-black">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
            title={videoTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
