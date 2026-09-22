import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_table",
  title: "Get table",
  description: "Read a Spark table: its columns and rows.",
  inputSchema: {
    id: z.string().uuid().describe("Table id."),
    limit: z.number().int().min(1).max(500).default(100).describe("Maximum number of rows."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const [table, fields, rows] = await Promise.all([
      supabase.from("collections").select("id,name,icon").eq("id", id).maybeSingle(),
      supabase
        .from("collection_fields")
        .select("id,name,type,options,position")
        .eq("collection_id", id)
        .order("position"),
      supabase
        .from("collection_rows")
        .select("id,data,position")
        .eq("collection_id", id)
        .order("position")
        .limit(limit),
    ]);
    if (table.error) throw new ToolError(table.error.message);
    if (!table.data) throw new ToolError(`No table found with id ${id}`);
    if (fields.error) throw new ToolError(fields.error.message);
    if (rows.error) throw new ToolError(rows.error.message);

    const result = {
      id: table.data.id,
      name: table.data.name,
      icon: table.data.icon,
      columns: (fields.data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        position: f.position,
        choices: Array.isArray((f.options as { choices?: unknown })?.choices)
          ? ((f.options as { choices?: string[] }).choices ?? []).map(String)
          : [],
      })),
      rows: (rows.data ?? []).map((r) => ({
        id: r.id,
        position: r.position,
        values: JSON.parse(JSON.stringify(r.data ?? {})) as Record<string, unknown>,
      })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: { table: result },
    };
  },
});
