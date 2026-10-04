import { auth, defineMcp } from "@lovable.dev/mcp-js";

import createDocumentTool from "./tools/create-document";
import createTableRowTool from "./tools/create-table-row";
import getAgendaTool from "./tools/get-agenda";
import getBrainContextTool from "./tools/get-brain-context";
import getDocumentTool from "./tools/get-document";
import getNoteTool from "./tools/get-note";
import getTableTool from "./tools/get-table";
import listDocumentsTool from "./tools/list-documents";
import listSpacesTool from "./tools/list-spaces";
import listTablesTool from "./tools/list-tables";
import listTasksTool from "./tools/list-tasks";
import logMoodTool from "./tools/log-mood";
import searchNotesTool from "./tools/search-notes";
import searchWorkspaceTool from "./tools/search-workspace";
import toggleTaskTool from "./tools/toggle-task";
import updateDocumentTool from "./tools/update-document";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "spark",
  title: "Spark",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in user's private Spark workspace. Use `search_workspace` to find pages and tables, `list_spaces` / `list_documents` / `get_document` to read content, `create_document` and `update_document` to write pages, and `list_tables` / `get_table` / `create_table_row` for databases. All access is scoped to the authenticated user's own data. The brain tools work on notes imported from the user's Obsidian vault: `get_brain_context` is the best starting point for a question, then `search_notes` / `get_note` for detail, `list_tasks` / `toggle_task` for the todo list, `log_mood` for wellbeing, and `get_agenda` for the whole day in one call.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchWorkspaceTool,
    listSpacesTool,
    listDocumentsTool,
    getDocumentTool,
    createDocumentTool,
    updateDocumentTool,
    listTablesTool,
    getTableTool,
    createTableRowTool,
    // Obsidian vault: notes, links, tasks, mood, work time.
    searchNotesTool,
    getNoteTool,
    getBrainContextTool,
    listTasksTool,
    toggleTaskTool,
    logMoodTool,
    getAgendaTool,
  ],
});
