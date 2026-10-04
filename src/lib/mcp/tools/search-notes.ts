import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

/**
 * Volltextsuche im Brain.
 * 
 * Nutzt die simple-TSVektor-Konfiguration des GIN-Index, damit auch
 * Agenten-Tools stabil funktionieren, aber die Abfrage über die
 * normalisierte where-Funktion zusätzlich Titel-Treffer priorisiert.
 */
export default defineTool({
  name: "search_notes",
  title: "Search notes",
  description:
    "Search the user's Obsidian brain (imported notes) by keyword. Returns matching notes with title, path, excerpt and link count. Use this to find relevant context before reading a note in full.",
  inputSchema: {
    query: z.string().trim().min(1).max(200).describe("Search term."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum results."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const cleaned = query.replace(/[%_,]/g, " ").trim();
    const like = `%${cleaned}%`;

    const { data, error } = await supabase
      .from("brain_notes")
      .select("id, title, path, content, folder_id, updated_at")
      .ilike("title", like)
      .limit(limit);

    if (error) throw new ToolError(error.message);

    // Inhaltssuche separat, damit Titeltreffer nicht doppelt gezählt werden.
    const { data: contentHits, error: contentErr } = await supabase
      .from("brain_notes")
      .select("id, title, path, content, folder_id, updated_at")
      .ilike("content", like)
      .not("id", "in", `(${data.map((r) => r.id).join(",") || "00000000-0000-0000-0000-000000000000"})`)
      .limit(limit);

    if (contentErr) throw new ToolError(contentErr.message);

    const merged = [...(data ?? []), ...(contentHits ?? [])].slice(0, limit);

    // Backlink-Zählung für Kontextwert
    const noteIds = merged.map((n) => n.id);
    const { data: linkRows } = await supabase
      .from("brain_note_links")
      .select("target_note_id")
      .in("target_note_id", noteIds.length ? noteIds : ["00000000-0000-0000-0000-000000000000"]);

    const backlinks = new Map<string, number>();
    for (const row of linkRows ?? []) {
      if (!row.target_note_id) continue;
      backlinks.set(row.target_note_id, (backlinks.get(row.target_note_id) ?? 0) + 1);
    }

    const notes = merged.map((n) => ({
      id: n.id,
      title: n.title,
      path: n.path,
      excerpt: excerptAround(n.content ?? "", cleaned),
      backlinks: backlinks.get(n.id) ?? 0,
      updatedAt: n.updated_at,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ notes, query }, null, 2) }],
      structuredContent: { notes, query },
    };
  },
});

/** Liefert ein Fenster um den Treffer, damit der Kontext lesbar bleibt. */
function excerptAround(content: string, term: string, radius = 220): string {
  if (!content) return "";
  const idx = content.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return content.slice(0, radius * 2).trim();

  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + term.length + radius);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";
  return `${prefix}${content.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}
