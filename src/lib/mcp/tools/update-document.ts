import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_document",
  title: "Update document",
  description: "Update the title or content of an existing Spark page.",
  inputSchema: {
    id: z.string().uuid().describe("Page id."),
    title: z.string().trim().min(1).max(200).optional().describe("New title."),
    content: z.string().max(200_000).optional().describe("New markdown content."),
    append: z
      .boolean()
      .default(false)
      .describe("When true, append the content to the existing page instead of replacing it."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id, title, content, append }, ctx) => {
    if (title === undefined && content === undefined) {
      throw new ToolError("Provide a title, content, or both.");
    }
    const supabase = supabaseForUser(ctx);
    let nextContent = content;
    if (content !== undefined && append) {
      const { data: existing, error: readError } = await supabase
        .from("documents")
        .select("content")
        .eq("id", id)
        .maybeSingle();
      if (readError) throw new ToolError(readError.message);
      if (!existing) throw new ToolError(`No page found with id ${id}`);
      nextContent = `${existing.content}\n\n${content}`;
    }
    const patch: { title?: string; content?: string } = {};
    if (title !== undefined) patch.title = title;
    if (nextContent !== undefined) patch.content = nextContent;
    const { data, error } = await supabase
      .from("documents")
      .update(patch)
      .eq("id", id)
      .select("id,title")
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError(`No page found with id ${id}`);
    return {
      content: [{ type: "text", text: `Updated page "${data.title}" (${data.id}).` }],
      structuredContent: { document: { id: data.id, title: data.title } },
    };
  },
});
