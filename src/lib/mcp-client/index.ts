/**
 * MCP Client — calls the app's own /mcp endpoint with the signed-in user's
 * Supabase session token as a bearer credential. No full OAuth2 PKCE flow needed:
 * the server accepts raw Supabase JWTs from the `Authorization: Bearer <token>` header.
 *
 * Uses the MCP SDK's StreamableHTTP transport and a minimal OAuthClientProvider
 * that vends the current Supabase session token (which refreshes automatically via
 * the Supabase client singleton).
 *
 * Tool responses are typed as `unknown` at the MCP layer — each helper function
 * casts the result to the correct shape so callers get full type safety.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { StreamableHTTPClientTransportOptions } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// MCP endpoint URL
// ---------------------------------------------------------------------------

function getMcpUrl(): string {
  if (typeof window === "undefined") {
    return "/mcp";
  }
  return `${window.location.origin}/mcp`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal subset of OAuthTokens needed by the provider interface. */
interface SparkOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

/**
 * Minimal OAuthClientProvider that provides the current Supabase session token.
 * - `tokens()` reads from the live Supabase singleton (auto-refreshes).
 * - `redirectUrl` returns `undefined` so no interactive browser redirect is triggered.
 * - All other methods are stubs required by the interface.
 */
class SupabaseSessionProvider implements OAuthClientProvider {
  get redirectUrl(): string | URL | undefined {
    return undefined;
  }

  get clientMetadataUrl(): string {
    return "";
  }

  get clientMetadata() {
    return {
      redirect_uris: [] as string[],
      grant_types: ["authorization_code", "refresh_token"] as string[],
      client_name: "spark-mcp-client",
    };
  }

  state(): string {
    return crypto.randomUUID();
  }

  clientInformation(): undefined {
    return undefined;
  }

  async tokens(): Promise<SparkOAuthTokens | undefined> {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return undefined;

    return {
      access_token: token,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: data.session?.refresh_token ?? "",
    };
  }

  async saveTokens(_tokens: SparkOAuthTokens): Promise<void> {
    // Tokens are managed by the Supabase singleton; nothing to persist here.
  }

  async redirectToAuthorization(_authorizationUrl: URL): Promise<void> {
    // No interactive redirect needed — we always have a session token.
    throw new Error(
      "No Supabase session found. Please sign in to use Brain tools."
    );
  }

  async saveCodeVerifier(_codeVerifier: string): Promise<void> {
    // No PKCE needed when using a pre-existing session token.
  }

  async codeVerifier(): Promise<string> {
    return "";
  }

  validateResourceURL(_serverUrl: string | URL, _resource?: string): Promise<URL | undefined> {
    return Promise.resolve(new URL(getMcpUrl()));
  }
}

// ---------------------------------------------------------------------------
// Singleton transport + client
// ---------------------------------------------------------------------------

let _transport: StreamableHTTPClientTransport | undefined;
let _client: Client | undefined;
let _connectionPromise: Promise<void> | undefined;
let _provider: SupabaseSessionProvider | undefined;

async function ensureConnection(): Promise<void> {
  if (_client && _transport) return;

  _provider = new SupabaseSessionProvider();

  const url = new URL(getMcpUrl());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: StreamableHTTPClientTransportOptions = {
    authProvider: _provider as unknown as OAuthClientProvider,
  };

  _transport = new StreamableHTTPClientTransport(url, opts);
  _client = new Client({ name: "spark-mcp-client", version: "1.0.0" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _connectionPromise = _client.connect(_transport as any);
  await _connectionPromise;
}

async function getClient(): Promise<Client> {
  await ensureConnection();
  return _client!;
}

// ---------------------------------------------------------------------------
// Typed brain helpers
// ---------------------------------------------------------------------------

/** Type guard: content[0] from callTool is always a text content block in our server. */
interface McpTextResult {
  content: Array<{ type: "text"; text?: string }>;
  isError?: boolean;
}

// ----- search_notes -----

export interface SearchNotesResult {
  notes: Array<{
    id: string;
    title: string;
    path: string;
    excerpt: string;
    backlinks: number;
    updatedAt: string;
  }>;
  query: string;
}

export async function searchNotes(query: string, limit = 10): Promise<SearchNotesResult> {
  await ensureConnection();
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.callTool(
    { name: "search_notes", arguments: { query, limit } },
    undefined,
    {} as any
  ) as McpTextResult;
  return JSON.parse(result.content[0]?.text ?? "{}") as SearchNotesResult;
}

// ----- get_note -----

export interface NoteLink {
  text: string | null;
  path: string | null;
  resolvedTitle: string | null;
  mediaPath: string | null;
  isEmbedded: boolean;
}

export interface GetNoteResult {
  id: string;
  title: string;
  path: string;
  content: string | undefined;
  contentOmitted: boolean;
  frontmatter: Record<string, unknown>;
  isStarred: boolean;
  hasDriveCopy: boolean;
  createdAt: string;
  updatedAt: string;
  links: NoteLink[];
  backlinks: Array<{ id: string; title: string; path: string }>;
}

export async function getNote(opts: {
  path?: string;
  id?: string;
  includeContent?: boolean;
}): Promise<GetNoteResult> {
  await ensureConnection();
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.callTool(
    { name: "get_note", arguments: {
      path: opts.path,
      id: opts.id,
      includeContent: opts.includeContent ?? true,
    } },
    undefined,
    {} as any
  ) as McpTextResult;
  return JSON.parse(result.content[0]?.text ?? "{}") as GetNoteResult;
}

// ----- get_brain_context -----

export interface BrainContextResult {
  topic: string;
  notes: Array<{
    id: string;
    title: string;
    path: string;
    content: string;
    frontmatter: Record<string, unknown>;
    relevance: number;
    updatedAt: string;
  }>;
  neighbours: Array<{
    id: string;
    title: string;
    path: string;
    excerpt: string;
  }>;
}

export async function getBrainContext(
  topic: string,
  maxNotes = 3,
  maxNeighbours = 8,
  excerptChars = 400
): Promise<BrainContextResult> {
  await ensureConnection();
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.callTool(
    { name: "get_brain_context", arguments: { topic, maxNotes, maxNeighbours, excerptChars } },
    undefined,
    {} as any
  ) as McpTextResult;
  return JSON.parse(result.content[0]?.text ?? "{}") as BrainContextResult;
}

// ----- list_tasks -----

export interface BrainTask {
  id: string;
  text: string;
  isDone: boolean;
  dueDate: string | null;
  tags: string[];
  fromNote: string | null;
}

export interface ListTasksResult {
  tasks: BrainTask[];
  count: number;
}

export async function listTasks(
  isDone?: boolean,
  dueDate?: string,
  limit = 30
): Promise<ListTasksResult> {
  await ensureConnection();
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.callTool(
    { name: "list_tasks", arguments: { isDone, dueDate, limit } },
    undefined,
    {} as any
  ) as McpTextResult;
  return JSON.parse(result.content[0]?.text ?? "{}") as ListTasksResult;
}

// ----- toggle_task -----

export interface ToggleTaskResult {
  id: string;
  text: string;
  is_done: boolean;
}

export async function toggleTask(id: string, isDone?: boolean): Promise<ToggleTaskResult> {
  await ensureConnection();
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.callTool(
    { name: "toggle_task", arguments: { id, isDone } },
    undefined,
    {} as any
  ) as McpTextResult;
  return JSON.parse(result.content[0]?.text ?? "{}") as ToggleTaskResult;
}

// ----- log_mood -----

export interface LogMoodResult {
  entry_date: string;
  value: number;
  note: string | null;
  updated_at: string;
}

export async function logMood(
  date: string,
  value: number,
  note?: string
): Promise<LogMoodResult> {
  await ensureConnection();
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.callTool(
    { name: "log_mood", arguments: { date, value, note } },
    undefined,
    {} as any
  ) as McpTextResult;
  return JSON.parse(result.content[0]?.text ?? "{}") as LogMoodResult;
}

// ----- get_agenda -----

export interface WorkSession {
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  label: string | null;
}

export interface AgendaResult {
  date: string;
  tasks: BrainTask[];
  openCount: number;
  doneCount: number;
  mood: { value: number; note: string | null } | null;
  work: { minutes: number; sessions: WorkSession[] };
}

export async function getAgenda(
  date: string,
  includeCompleted = true
): Promise<AgendaResult> {
  await ensureConnection();
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.callTool(
    { name: "get_agenda", arguments: { date, includeCompleted } },
    undefined,
    {} as any
  ) as McpTextResult;
  return JSON.parse(result.content[0]?.text ?? "{}") as AgendaResult;
}

// ---------------------------------------------------------------------------
// Connection status (for UI)
// ---------------------------------------------------------------------------

export type McpConnectionState = "idle" | "connecting" | "connected" | "error";

let _connectionState: McpConnectionState = "idle";
let _connectionError: string | undefined;

export function getMcpConnectionState(): {
  state: McpConnectionState;
  error: string | undefined;
} {
  return { state: _connectionState, error: _connectionError };
}

export async function reconnectMcp(): Promise<void> {
  _connectionState = "connecting";
  _connectionError = undefined;
  _transport = undefined;
  _client = undefined;
  _connectionPromise = undefined;
  try {
    await ensureConnection();
    _connectionState = "connected";
  } catch (err) {
    _connectionState = "error";
    _connectionError = err instanceof Error ? err.message : "Connection failed";
    throw err;
  }
}
