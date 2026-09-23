/**
 * YouTube Learning & AI Scriptwriter Pipeline (Focus-Tube-Filter Integration).
 * Automatically categorizes channels and maps them to Spark Database collections.
 */

import { createCollection, createField, createRow, type Collection } from "./spark";

export interface YouTubeChannel {
  id: string;
  name: string;
  handle?: string | undefined;
  category: string;
  avatarUrl?: string | undefined;
  videoCount?: number | undefined;
  dailyGoal?: number | undefined;
  addedAt: string;
}

export interface YouTubeVideo {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  url: string;
  duration?: string | undefined;
  category: string;
  notes: string;
  watched: boolean;
  watchedAt?: string | undefined;
  addedAt: string;
}

export interface YouTubeScript {
  id: string;
  title: string;
  hook: string;
  problem: string;
  corePoints: { title: string; explanation: string; visualCue: string }[];
  retentionSpike: string;
  tacticalExecution: string[];
  callToAction: string;
  createdAt: string;
}

const STORAGE_CHANNELS_KEY = "spark_youtube_channels";
const STORAGE_VIDEOS_KEY = "spark_youtube_videos";
const STORAGE_SCRIPTS_KEY = "spark_youtube_scripts";

export const SKILL_CATEGORIES = [
  "Programmierung & Code",
  "Gesundheit & Biohacking",
  "Business & Unternehmertum",
  "Finanzen & Trading",
  "KI & Automatisierung",
  "Design & Video",
  "Produktivität & Systeme",
];

export function loadYouTubeChannels(): YouTubeChannel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_CHANNELS_KEY);
    return raw ? JSON.parse(raw) : getDefaultChannels();
  } catch {
    return getDefaultChannels();
  }
}

export const loadChannels = loadYouTubeChannels;

export function saveYouTubeChannels(channels: YouTubeChannel[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_CHANNELS_KEY, JSON.stringify(channels));
  } catch {}
}

export const saveChannels = saveYouTubeChannels;

export function loadYouTubeVideos(): YouTubeVideo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_VIDEOS_KEY);
    return raw ? JSON.parse(raw) : getDefaultVideos();
  } catch {
    return getDefaultVideos();
  }
}

export function saveYouTubeVideos(videos: YouTubeVideo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_VIDEOS_KEY, JSON.stringify(videos));
  } catch {}
}

export function loadYouTubeScripts(): YouTubeScript[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_SCRIPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveYouTubeScripts(scripts: YouTubeScript[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_SCRIPTS_KEY, JSON.stringify(scripts));
  } catch {}
}

/**
 * Heuristic/AI skill categorizer for YouTube channels and videos.
 */
export function categorizeSkill(title: string, channelName = ""): string {
  const text = `${title} ${channelName}`.toLowerCase();

  if (text.includes("code") || text.includes("react") || text.includes("python") || text.includes("programm") || text.includes("software") || text.includes("developer")) {
    return "Programmierung & Code";
  }
  if (text.includes("gesund") || text.includes("vitamin") || text.includes("blueprint") || text.includes("schlaf") || text.includes("fasten") || text.includes("kowallik") || text.includes("supplement")) {
    return "Gesundheit & Biohacking";
  }
  if (text.includes("business") || text.includes("startup") || text.includes("agentur") || text.includes("marketing") || text.includes("vertrieb") || text.includes("unternehmer")) {
    return "Business & Unternehmertum";
  }
  if (text.includes("aktie") || text.includes("trade") || text.includes("trading") || text.includes("finanz") || text.includes("krypto") || text.includes("bitcoin") || text.includes("geld")) {
    return "Finanzen & Trading";
  }
  if (text.includes("ai") || text.includes("ki") || text.includes("chatgpt") || text.includes("gemini") || text.includes("agent") || text.includes("automation")) {
    return "KI & Automatisierung";
  }
  if (text.includes("design") || text.includes("ui") || text.includes("video") || text.includes("edit") || text.includes("premiere") || text.includes("schnitt")) {
    return "Design & Video";
  }

  return "Produktivität & Systeme";
}

/**
 * Maps all YouTube videos directly into a Spark relational Database collection!
 */
export async function syncYouTubeVideosToDatabase(spaceId: string, videos: YouTubeVideo[]): Promise<Collection> {
  const col = await createCollection(spaceId, "YouTube Lern-Bibliothek");

  const fields = [
    await createField({ collectionId: col.id, name: "Video Titel", type: "text", position: 0 }),
    await createField({ collectionId: col.id, name: "Kanal", type: "text", position: 1 }),
    await createField({ collectionId: col.id, name: "Kategorie", type: "select", position: 2, choices: SKILL_CATEGORIES }),
    await createField({ collectionId: col.id, name: "Status", type: "select", position: 3, choices: ["Zu schauen", "In Arbeit", "Gesehen"] }),
    await createField({ collectionId: col.id, name: "Link", type: "url", position: 4 }),
    await createField({ collectionId: col.id, name: "Notizen", type: "text", position: 5 }),
    await createField({ collectionId: col.id, name: "Erledigt", type: "checkbox", position: 6 }),
  ];

  for (const v of videos) {
    await createRow(col.id, {
      [fields[0]!.id]: v.title,
      [fields[1]!.id]: v.channelName,
      [fields[2]!.id]: v.category,
      [fields[3]!.id]: v.watched ? "Gesehen" : "Zu schauen",
      [fields[4]!.id]: v.url,
      [fields[5]!.id]: v.notes,
      [fields[6]!.id]: v.watched,
    });
  }

  return col;
}

/**
 * Generates an end-to-end viral YouTube script from input notes or topic.
 */
export function generateYouTubeScript(input: {
  topic: string;
  notes?: string;
  targetAudience?: string;
}): YouTubeScript {
  const topic = input.topic.trim();
  const notes = input.notes?.trim() || "";

  return {
    id: crypto.randomUUID(),
    title: `Wie du ${topic} meisterst (Ohne die typischen Fehler)`,
    hook: `Wenn du das nächste Mal versuchst, ${topic} anzugehen, stoppe sofort. 95 % aller Leute machen dabei denselben fatalen Fehler – und verschwenden Wochen an Lebenszeit.`,
    problem: `Das Problem ist nicht fehlende Disziplin. Das Problem ist, dass die meisten blind Tutorials schauen, anstatt ein echtes System aufzubauen. ${notes ? `Hier ist die exakte Methode aus meinen Notizen:` : `Hier ist der Schritt-für-Schritt Fahrplan:`}`,
    corePoints: [
      {
        title: "1. Das Fundament: Die 80/20 Regel",
        explanation: `Fokussiere dich auf die 20 % der Aktionen, die 80 % des Ergebnisses bringen. Bei ${topic} bedeutet das: Sofort mit der praktischen Umsetzung starten.`,
        visualCue: "[Visual: B-Roll Screen-Capture oder animiertes Diagramm auf dem Whiteboard]",
      },
      {
        title: "2. Die Vermeidung des größten Flaschenhalses",
        explanation: `Die meisten scheitern an fehlender Konsistenz. Baue dir eine feste tägliche 25-Minuten-Routine (Deep Work) auf.`,
        visualCue: "[Visual: Pomodoro Timer eingeblendet, dynamischer Zoom auf das Gesicht]",
      },
      {
        title: "3. Aktiver Transfer & Verankerung",
        explanation: `Konsumiere nicht nur passiv. Führe sofort einen Notiz-Capture durch und wiederhole das Wissen per Spaced Repetition.`,
        visualCue: "[Visual: Split-Screen mit Notizen & Wissens-Graph]",
      },
    ],
    retentionSpike: `Achtung: Der größte Fehler, den ich bei Anfängern sehe, ist der sogenannte 'Collector's Fallacy' – Informationen zu sammeln, aber niemals anzuwenden.`,
    tacticalExecution: [
      `1. Schritt: Schreibe dir deine Top-Priorität für heute auf`,
      `2. Schritt: Schalte alle Benachrichtigungen aus und starte 40Hz Fokus-Audio`,
      `3. Schritt: Setze exakt 1 Kernidee sofort in die Tat um`,
    ],
    callToAction: `Wenn du dieses System für dich selbst nutzen willst, sichere dir die Vorlage unten in der Beschreibung und abonniere den Kanal für mehr datengestützte Systeme!`,
    createdAt: new Date().toISOString(),
  };
}

function getDefaultChannels(): YouTubeChannel[] {
  const now = new Date().toISOString();
  return [
    {
      id: "ch-1",
      name: "Fabian Kowallik",
      handle: "@fabiankowallik",
      category: "Gesundheit & Biohacking",
      addedAt: now,
    },
    {
      id: "ch-2",
      name: "Bryan Johnson",
      handle: "@bryanjohnson",
      category: "Gesundheit & Biohacking",
      addedAt: now,
    },
    {
      id: "ch-3",
      name: "Theo - t3.gg",
      handle: "@t3dotgg",
      category: "Programmierung & Code",
      addedAt: now,
    },
    {
      id: "ch-4",
      name: "Alex Hormozi",
      handle: "@AlexHormozi",
      category: "Business & Unternehmertum",
      addedAt: now,
    },
  ];
}

function getDefaultVideos(): YouTubeVideo[] {
  const now = new Date().toISOString();
  return [
    {
      id: "vid-1",
      channelId: "ch-1",
      channelName: "Fabian Kowallik",
      title: "Das Trifecta der Supplements: Warum D3 ohne K2 gefährlich ist",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "18:24",
      category: "Gesundheit & Biohacking",
      notes: "[02:15] D3 erhöht Kalziumaufnahme. K2 zwingend für Knochen nötig.\n[06:40] Magnesium Citrat morgens, Bisglycinat abends.",
      watched: true,
      watchedAt: now,
      addedAt: now,
    },
    {
      id: "vid-2",
      channelId: "ch-2",
      channelName: "Bryan Johnson",
      title: "Blueprint Desk Setup: Wie schlechte Haltung mich fast getötet hätte",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "24:10",
      category: "Gesundheit & Biohacking",
      notes: "[04:30] Jugularvenen-Stenose durch Herabschauen auf Bildschirme.\n[11:00] Faden-Trick & Monitor exakt auf Augenhöhe!",
      watched: false,
      addedAt: now,
    },
  ];
}
