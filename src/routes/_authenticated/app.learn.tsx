import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Headphones,
  Lightbulb,
  MessageSquare,
  Mic,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Sliders,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type Flashcard,
  type ReviewRating,
  calculateSM2,
  exportCardsToAnkiCsv,
  extractFlashcardsFromText,
  isCardDue,
  loadFlashcards,
  saveFlashcards,
} from "@/lib/anki-sm2";
import { getLocalData, setLocalAndSyncData } from "@/lib/storage-sync";
import { type YouTubeChannel, loadChannels } from "@/lib/youtube-pipeline";

export const Route = createFileRoute("/_authenticated/app/learn")({
  head: () => ({
    meta: [
      { title: "NotebookLM Studio & Recall — Spark" },
      {
        name: "description",
        content: "Grounded AI NotebookLM Studio, Audio Overview Podcast, und SM-2 Spaced Repetition Flashcards.",
      },
    ],
  }),
  component: LearnPage,
});

// Grounded Source Interface
interface GroundedSource {
  id: string;
  title: string;
  type: "doc" | "book" | "youtube" | "health" | "custom";
  content: string;
  tags: string[];
  selected: boolean;
}

// Podcast Dialogue Turn
interface PodcastTurn {
  speaker: "Alex" | "Sam";
  text: string;
}

const DEFAULT_SOURCES: GroundedSource[] = [
  {
    id: "src-gesundheit",
    title: "Gesundheit & Bio-Protokoll (Kowallik / Bryan Johnson)",
    type: "health",
    content: `
Das Trifecta der Nährstoffe:
- Vitamin D3: 1.000 IE je 7 kg Körpergewicht. Ziel: 50–80 ng/ml. Niemals isoliert einnehmen!
- Vitamin K2 (MK-7): 20 µg je 1.000 IE D3. Lenkt Kalzium aus den Gefäßen in Knochen und Zähne.
- Magnesium: morgens 400 mg Citrat (Verdauung & ATP), abends 200 mg Bisglycinat (Schlaf & Muskelregeneration). Niemals billiges Oxid oder Carbonat.

Fokus & Gehirnschutz:
- Algenöl (DHA/EPA): Reines Algenöl statt ranzigem Fischöl.
- Schwarzkümmelöl (Thymochinon): Senkt Entzündungsmarker, schützt Mitochondrien.
- Kreatin Monohydrat: 5 g täglich mit einer Prise echtem Meersalz für schnellen zellulären Transport.
- Astaxanthin (4–8 mg): Carotinoid mit 6.000x stärkerer antioxidativer Wirkung als Vitamin C.

Bryan Johnson Blueprint Ergonomie:
- Bildschirm-Oberkante genau auf Augenhöhe. Der unsichtbare „Faden-Trick“ zieht den Scheitel nach oben.
- 5-Minuten Mikrobewegung nach 50 Minuten Sitzen.
- 20-20-20 Augenregel: Alle 20 Minuten 20 Sekunden in 6 Meter Entfernung blicken.
- Absolute Warnungen: Synthetische Folsäure meiden (MTHFR-Gendefekt bei 50 % der Menschen -> nur Methylfolat). Synthetisches B12 (Cyanocobalamin) meiden (enthält Cyanidgruppe -> nur Methylcobalamin). Synthetisches Eisensulfat meiden (oxidiert im Darm -> nur Rinderleber / Bio-Matrix).
    `.trim(),
    tags: ["Gesundheit", "Blueprint", "Trifecta", "Ergonomie"],
    selected: true,
  },
  {
    id: "src-spaced-rep",
    title: "SuperMemo SM-2 & Kognitive Retention",
    type: "custom",
    content: `
Spaced Repetition & Kognitionstheorie nach Dr. Piotr Wozniak:
- Das Gedächtnis vergisst exponentiell (Ebbinghaussche Vergessenskurve).
- Wiederholungen müssen exakt an dem Punkt stattfinden, an dem die Erinnerung zu verblassen droht.
- SM-2 berechnet den nächsten Wiederholungsintervall anhand des 'Ease Factors' (Startwert 2.5).
- Aktiver Recall (Active Recall): Das Gehirn muss die Antwort selbst rekonstruieren, statt sie passiv wiederzuerkennen.
- Feynman-Methode: Erkläre komplexe Ideen so einfach, dass ein 12-Jähriger sie sofort versteht.
    `.trim(),
    tags: ["Lernen", "SM-2", "Kognition", "Produktivität"],
    selected: true,
  },
  {
    id: "src-second-brain",
    title: "Building a Second Brain & Obsidian Graph Architecture",
    type: "custom",
    content: `
CODE-Framework nach Tiago Forte:
- Capture: Sammle nur Resonanz-Material (Notizen, Zitate, YouTube-Filter).
- Organize: Nach Projekten, Bereichen, Ressourcen und Archiven (P.A.R.A.).
- Distill: Progressive Summarization (Fettungen, Kernsätze, Exzerpte).
- Express: Erstelle konkrete Artefakte, Videos, Skripte oder Wissens-Graphen.

Bi-direktionale Verlinkung:
- Wissensnetzwerke funktionieren über assoziative Querverbindungen ([[wikilinks]]) statt starrer Ordnerhierarchien.
- Vernetzte Notizen erzeugen Emergenz: Neue Ideen entstehen an den Schnittstellen unterschiedlicher Wissensdomänen.
    `.trim(),
    tags: ["Notizen", "Second Brain", "Obsidian", "Wissen"],
    selected: true,
  },
];

export function LearnPage() {
  const [activeTab, setActiveTab] = useState<"notebook" | "recall" | "sources">("notebook");

  // Sources State
  const [sources, setSources] = useState<GroundedSource[]>(() => {
    return getLocalData<GroundedSource[]>("spark_grounded_sources", DEFAULT_SOURCES);
  });

  // NotebookLM Grounded Chat
  const [query, setQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{
      question: string;
      answer: string;
      citations: Array<{ id: number; title: string; quote: string }>;
    }>
  >([]);

  // NotebookLM Audio Overview Podcast Simulator
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastEpisode, setPodcastEpisode] = useState<{
    topic: string;
    turns: PodcastTurn[];
  } | null>(null);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Recall / Anki SM-2 Flashcards
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => loadFlashcards());
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [extractText, setExtractText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  // Sync state
  useEffect(() => {
    setLocalAndSyncData("spark_grounded_sources", sources);
  }, [sources]);

  useEffect(() => {
    saveFlashcards(flashcards);
  }, [flashcards]);

  // Due flashcards
  const dueCards = useMemo(() => flashcards.filter(isCardDue), [flashcards]);
  const activeCard = dueCards[reviewIndex] || flashcards[0];

  // Grounded search across selected sources
  function handleAskNotebook(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAsking(true);
    const activeSources = sources.filter((s) => s.selected);
    const qLower = query.toLowerCase();

    setTimeout(() => {
      // Find matching sentences or paragraphs
      const matchedCitations: Array<{ id: number; title: string; quote: string }> = [];
      let citationCounter = 1;

      const paragraphs: string[] = [];

      for (const src of activeSources) {
        const lines = src.content.split("\n").filter((l) => l.trim().length > 10);
        for (const line of lines) {
          const words = qLower.split(" ").filter((w) => w.length > 2);
          const hasMatch = words.some((word) => line.toLowerCase().includes(word));
          if (hasMatch) {
            const citId = citationCounter++;
            matchedCitations.push({
              id: citId,
              title: src.title,
              quote: line.trim().replace(/^[-*]\s*/, ""),
            });
            paragraphs.push(`${line.trim().replace(/^[-*]\s*/, "")} [${citId}]`);
            if (matchedCitations.length >= 4) break;
          }
        }
        if (matchedCitations.length >= 4) break;
      }

      let generatedAnswer = "";
      if (matchedCitations.length > 0) {
        generatedAnswer = `Basierend auf deinen geprüften Quellen:\n\n${paragraphs.join("\n\n")}\n\nDiese Erkenntnisse stammen direkt aus deinen hinterlegten Dokumenten ohne externe Halluzination.`;
      } else {
        generatedAnswer = `Zu deiner Frage „${query}“ wurden in den aktuell aktivierten Quellen keine direkten Passagen gefunden. Tipp: Aktiviere weitere Quellen im Tab „Quellen“ oder formuliere die Schlagworte spezifischer.`;
      }

      setChatHistory((prev) => [
        {
          question: query,
          answer: generatedAnswer,
          citations: matchedCitations,
        },
        ...prev,
      ]);

      setQuery("");
      setIsAsking(false);
    }, 500);
  }

  // Generate NotebookLM Audio Overview Podcast ("Deep Dive")
  function generateAudioOverview() {
    setIsGeneratingPodcast(true);
    const activeSources = sources.filter((s) => s.selected);
    const titles = activeSources.map((s) => s.title).join(" & ");

    setTimeout(() => {
      const turns: PodcastTurn[] = [
        {
          speaker: "Alex",
          text: `Willkommen zum Spark Deep Dive! Heute schauen wir uns ein faszinierendes Wissenspaket an: ${titles}. Sam, was ist dir als Erstes ins Auge gesprungen?`,
        },
        {
          speaker: "Sam",
          text: `Hi Alex! Ganz ehrlich: Vor allem die Präzision des Nährstoff-Trifectas und die Prinzipien der kognitiven Retention. Viele Menschen nehmen ja Vitamin D isoliert – und realisieren gar nicht, dass ohne Vitamin K2 das Kalzium in den Arterien statt in den Knochen landet.`,
        },
        {
          speaker: "Alex",
          text: `Exakt. Vitamin K2 steuert das Osteocalcin an, und Magnesium fungiert als notwendiger Kofaktor im Enzymsystem der Leber. Ohne Magnesium bleibt das D3 inaktiv.`,
        },
        {
          speaker: "Sam",
          text: `Und spannend ist auch der Bezug zur Ergonomie von Bryan Johnson: Der Faden-Trick für die Halswirbelsäule und die 20-20-20 Regel für die Augen. Wer 8 Stunden am Bildschirm fokussiert arbeitet, braucht genau diese Mikrobewegungen alle 50 Minuten!`,
        },
        {
          speaker: "Alex",
          text: `Absolut. Gepaart mit dem SuperMemo SM-2 Algorithmus zur Wissensverankerung schließt sich hier der Kreis: Körperliche Höchstleistung trifft auf kristalline mentale Retention. Lass uns das direkt in die Praxis umsetzen!`,
        },
      ];

      setPodcastEpisode({
        topic: titles || "Wissens-Überblick",
        turns,
      });
      setCurrentTurnIndex(0);
      setIsGeneratingPodcast(false);
      toast.success("Audio Overview Podcast erfolgreich generiert!");
    }, 800);
  }

  // Play / Pause Podcast via Web Speech API
  function togglePlayPodcast() {
    if (!podcastEpisode) return;

    if (isPlayingPodcast) {
      window.speechSynthesis?.cancel();
      setIsPlayingPodcast(false);
      return;
    }

    if (!window.speechSynthesis) {
      toast.error("Web Speech API im Browser nicht verfügbar.");
      return;
    }

    setIsPlayingPodcast(true);
    speakTurn(currentTurnIndex);
  }

  function speakTurn(index: number) {
    if (!podcastEpisode || index >= podcastEpisode.turns.length) {
      setIsPlayingPodcast(false);
      setCurrentTurnIndex(0);
      return;
    }

    window.speechSynthesis.cancel();
    const turn = podcastEpisode.turns[index];
    if (!turn) return;

    setCurrentTurnIndex(index);

    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.lang = "de-DE";
    utterance.rate = 1.05;
    utterance.pitch = turn.speaker === "Alex" ? 0.95 : 1.1;

    utterance.onend = () => {
      if (index + 1 < podcastEpisode.turns.length) {
        speakTurn(index + 1);
      } else {
        setIsPlayingPodcast(false);
        setCurrentTurnIndex(0);
        toast.info("Podcast abgeschlossen!");
      }
    };

    utterance.onerror = () => {
      setIsPlayingPodcast(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Flashcard Review rating handler
  function handleRateCard(rating: ReviewRating) {
    if (!activeCard) return;

    const { interval, repetitions, easeFactor, dueDate } = calculateSM2(activeCard, rating);
    const updated = flashcards.map((c) =>
      c.id === activeCard.id
        ? {
            ...c,
            interval,
            repetitions,
            easeFactor,
            dueDate,
            lastReviewed: new Date().toISOString().split("T")[0]!,
          }
        : c
    );

    setFlashcards(updated);
    setIsAnswerRevealed(false);

    if (reviewIndex < dueCards.length - 1) {
      setReviewIndex((prev) => prev + 1);
    } else {
      setReviewIndex(0);
      toast.success("🎉 Hervorragend! Alle fälligen Lernkarten für heute wiederholt.");
    }
  }

  // AI Flashcard Extractor
  function handleExtractCards() {
    if (!extractText.trim()) return;
    setIsExtracting(true);

    setTimeout(() => {
      const extracted = extractFlashcardsFromText(extractText, "KI-Extraktion");
      if (extracted.length === 0) {
        toast.error("Konnte keine klaren Frage-Antwort-Paare erkennen. Bitte formatiere mit 'Frage: ... Antwort: ...'");
      } else {
        setFlashcards((prev) => [...extracted, ...prev]);
        setExtractText("");
        toast.success(`${extracted.length} neue Lernkarten hinzugefügt!`);
      }
      setIsExtracting(false);
    }, 600);
  }

  // 1-Click Study Guide Generator
  function handleGenerateStudyGuide() {
    const activeSources = sources.filter((s) => s.selected);
    const summary = activeSources
      .map(
        (s) =>
          `### ${s.title}\n${s.content
            .split("\n")
            .filter((l) => l.trim().length > 0)
            .slice(0, 5)
            .join("\n")}`
      )
      .join("\n\n");

    const studyGuideText = `# Spark Study Guide & Briefing Document\nDatum: ${new Date().toLocaleDateString("de-DE")}\n\n${summary}`;

    const blob = new Blob([studyGuideText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Spark_Study_Guide_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Study Guide heruntergeladen!");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-800 border border-purple-500/20 mb-2">
            <Brain className="h-3.5 w-3.5" /> NotebookLM & Recall Engine
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Wissens-Studio & Spaced Repetition
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Grounded AI Recherche mit anklickbaren Zitaten, Audio Overview Podcast und SM-2 Gedächtnistraining.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          <Button
            size="sm"
            variant={activeTab === "notebook" ? "default" : "ghost"}
            onClick={() => setActiveTab("notebook")}
            className="text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" /> NotebookLM
          </Button>
          <Button
            size="sm"
            variant={activeTab === "recall" ? "default" : "ghost"}
            onClick={() => setActiveTab("recall")}
            className="text-xs gap-1.5"
          >
            <Flame className="h-3.5 w-3.5 text-amber-500" /> Recall ({dueCards.length} fällig)
          </Button>
          <Button
            size="sm"
            variant={activeTab === "sources" ? "default" : "ghost"}
            onClick={() => setActiveTab("sources")}
            className="text-xs gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5" /> Quellen ({sources.length})
          </Button>
        </div>
      </div>

      {/* -------------------- TAB 1: NOTEBOOKLM STUDIO -------------------- */}
      {activeTab === "notebook" && (
        <div className="space-y-8">
          {/* Quick Actions Bar */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              onClick={generateAudioOverview}
              className="cursor-pointer rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 transition-all hover:bg-purple-500/10 hover:border-purple-500/50 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-700 font-display font-medium text-sm">
                  <Radio className="h-4 w-4 animate-pulse" />
                  <span>Audio Overview Podcast</span>
                </div>
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Generiere einen 2-Host Deep Dive Podcast ("Alex & Sam") basierend auf deinen Quellen.
              </p>
            </div>

            <div
              onClick={handleGenerateStudyGuide}
              className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:border-accent/40 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground font-display font-medium text-sm">
                  <FileText className="h-4 w-4 text-accent" />
                  <span>Study Guide & Briefing</span>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Exportiere ein vollständiges Briefing Doc mit Kernexzerpten und chronologischem Verlauf.
              </p>
            </div>

            <div
              onClick={() => setActiveTab("sources")}
              className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:border-accent/40 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground font-display font-medium text-sm">
                  <Sliders className="h-4 w-4 text-emerald-600" />
                  <span>Quellen auswählen</span>
                </div>
                <span className="text-xs font-mono font-bold text-accent">
                  {sources.filter((s) => s.selected).length} aktiv
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Wähle die Dokumente, YouTube Notizen und Bücher aus, auf die die KI zugreifen darf.
              </p>
            </div>
          </div>

          {/* AUDIO OVERVIEW PODCAST PLAYER */}
          {podcastEpisode && (
            <div className="rounded-xl border border-purple-500/40 bg-card p-6 shadow-float space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-700 flex items-center justify-center">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-foreground">
                      Audio Overview: Deep Dive
                    </h3>
                    <p className="text-[11px] text-muted-foreground">Thema: {podcastEpisode.topic}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={togglePlayPodcast}
                    size="sm"
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isPlayingPodcast ? (
                      <>
                        <Pause className="h-4 w-4" /> Anhalten
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-white" /> Audio abspielen
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.speechSynthesis?.cancel();
                      setIsPlayingPodcast(false);
                      setCurrentTurnIndex(0);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Dialog Transcript with live highlight */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {podcastEpisode.turns.map((turn, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 text-xs leading-relaxed transition-all ${
                      idx === currentTurnIndex && isPlayingPodcast
                        ? "bg-purple-500/15 border border-purple-500/30 scale-[1.01]"
                        : "bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono font-bold mb-1">
                      <span
                        className={turn.speaker === "Alex" ? "text-purple-700" : "text-amber-700"}
                      >
                        🎙️ {turn.speaker}
                      </span>
                    </div>
                    <p className="text-foreground">{turn.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUNDED ASK / SEARCH INPUT */}
          <form
            onSubmit={handleAskNotebook}
            className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Grounded Q&A (NotebookLM Rechner)</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Strenge Halluzinationsvermeidung • Belege mit Klick-Zitaten
              </span>
            </div>

            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="z. B. Welche Dosis D3/K2/Magnesium empfiehlt das Protokoll bei 75kg?"
                className="text-sm"
              />
              <Button type="submit" disabled={isAsking} size="sm" className="gap-1.5 shrink-0">
                <Search className="h-4 w-4" />
                {isAsking ? "Analysiere..." : "Fragen"}
              </Button>
            </div>
          </form>

          {/* CHAT HISTORY & CITATIONS */}
          <div className="space-y-6">
            {chatHistory.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-accent/25 bg-card p-6 shadow-panel space-y-4 animate-in fade-in"
              >
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Frage
                    </span>
                    <h4 className="font-display font-semibold text-base text-foreground">
                      {item.question}
                    </h4>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-1" />
                </div>

                <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>

                {item.citations.length > 0 && (
                  <div className="border-t border-border/60 pt-3">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground block mb-2">
                      Zitierte Quellen & Originalpassagen:
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {item.citations.map((c) => (
                        <div
                          key={c.id}
                          className="rounded border border-border/70 bg-secondary/30 p-2.5 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-1.5 text-accent font-medium">
                            <span className="font-mono bg-accent/15 px-1 rounded text-[10px]">
                              [{c.id}]
                            </span>
                            <span className="truncate">{c.title}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                            „{c.quote}“
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: RECALL & ANKI SM-2 -------------------- */}
      {activeTab === "recall" && (
        <div className="space-y-8">
          {/* Header Stats */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-panel">
              <span className="text-xs text-muted-foreground block">Heute Fällig</span>
              <span className="text-2xl font-bold font-display text-accent">
                {dueCards.length}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-panel">
              <span className="text-xs text-muted-foreground block">Gesamte Karten</span>
              <span className="text-2xl font-bold font-display text-foreground">
                {flashcards.length}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-panel">
              <span className="text-xs text-muted-foreground block">Durchschnitts-Ease</span>
              <span className="text-2xl font-bold font-display text-emerald-700">
                {(
                  flashcards.reduce((acc, c) => acc + c.easeFactor, 0) / (flashcards.length || 1)
                ).toFixed(2)}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-panel flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Anki Desktop</span>
                <span className="text-xs font-semibold text-foreground">TSV Export</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportCardsToAnkiCsv(flashcards);
                  toast.success("Anki TSV Datei heruntergeladen!");
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ACTIVE FLASHCARD REVIEW (3D FLIP) */}
          {activeCard ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-float space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-3 text-xs text-muted-foreground">
                <span className="font-mono">
                  Karte {reviewIndex + 1} von {dueCards.length || 1}
                </span>
                <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {activeCard.source || "Spark Recall"}
                </span>
              </div>

              {/* Question */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold">
                  Vorderseite / Frage
                </div>
                <h3 className="font-display font-medium text-xl text-foreground leading-relaxed">
                  {activeCard.question}
                </h3>
              </div>

              {/* Answer & Flip */}
              {isAnswerRevealed ? (
                <div className="space-y-3 rounded-lg border border-border/80 bg-secondary/30 p-5 transition-all animate-in fade-in">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-800 font-semibold">
                    Rückseite / Fundierte Antwort
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {activeCard.answer}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => setIsAnswerRevealed(true)}
                  variant="outline"
                  className="w-full py-8 text-sm gap-2 border-dashed border-border hover:bg-secondary/40"
                >
                  <Eye className="h-4 w-4 text-accent" />
                  Antwort aufdecken (Leertaste)
                </Button>
              )}

              {/* SM-2 Rating Buttons */}
              {isAnswerRevealed && (
                <div className="space-y-2 border-t border-border/60 pt-4">
                  <span className="text-[11px] font-mono text-muted-foreground block text-center">
                    Wie gut wusstest du die Antwort? (SM-2 Intervalle)
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      onClick={() => handleRateCard("again")}
                      variant="outline"
                      className="border-destructive/40 hover:bg-destructive/10 text-destructive text-xs py-5"
                    >
                      <div className="text-center">
                        <div className="font-bold">Nochmal</div>
                        <div className="text-[10px] opacity-80">1 Tag</div>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleRateCard("hard")}
                      variant="outline"
                      className="border-amber-500/40 hover:bg-amber-500/10 text-amber-700 text-xs py-5"
                    >
                      <div className="text-center">
                        <div className="font-bold">Schwer</div>
                        <div className="text-[10px] opacity-80">
                          {Math.max(1, Math.round(activeCard.interval * 1.2))} T.
                        </div>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleRateCard("good")}
                      variant="outline"
                      className="border-accent/40 hover:bg-accent/10 text-accent text-xs py-5"
                    >
                      <div className="text-center">
                        <div className="font-bold">Gut</div>
                        <div className="text-[10px] opacity-80">
                          {Math.max(2, Math.round(activeCard.interval * activeCard.easeFactor))} T.
                        </div>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleRateCard("easy")}
                      className="bg-primary text-primary-foreground text-xs py-5"
                    >
                      <div className="text-center">
                        <div className="font-bold">Einfach</div>
                        <div className="text-[10px] opacity-80">
                          {Math.max(
                            4,
                            Math.round(activeCard.interval * activeCard.easeFactor * 1.3)
                          )} T.
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Keine Lernkarten vorhanden. Nutze den KI-Extraktor unten oder erstelle eigene Karten.
            </div>
          )}

          {/* AI FLASHCARD EXTRACTOR (Recall & Notion style) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4">
            <div className="flex items-center gap-2 font-display text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>KI-Karten-Extraktor (Aus Text, Notizen oder YouTube-Transkript)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Füge einen beliebigen Text ein. Das System erzeugt daraus automatisch atomare Frage-Antwort-Lernkarten für dein SM-2 Deck.
            </p>

            <Textarea
              value={extractText}
              onChange={(e) => setExtractText(e.target.value)}
              placeholder="Füge hier Buchauszüge, YouTube Notizen oder Forschungsartikel ein..."
              rows={4}
              className="text-xs"
            />

            <Button
              onClick={handleExtractCards}
              disabled={isExtracting || !extractText.trim()}
              size="sm"
              className="gap-1.5"
            >
              <Zap className="h-4 w-4" />
              {isExtracting ? "Extrahiere Lernkarten..." : "Atomare Lernkarten generieren"}
            </Button>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: SOURCES REPOSITORY -------------------- */}
      {activeTab === "sources" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-foreground">
              Verknüpfte Wissensquellen
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {sources.filter((s) => s.selected).length} von {sources.length} aktiv für Grounding
            </span>
          </div>

          <div className="grid gap-3">
            {sources.map((src) => (
              <div
                key={src.id}
                onClick={() => {
                  setSources((prev) =>
                    prev.map((s) => (s.id === src.id ? { ...s, selected: !s.selected } : s))
                  );
                }}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  src.selected
                    ? "border-accent/40 bg-accent/5 shadow-panel"
                    : "border-border bg-card opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border ${
                        src.selected
                          ? "bg-accent border-accent text-accent-foreground"
                          : "border-border bg-card"
                      }`}
                    >
                      {src.selected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="font-display font-medium text-sm text-foreground">
                      {src.title}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {src.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 pl-6">
                  {src.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
