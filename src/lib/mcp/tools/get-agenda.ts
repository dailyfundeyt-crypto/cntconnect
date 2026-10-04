import { defineTool, ToolError, type JsonValueInput } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

/**
 * Tagesansicht: Aufgaben, Stimmung und gebuchte Arbeitszeit eines Datums.
 * Ein Aufruf statt drei - das ist die Tagesansicht für die Connect-Startseite.
 */
export default defineTool({
  name: "get_agenda",
  title: "Get agenda",
  description:
    "Get the full day view for a date: open and done tasks, mood, and total work minutes. This is the single call a daily dashboard needs.",
  inputSchema: {
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date as YYYY-MM-DD."),
    includeCompleted: z.boolean().default(true).describe("Include already completed tasks."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date, includeCompleted }, ctx) => {
    const supabase = supabaseForUser(ctx);

    // Aufgaben: fällig am Tag, oder ohne Datum (als "irgendwann" gelistet)
    const { data: taskRows, error: taskErr } = await supabase
      .from("brain_tasks")
      .select("id, text, is_done, due_date, tags, note_id")
      .eq("due_date", date);

    if (taskErr) throw new ToolError(taskErr.message);

    // Stimmung
    const { data: mood, error: moodErr } = await supabase
      .from("brain_mood_entries")
      .select("value, note")
      .eq("entry_date", date)
      .limit(1)
      .maybeSingle();

    if (moodErr) throw new ToolError(moodErr.message);

    // Arbeitszeit: Sessions, die am Tag begonnen wurden
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const { data: sessions, error: sessionErr } = await supabase
      .from("brain_work_sessions")
      .select("started_at, ended_at, minutes, label")
      .gte("started_at", dayStart)
      .lte("started_at", dayEnd);

    if (sessionErr) throw new ToolError(sessionErr.message);

    const workMinutes = (sessions ?? []).reduce((sum, s) => {
      if (typeof s.minutes === "number") return sum + s.minutes;
      if (s.ended_at) {
        return sum + Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 60000);
      }
      return sum;
    }, 0);

    const noteIds = [
      ...new Set((taskRows ?? []).map((t) => t.note_id).filter((id): id is string => typeof id === "string")),
    ];
    const { data: notes } = await supabase
      .from("brain_notes")
      .select("id, title, path")
      .in("id", noteIds.length ? noteIds : ["00000000-0000-0000-0000-000000000000"]);

    const noteById = new Map((notes ?? []).map((n) => [n.id, n]));

    const all = (taskRows ?? []).map((t) => ({
      id: t.id,
      text: t.text,
      isDone: t.is_done,
      tags: t.tags ?? [],
      fromNote: t.note_id ? (noteById.get(t.note_id)?.path ?? null) : null,
    }));

    const result = {
      date,
      tasks: includeCompleted ? all : all.filter((t) => !t.isDone),
      openCount: all.filter((t) => !t.isDone).length,
      doneCount: all.filter((t) => t.isDone).length,
      mood: mood ? { value: mood.value, note: mood.note } : null,
      work: { minutes: workMinutes, sessions: sessions ?? [] },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result as JsonValueInput,
    };
  },
});
