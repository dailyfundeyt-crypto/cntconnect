import { defineTool, ToolError, type JsonValueInput } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

/**
 * Schliesst einen Aufgabenhaken um.
 * Schreibzugriff auf brain_tasks, RLS begrenzt es auf den eigenen Nutzer.
 */
export default defineTool({
  name: "toggle_task",
  title: "Toggle task",
  description:
    "Flip the completion state of a task from the user's Obsidian notes. Use list_tasks to find the task id first. Returns the updated state.",
  inputSchema: {
    id: z.string().uuid().describe("Task id from list_tasks."),
    isDone: z.boolean().optional().describe("Target state. Omit = umschalten."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, isDone }, ctx) => {
    const supabase = supabaseForUser(ctx);

    const { data: current, error: readErr } = await supabase
      .from("brain_tasks")
      .select("id, text, is_done, note_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (readErr) throw new ToolError(readErr.message);
    if (!current) throw new ToolError(`Task not found: ${id}`);

    const next = typeof isDone === "boolean" ? isDone : !current.is_done;

    const { data, error } = await supabase
      .from("brain_tasks")
      .update({ is_done: next })
      .eq("id", id)
      .select("id, text, is_done")
      .single();

    if (error) throw new ToolError(error.message);

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data as JsonValueInput,
    };
  },
});
