import { createFileRoute } from "@tanstack/react-router";
import { Layout, PenTool, Sparkles } from "lucide-react";
import { WhiteCanvas } from "@/components/spark/white-canvas";

export const Route = createFileRoute("/_authenticated/app/canvas")({
  head: () => ({
    meta: [
      { title: "Whiteboard Canvas — Spark" },
      { name: "description", content: "Unendliche Freihand-Zeichenfläche, Skizzen und Haftnotizen für visuelles Denken." },
    ],
  }),
  component: CanvasPage,
});

function CanvasPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <PenTool className="h-6 w-6 text-accent" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Whiteboard &amp; Canvas
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Freihand-Skizzen, Brainstorming, Farb-Marker und Notizzettel auf digitalem Papier.
          </p>
        </div>
      </div>

      {/* Main Canvas Component */}
      <WhiteCanvas />
    </div>
  );
}
