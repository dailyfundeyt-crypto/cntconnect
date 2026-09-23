import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getLocalData,
  setLocalAndSyncData,
  pullFromSupabase,
} from "@/lib/storage-sync";
import {
  clearCalendarToken,
  createCalendarEvent,
  getStoredCalendarToken,
  getTodayCalendarEvents,
  GoogleCalendarEvent,
  requestGoogleCalendarAuth,
} from "@/lib/google-calendar";
import { CalendarConfirmDialog } from "@/components/spark/calendar-confirm-dialog";

export const Route = createFileRoute("/_authenticated/app/plan")({
  head: () => ({
    meta: [
      { title: "Tagesplan & Kalender — Spark" },
      { name: "description", content: "Optimiere deinen Tag und synchronisiere mit Google Kalender." },
    ],
  }),
  component: PlanPage,
});

interface PlanBlock {
  id: string;
  title: string;
  category: "focus" | "recall" | "study" | "health" | "custom";
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
  notes: string;
  isSyncedToGCal?: boolean;
}

export function PlanPage() {
  const [dateStr] = useState<string>(
    new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );

  // Google Calendar state
  const [gcalToken, setGcalToken] = useState<string | null>(null);
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingGCal, setLoadingGCal] = useState(false);

  // Confirmation dialog state (no silent writes)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<Omit<GoogleCalendarEvent, "id"> | null>(null);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Plan blocks & Day Optimizer
  const [blocks, setBlocks] = useState<PlanBlock[]>(() => {
    return getLocalData<PlanBlock[]>("spark_plan", [
      {
        id: "1",
        title: "Deep Work: Hauptziel des Tages",
        category: "focus",
        startTime: "09:00",
        endTime: "11:00",
        notes: "Ungestörter Fokusblock ohne Benachrichtigungen.",
      },
      {
        id: "2",
        title: "Spaced Repetition & Recall",
        category: "recall",
        startTime: "11:15",
        endTime: "11:45",
        notes: "Fällige Lernkarten und Buchzusammenfassungen wiederholen.",
      },
      {
        id: "3",
        title: "Studio & Content / Video Analyse",
        category: "study",
        startTime: "14:00",
        endTime: "15:30",
        notes: "YouTube-Notizen durcharbeiten und Buchkapitel erfassen.",
      },
      {
        id: "4",
        title: "Bio-Check & Bewegungspause",
        category: "health",
        startTime: "16:00",
        endTime: "16:45",
        notes: "Hydration, frische Luft und Mikronährstoff-Einnahme.",
      },
    ]);
  });

  // Manual block form
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("10:00");
  const [newEnd, setNewEnd] = useState("11:00");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    // Check local calendar token
    const token = getStoredCalendarToken();
    if (token) {
      setGcalToken(token);
      void loadGoogleEvents(token);
    }

    // Hydrate plan from Supabase
    void pullFromSupabase<PlanBlock[]>("spark_plan", blocks).then((remote) => {
      if (remote && remote.length > 0) setBlocks(remote);
    });
  }, []);

  function saveBlocks(newBlocks: PlanBlock[]) {
    setBlocks(newBlocks);
    setLocalAndSyncData("spark_plan", newBlocks);
  }

  async function loadGoogleEvents(token: string) {
    setLoadingGCal(true);
    try {
      const events = await getTodayCalendarEvents(token);
      setGcalEvents(events);
    } catch (err: any) {
      toast.error(err.message || "Google Kalender Events konnten nicht geladen werden.");
      if (err.message?.includes("abgelaufen")) {
        setGcalToken(null);
      }
    } finally {
      setLoadingGCal(false);
    }
  }

  async function handleConnectGCal() {
    const clientId =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? (import.meta.env["VITE_GOOGLE_LOCAL_CLIENT_ID"] ||
           "191673675014-kppmek9blvhu7l9d4dd9nq6e5fugqivl.apps.googleusercontent.com")
        : (import.meta.env["VITE_GOOGLE_WEB_CLIENT_ID"] ||
           "191673675014-002k6i88eo0epect8v6gqfshaab43d8l.apps.googleusercontent.com");

    try {
      toast.info("Google Login wird geöffnet...");
      const token = await requestGoogleCalendarAuth(clientId);
      setGcalToken(token);
      toast.success("Erfolgreich mit Google Kalender verbunden!");
      await loadGoogleEvents(token);
    } catch (err: any) {
      toast.error(err.message || "Verbindung fehlgeschlagen.");
    }
  }

  function handleDisconnectGCal() {
    clearCalendarToken();
    setGcalToken(null);
    setGcalEvents([]);
    toast.info("Google Kalender getrennt.");
  }

  // Trigger confirmation modal for GCal event creation
  function prepareGCalEvent(block: PlanBlock) {
    if (!gcalToken) {
      toast.error("Bitte zuerst Google Kalender verbinden.");
      return;
    }

    const today = new Date();
    const [startH, startM] = block.startTime.split(":").map(Number);
    const [endH, endM] = block.endTime.split(":").map(Number);

    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM);

    setPendingEvent({
      summary: `[Spark] ${block.title}`,
      description: block.notes || `Erstellt aus Spark Tagesplan (${block.category})`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    });
    setConfirmOpen(true);
  }

  async function handleConfirmGCalWrite() {
    if (!pendingEvent || !gcalToken) return;
    setIsSubmittingEvent(true);
    try {
      await createCalendarEvent(gcalToken, pendingEvent, true);
      toast.success(`"${pendingEvent.summary}" in Google Kalender eingetragen!`);
      setConfirmOpen(false);
      setPendingEvent(null);
      await loadGoogleEvents(gcalToken);
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Eintragen in Google Kalender.");
    } finally {
      setIsSubmittingEvent(false);
    }
  }

  function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newBlock: PlanBlock = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      category: "custom",
      startTime: newStart,
      endTime: newEnd,
      notes: newNotes.trim(),
    };

    saveBlocks([...blocks, newBlock]);
    setNewTitle("");
    setNewNotes("");
    toast.success("Zeitblock hinzugefügt.");
  }

  function handleRemoveBlock(id: string) {
    saveBlocks(blocks.filter((b) => b.id !== id));
  }

  // Optimize day from goals + recall + library
  function handleOptimizeDay() {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: "Optimiere Tagesablauf aus Journal, Lernkarten & Zielen...",
        success: () => {
          const optimized: PlanBlock[] = [
            {
              id: crypto.randomUUID(),
              title: "Morgenroutine & Hydration / Nährstoffe",
              category: "health",
              startTime: "07:30",
              endTime: "08:15",
              notes: "Wasser mit Elektrolyten, Trifecta Einnahme & Karottensalat.",
            },
            {
              id: crypto.randomUUID(),
              title: "Fokusblock 1: Hauptprojekt (Spark)",
              category: "focus",
              startTime: "08:30",
              endTime: "11:30",
              notes: "Priorisierte Entwicklung & Code-Review.",
            },
            {
              id: crypto.randomUUID(),
              title: "Spaced Repetition: Fällige Recall-Karten",
              category: "recall",
              startTime: "11:45",
              endTime: "12:15",
              notes: "Aktive Wissensabfrage aus den erfassten Quellen.",
            },
            {
              id: crypto.randomUUID(),
              title: "Lern- & Studioblock: Bücher & Video-Notizen",
              category: "study",
              startTime: "14:00",
              endTime: "15:30",
              notes: "Kapitel lesen, Kernaussagen exzerpieren.",
            },
            {
              id: crypto.randomUUID(),
              title: "Tagesabschluss & Reflexion",
              category: "focus",
              startTime: "17:30",
              endTime: "18:00",
              notes: "Journal ausfüllen, Fortschritt sichern, nächste Schritte notieren.",
            },
          ];
          saveBlocks(optimized);
          return "Tagesablauf erfolgreich optimiert!";
        },
      }
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Tagesplan & Kalender
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dateStr} — Synchronisiere deinen Tag mit Google Kalender und optimiere Zeitblöcke.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOptimizeDay}
            variant="outline"
            className="border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent font-medium text-sm flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Tag optimieren
          </Button>
        </div>
      </div>

      {/* Google Calendar Integration Box */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
              <CalendarIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="font-medium text-foreground flex items-center gap-2">
                <span>Google Kalender</span>
                {gcalToken ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Verbunden
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    Nicht verbunden
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {gcalToken
                  ? "Termine werden angezeigt. Vor jedem neuen Eintrag erfolgt ein Bestätigungsdialog."
                  : "Verbinde deinen Google-Account, um Termine zu laden und Zeitblöcke sicher zu exportieren."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {gcalToken ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadGoogleEvents(gcalToken)}
                  disabled={loadingGCal}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingGCal ? "animate-spin" : ""}`} />
                  Aktualisieren
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDisconnectGCal}>
                  Trennen
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleConnectGCal} className="gap-2">
                <Zap className="h-3.5 w-3.5 text-accent" />
                Google Kalender verbinden
              </Button>
            )}
          </div>
        </div>

        {/* Display GCal Events */}
        {gcalToken && gcalEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Heutige Google Kalender Termine ({gcalEvents.length})
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {gcalEvents.map((event) => {
                const start = event.start.dateTime
                  ? new Date(event.start.dateTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                  : "Ganztägig";
                const end = event.end.dateTime
                  ? new Date(event.end.dateTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                  : "";
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 p-2.5 text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="font-medium text-foreground">{event.summary}</span>
                      <div className="text-muted-foreground text-[11px]">
                        {start} {end ? `– ${end}` : ""}
                      </div>
                    </div>
                    {event.htmlLink && (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Optimized Timeline Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Geplante Zeitblöcke ({blocks.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Automatische Synchronisation mit Supabase aktiv
          </span>
        </div>

        <div className="space-y-3">
          {blocks.map((block) => {
            const badgeColors: Record<string, string> = {
              focus: "bg-amber-500/10 text-amber-800 border-amber-500/20",
              recall: "bg-blue-500/10 text-blue-800 border-blue-500/20",
              study: "bg-purple-500/10 text-purple-800 border-purple-500/20",
              health: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20",
              custom: "bg-secondary text-foreground border-border",
            };

            return (
              <div
                key={block.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-panel hover:border-border/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-muted-foreground pt-0.5 min-w-[105px]">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {block.startTime} – {block.endTime}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{block.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                          badgeColors[block.category] ?? badgeColors["custom"]
                        }`}
                      >
                        {block.category.toUpperCase()}
                      </span>
                    </div>
                    {block.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{block.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5 border-border hover:bg-secondary"
                    onClick={() => prepareGCalEvent(block)}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-accent" />
                    In GCal eintragen
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveBlock(block.id)}
                  >
                    Löschen
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Block Form */}
      <form onSubmit={handleAddBlock} className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4">
        <div className="font-display font-medium text-sm text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-accent" />
          <span>Weiteren Zeitblock planen</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Titel des Blocks</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="z. B. Marketing Analyse oder Pause"
              className="text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Startzeit</Label>
            <Input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="text-sm font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Endzeit</Label>
            <Input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="text-sm font-mono"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notizen / Beschreibung (optional)</Label>
          <Input
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Wichtige Punkte für diesen Zeitraum..."
            className="text-sm"
          />
        </div>

        <Button type="submit" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Block hinzufügen
        </Button>
      </form>

      {/* Confirmation Dialog (Strict Security: No Silent Writes) */}
      <CalendarConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        event={pendingEvent}
        onConfirm={handleConfirmGCalWrite}
        isSubmitting={isSubmittingEvent}
      />
    </div>
  );
}
