import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Filter, Maximize2, RefreshCw, Search, ZoomIn, ZoomOut } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface GraphNode {
  id: string;
  label: string;
  type: "doc" | "table" | "book" | "video" | "health";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  connections: number;
  href: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  height?: number;
}

export function KnowledgeGraph({ nodes: initialNodes, links, height = 600 }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Pan & Zoom
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const draggedNode = useRef<GraphNode | null>(null);

  // Initialize node positions in a circle
  useEffect(() => {
    const width = 800;
    const center = { x: width / 2, y: height / 2 };
    const nodeCount = initialNodes.length;

    const initialized = initialNodes.map((n, i) => {
      const angle = (i / Math.max(nodeCount, 1)) * 2 * Math.PI;
      const dist = 120 + Math.random() * 150;
      return {
        ...n,
        x: center.x + Math.cos(angle) * dist,
        y: center.y + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
      };
    });

    setNodes(initialized);
  }, [initialNodes, height]);

  // Force-directed physics loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      setNodes((current) => {
        if (!current.length) return current;

        const next = current.map((n) => ({ ...n }));
        const nodeMap = new Map(next.map((n) => [n.id, n]));

        // 1. Repulsion between all pairs
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i]!;
            const b = next[j]!;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy + 1;
            const dist = Math.sqrt(distSq);

            if (dist < 300) {
              const force = (300 - dist) / dist * 0.08;
              a.vx -= dx * force * 0.05;
              a.vy -= dy * force * 0.05;
              b.vx += dx * force * 0.05;
              b.vy += dy * force * 0.05;
            }
          }
        }

        // 2. Attraction along links
        links.forEach((l) => {
          const a = nodeMap.get(l.source);
          const b = nodeMap.get(l.target);
          if (!a || !b) return;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 90;
          const force = (dist - targetDist) * 0.02;

          a.vx += (dx / dist) * force;
          a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force;
          b.vy -= (dy / dist) * force;
        });

        // 3. Centering force & update
        const centerX = 400;
        const centerY = height / 2;

        next.forEach((n) => {
          if (draggedNode.current?.id === n.id) return;

          // Pull to center
          n.vx += (centerX - n.x) * 0.003;
          n.vy += (centerY - n.y) * 0.003;

          // Damping
          n.vx *= 0.85;
          n.vy *= 0.85;

          n.x += n.vx;
          n.y += n.vy;
        });

        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [links, height]);

  // Render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, width, h);
    ctx.save();

    // Pan & zoom transform
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Draw links
    links.forEach((link) => {
      const src = nodeMap.get(link.source);
      const tgt = nodeMap.get(link.target);
      if (!src || !tgt) return;

      const isHighlighted =
        hoveredNode && (hoveredNode.id === src.id || hoveredNode.id === tgt.id);

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = isHighlighted ? "oklch(0.7 0.17 48)" : "oklch(0.85 0.01 60 / 40%)";
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node) => {
      const isFiltered =
        (filterType !== "all" && node.type !== filterType) ||
        (searchQuery && !node.label.toLowerCase().includes(searchQuery.toLowerCase()));

      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;

      ctx.save();
      if (isFiltered) {
        ctx.globalAlpha = 0.2;
      }

      // Circle glow on hover/selected
      if (isHovered || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = "oklch(0.7 0.17 48 / 20%)";
        ctx.fill();
      }

      // Main Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = isSelected ? "oklch(0.2 0.01 60)" : "white";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.font = `${isHovered ? "bold " : ""}11px system-ui, sans-serif`;
      ctx.fillStyle = "oklch(0.25 0.01 60)";
      ctx.textAlign = "center";
      ctx.fillText(node.label, node.x, node.y + node.radius + 14);

      ctx.restore();
    });

    ctx.restore();
  }, [nodes, links, scale, offset, hoveredNode, selectedNode, searchQuery, filterType]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    return {
      x: (clientX - offset.x) / scale,
      y: (clientY - offset.y) / scale,
    };
  };

  const findNodeAt = (x: number, y: number) => {
    return nodes.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    }) ?? null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const hit = findNodeAt(coords.x, coords.y);

    if (hit) {
      draggedNode.current = hit;
      setSelectedNode(hit);
    } else {
      isDraggingCanvas.current = true;
      dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (draggedNode.current) {
      const target = draggedNode.current;
      target.x = coords.x;
      target.y = coords.y;
      target.vx = 0;
      target.vy = 0;
      setNodes([...nodes]);
      return;
    }

    if (isDraggingCanvas.current) {
      setOffset({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
      return;
    }

    const hit = findNodeAt(coords.x, coords.y);
    setHoveredNode(hit);
  };

  const handleMouseUp = () => {
    draggedNode.current = null;
    isDraggingCanvas.current = false;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const hit = findNodeAt(coords.x, coords.y);
    if (hit?.href) {
      navigate({ to: hit.href as never });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-panel overflow-hidden relative">
      {/* Control bar overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Graph durchsuchen..."
              className="h-8 pl-8 pr-3 text-xs w-48 bg-card/90 border-border backdrop-blur-md"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card/90 p-0.5 text-xs backdrop-blur-md">
            {["all", "doc", "table", "book", "video"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-2 py-1 rounded-md capitalize font-medium text-[11px] transition-colors",
                  filterType === type
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {type === "all" ? "Alle" : type === "doc" ? "Notizen" : type === "table" ? "Tabellen" : type === "book" ? "Bücher" : "Videos"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 pointer-events-auto bg-card/90 border border-border rounded-lg p-1 shadow-sm backdrop-blur-md">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setScale((s) => Math.min(s + 0.15, 2.5))}
            title="Vergrößern"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setScale((s) => Math.max(s - 0.15, 0.4))}
            title="Verkleinern"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            title="Ansicht zentrieren"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 w-72 rounded-xl border border-border bg-card/95 p-3.5 shadow-float backdrop-blur-md text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm truncate">{selectedNode.label}</span>
            <span className="capitalize px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground font-mono">
              {selectedNode.type}
            </span>
          </div>
          <div className="text-muted-foreground text-[11px]">
            {selectedNode.connections} Verknüpfungen im Wissensnetz
          </div>
          <Button
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => navigate({ to: selectedNode.href as never })}
          >
            Öffnen (Doppelklick)
          </Button>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="w-full bg-[#faf8f5] dark:bg-[#1a1918] cursor-grab active:cursor-grabbing block"
      />
    </div>
  );
}
