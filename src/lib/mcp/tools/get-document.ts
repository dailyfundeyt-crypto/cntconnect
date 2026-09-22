import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_document",
  title: "Get document",
  description: "Read one Spark page including its full content.",
  inputSchema: { id: z.string().uuid().describe("Page id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("documents")
      .select("id,space_id,parent_id,title,icon,content,is_favorite,updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError(`No page found with id ${id}`);
    const document = {
      id: data.id,
      spaceId: data.space_id,
      parentId: data.parent_id,
      title: data.title,
      icon: data.icon,
      content: data.content,
      isFavorite: data.is_favorite,
      updatedAt: data.updated_at,
    };
    return {
      content: [{ type: "text", text: `# ${document.title}\n\n${document.content}` }],
      structuredContent: { document },
    };
  },
});
