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

| Was | Wert |
|---|---|
| Projekt | `vgdqauqqkjwwumhzbuea` |
| Adresse | `https://vgdqauqqkjwwumhzbuea.supabase.co` |
| In der Cloud **vorhanden** | `profiles`, `spaces`, `documents`, `collections`, `collection_fields`, `collection_rows`, `collection_views`, `slack_bot_settings` |
| In der Cloud **fehlt** | alle 8 `brain_*`-Tabellen |
| Zugangsdaten | `C:\workspace\cntconnect\.env` |

**Heute (5.10.) sind noch keine Notizen in der Cloud.** Die 70 Notizen liegen nur
auf dem PC. Das ist der offene Punkt.

---

## 7. Kurz merken

1. **Arbeiten:** immer `C:\workspace\cntconnect`
2. **Notizen liegen in:** `...\000_CNT\Plannung\Brain`
3. **Der alte Code-Pfad ist tabu:** `...\007_Connect\003_Code\cntconnect`
4. **Kein iCloud/Apple hier** — falls doch, erst mit mir klären
5. **`.env` nie committen**, service_role-Key niemals ins Frontend
