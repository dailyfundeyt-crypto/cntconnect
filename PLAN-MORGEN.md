# Plan für morgen — 6. Oktober 2026

> **ACHTUNG — Wichtig:** Dieses Dokument ist ein historischer Plan vom späten
> Abend des 5.10.2026 (kurz nach Mitternacht). Er wurde **nie aktualisiert**,
> als der Supabase-Projektwechsel stattfand und die Cloud-Tabellen angelegt
> wurden. **Stand der Dinge ist heute 18:50 Uhr**, siehe `WO-LIEGT-WAS.md`
> Abschnitt 6 und das frischere `docs/setup-stand/README.md`.
>
> Der ursprüngliche Inhalt bleibt unten stehen — er kann noch nützlich sein,
> wenn du den Weg dorthin verstehen willst. Aber **folge den Anweisungen
> nicht blind**, sie verweisen auf ein verworfenes Projekt.

Stand: Ende 5. Oktober 2026, kurz nach Mitternacht. **Aktueller Stand: 5.10.2026, 18:50 Uhr.**

Alles hier ist **verifiziert**, nicht geschätzt — aber **für den damaligen Stand**.
Was in der Zwischenzeit passiert ist: das Supabase-Projekt wurde gewechselt
(`vgdqauqqkjwwumhzbuea` → `vktilvpwbhrddjytilvs`), die 16 Tabellen wurden per
`supabase/SETUP-ALLES.sql` in der neuen Cloud angelegt, der Code wurde
23 Commits weitergepusht (Stand 5.10.2026, 18:47 Uhr), `WO-LIEGT-WAS.md` ist
korrigiert.

---

## Was seit diesem Plan passiert ist (Stand 18:50)

- [x] Fast-Forward von 58 auf 80 Commits
- [x] App antwortet auf Port 8080
- [x] Google-Anmeldung war **schon fertig** — musste niemand neu bauen
- [x] Vault-Dry-Run erfolgreich: 70 Notizen, 38 Aufgaben, 111 Wikilinks gelesen
- [x] Schema in der Cloud: **16 Tabellen vorhanden, verifiziert per API**
- [x] Push auf GitHub: 23 Commits, Stand 18:47 Uhr (`2ad446e`)

## Was noch offen ist (Stand 18:50)

- [ ] Notizen-Import in die Cloud: 70 Notizen liegen noch nur auf dem PC. `scripts/migrate-vault.ts` ist bereit, der `sb_secret_…`-Key steht in der `.env`.
- [ ] RBAC-Migration: `supabase/migrations/20261005210000_agent_rbac.sql` ist im Repo, aber **noch nicht in der Cloud ausgeführt**. Der User macht das später im SQL-Editor.
- [ ] Google-Service-Account: 6 Schritte, nur du kannst sie. Anleitung in `WO-LIEGT-WAS.md` und dem Drive-Bericht.
- [ ] `package-lock.json` und `supabase/SETUP-ALLES.sql`: liegen untracked im Working Tree, werden committet, wenn RBAC fertig ist.
- [ ] 34 Working-Tree-Änderungen in der Hauptsache Code/Migrations-Änderungen — siehe `git status` für den exakten Stand.

---

## Historischer Inhalt — bitte nur als Kontext lesen

### Wo wir gestern/abends aufgehört haben

- Fast-Forward von 58 auf 74 Commits in `C:\workspace\cntconnect`, ohne Konflikt
- TypeScript sauber, App antwortet auf Port 8080
- Google-Anmeldung war **schon fertig** — musste niemand neu bauen
- Vault-Dry-Run erfolgreich: 70 Notizen, 38 Aufgaben, 111 Wikilinks gelesen
- Cloud geprüft: die 8 `brain_*`-Tabellen **fehlen noch**

### Was dich morgen blockiert

Zwei Dinge, die nur du machen kannst, weil sie dein Konto und dein Passwort brauchen.

#### Schritt 1 — Supabase anmelden (2 Minuten)

> **Historisch — das alte Projekt.** Heute gehört dein Konto zu
> `vktilvpwbhrddjytilvs`. Der Supabase-Login läuft über dein Konto, der
> Projektwechsel ist in den `project_id`-Werten der `.env` und der
> `supabase/config.toml` bereits erfolgt.

Neues PowerShell-Fenster öffnen:

```powershell
supabase login
```

Browser öffnet sich → mit dem Supabase-Konto anmelden, das zu `vktilvpwbhrddjytilvs` gehört.

#### Schritt 2 — Projekt verlinken (1 Minute)

> **Auch historisch — die `--project-ref` ist heute anders.**

```powershell
cd C:\workspace\cntconnect
supabase link --project-ref vktilvpwbhrddjytilvs
```

Fragt nach dem **Datenbank-Passwort**.
Wo du es findest: Supabase Dashboard → dein Projekt → Project Settings → Database → Database password.

> Achtung: nicht den `service_role` Key nehmen. Das sind zwei verschiedene Dinge.

### Reihenfolge danach — genau so

#### Teil A — Schema in die Cloud bringen (~10 Min)

> **Heute erledigt.** Alle 16 Tabellen sind per `SETUP-ALLES.sql` in der Cloud
> (siehe `WO-LIEGT-WAS.md` Abschnitt 6). Dennoch der historische Ablauf:

**A1.** Alte Migrationen als erledigt markieren. Ohne das würde `db push` sie erneut
ausführen und abstürzen, weil sie kein `IF NOT EXISTS` benutzen:

```powershell
supabase migration repair --status applied 20260916151927 20260916151937 20260919214329
```

**A2.** Nur die Gehirn-Migration ausführen:

```powershell
supabase db push
```

**A3.** Prüfen, ob es geklappt hat. Alle 8 müssen HTTP 200 liefern:
`brain_folders`, `brain_notes`, `brain_note_links`, `brain_files`, `brain_tasks`,
`brain_mood_entries`, `brain_work_sessions`, `brain_import_log`

#### Teil B — Notizen in die Cloud holen (~15 Min)

**B1.** `service_role` Key holen. Supabase Dashboard → Project Settings → API →
`service_role` → Reveal. Dann in `C:\workspace\cntconnect\.env` in Zeile 11 eintragen.
**Hinweis:** Der neue Key heißt `sb_secret_…` und ist **kein JWT** mehr.

**B2.** Erst der Probelauf, dann der echte:

```powershell
npx tsx scripts/migrate-vault.ts --path "C:\Users\Kunc GmbH\Documents\000_CNT\Plannung" --dry-run
npx tsx scripts/migrate-vault.ts --path "C:\Users\Kunc GmbH\Documents\000_CNT\Plannung" --real
```

**B3.** Gegenprüfen: In der Cloud sollten jetzt ~70 Zeilen in `brain_notes` stehen.

#### Teil C — Phase 5/6 fertig machen

Der Agent arbeitet noch daran, die Dateien aus dem alten Pfad zu holen und
`routeTree.gen.ts` neu zu erzeugen. Wenn er fertig ist, prüfen wir gemeinsam:
TypeScript sauber? Server startet? `/brain` erreichbar?

**Erwartung:** Die Ansicht zeigt Fehler, weil die Tabellen erst nach Teil A existieren.
Erst danach macht sie Sinn.

#### Teil D — Pushen

> **Heute erledigt (18:47 Uhr):** 23 Commits gepusht, kein Force. `git status` zeigt
> nur noch Working-Tree-Änderungen, keine unpusheden Commits mehr.

`main` war **17 Commits vor GitHub**. Nichts davon war online.
Sollte nur nach `git fetch` und `git status` gepusht werden, nie mit `--force`.

### Reihenfolge nicht ändern

Der Grund ist wichtig: **erst Schema, dann Notizen, dann Oberfläche.**

- Notizen ohne Tabellen gehen nicht
- Oberfläche ohne Notizen zeigt leere Seiten
- Alles andere ist Raten

---

## Korrigierte Fakten

Zwei frühere Aussagen waren falsch. Damit du sie nicht weiterträgst:

**1. „Ohne service_role kann ich das Schema nicht anlegen"** — Falsch.
Schema anlegen geht mit `supabase db push` und dem Datenbank-Passwort.
Den `service_role` Key braucht nur der Notizen-Import, weil RLS sonst nichts durchlässt.

**2. „Auth über die Vercel-Version von Connect"** — Gibt es nicht.
Keine `vercel.json`, keine Vercel-Variablen, kein Deployment. Connect ist kein
laufender Dienst, an den man sich andockt. Das ist eine offene Frage, keine Einstellung.

**3. Apple/iCloud** — Auf diesem Rechner nicht vorhanden. Details in `WO-LIEGT-WAS.md`, Abschnitt 5.

---

## Notausgang

Falls etwas schiefgeht, ist nichts verloren:

| | |
|---|---|
| Alter Code-Stand | Branch `backup-b-original` in `C:\workspace\cntconnect` |
| Alte Kopie komplett | `C:\Users\Kunc GmbH\Documents\...\007_Connect\003_Code\cntconnect` |
| Originale Notizen | `C:\Users\Kunc GmbH\Documents\000_CNT\Plannung\Brain` — **werden nie gelöscht** |
| Bestehende Cloud-Daten | unberührt, es wird nur ergänzt |
| Aktuelle Commits auf GitHub | `2ad446e` (Stand 18:47 Uhr, 5.10.2026) |

`migrate-vault.ts` ist idempotent: gleiche Notiz zweimal drin = kein Duplikat.
Mehrfach laufen lassen ist unschädlich.
