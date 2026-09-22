import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_documents",
  title: "List documents",
  description: "List pages in the Spark workspace, optionally filtered by space or parent page.",
  inputSchema: {
    space_id: z.string().uuid().optional().describe("Only list pages in this space."),
    parent_id: z.string().uuid().optional().describe("Only list subpages of this page."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of pages."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ space_id, parent_id, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("documents")
      .select("id,space_id,parent_id,title,icon,is_favorite,updated_at")
      .eq("is_trashed", false);
    if (space_id) query = query.eq("space_id", space_id);
    if (parent_id) query = query.eq("parent_id", parent_id);
    const { data, error } = await query.order("position").limit(limit);
    if (error) throw new ToolError(error.message);
    const documents = (data ?? []).map((d) => ({
      id: d.id,
      spaceId: d.space_id,
      parentId: d.parent_id,
      title: d.title,
      icon: d.icon,
      isFavorite: d.is_favorite,
      updatedAt: d.updated_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(documents, null, 2) }],
      structuredContent: { documents },
    };
  },
});
