import { defineTool, ToolError, type JsonValueInput } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

/**
 * Gebündelter Kontext zu einem Thema.
 * 
 * Statt dass ein Agent drei Werkzeuge aufrufen muss, liefert dieses hier
 * die Notizen plus deren direkte Nachbarn im Linkgraphen. Damit bekommt
 * ein Agent die Nachbarschaft, die im Obsidian der sichtbare Kontext ist.
 */
export default defineTool({
  name: "get_brain_context",
  title: "Get brain context",
  description:
    "Get bundled context for a topic: the most relevant notes with full content, plus their immediate neighbours from the link graph (both directions). Use this instead of many search_notes/get_note calls.",
  inputSchema: {
    topic: z.string().trim().min(2).max(200).describe("Topic or question."),
    maxNotes: z.number().int().min(1).max(10).default(3).describe("How many main notes to include in full."),
    maxNeighbours: z.number().int().min(0).max(30).default(8).describe("How many linked neighbours as excerpts."),
    excerptChars: z.number().int().min(100).max(2000).default(400).describe("Excerpt length per neighbour."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ topic, maxNotes, maxNeighbours, excerptChars }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const cleaned = topic.replace(/[%_,]/g, " ").trim();
    const like = `%${cleaned}%`;

    // Relevanzbewertung: Titeltreffer schlagen Inhaltstreffer.
    const [titleHits, contentHits] = await Promise.all([
      supabase
        .from("brain_notes")
        .select("id, title, path, content, frontmatter, updated_at")
        .ilike("title", like)
        .limit(maxNotes * 2),
      supabase
        .from("brain_notes")
        .select("id, title, path, content, updated_at")
        .ilike("content", like)
        .limit(maxNotes * 4),
    ]);

    if (titleHits.error) throw new ToolError(titleHits.error.message);
    if (contentHits.error) throw new ToolError(contentHits.error.message);

    const seen = new Set<string>();
    const ranked: { id: string; title: string; path: string; content: string; frontmatter?: unknown; updated_at: string; score: number }[] = [];

    for (const n of titleHits.data ?? []) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      ranked.push({ ...n, score: 100 });
    }
    for (const n of contentHits.data ?? []) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      // Häufigkeit im Text als grobes Gewicht
      const occurrences = (n.content?.toLowerCase().match(new RegExp(cleaned.toLowerCase(), "g")) ?? []).length;
      ranked.push({ ...n, score: Math.min(occurrences, 50) });
    }

    ranked.sort((a, b) => b.score - a.score);
    const main = ranked.slice(0, maxNotes);

    if (main.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { topic, notes: [], neighbours: [], hint: "Keine Notiz passt. Wurde der Vault importiert?" },
              null,
              2,
            ),
          },
        ],
        structuredContent: { topic, notes: [], neighbours: [] } as JsonValueInput,
      };
    }

    // Nachbarn: ausgehende und eingehende Links der Hauptnotizen
    const mainIds = main.map((n) => n.id);
    const [outgoing, incoming] = await Promise.all([
      supabase.from("brain_note_links").select("source_note_id, target_note_id").in("source_note_id", mainIds),
      supabase.from("brain_note_links").select("source_note_id, target_note_id").in("target_note_id", mainIds),
    ]);

    if (outgoing.error) throw new ToolError(outgoing.error.message);
    if (incoming.error) throw new ToolError(incoming.error.message);

    const neighbourIds = new Set<string>();
    for (const l of outgoing.data ?? []) {
      if (l.target_note_id && !mainIds.includes(l.target_note_id)) neighbourIds.add(l.target_note_id);
    }
    for (const l of incoming.data ?? []) {
      if (l.source_note_id && !mainIds.includes(l.source_note_id)) neighbourIds.add(l.source_note_id);
    }

    const neighbourList = [...neighbourIds].slice(0, maxNeighbours);
    const { data: neighbourNotes, error: nbErr } = await supabase
      .from("brain_notes")
      .select("id, title, path, content")
      .in("id", neighbourList.length ? neighbourList : ["00000000-0000-0000-0000-000000000000"]);

    if (nbErr) throw new ToolError(nbErr.message);

    const result = {
      topic,
      notes: main.map((n) => ({
        id: n.id,
        title: n.title,
        path: n.path,
        content: n.content ?? "",
        frontmatter: (n.frontmatter ?? {}) as JsonValueInput,
        relevance: n.score,
        updatedAt: n.updated_at,
      })),
      neighbours: (neighbourNotes ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        path: n.path,
        excerpt: (n.content ?? "").slice(0, excerptChars),
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result as JsonValueInput,
    };
  },
});
