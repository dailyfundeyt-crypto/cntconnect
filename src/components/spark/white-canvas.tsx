import { useEffect, useRef, useState } from "react";
import {
  Download,
  Eraser,
  Highlighter,
  Minus,
  PenTool,
  Plus,
  RotateCcw,
  Sparkles,
  StickyNote,
  Trash2,
  Undo,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CANVAS_COLORS = [
  { label: "Graphit", value: "oklch(0.2 0.01 60)" },
  { label: "Akzent Orange", value: "oklch(0.7 0.18 48)" },
  { label: "Smaragd", value: "oklch(0.6 0.17 150)" },
  { label: "Saphir", value: "oklch(0.55 0.18 250)" },
  { label: "Purpur", value: "oklch(0.6 0.2 320)" },
  { label: "Ziegelrot", value: "oklch(0.55 0.22 25)" },
];

export interface CanvasCard {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export function WhiteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);

  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [color, setColor] = useState<string>(CANVAS_COLORS[0]!.value);
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [cards, setCards] = useState<CanvasCard[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("spark_canvas_cards") || "[]");
    } catch {
      return [];
    }
  });

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Restore background & saved drawing if present
    const saved = localStorage.getItem("spark_canvas_drawing");
    if (saved) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = saved;
    } else {
      ctx.fillStyle = "#faf8f5";
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    ctxRef.current = ctx;
  }, []);

  // Sync tool attributes
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (tool === "eraser") {
      ctx.strokeStyle = "#faf8f5";
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = lineWidth * 4;
    } else if (tool === "highlighter") {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = lineWidth * 3.5;
    } else {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = lineWidth;
    }
  }, [tool, color, lineWidth]);

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      localStorage.setItem("spark_canvas_drawing", canvas.toDataURL());
    } catch {}
  };

  const saveCards = (next: CanvasCard[]) => {
    setCards(next);
    try {
      localStorage.setItem("spark_canvas_cards", JSON.stringify(next));
    } catch {}
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;

    isDrawing.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    ctxRef.current?.beginPath();
    saveDrawing();
  };

  const clearCanvas = () => {
    if (!confirm("Möchtest du das Whiteboard wirklich komplett leeren?")) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#faf8f5";
    ctx.fillRect(0, 0, rect.width, rect.height);
    saveCards([]);
    try {
      localStorage.removeItem("spark_canvas_drawing");
    } catch {}
    toast.info("Whiteboard geleert");
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `spark-whiteboard-${new Date().toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Whiteboard als PNG exportiert");
  };

  const addStickyCard = () => {
    const newCard: CanvasCard = {
      id: crypto.randomUUID(),
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      text: "Neue Notiz...",
      color: "bg-amber-100 dark:bg-amber-950/60 border-amber-300",
    };
    saveCards([...cards, newCard]);
    toast.success("Notizzettel hinzugefügt");
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-panel overflow-hidden flex flex-col h-[750px] relative">
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Tools */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card/90 p-1.5 shadow-float backdrop-blur-md pointer-events-auto">
          <Button
            size="sm"
            variant={tool === "pen" ? "default" : "ghost"}
            className="h-8 text-xs gap-1.5"
            onClick={() => setTool("pen")}
          >
            <PenTool className="h-3.5 w-3.5" /> Stift
          </Button>
          <Button
            size="sm"
            variant={tool === "highlighter" ? "default" : "ghost"}
            className="h-8 text-xs gap-1.5"
            onClick={() => setTool("highlighter")}
          >
            <Highlighter className="h-3.5 w-3.5" /> Marker
          </Button>
          <Button
            size="sm"
            variant={tool === "eraser" ? "default" : "ghost"}
            className="h-8 text-xs gap-1.5"
            onClick={() => setTool("eraser")}
          >
            <Eraser className="h-3.5 w-3.5" /> Radierer
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Color picker */}
          <div className="flex items-center gap-1">
            {CANVAS_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setColor(c.value);
                  if (tool === "eraser") setTool("pen");
                }}
                className={cn(
                  "h-5 w-5 rounded-full border border-black/10 transition-transform",
                  color === c.value && tool !== "eraser" && "scale-125 ring-2 ring-accent"
                )}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Width */}
          <div className="flex items-center gap-1 text-xs px-1 text-muted-foreground font-mono">
            <button
              onClick={() => setLineWidth((w) => Math.max(1, w - 1))}
              className="p-1 hover:text-foreground"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-4 text-center">{lineWidth}</span>
            <button
              onClick={() => setLineWidth((w) => Math.min(20, w + 1))}
              className="p-1 hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 bg-card/90 backdrop-blur-md"
            onClick={addStickyCard}
          >
            <StickyNote className="h-3.5 w-3.5 text-amber-500" /> Notiz anheften
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 bg-card/90 backdrop-blur-md"
            onClick={exportPNG}
          >
            <Download className="h-3.5 w-3.5" /> Als PNG
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive hover:bg-destructive/10 bg-card/90 backdrop-blur-md"
            onClick={clearCanvas}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Drawing Area */}
      <div ref={containerRef} className="relative flex-1 w-full h-full touch-none overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={startDraw}
          onPointerMove={onDraw}
          onPointerUp={stopDraw}
          onPointerLeave={stopDraw}
          className="absolute inset-0 block cursor-crosshair"
        />

        {/* Sticky Notes Cards */}
        {cards.map((card) => (
          <div
            key={card.id}
            style={{ left: `${card.x}px`, top: `${card.y}px` }}
            className={cn(
              "absolute z-10 w-48 rounded-xl border p-3 shadow-panel text-xs space-y-2 cursor-move",
              card.color
            )}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-1">
              <span className="font-semibold text-[10px] text-muted-foreground uppercase">Haftnotiz</span>
              <button
                onClick={() => saveCards(cards.filter((c) => c.id !== card.id))}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </div>
            <textarea
              defaultValue={card.text}
              onBlur={(e) => {
                const next = cards.map((c) =>
                  c.id === card.id ? { ...c, text: e.target.value } : c
                );
                saveCards(next);
              }}
              rows={3}
              className="w-full bg-transparent border-none resize-none outline-none text-foreground font-sans text-xs leading-relaxed"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
