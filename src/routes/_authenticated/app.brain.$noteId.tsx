import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Star,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getNote,
  getMcpConnectionState,
  reconnectMcp,
  type GetNoteResult,
} from "@/lib/mcp-client";
import { MarkdownView } from "@/components/spark/markdown-view";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/brain/$noteId")({
  head: () => ({
    meta: [
      { title: "Note — Spark Brain" },
      { name: "description", content: "Read an Obsidian note with backlinks and outgoing links." },
    ],
  }),
  component: NotePage,
});

function NotePage() {
  const navigate = useNavigate();
  const { noteId } = Route.useParams();

  const { state: connState, error: connError } = getMcpConnectionState();

  const noteQuery = useQuery<GetNoteResult, Error>({
    queryKey: ["brain", "note", noteId],
    queryFn: () => getNote({ id: noteId, includeContent: true }),
    retry: 1,
    retryDelay: 1000,
    staleTime: 30_000,
    enabled: Boolean(noteId),
  });

  const isOffline = connState === "error" || connState === "idle";

  const note = noteQuery.data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10 space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
          <Link to="/app/brain">
            <ArrowLeft className="h-4 w-4" />
            Brain
          </Link>
        </Button>
      </div>

      {/* Offline banner */}
      {isOffline && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Brain server is offline. Showing cached data if available.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
            onClick={() => void reconnectMcp()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {noteQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading note…</p>
        </div>
      )}

      {/* Error state */}
      {noteQuery.isError && !noteQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">
            {noteQuery.error?.message ?? "Failed to load note."}
          </p>
          <Button variant="outline" size="sm" onClick={() => noteQuery.refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Try again
          </Button>
        </div>
      )}

      {/* Note content */}
      {note && (
        <>
          {/* Note header */}
          <div className="space-y-3 border-b border-border/80 pb-6">
            <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 text-accent shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {note.title || "Untitled"}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>{note.path}</span>
                  <span>·</span>
                  <span title={note.updatedAt}>
                    Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: de })}
                  </span>
                  {note.isStarred && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                    </span>
                  )}
                  {note.hasDriveCopy && (
                    <Badge variant="secondary" className="text-[10px]">
                      Google Drive
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Outgoing links */}
            {note.links.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground font-medium">Links to:</span>
                {note.links.map((link, i) => (
                  <button
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs text-accent hover:border-accent/40 hover:bg-accent/5 transition-colors"
                    onClick={() => {
                      if (link.resolvedTitle) {
                        // Navigate back to brain search for now (note IDs are UUIDs)
                        navigate({
                          to: "/app/brain",
                        });
                      }
                    }}
                  >
                    {link.text ?? link.resolvedTitle ?? link.path}
                    {link.isEmbedded && <span className="text-[10px] opacity-60 ml-0.5">◆</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note body */}
          <div className="min-w-0">
            <MarkdownView
              content={note.content ?? ""}
              className="spark-prose"
            />
          </div>

          {/* Backlinks */}
          {note.backlinks.length > 0 && (
            <div className="border-t border-border/80 pt-6 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Backlinks ({note.backlinks.length})
              </h2>
              <ul className="space-y-2">
                {note.backlinks.map((bl) => (
                  <li key={bl.id}>
                    <button
                      className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-accent/40 hover:shadow-sm transition-all text-sm"
                      onClick={() => navigate({ to: "/app/brain/$noteId", params: { noteId: bl.id } })}
                    >
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-accent" />
                        {bl.title || "Untitled"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono">{bl.path}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
