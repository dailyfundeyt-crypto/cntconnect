# Spark: vernetzter Arbeits- und Wissensraum

## Zielbild
Spark wird die zentrale Oberfläche für Dokumente, vollwertige Tabellen, Whiteboards, Bücher, Lerninhalte, Wissen, Finanzen und veröffentlichbare Mini-Apps. Externe Dienste werden über MCP beziehungsweise sichere Nutzerverbindungen angebunden; Spark zeigt dafür eigene, einheitliche Arbeitsflächen statt fremde Login-Seiten einzubetten.

```text
Externe Quellen ── MCP / Nutzerverbindung ── Sync-Schicht
                                              │
                                              ▼
Docs · Sheets · Boards · Books · Media · Finance
                                              │
                                              ▼
                          AI-Assistent · Wissensgraph · Spark MCP
```

## Verifizierter Ausgangspunkt
- Spark besitzt bereits private Spaces, Markdown-Seiten mit Unterseiten, Favoriten und Papierkorb.
- Die vorhandenen Tabellen sind aktuell strukturierte Datensätze mit Grid-, Galerie- und Board-Ansicht, aber noch keine Kalkulationstabellen mit Zellformeln.
- Eine kontogebundene Slack-Einstellung samt Verbindungscode ist in der Datenbank vorhanden; die Slack-Ereignisverarbeitung und App-Bereitstellung fehlen noch.
- Die geprüfte Bookreader-App enthält bereits PDF-/EPUB-Upload, Bibliothek, Offline-Kopie und Reader-Grundlagen, die übernommen und an Sparks Datenmodell angepasst werden können.
- Die geprüfte Anki-App enthält eine AI-gestützte, strukturierte Kartenextraktion als wiederverwendbares Muster.

## Umsetzung

### 1. Fundament, Navigation und einheitliche Datenobjekte
- Seitenleiste und Startbereich um Docs, Sheets, Boards, Knowledge, Library, Learn, Articles, Finance, Apps und Connections erweitern.
- Einheitliches Quellenmodell für lokale Inhalte und externe Spiegel anlegen: Eigentümer, Quelltyp, externe ID, Sync-Richtung, Versionsstand, Konfliktstatus und letzter Abgleich.
- Dateiablage für Bilder, PDFs, EPUBs, CSV/XLSX und Anhänge einrichten; alle Daten bleiben kontogebunden.
- Bestehende Spark-Farben präzise auf das dunkle Logo mit warmem Orange und hellem Creme abstimmen.

### 2. Notion-ähnliche Dokumente und Import
- Den Markdown-Textbereich durch einen Tiptap-basierten Blockeditor ersetzen: Überschriften, Listen, Aufgaben, Zitate, Code, Tabellen, Links, Callouts, Drag-and-drop und Slash-Menü.
- Bilder per Upload und Einfügen unterstützen; Ausrichtung links, Mitte, rechts sowie frei positionierte Canvas-Blöcke anbieten.
- Unterseiten verschachtelt und verschiebbar machen.
- Import für Markdown, Text, HTML, CSV und strukturierte Notizen ergänzen; Export zurück in portable Formate.
- Pro Dokument eine Änderungshistorie und konfliktfähige Sync-Metadaten führen.

### 3. Echte Kalkulationstabellen
- Univer clientseitig als Apache-2.0-Tabellenkern integrieren, mit Zellformeln, Formatierung, Filtern, Sortierung, Datenvalidierung, mehreren Blättern, Diagrammen, Pivot-Funktionen, Undo/Redo sowie CSV/XLSX-Import und -Export.
- Das aktuelle Datenbank-Grid als „Database“-Ansicht erhalten; neue „Spreadsheet“-Dokumente separat behandeln.
- Arbeitsmappen versioniert speichern und Änderungen inkrementell synchronisieren.
- Google Sheets und Microsoft Excel pro Nutzer verbinden; Import, Export und automatischen beidseitigen Abgleich mit Konfliktanzeige bauen.
- Klare Produktgrenze: hohe Excel-/Sheets-Kompatibilität, aber keine Behauptung vollständiger Parität bei VBA, Apps Script oder proprietären Enterprise-Funktionen.

### 4. Boards und Miro
- Excalidraw als MIT-lizenzierte native Board-Fläche integrieren: freie Formen, Text, Verbindungen, Bilder, Frames und Tabellenkarten.
- Offiziellen Miro Remote-MCP-Endpunkt mit Nutzer-OAuth anbinden.
- Miro-Boards lesen, zusammenfassen und über AI-Werkzeuge ergänzen; Änderungen in Spark und Miro mit Sync-Status und Konfliktbehandlung spiegeln.
- Externe Originale per Link öffnen; keine unsichere Umgehung gesperrter Einbettungen.

### 5. AI-Bereich und MCP-Verbindungen
- Einen frei verschiebbaren, weißen leuchtenden Kreis über der Oberfläche platzieren; Position pro Nutzer speichern.
- Klick öffnet die AI-Fläche mit Chat, Quellenwahl, Agentenprofilen und verfügbaren Werkzeugen.
- Vorlesen über Sprachsynthese ergänzen; während der Wiedergabe animieren drei versetzte, großzügige Pfeil-/Wellenformen den Kreis. Pause, Fortsetzen und Stopp sind direkt erreichbar; reduzierte Bewegung wird respektiert.
- Spark als geschützten MCP-Server veröffentlichen, damit ChatGPT, Claude, Cursor, Codex und andere MCP-Clients alle freigegebenen Spark-Bereiche nutzen können.
- Der Spark-MCP erhält einen vollständigen, modularen Werkzeugkatalog: Spaces und Unterseiten; Dokumente und Anhänge; Datenbanken und Kalkulationstabellen; Boards; Bücher, Markierungen und Lesefortschritt; Artikel; Tweets und Wissensgraph; Lernzettel und Karteikarten; Finanzen; veröffentlichte Mini-Apps; Suche und AI-Aktionen. Werkzeuge unterstützen je nach Berechtigung Lesen, Suchen, Erstellen, Ändern, Importieren, Exportieren und Synchronisieren.
- Berechtigungen werden pro Verbindung und Bereich steuerbar: standardmäßig nur Lesen, Schreibzugriff bewusst freigeben, besonders riskante Aktionen separat bestätigen. Private Daten werden niemals allein durch die MCP-Veröffentlichung öffentlich.
- Große Dateien, Videoanalyse und umfangreiche Generierungen bleiben asynchrone Spark-Aufgaben; MCP kann sie starten, Status lesen und fertige Ergebnisse abrufen, ohne in ein Zeitlimit zu laufen.
- Spark gleichzeitig als MCP-Client ausbauen: Miro und weitere Remote-MCPs pro Nutzer verbinden, OAuth-Daten verschlüsselt speichern, Werkzeuge nur serverseitig laden und nach jeder Anfrage schließen.
- Google Sheets/Excel werden in der AI-Fläche als Werkzeuge sichtbar. Wo kein produktionsreifer offizieller Remote-MCP existiert, nutzt Spark die sichere Nutzerverbindung intern und stellt dieselben Aktionen über den eigenen Spark-MCP-Werkzeugkatalog bereit.

### 6. Automatischer Sync
- Einheitliche Sync-Warteschlange für Pull, Push, Webhook-Ereignisse, Wiederholung und Konflikte bauen.
- Google/Microsoft/Miro/Notion-Verbindungen pro Nutzer verwalten, inklusive Verbinden, Trennen, letztem Abgleich und Fehlerzustand.
- Feld- und Block-Zuordnungen speichern, damit externe Änderungen nicht bei jedem Lauf Duplikate erzeugen.
- Konflikte nicht still überschreiben: Nutzer wählen lokale Version, externe Version oder Zusammenführung.

### 7. Wissensgraph, XCapture und Agenten
- Gespeicherte Tweets, Seiten, Bücher, Videos und Artikel in gemeinsame Quellen, Aussagen, Themen und Beziehungen zerlegen.
- Sigma.js/graphology für den interaktiven Obsidian-ähnlichen Graphen einsetzen.
- Agentenprofile definierbar machen: Fokus, Kategorien, gewünschte Extraktionen und erlaubte Aktionen. Keine Speicherung interner Modell-Gedankengänge; stattdessen nachvollziehbare Zusammenfassungen, Belege und extrahierte Erkenntnisse speichern.
- Neue gespeicherte Inhalte automatisch analysieren und mit bestehenden Knoten verknüpfen.

### 8. Bücher, Lernen und Medien
- PDF-/EPUB-Bibliothek und Reader aus dem Bookreader-Projekt übernehmen; Upload, Lesefortschritt, Markierungen, Notizen, Offline-Nutzung und Vorlesen integrieren.
- Amazon-Inhalte nur über offiziell erlaubte Verbindungen/Dateien anbinden; keine Umgehung von DRM oder geschützten Kindle-Dateien.
- Bücher und Notizen über Spark MCP durchsuchbar machen.
- Karteikarten aus Seiten, Bildern, Büchern und Transkripten generieren; Decks, Wiederholungsplan und Lernmodus ergänzen.
- YouTube-Link importieren, verfügbares Transkript verarbeiten, Kernpunkte und Lernzettel erzeugen und das Video über den offiziellen Player zeigen.

### 9. Artikel, Finanzen und Mini-Apps
- Article Studio für Quellenpaket → AI-Entwurf → Post → kurzes Video integrieren; Freigabe bleibt beim Nutzer.
- Finanzbereich auf Basis der vorhandenen HyperLite-Werkzeuge aufbauen: Abos, Einnahmen, Termine und Community-Rabatte; bestehende MCP-Werkzeuge anbinden.
- Code Flow integrieren: Nutzer erzeugen HTML/CSS/JS-Mini-Apps in einer isolierten Vorschau, verbinden freigegebene Spark-Daten und veröffentlichen eine eigene Spark-Seite.
- Veröffentlichte Mini-Apps strikt sandboxen, erlaubte Datenzugriffe deklarieren und Version/Rollback führen.

### 10. Slack-Bot
- Slack-Ereignisroute mit Signaturprüfung, schneller Bestätigung und Hintergrundverarbeitung ergänzen.
- Bot über den vorhandenen Einmalcode an genau ein Spark-Konto binden.
- Nur freigegebene Seiten und Quellen des verbundenen Kontos suchen und beantworten; Quellenlinks mitsenden.
- Slack-App mit minimalen Berechtigungen bereitstellen und den vollständigen Nachrichtenfluss testen.

## Technische Leitplanken
- **Editor:** Tiptap Core (MIT) mit eigenen Spark-Blöcken.
- **Spreadsheet:** Univer (Apache-2.0), nur im Browser nachgeladen, damit Start und Server schlank bleiben.
- **Board:** Excalidraw (MIT), ebenfalls nur im Browser nachgeladen.
- **Graph:** Sigma.js + graphology (MIT).
- **Sicherheit:** Alle Nutzerinhalte bleiben durch Kontoregeln getrennt; externe Tokens/Verbindungsschlüssel nie im Browser oder Klartext speichern.
- **MCP:** OAuth-geschützt; kein öffentliches Lesen privater Daten. Spark-Titel `Spark`, Servername `spark`.
- **Synchronisation:** Webhooks, wo Anbieter sie verlässlich anbieten; sonst kontrollierter Hintergrundabgleich. Jeder Sync ist idempotent und konfliktbewusst.
- **Copyright:** Uploads nur mit Nutzungsrechten; keine DRM-Umgehung.

## Lieferreihenfolge und Abnahme
1. **Workspace-Kern:** neue Navigation, Verbindungen, Datenmodell, Dateiupload und Logo-Farbwelt.
2. **Docs + Sheets:** Blockeditor, Bilder/Positionierung, CSV/XLSX, Univer und funktionierende Speicherung.
3. **AI + MCP:** schwebender Assistent, Vorlesen, Spark MCP, Miro/Google/Microsoft-Verbindungen.
4. **Knowledge + Library + Learn:** Graph, XCapture, Bücher, YouTube, Lernzettel und Karteikarten.
5. **Studios:** Artikel, Finanzen, Code Flow und Slack-Bot.
6. **Qualität:** Desktop/Mobil, Offline-/Fehlerzustände, Sync-Konflikte, Rechteprüfung und Ende-zu-Ende-Tests.

Jede Stufe wird als nutzbarer vertikaler Ausschnitt fertiggestellt, bevor die nächste beginnt. Damit bleibt Spark während des großen Ausbaus stabil und testbar.
