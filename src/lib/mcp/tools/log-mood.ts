import { defineTool, ToolError, type JsonValueInput } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

/**
 * Stimmung für ein Datum festhalten. Pro Tag genau ein Eintrag,
 * ein zweiter Aufruf am selben Tag aktualisiert statt zu duplizieren.
 */
export default defineTool({
  name: "log_mood",
  title: "Log mood",
  description:
    "Record the user's mood for a day (1 = very low, 5 = very good). One entry per day: logging again for the same date updates the value.",
  inputSchema: {
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date as YYYY-MM-DD."),
    value: z.number().int().min(1).max(5).describe("Mood value 1-5."),
    note: z.string().trim().max(500).optional().describe("Optional short note."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ date, value, note }, ctx) => {
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("brain_mood_entries")
      .upsert(
        { entry_date: date, value, note: note ?? null },
        { onConflict: "user_id,entry_date" },
      )
      .select("entry_date, value, note, updated_at")
      .single();

    if (error) throw new ToolError(error.message);

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data as JsonValueInput,
    };
  },
});
