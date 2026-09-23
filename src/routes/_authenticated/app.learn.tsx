import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Eye,
  HelpCircle,
  Lightbulb,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
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

export const Route = createFileRoute("/_authenticated/app/learn")({
  head: () => ({
    meta: [
      { title: "Lernen & Spaced Repetition — Spark" },
      { name: "description", content: "Spaced Repetition, Resurface und fundierte Wissensabfrage." },
    ],
  }),
  component: LearnPage,
});

export interface RecallCard {
  id: string;
  question: string;
  answer: string;
  source: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string; // ISO
}

export function LearnPage() {
  const [activeTab, setActiveTab] = useState<"recall" | "ask">("recall");

  // Recall Cards State
  const [cards, setCards] = useState<RecallCard[]>(() => {
    const today = new Date().toISOString();
    return getLocalData<RecallCard[]>("spark_recall", [
      {
        id: "1",
        question: "Warum darf Vitamin D3 niemals isoliert ohne Vitamin K2 eingenommen werden?",
        answer: "Weil D3 die Kalziumaufnahme drastisch erhöht. Ohne K2 lagert sich dieses Kalzium in den Blutgefäßen und Nieren ab (Arterienverkalkung & Nierensteine). K2 transportiert das Kalzium gezielt in Knochen und Zähne.",
        source: "Gesundheit.txt (Fabian Kowallik)",
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: today,
      },
      {
        id: "2",
        question: "Welche Magnesium-Formen sollten morgens und abends gewählt werden, und wovon wird abgeraten?",
        answer: "Morgens: Magnesiumcitrat (unterstützt Verdauung & Energie). Abends: Magnesiumbisglycinat (beruhigt das Nervensystem & fördert Tiefschlaf). Strikt meiden: billiges Magnesiumoxid und -carbonat, da kaum resorbierbar.",
        source: "Gesundheit.txt (Fabian Kowallik)",
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: today,
      },
      {
        id: "3",
        question: "Warum ist synthetische Folsäure bei ca. 50 % der Menschen bedenklich?",
        answer: "Aufgrund des verbreiteten MTHFR-Gendefekts kann der Körper synthetische Folsäure nicht effizient umwandeln. Sie akkumuliert im Blut und kann Entartungsprozesse fördern. Die bioaktive Form ist Methylfolat.",
        source: "Gesundheit.txt (Fabian Kowallik)",
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: today,
      },
    ]);
  });

  // Current card index in review
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // New card form
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newSource, setNewSource] = useState("");

  // Grounded Ask State (NotebookLM style)
  const [searchQuery, setSearchQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState<{ answer: string; sources: string[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    void pullFromSupabase<RecallCard[]>("spark_recall", cards).then((remote) => {
      if (remote && remote.length > 0) setCards(remote);
    });
  }, []);

  function saveCards(newCards: RecallCard[]) {
    setCards(newCards);
    setLocalAndSyncData("spark_recall", newCards);
  }

  // Handle Spaced Repetition Rating
  function handleRateCard(grade: "again" | "good" | "easy") {
    const card = cards[currentIndex];
    if (!card) return;

    let nextInterval = card.intervalDays;
    let nextRepetitions = card.repetitions;
    let nextEase = card.easeFactor;

    if (grade === "again") {
      nextInterval = 1;
      nextRepetitions = 0;
      nextEase = Math.max(1.3, nextEase - 0.2);
    } else if (grade === "good") {
      nextRepetitions += 1;
      nextInterval = nextRepetitions === 1 ? 2 : Math.round(nextInterval * nextEase);
    } else if (grade === "easy") {
      nextRepetitions += 1;
      nextEase += 0.15;
      nextInterval = Math.round(nextInterval * nextEase * 1.3);
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextInterval);

    const updatedCard: RecallCard = {
      ...card,
      intervalDays: nextInterval,
      repetitions: nextRepetitions,
      easeFactor: nextEase,
      nextReviewDate: nextDate.toISOString(),
    };

    const updatedCards = [...cards];
    updatedCards[currentIndex] = updatedCard;
    saveCards(updatedCards);

    setShowAnswer(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      toast.success("Alle fälligen Karten für heute wiederholt!");
      setCurrentIndex(0);
    }
  }

  function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const card: RecallCard = {
      id: crypto.randomUUID(),
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      source: newSource.trim() || "Persönliche Notiz",
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
    };

    saveCards([...cards, card]);
    setNewQuestion("");
    setNewAnswer("");
    setNewSource("");
    toast.success("Lernkarte hinzugefügt!");
  }

  // Grounded search across stored cards and notes
  function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const matched = cards.filter(
        (c) =>
          c.question.toLowerCase().includes(q) ||
          c.answer.toLowerCase().includes(q) ||
          c.source.toLowerCase().includes(q)
      );

      if (matched.length > 0) {
        setAiAnswer({
          answer: matched.map((m) => m.answer).join("\n\n"),
          sources: matched.map((m) => m.source),
        });
      } else {
        setAiAnswer({
          answer: `Zu "${searchQuery}" wurden in deinen verifizierten Dokumenten keine direkten Belege gefunden. Um Halluzinationen zu vermeiden, wird keine unbelegte Aussage generiert.`,
          sources: [],
        });
      }
      setIsSearching(false);
    }, 600);
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Wissen & Spaced Repetition
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wiederhole Kernkonzepte nach wissenschaftlichem Recall und befrage deine Notizen ohne Halluzinationen.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          <Button
            size="sm"
            variant={activeTab === "recall" ? "default" : "ghost"}
            onClick={() => setActiveTab("recall")}
            className="text-xs gap-1.5"
          >
            <Brain className="h-3.5 w-3.5" /> Recall ({cards.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "ask" ? "default" : "ghost"}
            onClick={() => setActiveTab("ask")}
            className="text-xs gap-1.5"
          >
            <Lightbulb className="h-3.5 w-3.5" /> Fundierte Q&A
          </Button>
        </div>
      </div>

      {/* ----------------- TAB: SPACED REPETITION RECALL ----------------- */}
      {activeTab === "recall" && (
        <div className="space-y-6">
          {cards.length > 0 && currentCard ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-float space-y-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-3">
                <span className="font-mono">
                  Karte {currentIndex + 1} von {cards.length}
                </span>
                <span className="rounded bg-secondary px-2 py-0.5 font-medium text-foreground text-[11px]">
                  Quelle: {currentCard.source}
                </span>
              </div>

              {/* Question */}
              <div className="space-y-2">
                <div className="text-xs uppercase font-mono tracking-wider text-accent font-semibold">
                  Frage
                </div>
                <h3 className="font-display font-medium text-lg text-foreground leading-relaxed">
                  {currentCard.question}
                </h3>
              </div>

              {/* Answer toggle */}
              {showAnswer ? (
                <div className="space-y-3 rounded-lg border border-border/70 bg-secondary/30 p-4 transition-all animate-in fade-in">
                  <div className="text-xs uppercase font-mono tracking-wider text-emerald-800 font-semibold">
                    Fundierte Antwort
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {currentCard.answer}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAnswer(true)}
                  variant="outline"
                  className="w-full py-6 text-sm gap-2 border-dashed border-border hover:bg-secondary/40"
                >
                  <Eye className="h-4 w-4 text-accent" />
                  Antwort aufdecken
                </Button>
              )}

              {/* Rating Buttons */}
              {showAnswer && (
                <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
                  <Button
                    onClick={() => handleRateCard("again")}
                    variant="outline"
                    className="border-destructive/30 hover:bg-destructive/10 text-destructive text-xs"
                  >
                    Nochmal (1 Tag)
                  </Button>
                  <Button
                    onClick={() => handleRateCard("good")}
                    variant="outline"
                    className="border-accent/40 hover:bg-accent/10 text-accent text-xs"
                  >
                    Gut ({Math.round(currentCard.intervalDays * currentCard.easeFactor)} Tage)
                  </Button>
                  <Button
                    onClick={() => handleRateCard("easy")}
                    className="bg-primary text-primary-foreground text-xs"
                  >
                    Einfach ({Math.round(currentCard.intervalDays * currentCard.easeFactor * 1.3)} Tage)
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Keine Lernkarten vorhanden. Erstelle jetzt deine erste Karte unten.
            </div>
          )}

          {/* New Card Form */}
          <form onSubmit={handleAddCard} className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4">
            <div className="font-display font-medium text-sm text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-accent" />
              <span>Neue Wissenskarte anlegen</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Frage / Reizwort</Label>
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="z. B. Was bewirkt Schwarzkümmelöl im Körper?"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Antwort (Präzise & belegt)</Label>
                <Textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Kernaussage, Mechanismus, Dosierung..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Quelle (Buch, Video, Datei)</Label>
                <Input
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="z. B. Gesundheit.txt oder Deep Work"
                />
              </div>
            </div>

            <Button type="submit" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Karte speichern
            </Button>
          </form>
        </div>
      )}

      {/* ----------------- TAB: GROUNDED NOTEBOOKLM Q&A ----------------- */}
      {activeTab === "ask" && (
        <div className="space-y-6">
          <form onSubmit={handleAsk} className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4">
            <div className="flex items-center gap-2 font-display text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Frage an deine Wissensquellen stellen</span>
            </div>

            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="z. B. Welche Supplements senken stille Entzündungen?"
                className="text-sm"
              />
              <Button type="submit" size="sm" disabled={isSearching} className="gap-1.5 shrink-0">
                <Search className="h-4 w-4" />
                {isSearching ? "Wird geprüft..." : "Abfragen"}
              </Button>
            </div>
          </form>

          {aiAnswer && (
            <div className="rounded-xl border border-accent/30 bg-card p-6 shadow-panel space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="font-display font-medium text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Grounded Antwort
                </span>
                {aiAnswer.sources.length > 0 && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Gefunden in: {Array.from(new Set(aiAnswer.sources)).join(", ")}
                  </span>
                )}
              </div>

              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {aiAnswer.answer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
