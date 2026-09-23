/**
 * Anki SuperMemo SM-2 Spaced Repetition Algorithm & Flashcard Engine.
 */

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  source?: string;
  tags?: string[];
  interval: number; // in days
  repetitions: number;
  easeFactor: number; // default 2.5
  dueDate: string; // YYYY-MM-DD
  lastReviewed: string | null;
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

export const LOCAL_FLASHCARDS_KEY = "spark_flashcards";

export function loadFlashcards(): Flashcard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_FLASHCARDS_KEY);
    if (!raw) return getDefaultFlashcards();
    return JSON.parse(raw);
  } catch {
    return getDefaultFlashcards();
  }
}

export function saveFlashcards(cards: Flashcard[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_FLASHCARDS_KEY, JSON.stringify(cards));
  } catch (err) {
    console.error("Failed to save flashcards", err);
  }
}

/**
 * SuperMemo SM-2 calculation.
 */
export function calculateSM2(
  card: Flashcard,
  rating: ReviewRating
): { interval: number; repetitions: number; easeFactor: number; dueDate: string } {
  let { interval, repetitions, easeFactor } = card;

  // Grade from 0 to 5
  // again = 1, hard = 3, good = 4, easy = 5
  let grade = 4;
  if (rating === "again") grade = 1;
  else if (rating === "hard") grade = 3;
  else if (rating === "good") grade = 4;
  else if (rating === "easy") grade = 5;

  if (grade >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate new due date
  const now = new Date();
  now.setDate(now.getDate() + interval);
  const dueDate = now.toISOString().split("T")[0]!;

  return { interval, repetitions, easeFactor, dueDate };
}

export function isCardDue(card: Flashcard): boolean {
  const today = new Date().toISOString().split("T")[0]!;
  return card.dueDate <= today;
}

/**
 * Generate CSV for Anki Desktop import.
 */
export function exportCardsToAnkiCsv(cards: Flashcard[]): void {
  const lines = [
    "#separator:Tab",
    "#html:true",
    "#tags column:3",
    ...cards.map((c) => {
      const q = c.question.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const a = c.answer.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const t = (c.tags || []).join(" ");
      return `${q}\t${a}\t${t}`;
    }),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spark-anki-export-${new Date().toISOString().split("T")[0]}.tsv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * AI-assisted flashcard extraction from text / book notes / transcripts.
 */
export function extractFlashcardsFromText(text: string, sourceName = "Notiz"): Flashcard[] {
  const cards: Flashcard[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Parse lines with ":", "-", "?" or definitions
  for (const line of lines) {
    if (line.includes("?") && (line.includes(":") || line.includes("->") || line.includes("="))) {
      const parts = line.split(/[?:=->]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        cards.push(createCard(parts[0]!, parts[1]!, sourceName));
      }
    } else if (line.includes(":") && line.length < 200) {
      const idx = line.indexOf(":");
      const q = line.slice(0, idx).trim();
      const a = line.slice(idx + 1).trim();
      if (q && a && q.length > 2 && a.length > 2) {
        cards.push(createCard(q, a, sourceName));
      }
    }
  }

  // Fallback if no structured pattern
  if (!cards.length && text.length > 10) {
    cards.push(
      createCard(
        `Kernaussage aus ${sourceName}?`,
        text.slice(0, 300) + (text.length > 300 ? "…" : ""),
        sourceName
      )
    );
  }

  return cards;
}

function createCard(q: string, a: string, source: string): Flashcard {
  return {
    id: crypto.randomUUID(),
    question: q,
    answer: a,
    source,
    tags: ["spark", "recall"],
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString().split("T")[0]!,
    lastReviewed: null,
  };
}

function getDefaultFlashcards(): Flashcard[] {
  const today = new Date().toISOString().split("T")[0]!;
  return [
    {
      id: "card-1",
      question: "Was bildet das 'Trifecta' der Basis-Supplements nach Fabian Kowallik?",
      answer: "Vitamin D3 (Dosierung an Körpergewicht angepasst), Vitamin K2 (MK-7, zwingend für Knochen-Kalzium) und Magnesium (Citrat morgens, Bisglycinat abends).",
      source: "Gesundheit.txt",
      tags: ["gesundheit", "longevity"],
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: today,
      lastReviewed: null,
    },
    {
      id: "card-2",
      question: "Warum darf Vitamin D3 niemals isoliert eingenommen werden?",
      answer: "Weil D3 die Kalziumaufnahme massiv steigert. Ohne K2 lagert sich Kalzium in den Gefäßen ab (Arterienverkalkung, Nierensteine). K2 transportiert es in die Knochen.",
      source: "Gesundheit.txt",
      tags: ["gesundheit", "trifecta"],
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: today,
      lastReviewed: null,
    },
    {
      id: "card-3",
      question: "Was ist der Bryan Johnson 'Faden-Trick' für Schreibtisch-Ergonomie?",
      answer: "Stelle dir vor, ein Faden zieht deinen Kopf von oben schnurgerade nach oben. Der Monitor muss exakt auf Augenhöhe stehen, um eine Jugularvenen-Stenose (Verengung der Halsvene) zu verhindern.",
      source: "Blueprint",
      tags: ["ergonomie", "blueprint"],
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: today,
      lastReviewed: null,
    },
    {
      id: "card-4",
      question: "Was bewirkt der tägliche rohe Karottensalat am Morgen?",
      answer: "Geraspelte rohe Karotte mit etwas Kokos- oder Olivenöl und Salz bindet Giftstoffe, Endotoxine und überschüssiges Östrogen im Darm und leitet sie aus.",
      source: "Gesundheit.txt",
      tags: ["ernährung", "entgiftung"],
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: today,
      lastReviewed: null,
    },
  ];
}
