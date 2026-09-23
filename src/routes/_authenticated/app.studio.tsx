import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Book,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Film,
  Flame,
  Globe,
  PenTool,
  Play,
  Plus,
  Quote,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  Video,
  Youtube,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EmbeddedVideoPlayer } from "@/components/spark/focustube/embedded-video-player";
import { YearActivityGrid } from "@/components/spark/focustube/year-activity-grid";
import { SkillProgress } from "@/components/spark/focustube/skill-progress";
import { WatchlistGrid } from "@/components/spark/focustube/watchlist-grid";
import { AddWatchlistVideo } from "@/components/spark/focustube/add-watchlist-video";
import { WatchedVideosTab } from "@/components/spark/focustube/watched-videos-tab";
import { CategoryManagement } from "@/components/spark/focustube/category-management";
import { AddChannelDialog } from "@/components/spark/focustube/add-channel-dialog";
import { ChannelGoalSettings } from "@/components/spark/focustube/channel-goal-settings";
import { getLocalData, setLocalAndSyncData } from "@/lib/storage-sync";
import {
  categorizeSkill,
  generateYouTubeScript,
  loadYouTubeChannels,
  loadYouTubeScripts,
  loadYouTubeVideos,
  saveYouTubeChannels,
  saveYouTubeScripts,
  saveYouTubeVideos,
  SKILL_CATEGORIES,
  syncYouTubeVideosToDatabase,
  type YouTubeChannel,
  type YouTubeScript,
  type YouTubeVideo,
} from "@/lib/youtube-pipeline";
import { parseAndCaptureContent } from "@/lib/xcapture";
import { createDocument, listSpaces } from "@/lib/spark";

export const Route = createFileRoute("/_authenticated/app/studio")({
  head: () => ({
    meta: [
      { title: "Content Studio & Lernen — Spark" },
      { name: "description", content: "Bookmory-Lesetracker, YouTube Focus Learning, KI-Scriptwriter und XCapture." },
    ],
  }),
  component: StudioPage,
});

export interface BookItem {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  readPages: number;
  status: "reading" | "completed" | "wishlist";
  notes: string;
  quotes: string[];
}

function StudioPage() {
  const [activeTab, setActiveTab] = useState<"books" | "youtube" | "scriptwriter" | "xcapture">("books");

  /* ---------- 1. BOOKS & READING SESSION (BOOKMORY / BOCKREADER) ---------- */
  const [books, setBooks] = useState<BookItem[]>(() => {
    return getLocalData<BookItem[]>("spark_library", [
      {
        id: "1",
        title: "Deep Work: Rules for Focused Success",
        author: "Cal Newport",
        totalPages: 304,
        readPages: 185,
        status: "reading",
        notes: "Konzentrierte Arbeit ohne Ablenkung als Superkraft der modernen Wirtschaft.",
        quotes: ["Klarheit darüber, was zählt, liefert Klarheit darüber, was ignoriert werden muss."],
      },
      {
        id: "2",
        title: "Atomic Habits",
        author: "James Clear",
        totalPages: 320,
        readPages: 320,
        status: "completed",
        notes: "1% besser jeden Tag — Systeme schlagen Ziele.",
        quotes: ["Du fällst nicht auf das Niveau deiner Ziele, sondern auf das deiner Systeme."],
      },
    ]);
  });

  // Reading Session Timer state
  const [readingTimerActive, setReadingTimerActive] = useState(false);
  const [readingTimerSeconds, setReadingTimerSeconds] = useState(0);
  const [sessionActiveBookId, setSessionActiveBookId] = useState<string | null>(null);
  const [sessionPagesRead, setSessionPagesRead] = useState<number>(0);

  useEffect(() => {
    let interval: number | null = null;
    if (readingTimerActive) {
      interval = window.setInterval(() => {
        setReadingTimerSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [readingTimerActive]);

  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [newBookPages, setNewBookPages] = useState<number>(300);

  function saveBooks(newBooks: BookItem[]) {
    setBooks(newBooks);
    setLocalAndSyncData("spark_library", newBooks);
  }

  function handleAddBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newBookTitle.trim()) return;

    const book: BookItem = {
      id: crypto.randomUUID(),
      title: newBookTitle.trim(),
      author: newBookAuthor.trim() || "Unbekannter Autor",
      totalPages: newBookPages || 100,
      readPages: 0,
      status: "reading",
      notes: "",
      quotes: [],
    };

    saveBooks([book, ...books]);
    setNewBookTitle("");
    setNewBookAuthor("");
    toast.success("Buch zur Bibliothek hinzugefügt!");
  }

  function updateBookProgress(id: string, delta: number) {
    const updated = books.map((b) => {
      if (b.id !== id) return b;
      const nextPages = Math.max(0, Math.min(b.totalPages, b.readPages + delta));
      const nextStatus = nextPages >= b.totalPages ? ("completed" as const) : b.status;
      return { ...b, readPages: nextPages, status: nextStatus };
    });
    saveBooks(updated);
  }

  function addQuoteToBook(bookId: string, quote: string) {
    if (!quote.trim()) return;
    const updated = books.map((b) => {
      if (b.id !== bookId) return b;
      return { ...b, quotes: [...b.quotes, quote.trim()] };
    });
    saveBooks(updated);
    toast.success("Zitat gespeichert!");
  }

  /* ---------- 2. YOUTUBE LEARNING PIPELINE (FOCUS-TUBE-FILTER) ---------- */
  const [channels, setChannels] = useState<YouTubeChannel[]>(() => loadYouTubeChannels());
  const [videos, setVideos] = useState<YouTubeVideo[]>(() => loadYouTubeVideos());
  const [focusTubeSubTab, setFocusTubeSubTab] = useState<"feed" | "watchlist" | "watched" | "analytics">("feed");
  const [activePlayerVideo, setActivePlayerVideo] = useState<{ id: string; title: string } | null>(null);
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>("all");

  const totalDailyGoal = channels.reduce((sum, c) => sum + (c.dailyGoal || 1), 0);
  const watchedTodayCount = videos.filter((v) => v.watched).length;
  const goalPercentage = totalDailyGoal > 0 ? Math.min(100, Math.round((watchedTodayCount / totalDailyGoal) * 100)) : 0;

  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelHandle, setNewChannelHandle] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoChannel, setNewVideoChannel] = useState("");
  const [newVideoNotes, setNewVideoNotes] = useState("");

  function extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1]! : "";
  }

  function handleAddChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    const category = categorizeSkill(newChannelName);
    const newCh: YouTubeChannel = {
      id: crypto.randomUUID(),
      name: newChannelName.trim(),
      handle: newChannelHandle.trim() || undefined,
      category,
      addedAt: new Date().toISOString(),
    };
    const next = [newCh, ...channels];
    setChannels(next);
    saveYouTubeChannels(next);
    setNewChannelName("");
    setNewChannelHandle("");
    toast.success(`Kanal hinzugefügt & als "${category}" kategorisiert!`);
  }

  function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) return;
    const category = categorizeSkill(newVideoTitle, newVideoChannel);
    const newVid: YouTubeVideo = {
      id: crypto.randomUUID(),
      channelId: "custom",
      channelName: newVideoChannel.trim() || "YouTube",
      title: newVideoTitle.trim(),
      url: newVideoUrl.trim(),
      category,
      notes: newVideoNotes.trim(),
      watched: false,
      addedAt: new Date().toISOString(),
    };
    const next = [newVid, ...videos];
    setVideos(next);
    saveYouTubeVideos(next);
    setNewVideoTitle("");
    setNewVideoUrl("");
    setNewVideoNotes("");
    toast.success("Video erfasst!");
  }

  async function handleSyncToDatabase() {
    try {
      const spaces = await listSpaces();
      const spaceId = spaces[0]?.id || "";
      if (!spaceId) {
        toast.error("Kein aktiver Space gefunden");
        return;
      }
      const col = await syncYouTubeVideosToDatabase(spaceId, videos);
      toast.success(`Tabelle „${col.name}“ erfolgreich in Spark Datenbank erstellt!`);
    } catch (err) {
      toast.error("Konnte Tabelle nicht erstellen");
    }
  }

  /* ---------- 3. YOUTUBE SCRIPTWRITER ---------- */
  const [scripts, setScripts] = useState<YouTubeScript[]>(() => loadYouTubeScripts());
  const [scriptTopic, setScriptTopic] = useState("");
  const [scriptNotes, setScriptNotes] = useState("");

  function handleCreateScript(e: React.FormEvent) {
    e.preventDefault();
    if (!scriptTopic.trim()) return;

    const generated = generateYouTubeScript({
      topic: scriptTopic.trim(),
      notes: scriptNotes.trim(),
    });

    const next = [generated, ...scripts];
    setScripts(next);
    saveYouTubeScripts(next);
    setScriptTopic("");
    setScriptNotes("");
    toast.success("YouTube-Skript mit Hook, Retention & Framework generiert!");
  }

  /* ---------- 4. XCAPTURE (WEB ARTICLE TO OBSIDIAN MARKDOWN) ---------- */
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [captureTitle, setCaptureTitle] = useState("");

  async function handleCaptureArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!captureText.trim() && !captureUrl.trim()) {
      toast.error("Bitte URL oder Text eingeben");
      return;
    }

    const captured = parseAndCaptureContent({
      text: captureText || `Inhalt aus ${captureUrl}`,
      url: captureUrl || undefined,
      customTitle: captureTitle || undefined,
    });

    try {
      const spaces = await listSpaces();
      const spaceId = spaces[0]?.id || "";
      if (spaceId) {
        await createDocument({
          spaceId,
          title: captured.title,
          content: captured.markdown,
        });
        toast.success(`Artikel als Obsidian-Notiz „${captured.title}“ gespeichert!`);
        setCaptureUrl("");
        setCaptureText("");
        setCaptureTitle("");
      }
    } catch {
      toast.error("Konnte Notiz nicht speichern");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Content Studio &amp; Wissens-Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bookmory-Lesetracker, YouTube Focus Learning, KI-Scriptwriter und XCapture Article Importer.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1 overflow-x-auto max-w-full">
          <Button
            size="sm"
            variant={activeTab === "books" ? "default" : "ghost"}
            onClick={() => setActiveTab("books")}
            className="text-xs gap-1.5 shrink-0 whitespace-nowrap"
          >
            <BookOpen className="h-3.5 w-3.5" /> Bücher &amp; Reader
          </Button>
          <Button
            size="sm"
            variant={activeTab === "youtube" ? "default" : "ghost"}
            onClick={() => setActiveTab("youtube")}
            className="text-xs gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Youtube className="h-3.5 w-3.5 text-red-500" /> Focus-Tube
          </Button>
          <Button
            size="sm"
            variant={activeTab === "scriptwriter" ? "default" : "ghost"}
            onClick={() => setActiveTab("scriptwriter")}
            className="text-xs gap-1.5 shrink-0 whitespace-nowrap"
          >
            <PenTool className="h-3.5 w-3.5 text-accent" /> KI-Scriptwriter
          </Button>
          <Button
            size="sm"
            variant={activeTab === "xcapture" ? "default" : "ghost"}
            onClick={() => setActiveTab("xcapture")}
            className="text-xs gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Globe className="h-3.5 w-3.5 text-sky-500" /> XCapture
          </Button>
        </div>
      </div>

      {/* ----------------- TAB 1: BOOKS (BOOKMORY / BOCKREADER) ----------------- */}
      {activeTab === "books" && (
        <div className="space-y-6">
          {/* Active Reading Stopwatch Bar */}
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-accent" />
              <div>
                <div className="font-semibold text-xs text-foreground">Aktive Lese-Session</div>
                <div className="font-mono text-2xl font-bold text-accent">
                  {Math.floor(readingTimerSeconds / 60)}:{(readingTimerSeconds % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={readingTimerActive ? "outline" : "default"}
                onClick={() => setReadingTimerActive(!readingTimerActive)}
                className="text-xs"
              >
                {readingTimerActive ? "Timer anhalten" : "Session starten"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReadingTimerActive(false);
                  setReadingTimerSeconds(0);
                }}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* New Book Form */}
          <form onSubmit={handleAddBook} className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4">
            <div className="font-display font-medium text-sm text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-accent" />
              <span>Neues Buch zur Leseliste hinzufügen</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Buchtitel</Label>
                <Input
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  placeholder="z. B. Deep Work, Atomic Habits..."
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Autor</Label>
                <Input
                  value={newBookAuthor}
                  onChange={(e) => setNewBookAuthor(e.target.value)}
                  placeholder="z. B. Cal Newport"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gesamtseiten</Label>
                <Input
                  type="number"
                  value={newBookPages}
                  onChange={(e) => setNewBookPages(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" type="submit" className="text-xs">
                Buch hinzufügen
              </Button>
            </div>
          </form>

          {/* Books Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {books.map((book) => {
              const percent = Math.round((book.readPages / book.totalPages) * 100);
              return (
                <div
                  key={book.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-panel space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-display font-semibold text-base text-foreground">
                          {book.title}
                        </div>
                        <div className="text-xs text-muted-foreground">{book.author}</div>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold border uppercase",
                          book.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-800 border-emerald-500/30"
                            : "bg-secondary text-muted-foreground border-border"
                        )}
                      >
                        {book.status === "completed" ? "Gelesen" : "Am Lesen"}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>
                          {book.readPages} / {book.totalPages} Seiten
                        </span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-accent h-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Fast Page Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => updateBookProgress(book.id, 5)}
                      >
                        +5 S.
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => updateBookProgress(book.id, 10)}
                      >
                        +10 S.
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => updateBookProgress(book.id, 25)}
                      >
                        +25 S.
                      </Button>
                    </div>

                    {/* Quotes section */}
                    {book.quotes.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-border/60">
                        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Quote className="h-3 w-3 text-accent" /> Zitate ({book.quotes.length})
                        </div>
                        {book.quotes.map((q, idx) => (
                          <blockquote
                            key={idx}
                            className="border-l-2 border-accent pl-2 text-xs italic text-muted-foreground"
                          >
                            „{q}“
                          </blockquote>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add quote input */}
                  <div className="pt-2 border-t border-border/40 flex items-center gap-2">
                    <Input
                      id={`quote-input-${book.id}`}
                      placeholder="Neues Zitat eintragen..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addQuoteToBook(book.id, e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => saveBooks(books.filter((b) => b.id !== book.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: YOUTUBE LEARNING (FOCUS-TUBE-FILTER SUITE) ----------------- */}
      {activeTab === "youtube" && (
        <div className="space-y-6">
          {/* Top Control Bar with Sub-Tabs and Daily Goal Progress */}
          <div className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-panel space-y-4 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-500" /> Focus-Tube Learning Suite
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Ablenkungsfreie Videos, echte Watchlist, 365-Tage Lern-Heatmap &amp; Skill-Tracking.
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/40 p-1 overflow-x-auto max-w-full">
                <Button
                  size="sm"
                  variant={focusTubeSubTab === "feed" ? "default" : "ghost"}
                  onClick={() => setFocusTubeSubTab("feed")}
                  className="h-8 text-xs gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <Film className="h-3.5 w-3.5" /> Feed &amp; Kanäle
                </Button>
                <Button
                  size="sm"
                  variant={focusTubeSubTab === "watchlist" ? "default" : "ghost"}
                  onClick={() => setFocusTubeSubTab("watchlist")}
                  className="h-8 text-xs gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Watchlist
                </Button>
                <Button
                  size="sm"
                  variant={focusTubeSubTab === "watched" ? "default" : "ghost"}
                  onClick={() => setFocusTubeSubTab("watched")}
                  className="h-8 text-xs gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Gesehen
                </Button>
                <Button
                  size="sm"
                  variant={focusTubeSubTab === "analytics" ? "default" : "ghost"}
                  onClick={() => setFocusTubeSubTab("analytics")}
                  className="h-8 text-xs gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <Zap className="h-3.5 w-3.5 text-accent" /> Analytics &amp; Heatmap
                </Button>
              </div>
            </div>

            {/* Daily Goal & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-border/50 text-xs">
              <div className="flex-1 max-w-md space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tages-Lernziel:</span>
                  <span className="font-semibold text-foreground">
                    {watchedTodayCount} von {totalDailyGoal} Videos ({goalPercentage}%)
                  </span>
                </div>
                <Progress value={goalPercentage} className="h-2" />
              </div>

              <div className="flex items-center gap-2">
                <AddChannelDialog
                  onChannelAdded={(newChan) => {
                    const next = [newChan, ...channels];
                    setChannels(next);
                    saveYouTubeChannels(next);
                  }}
                />
                <Button size="sm" variant="ghost" onClick={handleSyncToDatabase} className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                  <Database className="h-3.5 w-3.5 text-accent" /> In DB sichern
                </Button>
              </div>
            </div>
          </div>

          {/* SUB-TAB 1: FEED & CHANNELS */}
          {focusTubeSubTab === "feed" && (
            <div className="space-y-6">
              {/* Channel Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Button
                  size="sm"
                  variant={selectedChannelFilter === "all" ? "default" : "outline"}
                  onClick={() => setSelectedChannelFilter("all")}
                  className="h-7 text-xs rounded-full"
                >
                  Alle Kanäle ({videos.length})
                </Button>
                {channels.map((ch) => (
                  <div key={ch.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
                    <button
                      onClick={() => setSelectedChannelFilter(ch.name)}
                      className={cn(
                        "font-medium transition-colors hover:text-primary",
                        selectedChannelFilter === ch.name ? "text-primary font-bold" : "text-foreground"
                      )}
                    >
                      {ch.name}
                    </button>
                    <span className="text-[10px] text-muted-foreground font-mono">({ch.category})</span>
                    <ChannelGoalSettings
                      channelId={ch.id}
                      channelName={ch.name}
                      currentGoal={ch.dailyGoal || 1}
                      onGoalUpdate={(newGoal) => {
                        const updated = channels.map((c) => (c.id === ch.id ? { ...c, dailyGoal: newGoal } : c));
                        setChannels(updated);
                        saveYouTubeChannels(updated);
                      }}
                    />
                    <button
                      onClick={() => {
                        const next = channels.filter((c) => c.id !== ch.id);
                        setChannels(next);
                        saveYouTubeChannels(next);
                        if (selectedChannelFilter === ch.name) setSelectedChannelFilter("all");
                      }}
                      className="text-muted-foreground hover:text-destructive ml-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Video Form */}
              <form onSubmit={handleAddVideo} className="rounded-2xl border border-border bg-card/80 p-5 shadow-panel space-y-3">
                <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-accent" /> Neues Lern-Video erfassen
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    placeholder="Video-Titel..."
                    className="text-xs"
                    required
                  />
                  <Input
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="YouTube-URL (watch?v=... oder youtu.be/...)"
                    className="text-xs"
                    required
                  />
                  <Input
                    value={newVideoChannel}
                    onChange={(e) => setNewVideoChannel(e.target.value)}
                    placeholder="Kanalname (optional)"
                    className="text-xs"
                  />
                </div>
                <Textarea
                  value={newVideoNotes}
                  onChange={(e) => setNewVideoNotes(e.target.value)}
                  placeholder="Kernideen, Notizen, Fazit oder wichtige Zeitstempel..."
                  rows={2}
                  className="text-xs"
                />
                <div className="flex justify-end">
                  <Button size="sm" type="submit" className="text-xs">
                    Video speichern &amp; kategorisieren
                  </Button>
                </div>
              </form>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos
                  .filter((v) => selectedChannelFilter === "all" || v.channelName === selectedChannelFilter)
                  .map((vid) => {
                    const ytId = extractYouTubeId(vid.url);
                    const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : "";

                    return (
                      <Card
                        key={vid.id}
                        className="group overflow-hidden border-border/70 bg-card/70 backdrop-blur-sm transition-all hover:border-primary/50 flex flex-col justify-between"
                      >
                        <div>
                          {/* Thumbnail with Click-to-Play */}
                          <div
                            className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                            onClick={() => {
                              if (ytId) setActivePlayerVideo({ id: ytId, title: vid.title });
                              else window.open(vid.url, "_blank");
                            }}
                          >
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={vid.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground text-xs">
                                Kein Thumbnail
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                              <div className="h-10 w-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                                <Play className="h-5 w-5 fill-current ml-0.5" />
                              </div>
                            </div>
                            {vid.watched && (
                              <div className="absolute top-2 right-2 bg-emerald-500/90 text-white rounded-full p-1 shadow">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>

                          <div className="p-4 space-y-2">
                            <h3
                              className="font-medium text-sm line-clamp-2 text-foreground hover:text-primary cursor-pointer transition-colors"
                              onClick={() => {
                                if (ytId) setActivePlayerVideo({ id: ytId, title: vid.title });
                                else window.open(vid.url, "_blank");
                              }}
                            >
                              {vid.title}
                            </h3>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                              <span className="font-semibold text-foreground/80">{vid.channelName}</span>
                              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                {vid.category}
                              </span>
                            </div>

                            {vid.notes && (
                              <div className="rounded-lg bg-secondary/40 p-2 text-[11px] text-foreground font-mono leading-relaxed line-clamp-3">
                                {vid.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-4 pt-0 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                          <button
                            onClick={() => {
                              const next = videos.map((v) =>
                                v.id === vid.id ? { ...v, watched: !v.watched, watchedAt: !v.watched ? new Date().toISOString() : undefined } : v
                              );
                              setVideos(next);
                              saveYouTubeVideos(next);
                              toast.success(vid.watched ? "Als ungesehen markiert" : "Als gesehen markiert!");
                            }}
                            className={cn(
                              "flex items-center gap-1.5 font-medium transition-colors text-xs",
                              vid.watched ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {vid.watched ? "Gesehen" : "Abhaken"}
                          </button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const next = videos.filter((v) => v.id !== vid.id);
                              setVideos(next);
                              saveYouTubeVideos(next);
                              toast.success("Video entfernt");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: WATCHLIST */}
          {focusTubeSubTab === "watchlist" && <WatchlistGrid />}

          {/* SUB-TAB 3: WATCHED HISTORY */}
          {focusTubeSubTab === "watched" && <WatchedVideosTab />}

          {/* SUB-TAB 4: ANALYTICS, HEATMAP & CATEGORIES */}
          {focusTubeSubTab === "analytics" && (
            <div className="space-y-6">
              <YearActivityGrid />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Skill-Fortschritt nach Kategorien</h3>
                <SkillProgress />
              </div>
              <CategoryManagement />
            </div>
          )}

          {/* Distraction-Free Modal Player */}
          <EmbeddedVideoPlayer
            videoId={activePlayerVideo?.id || null}
            videoTitle={activePlayerVideo?.title || ""}
            onClose={() => setActivePlayerVideo(null)}
          />
        </div>
      )}

      {/* ----------------- TAB 3: AI SCRIPTWRITER ----------------- */}
      {activeTab === "scriptwriter" && (
        <div className="space-y-6">
          <form onSubmit={handleCreateScript} className="rounded-2xl border border-border bg-card p-6 shadow-panel space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="font-display font-semibold text-lg text-foreground">
                Automatischer YouTube-Skript-Generator
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Verwandelt erfasste Video-Erkenntnisse, Notizen oder Themen in ein virales Skript (Hook, Problem, 3 Kernpunkte mit Retention-Spikes, Takeaway &amp; CTA).
            </p>

            <div className="space-y-2">
              <Label className="text-xs">Thema oder Ziel des Videos</Label>
              <Input
                value={scriptTopic}
                onChange={(e) => setScriptTopic(e.target.value)}
                placeholder="z. B. Wie man programmieren lernt ohne Tutorial-Hell..."
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Zusätzliche Notizen / Frameworks</Label>
              <Textarea
                value={scriptNotes}
                onChange={(e) => setScriptNotes(e.target.value)}
                placeholder="Füge hier Notizen aus gelesenen Büchern oder YouTube-Videos ein..."
                rows={3}
                className="text-xs"
              />
            </div>

            <Button size="sm" type="submit" className="text-xs">
              Skript jetzt generieren
            </Button>
          </form>

          {/* Generated Scripts list */}
          <div className="space-y-6">
            {scripts.map((sc) => (
              <div
                key={sc.id}
                className="rounded-2xl border border-border bg-card p-6 shadow-panel space-y-5"
              >
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <h3 className="font-display font-bold text-lg text-foreground">{sc.title}</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => {
                      const fullText = `# ${sc.title}\n\n## Hook\n${sc.hook}\n\n## Problem\n${sc.problem}\n\n## Kernpunkte\n${sc.corePoints.map((c) => `### ${c.title}\n${c.visualCue}\n${c.explanation}`).join("\n\n")}\n\n## CTA\n${sc.callToAction}`;
                      void navigator.clipboard.writeText(fullText);
                      toast.success("Skript in Zwischenablage kopiert!");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Kopieren
                  </Button>
                </div>

                {/* Hook */}
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    ⚡ Hook (0 - 5 Sekunden)
                  </div>
                  <p className="text-xs text-foreground font-medium">{sc.hook}</p>
                </div>

                {/* Problem */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    🎯 Problem &amp; Relevanz (5 - 30 Sekunden)
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{sc.problem}</p>
                </div>

                {/* 3 Core Points */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    📚 Die 3 Kernpunkte
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {sc.corePoints.map((cp, idx) => (
                      <div key={idx} className="rounded-xl border border-border p-3.5 space-y-2 bg-secondary/30">
                        <div className="font-semibold text-xs text-foreground">{cp.title}</div>
                        <div className="text-[10px] text-accent font-mono">{cp.visualCue}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {cp.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to action */}
                <div className="rounded-xl bg-secondary/60 p-3 text-xs text-foreground flex items-center justify-between">
                  <span>📢 <strong>CTA:</strong> {sc.callToAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: XCAPTURE (WEB ARTICLE TO OBSIDIAN) ----------------- */}
      {activeTab === "xcapture" && (
        <div className="space-y-6">
          <form onSubmit={handleCaptureArticle} className="rounded-2xl border border-border bg-card p-6 shadow-panel space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-sky-500" />
              <h2 className="font-display font-semibold text-lg text-foreground">
                XCapture: Web-Artikel &amp; X-Posts erfassen
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Konvertiert beliebige Web-URLs, Artikel oder Rohtexte in saubere, Obsidian-fertige Markdown-Notizen mit Frontmatter, Tags und Kernaussagen.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Artikel-URL (optional)</Label>
                <Input
                  value={captureUrl}
                  onChange={(e) => setCaptureUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Eigener Titel (optional)</Label>
                <Input
                  value={captureTitle}
                  onChange={(e) => setCaptureTitle(e.target.value)}
                  placeholder="Titel vergeben..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Artikeltext / Inhalt</Label>
              <Textarea
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="Füge hier den Text des Artikels, Tweets oder Newsletters ein..."
                rows={6}
                className="text-xs font-mono"
              />
            </div>

            <Button size="sm" type="submit" className="text-xs">
              In Spark &amp; Obsidian-Notiz speichern
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
