# Setup-Stand: Supabase Cloud-Anbindung

**Stand:** 5. Oktober 2026, 18:55 Uhr
**Status:** Code läuft. Was noch fehlt, ist unten ehrlich aufgelistet.

> **Letzte Aktualisierung 18:55:** Die Schema-Ausführung (Punkt 1 unten) ist
> **erledigt** — die 16 Tabellen stehen in der Cloud, per API verifiziert.
> Google-Login (Punkt 2) ist offen — der User macht es im Supabase-Dashboard.
> Secret-Key-Rotation (Punkt 4) ist **dringend**, weil der `sb_secret_…` Key
> heute in einem Chatverlauf erwähnt wurde.

---

## Projektumstellung: ERLEDIGT

Spark ist auf das neue Supabase-Projekt umgestellt. Nicht die alte ID
`vgdqauqqkjwwumhzbuea`, sondern die neue `vktilvpwbhrddjytilvs`. Das alte
Projekt ist **verworfen** — siehe `WO-LIEGT-WAS.md` Abschnitt 6.

| Feld | Wert |
|---|---|
| Projekt-URL | `https://vktilvpwbhrddjytilvs.supabase.co` |
| Konto | dailyfunen.yt@gmail.com |
| Keys-Format | neu: `sb_secret_…` / `sb_publishable_…` (kein JWT mehr) |

### Geänderte Dateien

| Datei | Änderung |
|---|---|
| `.env` | 5 Supabase-Zeilen + beide Schlüssel eingetragen |
| `.env.example` | 5 Zeilen auf neue URL |
| `supabase/config.toml` | `project_id` |
| `.lovable/mcp/manifest.json` | OAuth-Issuer (`auth/v1`) |
| `scripts/schema-auf-die-cloud.ps1` | `$ProjectRef` |
| `scripts/notizen-in-die-cloud.ps1` | Hinweistext |
| `WO-LIEGT-WAS.md` | Projektreferenz, korrigiert 18:30 Uhr |
| `HANDOVER.md` | Projektreferenz |

`PLAN-MORGEN.md` wurde am 5.10.2026, 18:50 Uhr nachträglich als historisch
markiert — der ursprüngliche Text bleibt, aber mit deutlichen Hinweisen.

### Verifiziert

- Publishable-Key gehört zu `vktilvpwbhrddjytilvs` → HTTP 200
- Publishable-Key gegen altes Projekt → HTTP 401 (korrekt, gehört nicht dazu)
- Beide Keys sind gueltig und dem neuen Projekt zugeordnet
- **Heute zusätzlich verifiziert:** 16 Tabellen vorhanden (Kontrolltest mit
  erfundener Spalte schlug fehl, daher belastbar)

### Wichtige Test-Erkenntnis

Supabase prueft den `apikey`-Header strenger als den `Authorization`-Header.
Bei Abfragen immer beide setzen: `apikey` = Publishable, `Authorization` = Secret.
Nur `rest/v1/` abzufragen ist unzuverlaessig, wenn nur der Secret-Key gesetzt ist.

**Ergänzung 18:50:** Bei PowerShell-Aufrufen muss der User-Agent `node` sein,
sonst meldet Supabase „Forbidden use of secret API key in browser" und gibt
HTTP 401 zurück. Das ist eine Schutzmaßnahme gegen versehentliches Leaken
des Secret-Keys in Frontend-Code.

---

## Stand 18:55 — was ist wo

| | |
|---|---|
| **Schema in der Cloud** | 16 Tabellen, alle vorhanden |
| **Notizen in der Cloud** | keine, 70 liegen nur auf dem PC |
| **Code auf GitHub** | `2ad446e`, 23 Commits heute gepusht |
| **Code lokal** | 80 Commits, 34 Working-Tree-Änderungen |
| **MCP-Tools** | 18 Tools registriert, **kein RBAC** (im Bau) |
| **Google-Drive** | Code fertig, Service-Account fehlt (6 Schritte User-Arbeit) |
| **Secret-Key im Chat erwähnt** | ja, **rotieren** |

---

## Offen: braucht Browser-Arbeit, kein Code

### 1. Datenbank-Schema einfuegen — ERLEDIGT

Die Cloud enthält jetzt die 16 Tabellen, die in `WO-LIEGT-WAS.md` Abschnitt 6
aufgelistet sind. Quelle: `supabase/SETUP-ALLES.sql` (im Working Tree, noch
nicht committet) und `supabase/migrations/20261004230000_brain_schema.sql`
(bereits auf GitHub).

Verifizierung per API: alle 16 SELECTs liefern HTTP 200.

### 2. Google-Login aktivieren (fehlt vollstaendig)

Verifiziert: `external.google` ist **NICHT** aktiv, nur E-Mail.
Deshalb kommt man in Spark nicht rein.

Dashboard → Authentication → Providers → Google → einschalten.
Die Client-ID und das Client-Secret stehen bereits in der `.env`
(`GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET`).

### 3. Passwort (nur falls doch per CLI gewuenscht)

Dashboard → Project Settings → Database → Database password.
Supabase-Passwoerter koennen zurueckgesetzt werden, es ist nichts Endgueltiges.
Fuer `scripts/schema-auf-die-cloud.ps1` wird es gebraucht.
Der SQL-Weg oben braucht es nicht.

---

## Sicherheit: offen, dringend aber nicht jetzt

### Service-Key wurde im Chat genannt

Der `sb_secret_`-Wert wurde in einem Chatverlauf genannt und in die `.env`
eingetragen. Er umgeht alle RLS-Regeln von Supabase. **Nach dem Setup rotieren.**
Der Wechsel dauert eine Minute, danach funktioniert alles weiter.

Rotation: Dashboard → Projekt → Project Settings → API Keys → Secret-Key
regenerieren, dann `.env` aktualisieren.

### .env war zweimal im Git-Repo

`git log` zeigt Commits `2967be1` und `b220ea7`. Die Google-Secrets sind damit
historisch sichtbar. Bereinigung noetig, heute nicht.

Vollstaendiger Neuschreiben der Historie (`filter-repo`, `BFG`) oder
einfach die Google-Secrets rotieren - das Second ist schneller und reicht.

---

## Befund zum MCP-Manifest

> **Korrigiert 18:55:** Das Manifest listet heute **16 Werkzeuge**, nicht 9.
> Die 9 hier genannten sind die Kern-Werkzeuge für Dokumente, daneben gibt
> es 7 Brain-Werkzeuge (`search_notes`, `get_note`, `get_brain_context`,
> `list_tasks`, `toggle_task`, `log_mood`, `get_agenda`).
>
> **Korrektur 19:00:** Der RBAC-Agent-Bericht sprach von „18 Werkzeugen", aber
> Manifest (`mcp.tools[].length`) und Code (`src/lib/mcp/index.ts:65-80`)
> führen beide **16 Tools**. 11 mit `requiredRole: readonly`, 5 mit
> `requiredRole: editor`.
gerade eingebaut: ein externer Agent bekommt nur die Tools, die seiner Rolle
entspricht. Migration liegt unter `supabase/migrations/20261005210000_agent_rbac.sql`,
noch nicht in der Cloud. RBAC-Bericht: siehe `docs/setup-stand/rbac-report.md`
(nach Fertigstellung).

---

## Reihenfolge nach dem Code-Prozess

1. ~~`supabase/SETUP-ALLES.sql` im SQL-Editor ausfuehren~~ **erledigt 5.10.2026**
2. Google-Provider in Supabase aktivieren
3. Google-Secrets in die Felder eintragen
4. Secret-Key rotieren (dringend, weil im Chat erwähnt)
5. ~~Vault importieren~~ **offen** — `scripts/migrate-vault.ts --real` laufen lassen
6. RBAC-Migration in der Cloud ausführen (User im SQL-Editor)
7. Google-Secrets rotieren, Git-Historie bereinigen
8. Google-Drive-Service-Account einrichten (6 Schritte)
