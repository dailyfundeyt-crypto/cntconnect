import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_document",
  title: "Create document",
  description: "Create a new Spark page, optionally as a subpage of another page.",
  inputSchema: {
    space_id: z.string().uuid().describe("Space the page belongs to."),
    title: z.string().trim().min(1).max(200).describe("Page title."),
    content: z.string().max(200_000).default("").describe("Markdown content."),
    parent_id: z.string().uuid().optional().describe("Parent page id for a subpage."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ space_id, title, content, parent_id }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("documents")
      .insert({ space_id, title, content, parent_id: parent_id ?? null })
      .select("id,title")
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `Created page "${data.title}" (${data.id}).` }],
      structuredContent: { document: { id: data.id, title: data.title } },
    };
  },
});
