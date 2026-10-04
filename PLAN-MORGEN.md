# Plan für morgen — 6. Oktober 2026

Stand: Ende 5. Oktober 2026, kurz nach Mitternacht.
Alles hier ist **verifiziert**, nicht geschätzt.

---

## Wo wir gestern/abends aufgehört haben

- Fast-Forward von 58 auf 74 Commits in `C:\workspace\cntconnect`, ohne Konflikt
- TypeScript sauber, App antwortet auf Port 8080
- Google-Anmeldung war **schon fertig** — musste niemand neu bauen
- Vault-Dry-Run erfolgreich: 70 Notizen, 38 Aufgaben, 111 Wikilinks gelesen
- Cloud geprüft: die 8 `brain_*`-Tabellen **fehlen noch**

---

## Was dich morgen blockiert

Zwei Dinge, die nur du machen kannst, weil sie dein Konto und dein Passwort brauchen.

### Schritt 1 — Supabase anmelden (2 Minuten)

Neues PowerShell-Fenster öffnen:

```powershell
supabase login
```

Browser öffnet sich → mit dem Supabase-Konto anmelden, das zu `vgdqauqqkjwwumhzbuea` gehört.

### Schritt 2 — Projekt verlinken (1 Minute)

```powershell
cd C:\workspace\cntconnect
supabase link --project-ref vgdqauqqkjwwumhzbuea
```

Fragt nach dem **Datenbank-Passwort**.
Wo du es findest: Supabase Dashboard → dein Projekt → Project Settings → Database → Database password.

> Achtung: nicht den `service_role` Key nehmen. Das sind zwei verschiedene Dinge.

---

## Reihenfolge danach — genau so

### Teil A — Schema in die Cloud bringen (~10 Min)

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

### Teil B — Notizen in die Cloud holen (~15 Min)

**B1.** `service_role` Key holen. Supabase Dashboard → Project Settings → API →
`service_role` → Reveal. Dann in `C:\workspace\cntconnect\.env` in Zeile 11 eintragen.

**B2.** Erst der Probelauf, dann der echte:

```powershell
npx tsx scripts/migrate-vault.ts --path "C:\Users\Kunc GmbH\Documents\000_CNT\Plannung" --dry-run
npx tsx scripts/migrate-vault.ts --path "C:\Users\Kunc GmbH\Documents\000_CNT\Plannung" --real
```

**B3.** Gegenprüfen: In der Cloud sollten jetzt ~70 Zeilen in `brain_notes` stehen.

### Teil C — Phase 5/6 fertig machen

Der Agent arbeitet noch daran, die Dateien aus dem alten Pfad zu holen und
`routeTree.gen.ts` neu zu erzeugen. Wenn er fertig ist, prüfen wir gemeinsam:
TypeScript sauber? Server startet? `/brain` erreichbar?

**Erwartung:** Die Ansicht zeigt Fehler, weil die Tabellen erst nach Teil A existieren.
Erst danach macht sie Sinn.

### Teil D — Pushen

`main` ist **17 Commits vor GitHub**. Nichts davon ist online.
Sollte nur nach `git fetch` und `git status` gepusht werden, nie mit `--force`.

---

## Reihenfolge nicht ändern

Der Grund ist wichtig: **erst Schema, dann Notizen, dann Oberfläche.**

- Notizen ohne Tabellen gehen nicht
- Oberfläche ohne Notizen zeigt leere Seiten
- Alles andere ist Raten

---

## Was du dem anderen Agenten sagen kannst

Fertig, nichts zu tun:

- **Google-Anmeldung** — existiert bereits in `src/routes/auth.tsx`
- **Supabase als Backend** — läuft, ist verlinkt nach Teil A
- **Spark-Start** — `npm run dev`, Port 8080

Offen, das ist echte Arbeit:

- **MCP-Verbindung zu Connect** — damit Connect dein Gehirn erreicht.
  Aktuell gibt es nur die Anleitung in `Brain\CONNECT-AGENTS.md`, nichts ist eingerichtet.
- **Lovable-Anbindung** — es gibt nur Plan-Dateien in `.lovable\plan\`, keine Verbindung im Code
- **Push nach GitHub** — fehlt komplett

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

`migrate-vault.ts` ist idempotent: gleiche Notiz zweimal drin = kein Duplikat.
Mehrfach laufen lassen ist unschädlich.
