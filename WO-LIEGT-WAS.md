# Wo liegt was — Spark, Connect, Brain, Apple

Erstellt: 5. Oktober 2026
Zweck: Nachschlagewerk. Bevor du etwas suchst oder löschst, hier nachsehen.

---

## 1. Die vier Hauptorte auf einen Blick

| Was | Wo | Zustand |
|---|---|---|
| **Spark — der Code** | `C:\workspace\cntconnect` | **aktiv, hier arbeiten wir** |
| **Spark — alte Kopie** | `C:\Users\Kunc GmbH\Documents\000_CNT\Unternehmen\Zukunft\007_Connect\003_Code\cntconnect` | eingefroren, nicht anfassen |
| **Brain / Notizen** | `C:\Users\Kunc GmbH\Documents\000_CNT\Plannung\Brain` | Quelle, wird nach Supabase kopiert |
| **Connect — die Notizen** | `C:\Users\Kunc GmbH\Documents\000_CNT\Plannung\Connect` | 3 Notizen, rein textlich |

---

## 2. Spark (Code) — der wichtige Teil

### Aktiv: `C:\workspace\cntconnect`

Ein TanStack-Start / React / TypeScript-Projekt. Läuft auf Port **8080**.

```powershell
cd C:\workspace\cntconnect
npm run dev
```

| Was | Pfad |
|---|---|
| Haupt-App | `C:\workspace\cntconnect\src\routes\_authenticated\app.tsx` |
| Gehirn-Ansicht (neu) | `...\src\routes\_authenticated\app.brain.tsx` |
| Einzelve Notiz (neu) | `...\src\routes\_authenticated\app.brain.$noteId.tsx` |
| Wissensgraph | `...\src\components\spark\knowledge-graph.tsx` |
| Markdown-Ansicht (neu) | `...\src\components\spark\markdown-view.tsx` |
| MCP-Server (Antwortet) | `...\src\lib\mcp\` |
| MCP-Client (neu) | `...\src\lib\mcp-client\` |
| Supabase-Zugriff | `...\src\integrations\supabase\` |
| Datei-Ablage | `...\src\lib\files\` |
| Gehirn-Schema (SQL) | `...\supabase\migrations\20261004230000_brain_schema.sql` |
| Vault-Import | `...\scripts\migrate-vault.ts` |
| Vault-Parser | `...\scripts\vault-parser.ts` |
| Zugangsdaten | `...\ .env` (**nie committen**) |
| Vorlage für Zugangsdaten | `...\ .env.example` |

**Git:** Branch `main`, 75 Commits, **17 Commits vor GitHub, nichts gepusht.**
Sicherung: Branch `backup-b-original` = alter 58er-Stand.

### Eingefroren: der alte Pfad

`C:\Users\Kunc GmbH\Documents\000_CNT\Unternehmen\Zukunft\007_Connect\003_Code\cntconnect`

Dort liegt noch die uncommittete Phase-5/6-Arbeit. **Nicht löschen, nicht bearbeiten.**
Sie wird morgen nach `C:\workspace\cntconnect` geholt. Danach kann der Ordner weg, aber
erst wenn der Transfer verifiziert ist.

---

## 3. Brain (deine Notizen) — die Quelle

**Vault-Wurzel:** `C:\Users\Kunc GmbH\Documents\000_CNT\Plannung`
**Gehirn-Ordner darin:** `...\Plannung\Brain` (35 Notizen)

```
Brain\
  Daily\        tägliche Notizen
  Inbox\        Eingang von anderen Agenten
  Memory\       dauerhaftes Gedächtnis, je Agent ein Unterordner
  Projects\     laufende Projekte
  Shared\       wird an ChatGPT / Grok / Manus hochgeladen
  Skills\       Fähigkeiten
  _templates\   Vorlagen
  hot.md        das Wichtigste gerade
  index.md      Inhaltsverzeichnis
  log.md        was wann passiert ist
  agents.json   welcher Agent welche Rechte hat
  AGENTS.md     die Regeln
  CONNECT-AGENTS.md   wie externe Agents ankommen
```

**Ganze Vault-Übersicht (70 .md-Dateien):**

| Ordner | Notizen |
|---|---|
| Brain | 35 |
| Analyis | 5 |
| Hyper | 4 |
| Spark | 4 |
| CNT, Connect, Consensus, Flux, Nexus | je 3 |
| Morgen | 1 |
| Werbe Video | 1 |

**Wichtig:** Das Brain liegt **nur auf diesem PC**. Es gibt keine Kopie in der Cloud.
Deshalb ist der Import nach Supabase wichtig — erst dann existiert es an einem
zweiten Ort.

---

## 4. Connect — was es ist und wo

**Notizen dazu:** `...\Plannung\Connect\` → `Connect Idee.md`, `Connect Software.md`, `Connect System.md`

**Connect ist kein laufendes Programm auf deinem PC.** Es ist die Idee, deine Agenten
(ChatGPT, Grok, Manus, Claude, Cursor) an dein gemeinsames Gehirn anzuschließen.

`Brain\CONNECT-AGENTS.md` beschreibt zwei Wege:

**Weg 1 — Web-Agents** (ChatGPT, Grok.com, Manus)
Die sehen deinen PC nicht. Sie bekommen eine **Kopie zum Lesen**: `AGENTS.md`,
`hot.md`, `index.md`, `Shared/*.md`. Zurück kommt ein Textblock:

```
### BRAIN-NOTIZ
agent: chatgpt
datum: 2026-10-05 14:30
titel: kurze Zusammenfassung
- Was: …
- Ergebnis: …
- Nächster Schritt: …
### ENDE
```

Den Block legst du in `Brain\Inbox\YYYY-MM-DD-<kürzel>-<thema>.md`.

**Weg 2 — Desktop-Agents** (Claude, Cursor)
Die können direkt auf Ordner zugreifen. Konfiguration in
`%USERPROFILE%\.cursor\mcp.json`:

```json
{
  "mcpServers": {
    "brain": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem",
               "C:\\Users\\Kunc GmbH\\Documents\\000_CNT\\Plannung\\Brain"]
    }
  }
}
```

**Status: nichts davon ist eingerichtet.** Beides ist Anleitung, kein Aufbau.

---

## 5. Apple / iCloud — ehrliche Antwort

**Es gibt keinen Apple-Ordner auf diesem Rechner.**

Geprüft am 5.10.2026:

| Gesucht | Ergebnis |
|---|---|
| `iCloud Drive` | **nicht vorhanden** |
| OneDrive | vorhanden, aber **enthält nur** `Bilder\`, `Dokumente\`, `Erste Schritte mit OneDrive.pdf`, `Personal Vault.lnk` |
| Ordner mit „Apple" im Namen | keiner |
| Apple-Dateien im Vault | keine |

**Was das heißt:** Auf diesem Windows-Rechner liegen keine Apple-Dokumente.
Falls du Apple-Dokumente erwartest, sind sie entweder
- auf einem anderen Gerät (Mac, iPad, iPhone),
- in iCloud, das hier **nicht** eingerichtet ist,
- oder unter einem anderen Namen gespeichert.

**Falls du iCloud willst:** Auf Windows `winget install Apple.ICloud` — dann
erscheint `iCloud Drive` unter `%USERPROFILE%`. Apple nennt es selbst
iCloud für Windows. Sag Bescheid, dann richte ich das ein.

**Falls du „Apple Docs" meintest:** Meinst du die **Obsidian-Notizen**? Die liegen
in `Plannung` und sind in Abschnitt 3 beschrieben. Oder meintest du iCloud
Dokumente? Dann brauche ich den genauen Namen.

---

## 6. Die Cloud — Supabase

> **Aktiv ist nur EIN Projekt.** Stand 5.10.2026, 18:50 Uhr. Alles andere ist
> verworfen, bitte nirgends mehr referenzieren.

| Was | Wert |
|---|---|
| **Aktives Projekt** | `vktilvpwbhrddjytilvs` |
| **Adresse** | `https://vktilvpwbhrddjytilvs.supabase.co` |
| Verifiziert per API am 5.10.2026 | 16 Tabellen vorhanden, siehe unten |
| Zugangsdaten | `C:\workspace\cntconnect\.env` (git-ignoriert) |
| Vorlage | `C:\workspace\cntconnect\.env.example` |
| Service-Role-Key-Format | neu: `sb_secret_…`, **kein JWT** |
| Publishable-Key-Format | neu: `sb_publishable_…`, **kein JWT** |

### Verworfene Projekte (NICHT mehr benutzen)

| Projekt-ID | Status | Quelle |
|---|---|---|
| `vgdqauqqkjwwumhzbuea` | **verworfen, tot.** Tauchte in `WO-LIEGT-WAS.md` als vermeintlich aktiv auf — falsch. Wurde heute durch `vktilvpwbhrddjytilvs` ersetzt. Wurde offenbar nie produktiv genutzt; ein Projektwechsel fand statt, ohne dass er in Commit-Messages dokumentiert wurde. | Doku-Korrektur 5.10.2026 |

### Tabellen in der aktiven Cloud (`vktilvpwbhrddjytilvs`)

**Verifiziert am 5.10.2026 per REST-API** (Kontrolltest mit erfundener Spalte
schlug fehl, daher belastbar):

| Tabelle | Zweck |
|---|---|
| `profiles` | User-Profile |
| `spaces` | Workspaces |
| `documents` | Dokumente |
| `collections` | Sammlungen |
| `collection_fields` | Sammlungs-Schemata |
| `collection_rows` | Sammlungs-Zeilen |
| `collection_views` | Sammlungs-Ansichten |
| `slack_bot_settings` | Slack-Integration |
| `brain_files` | Brain: Datei-Metadaten |
| `brain_folders` | Brain: Ordner |
| `brain_import_log` | Brain: Import-Historie |
| `brain_mood_entries` | Brain: Stimmungs-Einträge |
| `brain_note_links` | Brain: Notiz-Verknüpfungen |
| `brain_notes` | Brain: Notizen (`drive_file_id` vorhanden) |
| `brain_tasks` | Brain: Aufgaben |
| `brain_work_sessions` | Brain: Arbeits-Sessions |

**16 Tabellen, alle vorhanden.** Schema-Quelle für `brain_*`:
`supabase/migrations/20261004230000_brain_schema.sql`.

### Migrationen, die noch nicht in der Cloud laufen

| Datei | Zweck | Status |
|---|---|---|
| `supabase/migrations/20261005210000_agent_rbac.sql` | RBAC: `agent_roles`, `agent_role_tools`, `agent_registry` | im Repo, **noch nicht in der Cloud ausgeführt**. User führt sie später im SQL-Editor aus. |

**Notizen in der Cloud:** Stand 5.10.2026 weiterhin keine. Die 70 Notizen liegen
nur auf dem PC, `scripts/migrate-vault.ts` ist der Importweg.

> **Versions-Hinweis:** Das Schema, das in der Cloud läuft, ist mit
> `supabase/SETUP-ALLES.sql` einmalig von Hand eingespielt worden. Diese Datei
> ist neu im Working Tree (Stand 5.10.2026) und wird committet, sobald RBAC
> fertig ist, damit die Cloud reproduzierbar wird.

---

## 6b. Editor-Entscheidung (verbindlich, 5.10.2026)

**Beschlossen:** Alte Notizen bleiben **Plaintext** und funktionieren unverändert.
Neue Notizen dürfen Rich-Text/Markdown bekommen. **Keine destruktive Migration.**

| Regel | Detail |
|---|---|
| Bestehende Inhalte | bleiben Plaintext in `brain_notes.content` / `documents.content`, keine Konvertierung, kein `drop`, kein `alter column` |
| Neue Notizen | Rich-Text/Markdown erlaubt, gespeichert weiterhin als Text/Markdown |
| Laden | Detect-and-render: Plaintext wird wie heute dargestellt, Markdown/HTML wird erkannt und entsprechend gerendert. Beides muss gleichzeitig funktionieren |
| Speichern | immer als das, was gelesen wurde — kein stilles Umschreiben des Formats beim Speichern |
| Migration | **verboten.** Nur additive, rückwärtskompatible Spalten wenn überhaupt |

**Merksatz für jeden Agent:** Wenn du an `content`-Spalten rührst, prüfe zuerst,
ob alte Notizen danach noch lesbar sind. Ein Umbau, der `content` umdeutet,
ist auch dann falsch, wenn die Typen passen.

---

## 7. Kurz merken

1. **Arbeiten:** immer `C:\workspace\cntconnect`
2. **Notizen liegen in:** `...\000_CNT\Plannung\Brain`
3. **Der alte Code-Pfad ist tabu:** `...\007_Connect\003_Code\cntconnect`
4. **Kein iCloud/Apple hier** — falls doch, erst mit mir klären
5. **`.env` nie committen**, service_role-Key niemals ins Frontend
6. **Editor: keine destruktive Migration.** Alte Notizen bleiben Plaintext. Siehe Abschnitt 6b
7. **In der Cloud sind 16 Tabellen**, nicht 8. Siehe Abschnitt 6
8. **Nur EIN Supabase-Projekt ist aktiv:** `vktilvpwbhrddjytilvs`. Das andere (`vgdqauqqkjwwumhzbuea`) ist verworfen. Siehe Abschnitt 6.
9. **Keys sind im neuen Format** `sb_secret_…` / `sb_publishable_…`, nicht JWT. PowerShell-Browser-Check täuscht 401 vor — User-Agent `node` setzen für API-Calls.
   200|
