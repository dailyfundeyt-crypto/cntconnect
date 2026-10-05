# HANDOVER — Ultimativer Plan für den nächsten Agenten

> **Zweck:** Dieses Dokument ist der vollständige Bau- und Sicherungsplan für
> die offenen Arbeiten am 5./6. Oktober 2026. Es ist so geschrieben, dass ein
> anderer Agent es ohne Rückfragen abarbeiten kann — vorausgesetzt, er liest
> vorher die referenzierten Doku-Dateien.
>
> **Stand:** 5. Oktober 2026, 19:05 Uhr
> **Cloud:** `vktilvpwbhrddjytilvs` (16 Tabellen verifiziert)
> **GitHub:** `4b87ae3` (gerade gepusht), Branch `main`, 81 Commits

---

## 0. Lies zuerst — Pflichtlektüre, ohne die du Fehler machst

| Datei | Was du daraus brauchst |
|---|---|
| `WO-LIEGT-WAS.md` | Wo was liegt, welche Supabase-Projekt-ID aktiv ist, was **nicht** aktiv ist |
| `PLAN-MORGEN.md` | Was gestern erreicht wurde, was noch offen ist — als historischer Kontext |
| `docs/setup-stand/README.md` | Setup-Stand, was im Browser erledigt werden muss, was im Code offen ist |
| `docs/setup-stand/rbac-report.md` | RBAC-SQL, das der User im Supabase SQL-Editor ausführen muss |
| `.env` (nur lesen) | Welche Keys gesetzt sind. **Niemals committen, niemals ausgeben** |
| `.env.example` | Welche Keys gesetzt sein müssen (Vorlage) |
| `package.json` | Skripte und Dependency-Stand |
| `src/lib/mcp/index.ts` und `src/lib/mcp/tools/*.ts` | Tool-Implementierungen |

**Verbotenes Projekt:** `vgdqauqqkjwwumhzbuea` ist **verworfen, tot**.
Nirgends referenzieren, nicht versehentlich zurückschreiben.

**Aktives Projekt:** `vktilvpwbhrddjytilvs`. Keys im neuen Format
`sb_publishable_…` und `sb_secret_…` (kein JWT). PowerShell-User-Agent
muss `node` sein, sonst meldet Supabase fälschlich 401.

---

## 1. Aktueller Stand (verifiziert, nicht geschätzt)

### 1.1 Cloud

| Was | Stand | Quelle |
|---|---|---|
| 16 Tabellen vorhanden | verifiziert per API 5.10.2026, 18:30 | `WO-LIEGT-WAS.md` Abschnitt 6 |
| `brain_notes.drive_file_id` | verifiziert vorhanden | Kontrolltest mit erfundener Spalte schlug fehl |
| Notizen in der Cloud | **null** — 70 Notizen liegen nur auf dem PC | `scripts/migrate-vault.ts` ist der Importweg |
| RBAC-Tabellen (`agent_roles`, `agent_role_tools`, `agent_registry`) | **im Repo, noch nicht in der Cloud** | `supabase/migrations/20261005210000_agent_rbac.sql` |

### 1.2 GitHub

| Was | Wert |
|---|---|
| Branch | `main` |
| Letzter Commit | `4b87ae3` (5.10.2026, 19:00) |
| Commits gesamt | 81 |
| Ungepushte Commits | 0 (gerade alles gepusht) |

### 1.3 Lokaler Working-Tree (34 Änderungen, Stand 19:05)

| Pfad | Status | Risiko beim Push |
|---|---|---|
| `src/assets/spark-logo.png.asset.json` | D (Löschung) | niedrig, alte Asset-Referenz |
| `.env.example` | M | niedrig, Doku |
| `.lovable/mcp/manifest.json` | M | mittel, RBAC-Änderungen |
| `package.json` | M | niedrig, nur Versions-Patch |
| `src/components/spark/logo.tsx` | M | niedrig |
| `src/components/ui/button.tsx` | M | niedrig |
| `src/lib/mcp/index.ts` | M | mittel, RBAC-Wrapper |
| `src/lib/mcp/supabase.ts` | M | mittel, RBAC-Resolver |
| `src/routes/__root.tsx` | M | niedrig |
| `src/routes/_authenticated/app.brain.$noteId.tsx` | M | mittel, Drive-UI |
| `src/routes/auth.tsx` | M | niedrig |
| `src/routes/index.tsx` | M | niedrig |
| `src/routeTree.gen.ts` | M | generiert, normal |
| `src/styles.css` | M | niedrig |
| `supabase/config.toml` | M | niedrig |
| `supabase/migrations/20260916151927_*.sql` | M | **hoch**, siehe 2.4 |
| `supabase/migrations/20260916151937_*.sql` | M | **hoch**, siehe 2.4 |
| `supabase/migrations/20260919214329_*.sql` | M | **hoch**, siehe 2.4 |
| `vite.config.ts` | M | niedrig (Vorfehler bleibt) |
| `package-lock.json` | ?? | **mittel**, vorher push-Diff prüfen |
| `scripts/notizen-in-die-cloud.ps1` | ?? | niedrig |
| `scripts/schema-auf-die-cloud.ps1` | ?? | niedrig |
| `src/assets/spark-logo.jpg` | ?? | niedrig |
| `src/i18n/` | ?? | mittel, i18n-Agent arbeitet |
| `src/lib/theme.tsx` | ?? | niedrig |
| `src/routes/api/` | ?? | mittel, Drive-Routen von heute |
| `supabase/.temp/` | ?? | **nicht committen**, Build-Output |
| `supabase/migrations/20261005210000_agent_rbac.sql` | ?? | mittel, RBAC |
| `supabase/SETUP-ALLES.sql` | ?? | mittel, Cloud-Reproduzierbarkeit |
| `trace-pkce.cjs` | ?? | niedrig |
| `vercel.json` | ?? | niedrig |

### 1.4 Was bereits fertig ist

- ✅ Google-Drive-Integration (Code, ungetestet ohne Service-Account)
- ✅ RBAC-Code (Migration, Server-Filter, Manifest)
- ✅ Doku auf Stand 5.10.2026, 19:00 (Cloud, Git, offene Punkte)
- ✅ 23 + 1 Commits auf GitHub gepusht
- ✅ Editor-Entscheidung dokumentiert (`WO-LIEGT-WAS.md` Abschnitt 6b)

### 1.5 Was im Bau ist

- 🔄 i18n (Sprachdatei `src/i18n/de.json` existiert mit ~30 KB, `en.json` fehlt noch, Komponenten werden verdrahtet)

### 1.6 Was offen ist (echte Liste, sortiert)

| # | Was | Wer | Aufwand | Blockiert durch |
|---|---|---|---|---|
| 1 | i18n-Agent fertig werden lassen | aktueller Agent | läuft | — |
| 2 | Notion-Editor: rückwärtskompatibel bauen | nächster Agent | 1–2 h | Editor-Entscheidung in 6b |
| 3 | Working-Tree diffen und in logische Commits zerlegen | nächster Agent | 30 min | siehe 2.4 unten |
| 4 | Final-Push (Code + Migrationen, nicht `supabase/.temp/`) | nächster Agent | 5 min | Punkt 3 |
| 5 | RBAC-Migration in der Cloud ausführen | **User** im SQL-Editor | 5 min | Punkt 4 |
| 6 | Notizen-Import (`scripts/migrate-vault.ts --real`) | nächster Agent oder User | 15 min | Punkt 5 (oder direkt mit Service-Role) |
| 7 | Google-Provider in Supabase aktivieren | **User** im Dashboard | 2 min | — |
| 8 | Google-Secrets in Provider-Felder eintragen | **User** im Dashboard | 1 min | Punkt 7 |
| 9 | Service-Key rotieren (im Chat erwähnt) | **User** im Dashboard | 1 min | — |
| 10 | Google-Drive-Service-Account einrichten (6 Schritte) | **User** in Google Cloud Console | 15 min | — |
| 11 | `package-lock.json` push-Diff prüfen | nächster Agent | 5 min | siehe 2.3 |
| 12 | Vorfehler dokumentieren, NICHT beheben | nächster Agent | 5 min | siehe 2.5 |

---

## 2. Konkrete Arbeitsschritte für den nächsten Agenten

### 2.1 Sofort: Pflichtlektüre bestätigen

Bevor du irgendetwas änderst, gib aus:

```powershell
cd C:\workspace\cntconnect
git status
git log -1 --oneline
Test-Path .env
Test-Path WO-LIEGT-WAS.md
Test-Path docs\setup-stand\README.md
Test-Path docs\setup-stand\rbac-report.md
Test-Path src\i18n\de.json
```

Wenn eine dieser Dateien fehlt: **Stopp**, dem User melden. Nicht improvisieren.

### 2.2 i18n-Agent abwarten oder übernehmen

Prüfe, ob der i18n-Agent noch läuft:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, StartTime
```

Läuft er noch: **warte**, bis er committed (oder beendet ist). Er baut gerade
`en.json` und verdrahtet die Komponenten.

Läuft er nicht mehr, hat er vermutlich `en.json` und alle Komponenten fertig.
Dann:

```powershell
Get-ChildItem src\i18n
# Erwartung: de.json UND en.json vorhanden, ähnliche Größe
npx tsc --noEmit
npm run build
```

Vergleiche Vorfehler-Zähler (sollte unverändert sein, siehe 2.5).

### 2.3 `package-lock.json` push-Diff prüfen, bevor du es committest

```powershell
# Vor dem Commit:
git diff --stat package-lock.json
# Wenn > 500 Zeilen geändert: kurze Sichtkontrolle, was sich geändert hat
git diff package-lock.json | Select-String -Pattern '^\+.*"\^|"~|"latest' | Select-Object -First 20
```

**Wenn der Lockfile nur Pakete aus `package.json` wiederspiegelt, die wir
bewusst aktualisiert haben** (TanStack-Patch-Versionen): committen.

**Wenn der Lockfile plötzlich ganz andere Pakete oder transitive Deps
hinzugefügt hat**: nicht committen, User fragen.

### 2.4 Drei alte Migrations-Working-Tree-Änderungen — gefährlich

Diese drei sind die einzigen Migrations-Dateien, die vor dem heutigen Setup
geändert wurden:

```
supabase/migrations/20260916151927_ab51b218-b124-4c7b-9b58-954ec14677bf.sql
supabase/migrations/20260916151937_23a36679-3d29-4e5b-8365-dde9847fc575.sql
supabase/migrations/20260919214329_2ee122a9-8248-43f3-85e3-04a3dd6f4ff3.sql
```

Vorgehen:

```powershell
foreach ($m in @(
  'supabase\migrations\20260916151927_ab51b218-b124-4c7b-9b58-954ec14677bf.sql',
  'supabase\migrations\20260916151937_23a36679-3d29-4e5b-8365-dde9847fc575.sql',
  'supabase\migrations\20260919214329_2ee122a9-8248-43f3-85e3-04a3dd6f4ff3.sql'
)) {
  "=== $m ==="
  git diff --stat $m
  git diff $m | Select-Object -First 30
  ""
}
```

**Wenn die Änderungen idempotent sind** (`IF NOT EXISTS`, `DROP IF EXISTS`,
kein `DROP TABLE` ohne CASCADE): committen.

**Wenn eine Migration destruktive Operationen enthält** (DROP, ALTER COLUMN
ohne Default, RENAME): **NICHT committen**, User fragen. Diese Migrations
sind bereits in der Cloud gelaufen (siehe `docs/setup-stand/README.md`),
jede Änderung könnte Cloud-Stand und Code-Stand auseinanderlaufen lassen.

### 2.5 Bekannte Vorfehler — dokumentieren, nicht beheben

Es gibt **2 Vorfehler**, die **vor** dem heutigen Setup schon da waren.
Sie sind nicht deine Schuld. Behebe sie nicht ohne expliziten Auftrag.

| Fehler | Datei | Zeile | Warum Vorfehler |
|---|---|---|---|
| `TS2769: No overload matches this call. The last overload gave the following error. Type 'unknown[]' is not assignable to type 'PluginOption[]'.` | `vite.config.ts` | 38 | Existierte bereits vor den heutigen Änderungen. TypeScript-Inkonsistenz im Vite-Plugin-Array, build läuft trotzdem. |
| `rolldown:vite-resolve: "." is not exported under the conditions ["workerd", "worker", "production", "wasm", "unwasm", "import"] from package pkce-challenge` | Nitro production build | — | Framework-Problem mit `pkce-challenge`-Paket unter production-Conditions. Client- und SSR-Bundle laufen sauber. |

**Vor jeder Code-Änderung:** zähle die tsc-Fehler.

```powershell
npx tsc --noEmit 2>&1 | Select-String -Pattern "error TS" | Measure-Object | Select-Object -ExpandProperty Count
```

**Nach jeder Code-Änderung:** erneut zählen. Wenn die Zahl **gestiegen** ist,
hast du etwas kaputtgemacht. Beheben oder isolieren, nicht stillschweigend
committen.

### 2.6 Working-Tree in logische Commits zerlegen

**Reihenfolge** (jeder Commit ist ein eigener `git add` + `git commit`):

1. `supabase/SETUP-ALLES.sql` + `docs/setup-stand/SETUP-ALLES.*` falls vorhanden
   - Message: `chore(supabase): reproduzierbares Cloud-Setup (16 Tabellen, idempotent)`
2. `supabase/migrations/20261005210000_agent_rbac.sql`
   - Message: `feat(rbac): Migration für Agent-Rollen und Registry`
3. `src/lib/mcp/supabase.ts` + `src/lib/mcp/index.ts` + `.lovable/mcp/manifest.json`
   - Message: `feat(rbac): serverseitige Tool-Filterung und Manifest-Sync`
4. `src/routes/api/drive/*` + `src/routes/_authenticated/app.brain.$noteId.tsx`
   - Message: `feat(drive): Upload/Download/Delete-API + Notiz-UI`
5. `src/components/spark/logo.tsx` + `src/components/ui/button.tsx` + `src/assets/spark-logo.jpg` + `src/assets/spark-logo.png.asset.json` (D)
   - Message: `refactor(spark): Logo-Migration png -> jpg`
6. `src/routes/__root.tsx` + `src/routes/auth.tsx` + `src/routes/index.tsx` + `src/styles.css` + `src/lib/theme.tsx`
   - Message: `feat(ui): Theme-System und Routen-Header`
7. `src/i18n/de.json` + `src/i18n/en.json` + alle durch i18n geänderten Komponenten
   - Message: `feat(i18n): Sprachen Deutsch und Englisch, localStorage-Override`
8. `src/routeTree.gen.ts` (allein, weil generiert)
   - Message: `chore(routes): regenerate routeTree`
9. `vite.config.ts` + `supabase/config.toml` + `vercel.json`
   - Message: `chore(config): Build- und Deploy-Konfiguration`
10. `scripts/notizen-in-die-cloud.ps1` + `scripts/schema-auf-die-cloud.ps1`
    - Message: `chore(scripts): Cloud-Setup- und Import-Skripte`
11. `package.json` + `package-lock.json` (zusammen, nach Lockfile-Prüfung in 2.3)
    - Message: `chore(deps): TanStack-Patch-Versionen, mcp-js auf 3.0.1 festgepinnt`
12. `.env.example`
    - Message: `docs(env): Variablen dokumentiert, Google-Drive-Vars ergänzt`
13. **NICHT committen:** `supabase/.temp/`, `trace-pkce.cjs` (Debug-Artefakt)

Für jeden Commit:

```powershell
git add <dateien>
git commit -m "<message>"
```

Dann push:

```powershell
git push origin main
```

**Erwartung:** `git status` ist nach allen Commits clean (außer
`supabase/.temp/` und `trace-pkce.cjs`, die ignoriert oder gelöscht werden
sollten).

### 2.7 `supabase/.temp/` und `trace-pkce.cjs`

```powershell
# Sollte ignoriert sein, prüfen:
Get-Content .gitignore | Select-String -Pattern "temp|trace"
# Wenn .temp fehlt: ergänzen
# Wenn trace-pkce.cjs Müll ist: löschen oder zu .gitignore hinzufügen
```

### 2.8 i18n-Validierung (nach Punkt 2.2)

```powershell
# Beide Sprachen müssen existieren und ähnlich groß sein
Get-ChildItem src\i18n
# Key-Anzahl muss exakt gleich sein
$de = (Get-Content src\i18n\de.json -Raw | ConvertFrom-Json).PSObject.Properties.Name.Count
$en = (Get-Content src\i18n\en.json -Raw | ConvertFrom-Json).PSObject.Properties.Name.Count
"de: $de Keys | en: $en Keys | Differenz: $($de - $en)"
```

Wenn die Differenz ≠ 0: **nicht committen**, Bug im i18n-Agent.

### 2.9 Editor: rückwärtskompatibel bauen (Punkt 2 der offenen Liste)

**Bindend:** `WO-LIEGT-WAS.md` Abschnitt 6b. Alte Notizen bleiben Plaintext.
Keine destruktive Migration.

Konkrete Schritte stehen im i18n-Bericht, sobald er da ist. Wenn nicht:
selbst nach diesem Muster vorgehen:

1. **Detect-and-render:** In der Notiz-Ansicht (`src/routes/_authenticated/app.brain.$noteId.tsx`) vor dem Rendern prüfen, ob `note.content` Markdown-Marker enthält (`#`, `*`, `[`, ` ``` `, `>`). Wenn ja: Markdown-Renderer. Wenn nein: Plaintext wie heute.
2. **Speichern:** Beim Speichern das aktuelle interne Format beibehalten. Wenn eine Notiz als Plaintext geladen wurde, wird sie als Plaintext gespeichert. Wenn sie als Markdown geladen wurde, als Markdown.
3. **Keine Schema-Änderungen.** `brain_notes.content` bleibt `text`.
4. **Test:** Lade eine der 70 Notizen aus `C:\Users\Kunc GmbH\Documents\000_CNT\Plannung\Brain`, rufe die Render-Komponente auf, prüfe, dass die Ausgabe identisch zum Datei-Inhalt ist.

### 2.10 Nach dem Push: User-Aufgaben dokumentieren

Schreibe in `docs/setup-stand/README.md` Abschnitt „Reihenfolge nach dem
Code-Prozess" einen klaren Stand:

- [ ] (1) **erledigt** wenn i18n + Editor + alle Commits auf GitHub
- [ ] (2) **offen:** Google-Provider aktivieren
- [ ] (3) **offen:** Google-Secrets eintragen
- [ ] (4) **offen:** Service-Key rotieren
- [ ] (5) **offen:** RBAC-SQL im Supabase SQL-Editor ausführen
- [ ] (6) **offen:** Notizen-Import (`scripts/migrate-vault.ts --real`)
- [ ] (7) **offen:** Google-Drive-Service-Account einrichten
- [ ] (8) **offen:** Google-Secrets rotieren, Git-Historie bereinigen

---

## 3. Was du **nicht** tun darfst

| Aktion | Warum verboten |
|---|---|
| `.env` lesen und Inhalte ausgeben | Secret-Leak |
| `.env` committen | In `.gitignore`, würde sofort auf GitHub sichtbar |
| Supabase-API-Aufrufe, die Daten ändern | Migrationen führt nur der User manuell aus |
| `git push --force` | Datenverlust für andere |
| `git reset --hard` ohne expliziten Auftrag | Lokale Änderungen wegwerfen |
| Migrationen in der Cloud ausführen | Nur der User im SQL-Editor |
| Den verworfenen Projekt-Bezug `vgdqauqqkjwwumhzbuea` wieder einführen | Projekt ist tot |
| Vorfehler in `vite.config.ts` oder pkce-challenge beheben ohne Auftrag | Außerhalb des Scopes |
| `npm install` neue Pakete ohne Rücksprache | Lockfile-Drift |
| Den i18n-Agent-Bericht ungeprüft ins Repo schreiben | Wie beim RBAC-Bericht, müssen Zahlen stimmen |
| Mit dem i18n- oder RBAC-Agent gleichzeitig arbeiten | Race-Condition auf gleichen Dateien |

---

## 4. Was du tun sollst, wenn etwas schiefgeht

| Symptom | Reaktion |
|---|---|
| `git status` zeigt 50+ Dateien, die du nicht erwartest | **Stopp.** Nicht committen. Dem User melden, was du siehst. |
| tsc-Fehlerzahl gestiegen | **Stopp.** Den Fehler lesen, beheben oder rückgängig machen, dann weiter. |
| `npm run build` schlägt fehl, **anders als die zwei bekannten Vorfehler** | **Stopp.** Neuer Fehler ist neu. Dem User melden. |
| Supabase-Login funktioniert nicht | Keys im neuen Format? PowerShell-User-Agent `node`? Erneut prüfen. |
| Du sollst eine destruktive Migration schreiben | **NEIN.** Siehe `WO-LIEGT-WAS.md` Abschnitt 6b. |
| Eine Datei, die du brauchst, fehlt | Dem User melden, welche Datei, welchen Pfad, was du tun wolltest. |
| `git push` wird abgelehnt (non-fast-forward) | **NICHT** mit `--force` lösen. Dem User melden. |
| `vgdqauqqkjwwumhzbuea` taucht in einer Datei auf, die du öffnest | Diese Datei ist veraltet. Dem User melden, welche Datei, dann entscheiden, ob aktualisieren oder löschen. |

---

## 5. Verifikation am Ende (vor dem letzten Push)

Führe alle drei aus, vergleiche mit dem Stand **vor** deinen Änderungen:

```powershell
# 1. tsc-Fehler zählen
npx tsc --noEmit 2>&1 | Select-String -Pattern "error TS" | Measure-Object | Select-Object -ExpandProperty Count
# Erwartung: gleich wie vor deinen Änderungen (typisch 1, der vite.config.ts-Fehler)

# 2. Build-Stand
npm run build 2>&1 | Select-String -Pattern "error|failed|✓|built" | Select-Object -Last 10
# Erwartung: Client ok, SSR ok, Nitro fail mit dem pkce-challenge-Fehler (bekannt)

# 3. Working-Tree clean?
git status --short
# Erwartung: nur .env (ignoriert), supabase/.temp/ (ignoriert), trace-pkce.cjs (zu ignorieren)
```

**Bericht an den User** am Ende, mit echten Zahlen:
- Anzahl Commits, die du gemacht hast
- Anzahl Dateien pro Commit
- tsc-Vorher/Nachher-Differenz (erwartet 0)
- Was noch offen ist und wer es macht (Agent oder User)

---

## 6. Wenn der User nicht antwortet

Manchmal blockiert eine Frage den Agent. Die richtige Reihenfolge:

1. Selbst beantworten, wenn die Antwort in den oben genannten Doku-Dateien steht.
2. Wenn nicht: **AskQuestion** benutzen mit klaren Optionen.
3. Niemals stillschweigend eine Default-Antwort wählen, die eine Migration, einen Push oder einen API-Aufruf beinhaltet.

---

## 7. Datei-Inventar — alles, was du brauchst, an einem Ort

| Pfad | Zweck | Lesen? | Ändern? |
|---|---|---|---|
| `C:\workspace\cntconnect\WO-LIEGT-WAS.md` | Wo-was-Doku | **ja** | nur, wenn etwas Neues dazukommt |
| `C:\workspace\cntconnect\PLAN-MORGEN.md` | historisch, seit 19:00 markiert | ja | nein |
| `C:\workspace\cntconnect\HANDOVER.md` | Übergabe-Notiz | ja | ergänzen, wenn nötig |
| `C:\workspace\cntconnect\docs\setup-stand\README.md` | Setup-Stand | ja | aktualisieren nach jedem Schritt |
| `C:\workspace\cntconnect\docs\setup-stand\rbac-report.md` | RBAC-Bericht + SQL | ja | nein, historisch |
| `C:\workspace\cntconnect\.env` | Secrets | **niemals ausgeben** | nein |
| `C:\workspace\cntconnect\.env.example` | Vorlage | ja | ergänzen bei neuen Variablen |
| `C:\workspace\cntconnect\package.json` | Deps, Scripts | ja | bei Dependency-Änderungen |
| `C:\workspace\cntconnect\src\lib\mcp\index.ts` | MCP-Server, 16 Tools | ja | nur RBAC-Bereich |
| `C:\workspace\cntconnect\src\lib\mcp\supabase.ts` | Supabase-Auth + RBAC-Resolver | ja | nur RBAC-Bereich |
| `C:\workspace\cntconnect\src\lib\mcp\tools\*.ts` | 16 Tool-Implementierungen | ja | nein, sind API |
| `C:\workspace\cntconnect\src\lib\mcp-client\index.ts` | MCP-Client | ja | nein, sind API |
| `C:\workspace\cntconnect\src\routes\_authenticated\app.brain.*.tsx` | Brain-UI | ja | für Editor |
| `C:\workspace\cntconnect\src\routes\api\drive\*` | Drive-API | ja | bei Drive-Bugs |
| `C:\workspace\cntconnect\src\i18n\de.json` | deutsche Texte | ja | nein, generiert |
| `C:\workspace\cntconnect\src\i18n\en.json` | englische Texte | ja | nein, generiert |
| `C:\workspace\cntconnect\supabase\migrations\*.sql` | Schema-Versionen | ja | mit Vorsicht (siehe 2.4) |
| `C:\workspace\cntconnect\supabase\SETUP-ALLES.sql` | reproduzierbares Cloud-Setup | ja | nein, generiert |
| `C:\workspace\cntconnect\scripts\migrate-vault.ts` | Notizen-Import | ja | nein |
| `C:\workspace\cntconnect\scripts\vault-parser.ts` | Notizen-Parser | ja | nein |
| `C:\workspace\cntconnect\scripts\*.ps1` | PowerShell-Hilfen | ja | ergänzen |
| `C:\workspace\cntconnect\vite.config.ts` | Vite-Config | ja | Vorfehler nicht beheben |
| `C:\workspace\cntconnect\.lovable\mcp\manifest.json` | Tool-Manifest | ja | RBAC-Sync |

---

## 8. Erfolgskriterien

Am Ende dieser Session müssen **alle** diese Punkte zutreffen:

- [ ] `git status` zeigt nur ignorierte Dateien
- [ ] `git log -1` ist ein Commit von dir mit den heutigen Änderungen
- [ ] `npx tsc --noEmit` zeigt **gleich viele** Fehler wie vorher
- [ ] `npm run build` schlägt **nur** an den bekannten zwei Stellen fehl
- [ ] `docs/setup-stand/README.md` ist auf den heutigen Stand aktualisiert
- [ ] User weiß, was er im Browser/Supabase-Dashboard/Google-Console noch tun muss
- [ ] Keine Secrets im Working-Tree, kein `.env` committet
- [ ] Kein Aufruf an verworfenes Projekt `vgdqauqqkjwwumhzbuea` im Code
- [ ] Keine destruktive Migration für `content`-Spalten

Wenn alle Punkte erfüllt sind: **Session beenden**, Bericht an User geben,
nicht weiterarbeiten. Die nächsten Schritte (RBAC-SQL, Vault-Import,
Google-Service-Account) sind User-Aufgaben und werden in der nächsten
Session erledigt.
