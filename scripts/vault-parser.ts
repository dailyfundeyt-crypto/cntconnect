/**
 * Obsidian-Vault Parser
 * 
 * Liest einen Obsidian-Vault und zerlegt ihn in strukturierte Datensätze:
 * Ordner, Notizen (mit Frontmatter), Wikilinks, Aufgaben und Mediendateien.
 * 
 * Reiner Parser ohne I/O gegen Supabase - dadurch testbar und wiederverwendbar.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";

/** Verzeichnisse, die nie importiert werden. */
const IGNORED_DIRS = new Set([
  ".obsidian",
  ".git",
  ".trash",
  ".smart-env",
  ".copilot",
  ".hinote",
  "node_modules",
  ".tanstack",
  ".output",
  ".wrangler",
]);

/** Obsidian-Backup-/Autosave-Muster (.bak, .bak2, .bak-struktur ...). */
const BACKUP_SUFFIX_RE = /(\.bak[a-z0-9-]*)$/i;

/** Erlaubte Binär-/Medienendungen für den Drive-Upload. */
export const MEDIA_EXTENSIONS = new Set([
  ".mp4", ".mov", ".webm", ".mkv", ".avi",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".heic",
  ".pdf", ".mp3", ".wav", ".m4a", ".flac", ".ogg",
  ".zip", ".7z", ".rar",
]);

export interface ParsedFolder {
  path: string;
  name: string;
  parentPath: string | null;
  position: number;
}

export interface ParsedLink {
  /** Aufgelöstes Ziel als Vault-relativer Pfad ohne Endung, z.B. "Brain/index". */
  targetPath: string;
  /** Aufgelöstes Medienziel, wenn der Link auf eine Binärdatei zeigt. */
  mediaPath: string | null;
  /** Originaltext innerhalb der Klammern, z.B. "index" aus [[index|Index]]. */
  rawTarget: string;
  /** Anzeigetext bzw. Alias. */
  linkText: string;
  isEmbedded: boolean;
}

export interface ParsedTask {
  text: string;
  isDone: boolean;
  line: number;
  tags: string[];
}

export interface ParsedNote {
  path: string;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
  contentHash: string;
  sizeBytes: number;
  mtimeMs: number;
  links: ParsedLink[];
  tasks: ParsedTask[];
  /** Pfade eingebetteter Medien (![[bild.png]]), Vault-relativ. */
  embeds: string[];
  /** Embeds, die gegen die Mediendatei-Liste aufgelöst werden konnten. */
  resolvedEmbeds: string[];
}

export interface ParsedFile {
  path: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Ordnerpfad, falls die Datei in einem Unterordner liegt. */
  folderPath: string | null;
}

export interface ParsedVault {
  folders: ParsedFolder[];
  notes: ParsedNote[];
  files: ParsedFile[];
  /** Statistik für den Report. */
  stats: {
    notes: number;
    files: number;
    folders: number;
    links: number;
    resolvedLinks: number;
    /** Verweise auf Mediendateien, die aufgelöst werden konnten. */
    mediaLinks: number;
    tasks: number;
    unresolvedLinks: string[];
    skippedBackups: number;
    /** Bytes reiner Markdown-Text. */
    textBytes: number;
    /** Bytes der Mediendateien. */
    mediaBytes: number;
  };
}

/**
 * Normalisiert einen Pfad: Windows-Separator zu "/", kein führender Slash.
 */
function toPosix(p: string): string {
  return p.split(path.sep).join("/").replace(/^\/+/, "");
}

/**
 * Entfernt den .md-Suffix und normalisiert für Wikilink-Vergleiche.
 * Obsidian ist bei Links case-insensitiv, auf Windows auch die Pfade.
 */
function normalizeLinkTarget(p: string): string {
  return toPosix(p).replace(/\.md$/i, "").toLowerCase();
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Grobes MIME-Mapping - reicht für die Anzeige in Spark.
 */
function guessMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".heic": "image/heic",
    ".pdf": "application/pdf",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".zip": "application/zip",
    ".7z": "application/x-7z-compressed",
    ".rar": "application/vnd.rar",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Parst YAML-Frontmatter ohne externe Abhängigkeit.
 * Deckt den Obsidian-Kern ab: key: value, Listen, verschachtelte Listen.
 * Alles was nicht geparst werden kann, landet als String.
 */
export function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  if (!raw.startsWith("---")) return { data: {}, body: raw };

  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const yaml = match[1] ?? "";
  const body = raw.slice(match[0].length);
  const data: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);

  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && currentKey) {
      currentList ??= [];
      currentList.push(stripQuotes((listItem[1] ?? "").trim()));
      data[currentKey] = currentList;
      continue;
    }

    const kv = /^([A-Za-z0-9_\-.]+)\s*:\s*(.*)$/.exec(line);
    if (kv) {
      currentKey = kv[1] ?? null;
      const value = (kv[2] ?? "").trim();
      if (value === "") {
        currentList = null;
        continue;
      }
      currentList = null;
      if (value.startsWith("[") && value.endsWith("]")) {
        data[currentKey] = value
          .slice(1, -1)
          .split(",")
          .map((v) => stripQuotes(v.trim()))
          .filter(Boolean);
      } else {
        data[currentKey] = stripQuotes(value);
      }
    }
  }

  return { data, body };
}

function stripQuotes(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * Findet Wikilinks im Text.
 * Unterstützt: [[Ziel]], [[Ziel|Alias]], [[Ziel#Überschrift]] und ![[Ziel]] (Embed).
 * Überschriften und Blöcke werden entfernt, das verbleibende ist der Zielpfad.
 */
export function extractLinks(body: string): { links: ParsedLink[]; embeds: string[] } {
  const links: ParsedLink[] = [];
  const embeds: string[] = [];
  const seen = new Set<string>();
  // Negierter Lookbehind trennt Embeds (![[x]]) von normalen Links ([[x]]).
  const re = /(!?)\[\[([^\]\n]+)\]\]/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(body)) !== null) {
    const isEmbedded = m[1] === "!";
    const inner = (m[2] ?? "").trim();
    if (!inner) continue;

    // [[Ziel#Überschrift]] und [[Ziel#^block]] → nur Ziel
    const target = inner.split("#")[0]?.trim() ?? "";
    if (!target) continue;

    // [[Ziel|Alias]]
    const [targetPart, ...aliasParts] = target.split("|");
    const rawTarget = (targetPart ?? "").trim();
    if (!rawTarget) continue;
    const alias = aliasParts.join("|").trim();
    const linkText = alias || rawTarget;

    const decoded = decodeURIComponentSafe(rawTarget);
    const targetPath = normalizeLinkTarget(decoded);

    if (isEmbedded) {
      embeds.push(decoded);
    }

    const dedupeKey = `${targetPath}|${isEmbedded}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    links.push({ targetPath, mediaPath: null, rawTarget: decoded, linkText, isEmbedded });
  }

  return { links, embeds };
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Findet Checkbox-Aufgaben: "- [ ] text" / "- [x] text".
 * #tag und #tag/sub werden extrahiert, [[Wiki]] innerhalb der Aufgabe bleibt erhalten.
 */
export function extractTasks(body: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  const lines = body.split(/\r?\n/);
  const re = /^\s*[-*+]\s+\[([ xX/\->])\]\s+(.*)$/;

  lines.forEach((line, index) => {
    const m = re.exec(line);
    if (!m) return;
    const marker = m[1] ?? " ";
    const text = (m[2] ?? "").trim();
    if (!text) return;

    // Nur der Aufgabentext, ohne den Checkbox-Präfix und ohne nachfolgende Metadaten
    const tags = [...text.matchAll(/#([A-Za-z0-9_/-]+)/g)].map((t) => t[1] ?? "").filter(Boolean);

    tasks.push({
      text: text.replace(/\s+#[\w/-]+/g, "").trim(),
      isDone: marker === "x" || marker === "X",
      line: index + 1,
      tags,
    });
  });

  return tasks;
}

/**
 * Ermittelt den Notiztitel: Frontmatter "title", dann erster H1, dann Dateiname.
 */
function deriveTitle(frontmatter: Record<string, unknown>, body: string, filePath: string): string {
  const fmTitle = frontmatter["title"];
  if (typeof fmTitle === "string" && fmTitle.trim()) return fmTitle.trim();

  const h1 = /^#\s+(.+)$/m.exec(body);
  if (h1?.[1]?.trim()) return h1[1].trim();

  return path.basename(filePath).replace(/\.md$/i, "");
}

/**
 * Rekursive Sammlung aller Dateien, mit Filter für ignorierte Ordner.
 */
async function walk(root: string, current = ""): Promise<string[]> {
  const dir = path.join(root, current);
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") && IGNORED_DIRS.has(entry.name)) continue;
    const rel = current ? `${current}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      out.push(...(await walk(root, rel)));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

/**
 * Ordner-Dateien (.canvas, .excalidraw) überspringen - sie sind keine Markdown-Notizen.
 */
function isMarkdown(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".md";
}

function isMedia(filePath: string): boolean {
  return MEDIA_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Liest und parst den gesamten Vault.
 * 
 * @param root Absoluter Pfad zum Vault-Root.
 * @param options.includeMedia Objektmedien in `files` aufnehmen.
 */
export async function parseVault(
  root: string,
  options: { includeMedia?: boolean } = {},
): Promise<ParsedVault> {
  const includeMedia = options.includeMedia ?? true;
  const allFiles = await walk(root);

  const notes: ParsedNote[] = [];
  const files: ParsedFile[] = [];
  const folderSet = new Set<string>();
  let skippedBackups = 0;
  let textBytes = 0;
  let mediaBytes = 0;

  // Alle Notizpfade vorab sammeln, um Wikilinks korrekt aufzulösen.
  // Drei Auflösungswege, in dieser Reihenfolge:
  //   1. exakt  — der Link ist schon ein vollständiger Vault-Pfad
  //   2. sibling — Link ohne Ordner, Datei liegt im selben Ordner
  //   3. unique — Link ohne Ordner, Datei existiert genau einmal irgendwo
  // Das entspricht Obsidians Auflösung, ohne dass ein Index nötig wird.
  const notePaths = allFiles
    .filter((f) => isMarkdown(f) && !BACKUP_SUFFIX_RE.test(f))
    .map((f) => normalizeLinkTarget(f));
  const notePathSet = new Set(notePaths);

  // Kurzname -> alle vollständigen Pfade (für Strategy 3)
  const byBasename = new Map<string, string[]>();
  for (const p of notePaths) {
    const base = p.slice(p.lastIndexOf("/") + 1);
    const list = byBasename.get(base);
    if (list) list.push(p);
    else byBasename.set(base, [p]);
  }

  // Medien (mp4, jpg, ...) als Linkziel zulassen. Obsidian verlinkt auch Dateien.
  const mediaPaths = allFiles
    .filter((f) => isMedia(f) && !BACKUP_SUFFIX_RE.test(f))
    .map((f) => toPosix(f));
  const mediaPathSet = new Set(mediaPaths.map((p) => p.toLowerCase()));

  const mediaByBasename = new Map<string, string[]>();
  for (const p of mediaPaths) {
    const base = p.slice(p.lastIndexOf("/") + 1).toLowerCase();
    const list = mediaByBasename.get(base);
    if (list) list.push(p);
    else mediaByBasename.set(base, [p]);
  }

  /**
   * Löst einen Linkziel-String zu einem realen Notizpfad auf.
   * Gibt null zurück, wenn nichts passt.
   */
  const resolveLink = (rawTarget: string, sourcePath: string): string | null => {
    const target = normalizeLinkTarget(rawTarget);
    if (!target) return null;

    // 1. Exakter Vault-Pfad (Notiz)
    if (notePathSet.has(target)) return target;

    // Bereits ein Pfad, aber vielleicht falsch einsortiert:
    // auch das letzte Pfadsegment als Kurznamen probieren
    const targetBase = target.slice(target.lastIndexOf("/") + 1);

    // 2. Sibling: gleicher Ordner wie die Quelldatei
    const srcDir = sourcePath.includes("/")
      ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
      : "";
    if (srcDir) {
      const sibling = `${srcDir}/${targetBase}`;
      if (notePathSet.has(sibling)) return sibling;
    }

    // 3. Global eindeutiger Kurzname
    const candidates = byBasename.get(targetBase);
    if (candidates && candidates.length === 1) return candidates[0] as string;

    // 4. Der Link enthält einen Ordner, der vielleicht nur anders geschrieben ist:
    //    Wurzel-Suffix-Abgleich (Obsidian "closest match")
    if (target.includes("/")) {
      const matches = notePaths.filter((p) => p.endsWith(`/${target}`) || p === target);
      if (matches.length === 1) return matches[0] as string;
    }

    return null;
  };

  /**
   * Löst einen Verweis auf eine Mediendatei auf (mp4, jpg, ...).
   * Gleiche Strategien wie resolveLink, aber gegen die Medienliste.
   * Gibt den echten Vault-Pfad zurück (mit Endung) oder null.
   */
  const resolveMedia = (rawTarget: string, sourcePath: string): string | null => {
    const target = normalizeLinkTarget(rawTarget);
    if (!target) return null;

    // 1. Exakter Pfad, case-insensitive (Windows)
    for (const p of mediaPaths) {
      if (p.toLowerCase() === target) return p;
    }

    const targetBase = target.slice(target.lastIndexOf("/") + 1);

    // 2. Sibling
    const srcDir = sourcePath.includes("/")
      ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
      : "";
    if (srcDir) {
      const sibling = `${srcDir}/${targetBase}`;
      for (const p of mediaPaths) {
        if (p.toLowerCase() === sibling) return p;
      }
    }

    // 3. Global eindeutiger Kurzname
    const candidates = mediaByBasename.get(targetBase);
    if (candidates && candidates.length === 1) return candidates[0] as string;

    // 4. Suffix-Treffer
    if (target.includes("/")) {
      const matches = mediaPaths.filter((p) => p.toLowerCase().endsWith(`/${target}`));
      if (matches.length === 1) return matches[0] as string;
    }

    return null;
  };

  for (const rel of allFiles) {
    const abs = path.join(root, rel);
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(abs);
    } catch {
      continue;
    }

    // Backup-/Autosave-Dateien überspringen
    if (BACKUP_SUFFIX_RE.test(path.basename(rel))) {
      skippedBackups++;
      continue;
    }

    const dir = path.dirname(rel);
    if (dir !== "." && !IGNORED_DIRS.has(path.basename(dir))) {
      folderSet.add(toPosix(dir));
    }

    if (isMarkdown(rel)) {
      const raw = await fs.readFile(abs, "utf8");
      const noteBytes = Buffer.byteLength(raw, "utf8");
      textBytes += noteBytes;
      const { data, body } = parseFrontmatter(raw);
      const { links, embeds } = extractLinks(body);
      const tasks = extractTasks(body);

      // Links gegen den echten Vault-Index auflösen (Obsidian-Semantik).
      const notePath = toPosix(rel);
      const resolvedSource = normalizeLinkTarget(notePath);
      const resolvedLinks = links.map((l) => {
        const resolved = resolveLink(l.rawTarget, resolvedSource);
        if (resolved) return { ...l, targetPath: resolved };
        // Kein Notiz-Treffer: vielleicht eine Mediendatei.
        const media = resolveMedia(l.rawTarget, resolvedSource);
        return media ? { ...l, targetPath: "" , mediaPath: media } : { ...l, targetPath: "", mediaPath: null };
      });

      // Embeds gegen die Medienliste auflösen (Sourcedir, dann global eindeutig).
      const resolvedEmbeds = embeds
        .map((e) => resolveMedia(e, resolvedSource))
        .filter((e): e is string => Boolean(e));

      notes.push({
        path: notePath,
        title: deriveTitle(data, body, rel),
        content: body,
        frontmatter: data,
        contentHash: sha256(body),
        sizeBytes: noteBytes,
        mtimeMs: Math.floor(stat.mtimeMs),
        links: resolvedLinks,
        tasks,
        embeds: resolvedEmbeds,
      });
      continue;
    }

    if (includeMedia && isMedia(rel)) {
      mediaBytes += stat.size;
      files.push({
        path: toPosix(rel),
        name: path.basename(rel),
        mimeType: guessMime(rel),
        sizeBytes: stat.size,
        folderPath: dir === "." ? null : toPosix(dir),
      });
    }
  }

  // Ordnerhierarchie flach aus den gefundenen Ordnern ableiten.
  const folders: ParsedFolder[] = [];
  const allFolderPaths = new Set<string>();
  for (const f of folderSet) {
    const parts = f.split("/");
    for (let i = 1; i <= parts.length; i++) {
      allFolderPaths.add(parts.slice(0, i).join("/"));
    }
  }
  for (const p of [...allFolderPaths].sort()) {
    const idx = p.lastIndexOf("/");
    folders.push({
      path: p,
      name: p.slice(idx + 1),
      parentPath: idx === -1 ? null : p.slice(0, idx),
      position: folders.length,
    });
  }

  // Unaufgelöste Links: weder Notiz noch Mediendatei gefunden.
  // Ein leeres targetPath und leeres mediaPath bedeutet "nichts gefunden".
  const unresolved = new Set<string>();
  let resolvedCount = 0;
  let mediaLinkCount = 0;
  for (const note of notes) {
    for (const link of note.links) {
      if (link.targetPath) resolvedCount++;
      else if (link.mediaPath) mediaLinkCount++;
      else unresolved.add(link.rawTarget);
    }
  }

  return {
    folders,
    notes,
    files,
    stats: {
      notes: notes.length,
      files: files.length,
      folders: folders.length,
      links: notes.reduce((sum, n) => sum + n.links.length, 0),
      resolvedLinks: resolvedCount,
      mediaLinks: mediaLinkCount,
      tasks: notes.reduce((sum, n) => sum + n.tasks.length, 0),
      unresolvedLinks: [...unresolved].sort(),
      skippedBackups,
      textBytes,
      mediaBytes,
    },
  };
}
