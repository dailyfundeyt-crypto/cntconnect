import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tables",
  title: "List tables",
  description: "List the databases/tables in the Spark workspace, optionally filtered by space.",
  inputSchema: { space_id: z.string().uuid().optional().describe("Only list tables in this space.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ space_id }, ctx) => {
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("collections")
      .select("id,space_id,name,icon,updated_at")
      .eq("is_trashed", false);
    if (space_id) query = query.eq("space_id", space_id);
    const { data, error } = await query.order("position");
    if (error) throw new ToolError(error.message);
    const tables = (data ?? []).map((c) => ({
      id: c.id,
      spaceId: c.space_id,
      name: c.name,
      icon: c.icon,
      updatedAt: c.updated_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(tables, null, 2) }],
      structuredContent: { tables },
    };
  },
});
