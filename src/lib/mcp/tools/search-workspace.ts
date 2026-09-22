import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_workspace",
  title: "Search workspace",
  description: "Search the signed-in user's Spark pages and tables by keyword.",
  inputSchema: {
    query: z.string().trim().min(1).max(200).describe("Search term."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum results per type."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const like = `%${query.replace(/[%_,]/g, " ")}%`;
    const [docs, cols] = await Promise.all([
      supabase
        .from("documents")
        .select("id,title,icon,content,updated_at")
        .eq("is_trashed", false)
        .or(`title.ilike.${like},content.ilike.${like}`)
        .limit(limit),
      supabase
        .from("collections")
        .select("id,name,icon,updated_at")
        .eq("is_trashed", false)
        .ilike("name", like)
        .limit(limit),
    ]);
    if (docs.error) throw new ToolError(docs.error.message);
    if (cols.error) throw new ToolError(cols.error.message);
    const documents = (docs.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      icon: d.icon,
      excerpt: d.content.slice(0, 400),
      updatedAt: d.updated_at,
    }));
    const tables = (cols.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      updatedAt: c.updated_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify({ documents, tables }, null, 2) }],
      structuredContent: { documents, tables },
    };
  },
});
