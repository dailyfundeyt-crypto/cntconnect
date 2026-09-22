import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_table_row",
  title: "Create table row",
  description:
    "Add a row to a Spark table. Values are keyed by column id; use get_table to read column ids.",
  inputSchema: {
    table_id: z.string().uuid().describe("Table id."),
    values: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .describe("Row values keyed by column id."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ table_id, values }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("collection_rows")
      .insert({ collection_id: table_id, data: values as never })
      .select("id")
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `Created row ${data.id}.` }],
      structuredContent: { row: { id: data.id } },
    };
  },
});
