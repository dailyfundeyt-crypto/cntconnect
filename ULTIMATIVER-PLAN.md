# ULTIMATIVER PLAN — Verbindung fertigstellen

> **Zweck:** Verbindet alle laufenden Fäden zu einer lauffähigen App. Am Ende
> muss das Projekt: bauen, Notizen rückwärtskompatibel anzeigen, Sprachen
> umschaltbar machen, alle Geheimnisse in Sicherheit, der User weiß was im
> Browser zu tun ist.
>
> **Stand:** 5. Oktober 2026, 22:00 Uhr
> **Cloud:** `vktilvpwbhrddjytilvs` (16 Tabellen verifiziert)
> **GitHub:** `dcbdfdb`, Branch `main`, alles gepusht
> **Working-Tree:** siehe unten — Status vor dem Abarbeiten des Plans

**So nutzt du diesen Plan:**
1. Führe zuerst Teil I (5 Befehle, 30 Sekunden)
2. Dann arbeite Phase 1 bis 7 aus Teil C ab
3. Verifiziere am Ende mit Teil F (11 Erfolgskriterien)
4. Wenn etwas fehlschlägt: Teil E (Symptom-Tabelle)
5. Zum Schluss dem User die 7 Schritte aus Teil G geben

**Schwester-Datei:** `PROMPT-FUER-NAECHSTEN-AGENTEN.md` — der Auftragstext,
den der User in einen neuen Agenten einfügt. Wenn du das hier liest, bist du
vermutlich dieser Agent.

---

## TEIL A — Pflichtlektüre (5 Minuten, ohne die du Fehler machst)

| Datei | Was du daraus brauchst |
|---|---|
| `WO-LIEGT-WAS.md` | Aktives Projekt, 16 Tabellen, Editor-Regel in Abschnitt 6b |
| `HANDOVER-PLAN.md` | Vorheriger Plan, **aber:** durch diesen Plan hier ersetzt. Sektion 2.2 ist veraltet — i18n-Agent ist tot, hat aber mehr gebaut als gedacht |
| `docs/setup-stand/README.md` | Setup-Stand, was im Browser erledigt werden muss |
| `docs/setup-stand/rbac-report.md` | RBAC-SQL, das der User im Supabase SQL-Editor ausführen muss |
| `package.json` | Scripts, Deps. i18next + react-i18next sind schon installiert |

**Verbotenes Projekt:** `vgdqauqqkjwwumhzbuea`. Tot. Nicht referenzieren.
**Aktives Projekt:** `vktilvpwbhrddjytilvs`. Keys: `sb_publishable_…` / `sb_secret_…` (kein JWT). PowerShell-User-Agent muss `node` sein.

---

## TEIL B — Stand der Wahrheit (verifiziert 21:35 Uhr)

### B.1 Was tatsächlich existiert

```
src/i18n/
  de.json     32 KB   576 Leaf-Keys
  en.json     42 KB   768 Leaf-Keys
  index.ts     2 KB   i18next-Init, setLanguage, getLanguage

src/components/spark/
  language-switcher.tsx    2.1 KB
  markdown-view.tsx        6.2 KB   ← der Editor, rückwärtskompatibel

src/routes/_authenticated/
  14 Routes — ALLE haben useTranslation bereits eingebunden
  app.tsx, app.audio.tsx, app.brain.tsx, app.brain.$noteId.tsx,
  app.canvas.tsx, app.doc.$docId.tsx, app.graph.tsx, app.health.tsx,
  app.index.tsx, app.learn.tsx, app.plan.tsx, app.studio.tsx,
  app.table.$tableId.tsx, app.trash.tsx

src/routes/api/drive/   ← Drive-API
src/lib/mcp/   ← MCP-Server mit RBAC-Filter (16 Tools)
supabase/migrations/20261005210000_agent_rbac.sql  ← Migration
supabase/SETUP-ALLES.sql  ← reproduzierbares Cloud-Setup
```

### B.2 Was kaputt ist (echte Befunde, nicht Vermutungen)

| # | Was | Wo | Schwere |
|---|---|---|---|
| 1 | **TypeScript-Fehler in `app.learn.tsx`** Zeile 820: `error TS1005: ')' expected` — `\|\| (` an Zeile 816 ist ein Syntax-Bruch, vermutlich vom Subagent-Replace | `src/routes/_authenticated/app.learn.tsx:816-820` | Build-Blocker |
| 2 | **i18n-Key-Ungleichgewicht:** `en.json` hat 192 Keys ohne deutsches Gegenstück | `src/i18n/{de,en}.json` | Funktional: Sprachumschaltung zeigt leere Strings auf Deutsch |
| 3 | **Bekannte Vorfehler** (NICHT deine Schuld, nicht beheben): `vite.config.ts(38,5) TS2769` + Nitro pkce-challenge Production-Fail | `vite.config.ts:38` + Nitro-Build | vorhanden seit Tagen |

### B.3 Was ungetestet ist

| Was | Warum |
|---|---|
| RBAC-Logik live | Braucht `agent_registry`-Eintrag in der Cloud |
| Drive-Upload echt | Braucht Google-Service-Account |
| Markdown-Renderer mit echten Notizen | Code da, aber kein Vault-Import in Cloud |
| Sprachumschaltung im UI | Code da, aber UI-Pfad nicht verifiziert (Switcher nicht in `__root.tsx` eingebunden?) |

---

## TEIL C — Sieben-Phasen-Plan, in dieser Reihenfolge

### Phase 1: Sofort-Reparatur (15 min)

**Ziel:** Das Projekt muss `npx tsc --noEmit` mit **nur den bekannten Vorfehlern** durchlaufen.

**Schritt 1.1: Syntax in `app.learn.tsx` reparieren**

Öffne `src/routes/_authenticated/app.learn.tsx`, gehe zu Zeile 816. Du wirst etwas sehen wie:

```tsx
            </div>
          )}
        </div>
        || (                                              ← DAS HIER IST KAPUTT
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            {t("learn.noFlashcards")}
          </div>
        )
```

Lies den Kontext davor. Es war vermutlich ein `{condition ? <A /> : <B />}` und der Subagent hat das `?` und den ganzen Ternary-Ausdruck gelöscht, aber den `||`-Fall stehen lassen. **Behebe es so, wie es semantisch korrekt ist.** Wahrscheinlich: das `||` und der Block danach sind Müll und müssen weg. Oder: es war ein Conditional und muss `cond && (` werden.

**Verifiziere nach jeder Änderung:**
```powershell
npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count
# Ziel: 1 (nur vite.config.ts(38,5))
```

Wenn der Zähler **fällt auf 0** oder **steigt über 1**: stopp, dein Fix hat etwas anderes kaputtgemacht.

**Schritt 1.2: Bestätige, dass es wirklich nur 1 Fehler ist und kein versteckter zweiter**

```powershell
npx tsc --noEmit 2>&1 | Select-String "error TS" | ForEach-Object { $_.ToString() }
# Sollte zeigen:
#   src/routes/_authenticated/app.learn.tsx(820,12): error TS1005: ')' expected.
#   vite.config.ts(38,5): error TS2769: ...
```

Wenn dort etwas anderes steht, was vorher nicht da war: **das war kein Vorfehler, das hat der Subagent eingebaut. Beheben.**

### Phase 2: i18n-Key-Gleichgewicht (20 min)

**Ziel:** `de.json` und `en.json` haben **exakt gleich viele** Leaf-Keys.

**Schritt 2.1: Differenz finden**

```powershell
$de = Get-Content src\i18n\de.json -Raw | ConvertFrom-Json
$en = Get-Content src\i18n\en.json -Raw | ConvertFrom-Json
function Leaves($o, $prefix="") {
  $r = @()
  foreach ($p in $o.PSObject.Properties) {
    $k = if ($prefix) { "$prefix.$($p.Name)" } else { $p.Name }
    if ($p.Value -is [System.Management.Automation.PSObject]) {
      $r += Leaves $p.Value $k
    } else {
      $r += $k
    }
  }
  $r
}
$deKeys = Leaves $de
$enKeys = Leaves $en
$missingInDe = $enKeys | Where-Object { $_ -notin $deKeys }
$missingInEn = $deKeys | Where-Object { $_ -notin $enKeys }
"--- Nur in en.json (192 erwartet) ---"
$missingInDe | Select-Object -First 30
"--- Nur in de.json ---"
$missingInEn
```

**Schritt 2.2: Fehlende deutsche Keys nachpflegen**

Nimm die ersten 30 fehlenden Keys und übersetze sie ins Deutsche. Übliche Kandidaten: `audio.*`, `learn.*`, `studio.*`, weil das die Bereiche sind, die der Subagent vermutlich vollständiger gemacht hat.

Schreibe die deutschen Werte **in den richtigen Namespace** in `de.json`. Beispiele:

```json
// In en.json gefunden: "audio.upload": "Upload audio"
// In de.json unter "audio" ergänzen: "upload": "Audio hochladen"
```

**Schritt 2.3: Verifizieren**

```powershell
$deCount = (Leaves $de).Count
$enCount = (Leaves $en).Count
"de: $deCount | en: $enCount | Differenz: $($deCount - $enCount)"
# Ziel: Differenz 0
```

### Phase 3: Language-Switcher einbinden (10 min)

**Ziel:** `src/components/spark/language-switcher.tsx` ist in der Top-Bar sichtbar.

**Schritt 3.1: Wo wird er eingebunden?**

Suche in `src/routes/__root.tsx` nach der Header-Struktur. Wahrscheinlich gibt es einen Bereich, wo der User-Button sitzt (rechts oben). Füge dort ein:

```tsx
import { LanguageSwitcher } from "@/components/spark/language-switcher";

// Innerhalb des Header-JSX:
<LanguageSwitcher />
```

Falls `LanguageSwitcher` nicht existieren sollte (sollte laut B.1 da sein, 2.1 KB): **Stopp**, dem User melden.

**Schritt 3.2: Verifizieren — Dev-Server starten**

```powershell
# In einem separaten Terminal:
cd C:\workspace\cntconnect
npm run dev
# Port 8080
```

Dann in Browser: öffne `http://localhost:8080`, prüfe:
1. App lädt
2. Switcher ist sichtbar
3. Klick auf "EN" → Texte werden englisch
4. Klick auf "DE" → Texte werden deutsch
5. F5 → Sprache ist gemerkt (localStorage)

### Phase 4: Markdown-Editor verifizieren, rückwärtskompatibel (30 min)

**Ziel:** Alte Plaintext-Notizen rendern ohne Änderung. Neue Notizen dürfen Markdown nutzen.

**Schritt 4.1: `markdown-view.tsx` lesen und verstehen, was sie tut**

Öffne `src/components/spark/markdown-view.tsx`. Suche nach:
- Wie wird entschieden, ob Markdown oder Plaintext?
- Was passiert mit Sonderzeichen wie `#`, `*`, `[`?
- Wird der Originaltext irgendwie escaped oder verändert?

**Schritt 4.2: Detect-and-render-Regel anwenden**

Falls die Datei **nicht** detect-and-render macht (z.B. immer Markdown-Parse), dann ändere sie. Algorithmus:

```typescript
function looksLikeMarkdown(text: string): boolean {
  // Heuristik: hat der Text Markdown-Marker?
  return /(^|\n)(#{1,6}\s|\*\s|-\s|\d+\.\s|```|>\s|\[.+\]\(.+\))/m.test(text);
}

// In der Komponente:
const isMd = looksLikeMarkdown(content);
return isMd ? <ReactMarkdown>{content}</ReactMarkdown> : <pre>{content}</pre>;
```

**Schritt 4.3: Test mit echter Notiz aus dem Vault**

Lies eine Notiz aus dem Vault:

```powershell
$note = Get-Content "C:\Users\Kunc GmbH\Documents\000_CNT\Plannung\Brain\hot.md" -Raw
# Diese Datei sollte Plaintext sein, KEIN Markdown
# Kopiere den Inhalt in einen Test-Render
```

Prüfe:
1. Wird die Notiz **byte-genau** angezeigt? (Keine Zeichen verschluckt, keine HTML-Entities, keine Markdown-Interpretation, die den Text verändert)
2. Eine Notiz mit `# Überschrift\n\nText` wird als Überschrift + Text gerendert
3. Eine Notiz ohne Marker wird als Plaintext angezeigt

**Schritt 4.4: Speichern unverändert lassen**

Das ist der wichtigste Teil. In `src/routes/_authenticated/app.brain.$noteId.tsx`:
- Lade-Funktion: `setContent(note.content)` — 1:1
- Speicher-Funktion: schreibe `content` so zurück, wie es geladen wurde. **Kein stilles Umschreiben.**

### Phase 5: Build verifizieren (10 min)

**Ziel:** `npm run build` läuft mit **nur den bekannten Fehlern**.

```powershell
npm run build 2>&1 | Tee-Object -FilePath build.log
```

Erwartete Ausgabe:
- `✓ client built` (oder ähnlich)
- `✓ ssr built` (oder ähnlich)
- `✘ Error [nitro]: rolldown:vite-resolve: "." is not exported ... pkce-challenge ...` — **das ist der bekannte Vorfehler, ignorieren**
- Wenn noch andere Errors auftauchen: **das sind neue Fehler**, beheben.

**Wenn der Build erfolgreicher ist als erwartet** (z.B. Nitro-Build geht plötzlich durch): wunderbar, aber prüfe trotzdem, ob die App im Browser läuft. Vielleicht hat sich der Fehler durch deine Änderungen erledigt, vielleicht auch nicht.

### Phase 6: Working-Tree in logische Commits zerlegen und pushen (30 min)

**Ziel:** Alles, was lokal liegt, kommt auf GitHub. Strukturiert.

**Reihenfolge der Commits** (jeder Commit einzeln `git add` + `git commit`):

1. `src/i18n/de.json` + `src/i18n/en.json` + `src/i18n/index.ts` + `src/components/spark/language-switcher.tsx`
   - `feat(i18n): Sprachen Deutsch und Englisch, localStorage-Override, Switcher`
2. `src/components/spark/markdown-view.tsx`
   - `feat(editor): detect-and-render, rückwärtskompatibel zu Plaintext`
3. Alle 14 Routen in `src/routes/_authenticated/` + `src/routes/__root.tsx` + `src/routes/auth.tsx` + `src/routes/index.tsx`
   - `feat(i18n): alle Routen auf useTranslation umgestellt`
4. `src/routeTree.gen.ts` (allein, generiert)
   - `chore(routes): regenerate routeTree`
5. `src/lib/mcp/supabase.ts` + `src/lib/mcp/index.ts` + `.lovable/mcp/manifest.json` + `supabase/migrations/20261005210000_agent_rbac.sql`
   - `feat(rbac): serverseitige Tool-Filterung und Migration`
6. `src/routes/api/drive/*` + `src/routes/_authenticated/app.brain.$noteId.tsx`
   - `feat(drive): Upload/Download/Delete-API + Notiz-UI`
7. `supabase/SETUP-ALLES.sql`
   - `chore(supabase): reproduzierbares Cloud-Setup (16 Tabellen, idempotent)`
8. `supabase/migrations/20260916*.sql` (3 Dateien, gefährlich — siehe unten)
   - **STOPP**: erst die Diffs prüfen, dann entscheiden
9. `src/components/spark/logo.tsx` + `src/components/ui/button.tsx` + `src/assets/spark-logo.jpg` + `src/assets/spark-logo.png.asset.json` (D)
   - `refactor(spark): Logo png -> jpg`
10. `src/styles.css` + `src/lib/theme.tsx`
    - `feat(ui): Theme-System`
11. `vite.config.ts` + `supabase/config.toml` + `vercel.json`
    - `chore(config): Build- und Deploy-Konfiguration`
12. `scripts/notizen-in-die-cloud.ps1` + `scripts/schema-auf-die-cloud.ps1`
    - `chore(scripts): Cloud-Setup- und Import-Hilfen`
13. `package.json` + `package-lock.json` (zusammen, nach Lockfile-Prüfung)
    - `chore(deps): TanStack-Patch + mcp-js gepinnt + i18next`

**Gefährliche Schritte — vor jedem Commit verifizieren:**

Für jeden Commit vor dem `git commit`:
```powershell
git diff --staged --stat
# Lies ALLE geänderten Dateien. Wenn dir etwas nicht passt: nicht committen.
```

**Besonders kritisch (Schritt 8, drei alte Migrations):**
```powershell
foreach ($m in 'supabase\migrations\20260916151927_*.sql','supabase\migrations\20260916151937_*.sql','supabase\migrations\20260919214329_*.sql') {
  "=== $m ==="
  git diff $m | Select-Object -First 50
  ""
}
```

Wenn die Diffs destruktiv sind (DROP ohne CASCADE, ALTER COLUMN ohne Default): **NICHT committen**, dem User melden. Diese Migrations sind bereits in der Cloud.

**`supabase/.temp/`:** ist Build-Output. **Niemals committen.** Prüfe `.gitignore`, ergänze `.temp` falls nötig.

**`trace-pkce.cjs`:** Debug-Artefakt. Wenn Müll: löschen. Wenn nützlich: in `.gitignore`.

**Push:**
```powershell
git push origin main
# Erwartung: Fast-Forward, kein Force, keine Konflikte
```

### Phase 7: Bericht schreiben und User informieren (10 min)

**Ziel:** Der User weiß am Ende exakt, was passiert ist und was er noch tun muss.

**Schritt 7.1: `docs/setup-stand/README.md` aktualisieren**

Abschnitt „Stand" auf das Datum/die Uhrzeit setzen. Listen:
- ✅ Schema in der Cloud (16 Tabellen)
- ✅ i18n fertig, Sprachen DE/EN, Switcher im UI
- ✅ RBAC-Code committet, Migration bereit für User
- ✅ Drive-UI fertig, Service-Account fehlt
- ✅ Editor rückwärtskompatibel
- ❌ Notizen noch nicht in Cloud (Vault-Import ausstehend)
- ❌ Google-Login nicht aktiviert
- ❌ Service-Key nicht rotiert
- ❌ RBAC-SQL nicht in Cloud ausgeführt
- ❌ Google-Drive-Service-Account fehlt

**Schritt 7.2: `docs/setup-stand/i18n-report.md` neu anlegen**

Falls es einen vollständigen i18n-Bericht gibt: speichere ihn. Falls du den Doppelagent-Schaden beheben musstest: dokumentiere was passiert ist, sodass der nächste Agent nicht denselben Fehler macht.

**Schritt 7.3: Letzter `git add` + `git commit` + `git push` für die Doku-Updates**

**Schritt 7.4: Bericht an User** — schreib ihm:
- Welche der 7 Phasen du abgeschlossen hast (mit echten Zahlen)
- Welche tsc-Fehler noch da sind (sollte nur der eine vite.config.ts-Fehler sein)
- Was er im Browser/Supabase-Dashboard noch tun muss (6 Schritte)
- Welche Datei im Working-Tree noch offen ist (sollte 0 sein)

---

## TEIL D — Was du NICHT tun darfst (12 Verbote)

| Verbot | Grund |
|---|---|
| `.env` lesen und Inhalte ausgeben | Secret-Leak |
| `.env` committen | in `.gitignore`, sofort sichtbar auf GitHub |
| Supabase-Daten ändern (INSERT/UPDATE/DELETE) | Migrationen nur User manuell |
| `git push --force` | Datenverlust |
| `git reset --hard` ohne Auftrag | lokale Änderungen weg |
| Migrationen in Cloud ausführen | User im SQL-Editor |
| `vgdqauqqkjwwumhzbuea` referenzieren | Projekt ist tot |
| Vorfehler in `vite.config.ts` beheben | außerhalb Scope |
| `npm install` neue Pakete ohne Rücksprache | Lockfile-Drift |
| Ungeprüften Doppelagent-Bericht ins Repo | wie RBAC-Bericht, Zahlen müssen stimmen |
| Mit dem i18n-Subagent noch interagieren | er ist tot, nicht reanimieren |
| Subagenten parallel starten | Race-Condition |

---

## TEIL E — Symptom-Tabelle (was tun bei was)

| Symptom | Reaktion |
|---|---|
| tsc-Fehlerzahl **gestiegen** | Stopp, Diff ansehen, beheben oder rückgängig |
| `npm run build` schlägt **anders als die zwei bekannten Fehler** fehl | Stopp, dem User melden |
| i18n-Key-Differenz bleibt ≠ 0 | nicht committen, in de.json ergänzen |
| `vgdqauqqkjwwumhzbuea` in irgendeiner Datei | dem User melden, Datei aktualisieren oder löschen |
| `git push` non-fast-forward | **nicht** mit `--force`, dem User melden |
| Subagent-Output sieht „fertig" aus, aber `app.learn.tsx` ist kaputt | dem Subagent-Output **nicht vertrauen**, Code selbst prüfen |
| Sprache schaltet im Browser nicht um | Switcher eingebunden? localStorage wird gesetzt? |
| Vault-Notiz wird im Editor falsch dargestellt | detect-and-render-Heuristik zu eng, erweitern |
| `.env` ist plötzlich im Working-Tree | **nicht committen**, `.gitignore` prüfen |

---

## TEIL F — Erfolgskriterien (alle müssen erfüllt sein)

Vor dem letzten Push verifiziere:

- [ ] `npx tsc --noEmit` zeigt **1 Fehler** (`vite.config.ts(38,5)`)
- [ ] `npm run build` schlägt nur am **pkce-challenge** fehl, sonst grün
- [ ] i18n: `de.json` und `en.json` haben **gleiche** Key-Anzahl
- [ ] Browser-Test: Sprache umschaltbar, gemerkt nach Reload
- [ ] Editor-Test: Plaintext-Notiz byte-genau, Markdown-Notiz gerendert
- [ ] `git status` clean (außer ignorierte Dateien)
- [ ] 13 Commits auf GitHub, alle mit verständlichen Messages
- [ ] `docs/setup-stand/README.md` ist auf heutigen Stand
- [ ] User weiß, was er im Browser noch tun muss (6 Schritte)
- [ ] Kein Secret im Working-Tree, kein `.env` committet
- [ ] Keine destruktive Migration für `content`-Spalten

**Wenn alle 11 Punkte erfüllt sind: Session beenden**, Bericht an User geben.

---

## TEIL G — Verbleibende User-Aufgaben (nicht von dir, sondern vom User)

| # | Was | Wo | Aufwand |
|---|---|---|---|
| 1 | RBAC-SQL in der Cloud ausführen | Supabase Dashboard → SQL-Editor → `supabase/migrations/20261005210000_agent_rbac.sql` Inhalt pasten → Run | 5 min |
| 2 | Google-Provider aktivieren | Supabase Dashboard → Authentication → Providers → Google | 2 min |
| 3 | Google-Secrets in Provider-Felder | Supabase Dashboard → Authentication → Providers → Google → Client-ID/Secret | 1 min |
| 4 | Service-Key rotieren (im Chat erwähnt) | Supabase Dashboard → Project Settings → API Keys | 1 min |
| 5 | Vault-Notizen importieren | `npx tsx scripts/migrate-vault.ts --real` | 15 min |
| 6 | Google-Drive-Service-Account einrichten | Google Cloud Console → APIs & Services → Credentials | 15 min |
| 7 | Google-Secrets in `.env` ergänzen (falls 6 erledigt) | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY` | 2 min |

**Diese 7 Schritte sind NICHT deine Arbeit.** Du baust die Verbindung im Code fertig. Der User macht das Setup im Browser.

---

## TEIL H — Datei-Inventar (Pfade, die du brauchst)

| Pfad | Lesen | Ändern |
|---|---|---|
| `C:\workspace\cntconnect\WO-LIEGT-WAS.md` | ja | nur, wenn etwas Neues dazukommt |
| `C:\workspace\cntconnect\HANDOVER.md` | ja | ergänzen |
| `C:\workspace\cntconnect\HANDOVER-PLAN.md` | ja, **aber veraltet** | nicht ändern, dieser Plan ersetzt |
| `C:\workspace\cntconnect\docs\setup-stand\README.md` | ja | aktualisieren am Ende |
| `C:\workspace\cntconnect\docs\setup-stand\rbac-report.md` | ja | nein |
| `C:\workspace\cntconnect\.env` | **niemals ausgeben** | nein |
| `C:\workspace\cntconnect\.env.example` | ja | ergänzen bei neuen Vars |
| `C:\workspace\cntconnect\package.json` | ja | bei Dep-Änderungen |
| `C:\workspace\cntconnect\src\i18n\index.ts` | ja | nein, generiert |
| `C:\workspace\cntconnect\src\i18n\de.json` | ja | ergänzen wenn Keys fehlen |
| `C:\workspace\cntconnect\src\i18n\en.json` | ja | ergänzen wenn Keys fehlen |
| `C:\workspace\cntconnect\src\components\spark\language-switcher.tsx` | ja | nein, generiert |
| `C:\workspace\cntconnect\src\components\spark\markdown-view.tsx` | ja | ja, für detect-and-render |
| `C:\workspace\cntconnect\src\routes\__root.tsx` | ja | ja, für Switcher-Einbindung |
| `C:\workspace\cntconnect\src\routes\_authenticated\app.learn.tsx` | ja | **ja, für Syntax-Fix** |
| `C:\workspace\cntconnect\src\routes\_authenticated\app.brain.$noteId.tsx` | ja | ja, für Editor-Anbindung |
| `C:\workspace\cntconnect\src\routes\api\drive\*` | ja | bei Drive-Bugs |
| `C:\workspace\cntconnect\src\lib\mcp\index.ts` | ja | nur RBAC |
| `C:\workspace\cntconnect\src\lib\mcp\supabase.ts` | ja | nur RBAC |
| `C:\workspace\cntconnect\src\lib\mcp\tools\*.ts` | ja | nein, sind API |
| `C:\workspace\cntconnect\supabase\migrations\20261005210000_agent_rbac.sql` | ja | nein, generiert |
| `C:\workspace\cntconnect\supabase\SETUP-ALLES.sql` | ja | nein, generiert |
| `C:\workspace\cntconnect\supabase\migrations\20260916*.sql` | ja | **mit Vorsicht, siehe Phase 6 Schritt 8** |
| `C:\workspace\cntconnect\scripts\migrate-vault.ts` | ja | nein |
| `C:\workspace\cntconnect\scripts\vault-parser.ts` | ja | nein |
| `C:\workspace\cntconnect\vite.config.ts` | ja | Vorfehler nicht beheben |
| `C:\workspace\cntconnect\.lovable\mcp\manifest.json` | ja | RBAC-Sync |

---

## TEIL I — Wenn du startest, zuerst diese 5 Befehle

```powershell
cd C:\workspace\cntconnect
git status
git log -1 --oneline
npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count
Get-Content src\i18n\de.json -Raw | ConvertFrom-Json
Get-Content src\i18n\en.json -Raw | ConvertFrom-Json
```

Damit hast du in 30 Sekunden den Stand. **Dann** fängst du mit Phase 1 an.

---

**Los geht's. Bei Fragen: HANDOVER-PLAN.md (alt) und WO-LIEGT-WAS.md lesen. Sonst: fragen kostet nichts, raten kostet Commit.**
