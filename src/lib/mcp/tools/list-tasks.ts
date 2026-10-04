import { defineTool, ToolError, type JsonValueInput } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

/**
 * Listet Aufgaben aus dem importierten Brain.
 * Unterstuetzt Filter nach Erledigt-Status und Faelligkeitsdatum.
 */
export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description:
    "List checkbox tasks parsed from the user's Obsidian notes. Filter by completion state and due date. Returns the task text, tags, due date and the note it came from.",
  inputSchema: {
    isDone: z.boolean().optional().describe("Filter by completion state. Omit fuer alle."),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Exact due date, YYYY-MM-DD."),
    limit: z.number().int().min(1).max(100).default(30).describe("Maximum results."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ isDone, dueDate, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("brain_tasks")
      .select("id, text, is_done, due_date, tags, note_id, position, updated_at");

    if (typeof isDone === "boolean") query = query.eq("is_done", isDone);
    if (dueDate) query = query.eq("due_date", dueDate);

    const { data, error } = await query
      .order("is_done", { ascending: true })
      .order("position", { ascending: true })
      .limit(limit);

    if (error) throw new ToolError(error.message);

    // Quellnotiz fuer Kontext nachladen
    const noteIds = [
      ...new Set((data ?? []).map((t) => t.note_id).filter((id): id is string => typeof id === "string")),
    ];

    const { data: notes } = await supabase
      .from("brain_notes")
      .select("id, title, path")
      .in("id", noteIds.length ? noteIds : ["00000000-0000-0000-0000-000000000000"]);

    const noteById = new Map((notes ?? []).map((n) => [n.id, n]));

    const tasks = (data ?? []).map((t) => ({
      id: t.id,
      text: t.text,
      isDone: t.is_done,
      dueDate: t.due_date,
      tags: t.tags ?? [],
      fromNote: t.note_id ? (noteById.get(t.note_id)?.path ?? null) : null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ tasks, count: tasks.length }, null, 2) }],
      structuredContent: { tasks, count: tasks.length } as JsonValueInput,
    };
  },
});
