import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Book,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Film,
  FileText,
  Play,
  Plus,
  Quote,
  Trash2,
  Video,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getLocalData,
  setLocalAndSyncData,
  pullFromSupabase,
} from "@/lib/storage-sync";

export const Route = createFileRoute("/_authenticated/app/studio")({
  head: () => ({
    meta: [
      { title: "Content Studio & Bibliothek — Spark" },
      { name: "description", content: "Bookmory-Bücher-Tracker, YouTube Video-Erfassung und Notizen im ruhigen Papier-Design." },
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

export interface VideoItem {
  id: string;
  title: string;
  youtubeUrl: string;
  videoId: string;
  notes: string;
  timestamps: Array<{ time: string; label: string }>;
}

export function StudioPage() {
  const [activeTab, setActiveTab] = useState<"books" | "videos" | "drafts">("books");

  // Books State (Bookmory Style)
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

  // Videos State (YouTube Capture)
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    return [
      {
        id: "1",
        title: "Fabian Kowallik: Die Wahrheit über Nahrungsergänzung & Ernährung",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
        notes: "Ernährungs-Grundsätze, Trifecta (D3, K2, Magnesium) und Warnung vor synthetischem B12/Eisen.",
        timestamps: [
          { time: "03:15", label: "Warum D3 niemals ohne K2 genommen werden darf" },
          { time: "08:40", label: "Omega-3: Algenöl statt ranziges Fischöl" },
        ],
      },
    ];
  });

  // Form states
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [newBookPages, setNewBookPages] = useState<number>(300);

  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoNotes, setNewVideoNotes] = useState("");

  useEffect(() => {
    void pullFromSupabase<BookItem[]>("spark_library", books).then((remote) => {
      if (remote && remote.length > 0) setBooks(remote);
    });
  }, []);

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
    toast.success("Buch erfolgreich hinzugefügt!");
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

  function handleDeleteBook(id: string) {
    saveBooks(books.filter((b) => b.id !== id));
    toast.info("Buch gelöscht.");
  }

  // Extract YouTube ID
  function extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1]! : "";
  }

  function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    const videoId = extractYouTubeId(newVideoUrl);
    if (!videoId) {
      toast.error("Ungültige YouTube URL. Bitte Link überprüfen.");
      return;
    }

    const video: VideoItem = {
      id: crypto.randomUUID(),
      title: newVideoTitle.trim() || "YouTube Video",
      youtubeUrl: newVideoUrl.trim(),
      videoId,
      notes: newVideoNotes.trim(),
      timestamps: [],
    };

    setVideos([video, ...videos]);
    setNewVideoTitle("");
    setNewVideoUrl("");
    setNewVideoNotes("");
    toast.success("YouTube Video erfasst!");
  }

  function handleDeleteVideo(id: string) {
    setVideos(videos.filter((v) => v.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Content Studio & Bibliothek
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bookmory-Lesefortschritt, YouTube Video-Erfassung und Notizen im ruhigen Papier-Design.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          <Button
            size="sm"
            variant={activeTab === "books" ? "default" : "ghost"}
            onClick={() => setActiveTab("books")}
            className="text-xs gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5" /> Bücher
          </Button>
          <Button
            size="sm"
            variant={activeTab === "videos" ? "default" : "ghost"}
            onClick={() => setActiveTab("videos")}
            className="text-xs gap-1.5"
          >
            <Youtube className="h-3.5 w-3.5" /> YouTube
          </Button>
        </div>
      </div>

      {/* ----------------- TAB: BOOKS (BOOKMORY STYLE) ----------------- */}
      {activeTab === "books" && (
        <div className="space-y-6">
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
                  placeholder="z. B. Die 4-Stunden-Woche"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Autor</Label>
                <Input
                  value={newBookAuthor}
                  onChange={(e) => setNewBookAuthor(e.target.value)}
                  placeholder="z. B. Timothy Ferriss"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Gesamtseiten</Label>
                <Input
                  type="number"
                  value={newBookPages}
                  onChange={(e) => setNewBookPages(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>

            <Button type="submit" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Buch speichern
            </Button>
          </form>

          {/* Book Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {books.map((book) => {
              const percent = Math.round((book.readPages / book.totalPages) * 100);
              const isDone = book.readPages >= book.totalPages;

              return (
                <div
                  key={book.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-panel space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-semibold text-base text-foreground leading-snug">
                          {book.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          isDone
                            ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
                            : "bg-accent/10 text-accent border-accent/20"
                        }`}
                      >
                        {isDone ? "Gelesen" : `${percent}%`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                        <span>{book.readPages} Seiten</span>
                        <span>{book.totalPages} Seiten</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {book.notes && (
                      <p className="text-xs text-foreground/80 bg-secondary/30 p-2.5 rounded-lg border border-border/50 line-clamp-3">
                        {book.notes}
                      </p>
                    )}

                    {book.quotes && book.quotes.length > 0 && (
                      <div className="flex items-start gap-2 text-xs italic text-muted-foreground border-l-2 border-accent pl-2.5 pt-1">
                        <Quote className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />
                        <span>"{book.quotes[0]}"</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => updateBookProgress(book.id, -10)}
                        disabled={book.readPages <= 0}
                      >
                        -10
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => updateBookProgress(book.id, 10)}
                        disabled={book.readPages >= book.totalPages}
                      >
                        +10 S.
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => updateBookProgress(book.id, 25)}
                        disabled={book.readPages >= book.totalPages}
                      >
                        +25 S.
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive p-1"
                      onClick={() => handleDeleteBook(book.id)}
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

      {/* ----------------- TAB: YOUTUBE CAPTURE ----------------- */}
      {activeTab === "videos" && (
        <div className="space-y-6">
          {/* New Video Capture Form */}
          <form onSubmit={handleAddVideo} className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4">
            <div className="font-display font-medium text-sm text-foreground flex items-center gap-2">
              <Youtube className="h-4 w-4 text-accent" />
              <span>YouTube Video mit Notizen erfassen</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Video-Titel</Label>
                <Input
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  placeholder="z. B. Vortrag über Epigenetik & Ernährung"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">YouTube URL</Label>
                <Input
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Wichtige Kernaussagen / Zusammenfassung</Label>
              <Input
                value={newVideoNotes}
                onChange={(e) => setNewVideoNotes(e.target.value)}
                placeholder="Wichtigste Erkenntnisse, Referenzen, Dosierungen..."
              />
            </div>

            <Button type="submit" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Video speichern
            </Button>
          </form>

          {/* Videos List */}
          <div className="grid gap-6 sm:grid-cols-2">
            {videos.map((vid) => (
              <div
                key={vid.id}
                className="rounded-xl border border-border bg-card p-4 shadow-panel space-y-3"
              >
                {/* Embedded Video */}
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/5 border border-border">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${vid.videoId}`}
                    title={vid.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div>
                  <h3 className="font-display font-semibold text-sm text-foreground line-clamp-1">
                    {vid.title}
                  </h3>
                  {vid.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {vid.notes}
                    </p>
                  )}
                </div>

                {/* Timestamps */}
                {vid.timestamps.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Wichtige Zeitstempel
                    </span>
                    <div className="space-y-1">
                      {vid.timestamps.map((ts, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-foreground/80 bg-secondary/30 px-2 py-1 rounded"
                        >
                          <span className="font-mono text-[11px] text-accent font-semibold">{ts.time}</span>
                          <span className="truncate">{ts.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive p-1"
                    onClick={() => handleDeleteVideo(vid.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
