import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  Brain,
  CheckSquare,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Smile,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAgenda,
  getMcpConnectionState,
  listTasks,
  reconnectMcp,
  searchNotes,
  toggleTask,
  type AgendaResult,
  type BrainTask,
  type SearchNotesResult,
} from "@/lib/mcp-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/brain")({
  head: () => ({
    meta: [
      { title: "Brain — Spark" },
      { name: "description", content: "Your Obsidian brain: tasks, mood, and notes from your daily view." },
    ],
  }),
  component: BrainPage,
});

function BrainPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0]!;
  const [searchQuery, setSearchQuery] = useState("");

  const { state: connState, error: connError } = getMcpConnectionState();

  const agendaQuery = useQuery<AgendaResult, Error>({
    queryKey: ["brain", "agenda", today],
    queryFn: () => getAgenda(today, true),
    retry: 1,
    retryDelay: 1000,
    staleTime: 30_000,
  });

  const tasksQuery = useQuery<{ tasks: BrainTask[]; count: number }, Error>({
    queryKey: ["brain", "tasks", today],
    queryFn: () => listTasks(undefined, today, 20),
    retry: 1,
    retryDelay: 1000,
    staleTime: 30_000,
  });

  const searchQuery_ = useQuery<SearchNotesResult, Error>({
    queryKey: ["brain", "search", searchQuery],
    queryFn: () => searchNotes(searchQuery, 8),
    enabled: searchQuery.trim().length >= 2,
    retry: 1,
    staleTime: 60_000,
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone?: boolean }) =>
      toggleTask(id, isDone),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brain"] });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: reconnectMcp,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brain"] });
    },
  });

  const isOffline = connState === "error" || connState === "idle";
  const agenda = agendaQuery.data;
  const tasks = tasksQuery.data?.tasks ?? [];
  const openTasks = tasks.filter((t) => !t.isDone);
  const doneTasks = tasks.filter((t) => t.isDone);

  return (
    <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Brain
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tasks, mood &amp; notes from your Obsidian vault.
            </p>
          </div>
        </div>

        {/* Connection indicator */}
        <ConnectionBadge
          state={connState}
          error={connError}
          onReconnect={() => reconnectMutation.mutate()}
          isRetrying={reconnectMutation.isPending}
        />
      </div>

      {/* Offline banner */}
      {isOffline && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Brain server is not connected.{" "}
            {connError ? `Error: ${connError}` : "Tasks and notes show cached data."}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
            onClick={() => reconnectMutation.mutate()}
            disabled={reconnectMutation.isPending}
          >
            {reconnectMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Retry
          </Button>
        </div>
      )}

      {/* Today's summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Open tasks */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold">Open tasks</span>
            <Badge variant="secondary" className="ml-auto font-mono text-xs">
              {openTasks.length}
            </Badge>
          </div>
          {agendaQuery.isLoading ? (
            <LoadingSkeleton />
          ) : isOffline && !agenda ? (
            <p className="text-xs text-muted-foreground">No cached data available.</p>
          ) : openTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open tasks for today.</p>
          ) : (
            <ul className="space-y-1.5">
              {openTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-start gap-2">
                  <button
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border border-muted-foreground/40 bg-transparent cursor-pointer"
                    onClick={() => toggleTaskMutation.mutate({ id: task.id })}
                    aria-label={`Mark "${task.text}" as done`}
                  />
                  <span className="text-sm line-clamp-2">{task.text}</span>
                </li>
              ))}
              {openTasks.length > 5 && (
                <li className="text-xs text-muted-foreground pl-6">
                  +{openTasks.length - 5} more
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Mood */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Smile className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold">Mood today</span>
          </div>
          {agendaQuery.isLoading ? (
            <LoadingSkeleton />
          ) : agenda?.mood ? (
            <div className="flex items-center gap-3">
              <MoodEmoji value={agenda.mood.value} />
              <div>
                <div className="text-2xl font-bold">{agenda.mood.value}/5</div>
                {agenda.mood.note && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{agenda.mood.note}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isOffline ? "No cached mood data." : "No mood logged today yet."}
            </p>
          )}
        </div>

        {/* Work time */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold">Work time</span>
          </div>
          {agendaQuery.isLoading ? (
            <LoadingSkeleton />
          ) : agenda ? (
            <div>
              <div className="text-2xl font-bold">
                {formatMinutes(agenda.work.minutes)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {agenda.work.sessions.length} session{agenda.work.sessions.length !== 1 ? "s" : ""} today
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isOffline ? "No cached data." : "No work sessions logged."}
            </p>
          )}
        </div>
      </div>

      {/* Search notes */}
      <div className="panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Search notes</span>
        </div>

        <Input
          placeholder="Search your Obsidian vault…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />

        {searchQuery.trim().length >= 2 && (
          <div className="space-y-2">
            {searchQuery_.isLoading ? (
              <LoadingSkeleton />
            ) : searchQuery_.data?.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes found for "{searchQuery}".</p>
            ) : (
              <ul className="space-y-2">
                {searchQuery_.data?.notes.map((note) => (
                  <li key={note.id}>
                    <button
                      className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-accent/40 hover:shadow-sm transition-all text-sm"
                      onClick={() => navigate({ to: "/app/brain/$noteId", params: { noteId: note.id } })}
                    >
                      <div className="font-medium text-foreground">{note.title || "Untitled"}</div>
                      {note.excerpt && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{note.excerpt}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                        <span>{note.path}</span>
                        {note.backlinks > 0 && (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {note.backlinks} link{note.backlinks !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Done tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Done today ({doneTasks.length})
          </h2>
          <ul className="space-y-1.5">
            {doneTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2">
                <button
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-accent bg-accent cursor-pointer"
                  onClick={() => toggleTaskMutation.mutate({ id: task.id })}
                  aria-label={`Unmark "${task.text}"`}
                >
                </button>
                <span className="text-sm text-muted-foreground line-through">{task.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View all tasks link */}
      <div className="text-center">
        <Link
          to="/app/plan"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          Open full Tagesplan <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConnectionBadge({
  state,
  error,
  onReconnect,
  isRetrying,
}: {
  state: string;
  error: string | undefined;
  onReconnect: () => void;
  isRetrying: boolean;
}) {
  if (state === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <Wifi className="h-3 w-3" /> Connected
      </span>
    );
  }
  if (state === "connecting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
      <AlertCircle className="h-3 w-3" />
      {error ? "Error" : "Not connected"}
    </span>
  );
}

function MoodEmoji({ value }: { value: number }) {
  const emojis = ["😢", "😕", "😐", "🙂", "😊"];
  return (
    <span className="text-3xl" role="img" aria-label={`Mood: ${value} out of 5`}>
      {emojis[Math.min(Math.max(value - 1, 0), 4)]}
    </span>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  );
}
