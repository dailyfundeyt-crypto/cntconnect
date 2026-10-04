import { defineTool, ToolError, type JsonValueInput } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

/**
 * Liest eine Notiz im Volltext, inklusive aufgelöster Wikilinks und Backlinks.
 * Das ist der wichtigste Kontextlieferant für Agenten: eine Notiz plus ihre
 * Verknüpfungen reicht meist, um ohne weitere Suchen zu arbeiten.
 */
export default defineTool({
  name: "get_note",
  title: "Get note",
  description:
    "Read one note from the user's Obsidian brain by path or id. Returns full markdown content, frontmatter, resolved outgoing links and backlinks. Use search_notes first if you do not know the exact path.",
  inputSchema: {
    path: z.string().trim().min(1).max(400).optional().describe("Vault-relative path, e.g. 'Brain/hot.md'."),
    id: z.string().uuid().optional().describe("Note id from search_notes."),
    includeContent: z.boolean().default(true).describe("Return full markdown body."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ path, id, includeContent }, ctx) => {
    if (!path && !id) throw new ToolError("Either path or id is required.");

    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("brain_notes")
      .select("id, title, path, content, frontmatter, folder_id, drive_file_id, is_starred, created_at, updated_at");

    query = id ? query.eq("id", id) : query.eq("path", path as string);

    const { data: note, error } = await query.limit(1).maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!note) {
      throw new ToolError(`Note not found: ${id ?? path}. Use search_notes to find valid paths.`);
    }

    // Ausgehende Links mit Ziel-Titel
    const { data: outgoing, error: outErr } = await supabase
      .from("brain_note_links")
      .select("target_path, target_note_id, target_file_path, link_text, is_embedded")
      .eq("source_note_id", note.id);

    if (outErr) throw new ToolError(outErr.message);

    const targetIds = (outgoing ?? []).map((l) => l.target_note_id).filter((v): v is string => Boolean(v));
    const { data: targetNotes } = await supabase
      .from("brain_notes")
      .select("id, title, path")
      .in("id", targetIds.length ? targetIds : ["00000000-0000-0000-0000-000000000000"]);

    const titleById = new Map((targetNotes ?? []).map((t) => [t.id, t]));

    const links = (outgoing ?? []).map((l) => ({
      text: l.link_text,
      path: l.target_path,
      resolvedTitle: l.target_note_id ? (titleById.get(l.target_note_id)?.title ?? null) : null,
      mediaPath: l.target_file_path,
      isEmbedded: l.is_embedded,
    }));

    // Backlinks: Wer verweist auf diese Notiz?
    const { data: incoming, error: inErr } = await supabase
      .from("brain_note_links")
      .select("source_note_id")
      .eq("target_note_id", note.id);

    if (inErr) throw new ToolError(inErr.message);

    const sourceIds = [...new Set((incoming ?? []).map((l) => l.source_note_id).filter(Boolean))];
    const { data: sourceNotes } = await supabase
      .from("brain_notes")
      .select("id, title, path")
      .in("id", sourceIds.length ? sourceIds : ["00000000-0000-0000-0000-000000000000"]);

    const result = {
      id: note.id,
      title: note.title,
      path: note.path,
      content: includeContent ? (note.content ?? "") : undefined,
      contentOmitted: !includeContent,
      frontmatter: note.frontmatter ?? {},
      isStarred: note.is_starred,
      hasDriveCopy: Boolean(note.drive_file_id),
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      links,
      backlinks: sourceNotes ?? [],
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result as JsonValueInput,
    };
  },
});
