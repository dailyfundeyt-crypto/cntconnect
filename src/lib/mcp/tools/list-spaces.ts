import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_spaces",
  title: "List spaces",
  description: "List the spaces in the signed-in user's Spark workspace.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("spaces")
      .select("id,name,icon,position,created_at")
      .order("position");
    if (error) throw new ToolError(error.message);
    const spaces = (data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      position: s.position,
      createdAt: s.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(spaces, null, 2) }],
      structuredContent: { spaces },
    };
  },
});
