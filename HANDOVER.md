# Übergabe: Agent-Stand 5. Oktober 2026

> Lies das zuerst. Der zweite Agent wurde entfernt, dieser Stand ist die Fortsetzung.

## Wo ist was

| | |
|---|---|
| **Arbeitsverzeichnis (ab jetzt hier)** | `C:\workspace\cntconnect` |
| Alter, veralteter Pfad | `C:\Users\Kunc GmbH\Documents\...\cntconnect` — 74 Commits, gleicher Stand, aber mit uncommitteter Phase-5/6-Arbeit. **Nicht weiterbearbeiten.** |
| Cloud-Datenbank | Supabase-Projekt `vgdqauqqkjwwumhzbuea` (gehostet, unverändert) |
| GitHub | `origin/main`, `main` ist **17 Commits voraus**, nicht gepusht |

## Was gerade passiert ist

`C:\workspace\cntconnect` war 16 Commits zurück und wurde per Fast-Forward auf
`4c52113` geholt. Kein Merge, kein Konflikt, kein Datenverlust. Danach wurde
verifiziert, nicht behauptet:

- TypeScript `--noEmit`: clean
- `http://localhost:8080/`: HTTP 200
- `/mcp` + `/.well-known/oauth-protected-resource`: HTTP 200, zeigt auf den richtigen Auth-Server
- `.env` ist git-ignoriert (`.gitignore:11`)

Sicherung: Branch `backup-b-original` in `C:\workspace\cntconnect` = alter 58er-Stand.

## FALSCHE ANGABE, bitte korrigiert lesen

Frühere Aussage: „ohne `service_role` Key kann ich das Schema nicht anlegen."

**Das war falsch.** Es sind zwei getrennte Dinge:

1. **Schema anlegen** → `supabase db push`. Braucht `SUPABASE_ACCESS_TOKEN` bzw.
   die DB-Passwort-Verbindung, **nicht** den `service_role` Key.
2. **Vault importieren** → `scripts/migrate-vault.ts --real`. Braucht
   `SUPABASE_SERVICE_ROLE_KEY`, weil RLS sonst `anon` nichts durchlässt.

**Dry-Run braucht gar keinen Key:**

```bash
npm run dev            # Terminal 1, Port 8080
npx tsx scripts/migrate-vault.ts          # Dry-Run, schreibt nichts
npx tsx scripts/migrate-vault.ts --real   # braucht service_role
```

Supabase CLI ist installiert (2.117.0). Das Projekt ist **nicht** verlinket —
`supabase link` fehlt, und `.env` hat kein `SUPABASE_ACCESS_TOKEN`.

## Google Auth: schon fertig

Nicht neu bauen. `src/routes/auth.tsx` hat bereits:
- Google-OAuth-Login, zwei Client-IDs (localhost vs. deployed)
- E-Mail-Login
- Legacy-Fake-Session wird entfernt (`spark_google_user`)

## Offen / ungeklärt

1. **Schema ist nie angewandt worden.** `supabase/migrations/20261004230000_brain_schema.sql`
   (245 Zeilen) liegt in Git, aber es gibt kein `supabase link` und keine
   dokumentierte `db push`-Anleitung in `AGENTS.md`.
2. **Phase-5/6-Arbeit existiert nur im alten Pfad**, uncommittet:
   `app.brain.tsx`, `app.brain.$noteId.tsx`, `src/lib/mcp-client/`,
   `knowledge-graph.tsx`, `markdown-view.tsx`. Migrationsstand des
   begonnenen Subagents: unvollständig, nicht prüfbar.
3. **Kein Push nach GitHub.** `AGENTS.md` verbietet Force-Push; normaler Push
   wurde nie ausgeführt.
4. **Keine Vercel-Integration** — keine `vercel.json`, keine
   `VERCEL_*`-Variablen. "Auth über die Vercel-Version" ist daher eine
   offene Architekturentscheidung, keine Konfiguration.

## Nicht tun

- Nicht in `Documents\...\cntconnect` weiterarbeiten
- Nicht force-pushen
- `.env` nie committen (`.env.example` ist die Vorlage)
- `service_role` Key niemals ins Frontend (`VITE_*`) — umgeht RLS
