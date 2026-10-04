/**
 * Vault → Supabase Migration
 * 
 * Importiert einen Obsidian-Vault in die brain_* Tabellen.
 * Idempotent: Notizen werden über (user_id, path) aktualisiert statt dupliziert.
 * Unveränderte Notizen werden übersprungen (content_hash-Vergleich).
 * 
 * Aufruf:
 *   bun run scripts/migrate-vault.ts --dry-run
 *   bun run scripts/migrate-vault.ts --path "C:\...\Plannung" --real
 * 
 * Wird SUPABASE_SERVICE_ROLE_KEY nicht gesetzt, verweigert der --real-Lauf die
 * Ausführung, damit nie versehentlich mit einem Publishable Key geschrieben wird.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseVault, type ParsedNote } from "./vault-parser";

// ---------------------------------------------------------------------------
// Argument-Parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): {
  vaultPath: string | undefined;
  dryRun: boolean;
  real: boolean;
  includeMedia: boolean;
  limit: number | undefined;
} {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (flag: string): boolean => argv.includes(flag);

  const limitRaw = get("--limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  return {
    vaultPath: get("--path"),
    dryRun: has("--dry-run"),
    real: has("--real"),
    includeMedia: !has("--no-media"),
    limit: Number.isFinite(limit) ? limit : undefined,
  };
}

function loadDotEnv(): void {
  // Bun lädt .env automatisch; Node nicht. Manuell nachladen.
  if (typeof process === "undefined" || process.env["SUPABASE_URL"]) return;
  try {
    const fs = require("node:fs") as typeof import("node:fs");
    const buf = fs.readFileSync(".env", "utf8");
    for (const line of buf.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
      if (!m) continue;
      const key = m[1];
      const value = m[2];
      if (key && value !== undefined && !process.env[key]) process.env[key] = value;
    }
  } catch {
    // Keine .env - das ist ok, dann kommen die Werte aus der Umgebung.
  }
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Generiert eine UUID-v4 ohne externe Abhängigkeit. */
function uuid(): string {
  return globalThis.crypto.randomUUID();
}

function bytesLabel(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function normalizePath(p: string): string {
  return p.split("\\").join("/").replace(/^\/+/, "");
}

// ---------------------------------------------------------------------------
// Hauptprogramm
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.vaultPath) {
    console.error("Fehler: --path <Vault-Root> fehlt.");
    console.error('Beispiel: bun run scripts/migrate-vault.ts --path "C:\\Users\\...\\Plannung" --dry-run');
    process.exit(1);
  }

  const vaultPath = args.vaultPath;
  const isDryRun = args.dryRun || !args.real;

  console.log("=".repeat(64));
  console.log("Brain Vault Migration");
  console.log("=".repeat(64));
  console.log(`Vault:     ${vaultPath}`);
  console.log(`Modus:     ${isDryRun ? "DRY-RUN (keine Schreibzugriffe)" : "REAL"}`);
  console.log(`Medien:    ${args.includeMedia ? "inklusive" : "ausgeschlossen"}`);
  console.log("-".repeat(64));

  // 1. Vault lesen
  const vault = await parseVault(vaultPath, { includeMedia: args.includeMedia });
  const notes = args.limit ? vault.notes.slice(0, args.limit) : vault.notes;

  console.log(`Ordner:          ${vault.folders.length}`);
  console.log(`Notizen:         ${notes.length}${args.limit ? ` (Limit ${args.limit})` : ""}`);
  console.log(`Wikilinks:       ${vault.stats.links} davon ${vault.stats.resolvedLinks} auf Notiz, ${vault.stats.mediaLinks} auf Datei`);
  console.log(`Aufgaben:        ${vault.stats.tasks}`);
  console.log(`Mediendateien:   ${vault.files.length} (${bytesLabel(vault.stats.mediaBytes)})`);
  console.log(`Übersprungen:    ${vault.stats.skippedBackups} Backup-Dateien`);
  console.log(`Textvolumen:     ${bytesLabel(vault.stats.textBytes)}`);
  if (vault.stats.unresolvedLinks.length) {
    console.log(`Unaufgelöst:     ${vault.stats.unresolvedLinks.length} Linkziele fehlen im Vault`);
    console.log(`                 ${vault.stats.unresolvedLinks.slice(0, 10).join(", ")}`);
    if (vault.stats.unresolvedLinks.length > 10) {
      console.log(`                 ... und ${vault.stats.unresolvedLinks.length - 10} weitere`);
    }
  }
  console.log("-".repeat(64));

  if (isDryRun) {
    console.log("Vorschau - erste 15 Notizen:");
    for (const n of notes.slice(0, 15)) {
      const taskCount = n.tasks.length;
      const linkCount = n.links.length;
      console.log(
        `  ${n.path.padEnd(46)} ${String(n.sizeBytes).padStart(7)} B  ` +
          `${linkCount} Links  ${taskCount} Tasks`,
      );
    }
    if (notes.length > 15) console.log(`  ... und ${notes.length - 15} weitere`);

    console.log("-".repeat(64));
    console.log("DRY-RUN beendet. Es wurde nichts geschrieben.");
    console.log("Für den echten Import: --real verwenden.");
    return;
  }

  // 2. Supabase-Client (nur mit Service Role)
  loadDotEnv();
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url) {
    console.error("Fehler: SUPABASE_URL nicht gesetzt (.env prüfen).");
    process.exit(1);
  }
  if (!serviceKey) {
    console.error("Fehler: SUPABASE_SERVICE_ROLE_KEY nicht gesetzt.");
    console.error("Der Service-Role-Key wird nur für den Migrationslauf gebraucht.");
    console.error("Er darf NIEMALS im Frontend oder im committeten .env liegen.");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runId = uuid();

  // Der Import läuft unter einer festen User-ID, damit RLS nicht im Weg ist.
  // Standard: der erste vorhandene auth.users-Eintrag.
  const userId = await resolveUserId(supabase);
  if (!userId) {
    console.error("Fehler: Kein Nutzer in auth.users gefunden.");
    console.error("Erstelle zuerst einen Account in Spark, dann starte den Import erneut.");
    process.exit(1);
  }
  console.log(`Ziel-Nutzer: ${userId}`);
  console.log(`Run-ID:     ${runId}`);
  console.log("-".repeat(64));

  // 3. Bestehende Notiz-Hashes laden, um unveränderte Dateien zu überspringen
  const { data: existing, error: existingErr } = await supabase
    .from("brain_notes")
    .select("id, path, content_hash")
    .eq("user_id", userId);

  if (existingErr) {
    console.error(`Fehler beim Laden der bestehenden Notizen: ${existingErr.message}`);
    console.error("Hast du die Migration 20261004230000_brain_schema.sql ausgeführt?");
    process.exit(1);
  }

  const existingByPath = new Map<string, { id: string; content_hash: string }>();
  for (const row of existing ?? []) {
    if (row.path) existingByPath.set(normalizePath(row.path), { id: row.id, content_hash: row.content_hash });
  }

  // 4. Ordner schreiben
  const folderIdByPath = new Map<string, string>();
  for (const f of vault.folders) {
    const row: Record<string, unknown> = {
      user_id: userId,
      path: f.path,
      name: f.name,
      parent_path: f.parentPath,
      position: f.position,
    };
    const { data, error } = await supabase
      .from("brain_folders")
      .upsert(row, { onConflict: "user_id,path" })
      .select("id")
      .single();
    if (error) {
      console.error(`Ordner-Fehler ${f.path}: ${error.message}`);
      process.exit(1);
    }
    if (data?.id) folderIdByPath.set(f.path, data.id);
  }
  console.log(`Ordner geschrieben: ${folderIdByPath.size}`);

  // 5. Notizen schreiben
  const noteIdByPath = new Map<string, string>();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const note of notes) {
    const relPath = normalizePath(note.path);
    const dir = relPath.includes("/") ? relPath.slice(0, relPath.lastIndexOf("/")) : null;
    const folderId = dir ? (folderIdByPath.get(dir) ?? null) : null;

    const prior = existingByPath.get(relPath);
    if (prior && prior.content_hash === note.contentHash) {
      noteIdByPath.set(relPath, prior.id);
      skipped++;
      continue;
    }

    const row: Record<string, unknown> = {
      user_id: userId,
      folder_id: folderId,
      path: relPath,
      title: note.title,
      content: note.content,
      frontmatter: note.frontmatter,
      content_hash: note.contentHash,
      size_bytes: note.sizeBytes,
      mtime_ms: note.mtimeMs,
    };

    const { data, error } = await supabase
      .from("brain_notes")
      .upsert(row, { onConflict: "user_id,path" })
      .select("id")
      .single();

    if (error) {
      console.error(`Notiz-Fehler ${relPath}: ${error.message}`);
      continue;
    }
    if (data?.id) noteIdByPath.set(relPath, data.id);
    if (prior) updated++;
    else created++;
  }
  console.log(`Notizen: ${created} neu, ${updated} aktualisiert, ${skipped} unverändert`);

  // 6. Aufgaben
  let taskCount = 0;
  for (const note of notes) {
    const relPath = normalizePath(note.path);
    const noteId = noteIdByPath.get(relPath);
    if (!noteId || note.tasks.length === 0) continue;

    await supabase.from("brain_tasks").delete().eq("user_id", userId).eq("note_id", noteId);
    const rows = note.tasks.map((t) => ({
      user_id: userId,
      note_id: noteId,
      text: t.text,
      is_done: t.isDone,
      tags: t.tags,
      position: t.line,
    }));
    const { error } = await supabase.from("brain_tasks").insert(rows);
    if (error) {
      console.error(`Aufgaben-Fehler ${relPath}: ${error.message}`);
      continue;
    }
    taskCount += rows.length;
  }
  console.log(`Aufgaben geschrieben: ${taskCount}`);

  // 7. Links
  let linkCount = 0;
  for (const note of notes) {
    const relPath = normalizePath(note.path);
    const noteId = noteIdByPath.get(relPath);
    if (!noteId) continue;

    await supabase.from("brain_note_links").delete().eq("user_id", userId).eq("source_note_id", noteId);
    if (note.links.length === 0) continue;

    const rows = note.links.map((l) => ({
      user_id: userId,
      source_note_id: noteId,
      target_path: l.targetPath,
      target_note_id: noteIdByPath.get(l.targetPath) ?? null,
      link_text: l.linkText,
      raw_target: l.rawTarget,
      is_embedded: l.isEmbedded,
    }));
    const { error } = await supabase.from("brain_note_links").insert(rows);
    if (error) {
      console.error(`Link-Fehler ${relPath}: ${error.message}`);
      continue;
    }
    linkCount += rows.length;
  }
  console.log(`Links geschrieben: ${linkCount}`);

  // 8. Medien als Metadaten (Upload in Phase 3 folgt)
  if (vault.files.length > 0) {
    console.log("-".repeat(64));
    console.log(`Medien: ${vault.files.length} Dateien erkannt.`);
    console.log("Nur Metadaten werden jetzt gespeichert, der Upload nach Google Drive");
    console.log("erfolgt mit dem Drive-Adapter. Ohne drive_file_id bleiben sie lokal.");
  }

  // 9. Journal
  await supabase.from("brain_import_log").insert({
    user_id: userId,
    source: "obsidian",
    source_path: vaultPath,
    run_id: runId,
    stats: {
      notes_created: created,
      notes_updated: updated,
      notes_skipped: skipped,
      folders: folderIdByPath.size,
      tasks: taskCount,
      links: linkCount,
      media_detected: vault.files.length,
      text_bytes: vault.stats.textBytes,
      media_bytes: vault.stats.mediaBytes,
    },
    is_dry_run: false,
  });

  console.log("-".repeat(64));
  console.log("Migration abgeschlossen.");
  console.log(`Neue Notizen:     ${created}`);
  console.log(`Aktualisiert:     ${updated}`);
  console.log(`Unverändert:      ${skipped}`);
  console.log(`Ordner:           ${folderIdByPath.size}`);
  console.log(`Aufgaben:         ${taskCount}`);
  console.log(`Links:            ${linkCount}`);
  if (vault.stats.unresolvedLinks.length) {
    console.log(`Unaufgelöste Links: ${vault.stats.unresolvedLinks.length} (Ziel fehlt im Vault)`);
  }
}

/**
 * Ermittelt den Import-Nutzer.
 * Bevorzugt BRAIN_IMPORT_USER_ID, sonst der erste auth.users-Eintrag.
 */
async function resolveUserId(supabase: SupabaseClient): Promise<string | null> {
  const explicit = process.env["BRAIN_IMPORT_USER_ID"];
  if (explicit) return explicit;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    console.error(`Fehler bei Nutzerauflösung: ${error.message}`);
    return null;
  }
  return data?.users?.[0]?.id ?? null;
}

main().catch((error) => {
  console.error("Unerwarteter Fehler:", error);
  process.exit(1);
});
