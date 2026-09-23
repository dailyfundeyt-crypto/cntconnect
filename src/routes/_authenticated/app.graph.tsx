import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Network, Sparkles, Waypoints } from "lucide-react";

import {
  KnowledgeGraph,
  type GraphLink,
  type GraphNode,
} from "@/components/spark/knowledge-graph";
import { listDocuments, listSpaces, listCollections } from "@/lib/spark";

export const Route = createFileRoute("/_authenticated/app/graph")({
  head: () => ({
    meta: [
      { title: "Knowledge Graph — Spark" },
      { name: "description", content: "Interaktiver Obsidian-Wissensgraph aller Dokumente, Tabellen und Notizen." },
    ],
  }),
  component: GraphPage,
});

function GraphPage() {
  const spacesQuery = useQuery({ queryKey: ["spaces"], queryFn: listSpaces });
  const spaces = spacesQuery.data ?? [];
  const spaceId = spaces[0]?.id ?? "";

  const docsQuery = useQuery({
    queryKey: ["documents", spaceId],
    queryFn: () => listDocuments(spaceId),
    enabled: !!spaceId,
  });

  const collectionsQuery = useQuery({
    queryKey: ["collections", spaceId],
    queryFn: () => listCollections(spaceId),
    enabled: !!spaceId,
  });

  const docs = docsQuery.data ?? [];
  const collections = collectionsQuery.data ?? [];

  // Construct nodes and parse [[wikilinks]]
  const { nodes, links } = useMemo(() => {
    const rawNodes: GraphNode[] = [];
    const rawLinks: GraphLink[] = [];

    // Docs
    docs.forEach((doc) => {
      // Find [[wikilinks]] in content
      const content = doc.content ?? "";
      const matches = content.match(/\[\[(.*?)\]\]/g) || [];

      matches.forEach((m) => {
        const targetTitle = m.slice(2, -2).trim();
        const targetDoc = docs.find(
          (d) => d.title.toLowerCase() === targetTitle.toLowerCase() && d.id !== doc.id
        );
        if (targetDoc) {
          rawLinks.push({ source: doc.id, target: targetDoc.id });
        }
      });

      rawNodes.push({
        id: doc.id,
        label: doc.title || "Unbenannt",
        type: "doc",
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 8 + Math.min(matches.length * 2, 10),
        color: "oklch(0.25 0.01 60)",
        connections: matches.length,
        href: `/app/doc/${doc.id}`,
      });
    });

    // Collections (Tables)
    collections.forEach((col) => {
      rawNodes.push({
        id: col.id,
        label: col.name || "Tabelle",
        type: "table",
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 12,
        color: "oklch(0.65 0.17 150)", // Emerald
        connections: 1,
        href: `/app/table/${col.id}`,
      });

      // Link first doc to table if exists
      if (docs[0]) {
        rawLinks.push({ source: col.id, target: docs[0].id });
      }
    });

    // Books from local storage
    try {
      const savedBooks = JSON.parse(localStorage.getItem("spark_books") || "[]") as Array<{
        id: string;
        title: string;
      }>;
      savedBooks.forEach((b) => {
        rawNodes.push({
          id: b.id,
          label: b.title,
          type: "book",
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: 10,
          color: "oklch(0.6 0.15 220)", // Sky blue
          connections: 1,
          href: "/app/studio",
        });
      });
    } catch {}

    // Health Node
    rawNodes.push({
      id: "node-health-system",
      label: "Gesundheit & Bio-Tracking",
      type: "health",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 14,
      color: "oklch(0.7 0.18 48)", // Accent orange
      connections: 2,
      href: "/app/health",
    });

    if (docs[0]) {
      rawLinks.push({ source: "node-health-system", target: docs[0].id });
    }

    return { nodes: rawNodes, links: rawLinks };
  }, [docs, collections]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Waypoints className="h-6 w-6 text-accent" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Knowledge Graph
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bi-direktionales Beziehungsnetzwerk deiner Notizen, Tabellen, Bücher und Systeme.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-mono">
            <strong className="text-foreground">{nodes.length}</strong> Knoten
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 font-mono">
            <strong className="text-foreground">{links.length}</strong> Kanten
          </span>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <KnowledgeGraph nodes={nodes} links={links} height={680} />
    </div>
  );
}
