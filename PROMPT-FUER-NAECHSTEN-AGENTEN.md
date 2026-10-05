# Prompt für den nächsten Agenten — Verbindung fertigstellen

> Kopiere diesen Text 1:1 in den Auftrag eines neuen Agenten.
> Der Agent öffnet das Repo, liest den ULTIMATIVER-PLAN.md und arbeitet ihn
> Phase für Phase ab. Du musst im Prompt nichts ergänzen — alles Notwendige
> steht hier drin.

---

## Auftrag

Du übernimmst ein TanStack-Start-Projekt für eine persönliche Notiz-/Lern-App
namens **Spark**, das in einer Cloud-Supabase-Instanz läuft. Es gibt einen
vollständigen Bauplan in `C:\workspace\cntconnect\ULTIMATIVER-PLAN.md`. **Lies
diese Datei zuerst, vollständig, dann arbeite sie ab.**

Das Ziel dieser Session: Die App muss am Ende `npx tsc --noEmit` mit **nur
einem** Fehler durchlaufen, `npm run build` mit **nur dem bekannten
pkce-challenge-Fehler**, der Language-Switcher funktioniert im Browser, der
Notiz-Editor ist rückwärtskompatibel zu Plaintext, und alle lokalen Änderungen
sind in logischen Commits auf GitHub.

## Pflichtlektüre in dieser Reihenfolge

1. `C:\workspace\cntconnect\ULTIMATIVER-PLAN.md` — **der** Plan, 479 Zeilen, 7 Phasen
2. `C:\workspace\cntconnect\WO-LIEGT-WAS.md` — wo was liegt, Editor-Regel in Abschnitt 6b
3. `C:\workspace\cntconnect\docs\setup-stand\README.md` — Setup-Stand
4. `C:\workspace\cntconnect\docs\setup-stand\rbac-report.md` — RBAC-SQL für die Cloud

## Verbindliche Regeln

- **Arbeitsverzeichnis ist immer `C:\workspace\cntconnect`.** Nicht der alte
  Pfad `C:\Users\Kunc GmbH\Documents\007_Connect\003_Code\cntconnect`. Der
  ist tabu, steht in `WO-LIEGT-WAS.md` Abschnitt 1.
- **Aktives Supabase-Projekt ist `vktilvpwbhrddjytilvs`.** Das andere
  (`vgdqauqqkjwwumhzbuea`) ist verworfen, tot, **nicht referenzieren**.
- **Keys-Format ist neu:** `sb_publishable_…` und `sb_secret_…`. Kein JWT.
  PowerShell-User-Agent muss `node` sein, sonst meldet Supabase fälschlich 401.
- **`.env` weder lesen noch committen.** Nur Variablennamen verwenden.
- **Cloud-Operationen macht der User, nicht du.** Keine `INSERT`/`UPDATE`/
  `DELETE` gegen Supabase, keine Migrations ausführen. Du machst nur Code,
  der die Cloud-Verbindung **vorbereitet**, nicht ausführt.
- **Bekannte Vorfehler nicht beheben** (stehen im Plan Teil B.3):
  - `vite.config.ts(38,5) TS2769`
  - Nitro production build fail mit `pkce-challenge`

## Konkrete Startreihenfolge

Führe diese 5 Befehle aus, bevor du irgendetwas änderst:

```powershell
cd C:\workspace\cntconnect
git status
git log -1 --oneline
npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count
Get-Content src\i18n\de.json -Raw | ConvertFrom-Json
Get-Content src\i18n\en.json -Raw | ConvertFrom-Json
```

Damit kennst du den aktuellen Stand. **Dann** öffnest du
`ULTIMATIVER-PLAN.md` und arbeitest Phase 1 bis 7 ab.

## Was du am Ende liefern musst

1. **Phase 1 abgeschlossen:** tsc zeigt **1 Fehler** (nur vite.config.ts)
2. **Phase 2 abgeschlossen:** i18n-Keys in `de.json` und `en.json` haben
   **exakt gleiche** Anzahl
3. **Phase 3 abgeschlossen:** Language-Switcher im Browser sichtbar und
   funktional (Dev-Server `npm run dev` auf Port 8080)
4. **Phase 4 abgeschlossen:** Plaintext-Notiz aus dem Vault wird byte-genau
   angezeigt, Markdown-Notiz wird gerendert
5. **Phase 5 abgeschlossen:** `npm run build` schlägt nur am bekannten
   pkce-challenge-Fehler fehl
6. **Phase 6 abgeschlossen:** ~13 Commits auf GitHub, alle gepusht, jeder
   mit verständlicher Message
7. **Phase 7 abgeschlossen:** `docs/setup-stand/README.md` ist auf den
   heutigen Stand aktualisiert, der User weiß welche 7 Schritte im Browser
   noch zu tun sind

## Was du NICHT tun darfst

- Kein `git push --force` jemals
- Kein `git reset --hard` ohne expliziten Auftrag
- Keine Migrationen in der Cloud ausführen
- Keine Secrets ausgeben
- Kein Referenz auf das verworfene Projekt `vgdqauqqkjwwumhzbuea`
- Keine Subagenten parallel starten (Doppelagent-Vorfall von heute Abend
  hat `app.learn.tsx:820` zerschossen — siehe Plan Teil B.2)
- Keine ungeprüften Berichte ins Repo schreiben (zähle tsc-Fehler selbst,
  prüfe Key-Anzahl selbst)

## Was du tun sollst, wenn etwas unklar ist

- Steht im Plan: arbeite nach Plan
- Steht nicht im Plan, aber in `WO-LIEGT-WAS.md`: folge der Doku
- Steht in keiner Datei: **fragen**, nicht raten. Rat kostet Commit, Fragen
  kosten eine Sekunde

## Bericht am Ende

Am Session-Ende schreibst du einen kurzen Bericht mit:
- Welche Phasen du abgeschlossen hast (mit echten Zahlen)
- Welche tsc-Fehler noch da sind (erwartet: 1, der vite.config.ts-Fehler)
- Welche 7 Schritte der User im Browser/Supabase-Dashboard/Google-Console
  noch machen muss (stehen im Plan Teil G)
- Welche Commits du gemacht hast, mit den ersten 80 Zeichen jeder Message
- Ob `git status` am Ende clean ist (außer ignorierte Dateien)

Das war's. Leg los.
