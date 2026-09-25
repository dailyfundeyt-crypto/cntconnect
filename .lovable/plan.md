# Spark für Handys optimieren

## Ziel
Die wichtigsten Spark-Bereiche sollen auf kleinen Bildschirmen ohne abgeschnittene Inhalte funktionieren und bequem per Touch bedienbar sein. Die bestehende Desktop-Ansicht bleibt erhalten.

## Umsetzung
- Die mobile Hauptnavigation stabilisieren: sichere Bildschirmhöhe, größere Touch-Flächen, kompakter Kopfbereich und Berücksichtigung der unteren Gerätezone.
- Startseite, Dokumente und Papierkorb mit kleineren Seitenabständen, passenden Schriftgrößen und einspaltigen Aktionsbereichen anpassen.
- Dokument-Werkzeuge auf dem Handy horizontal scrollbar und ohne Überlappungen darstellen; lange Überschriften und Verknüpfungsinformationen umbrechen.
- Die Tabellenseite für Mobilgeräte umbauen: Titel und Aktionen stapeln, Ansichten und Modi horizontal scrollbar machen, Suche auf volle Breite setzen und das Tabellenraster als klaren seitlich scrollbaren Arbeitsbereich erhalten.
- Tabellenzellen und wichtige Symbolaktionen mit fingerfreundlichen Mindestgrößen ausstatten; desktopabhängige Hinweise auf Handys ausblenden.
- Öffentliche Start- und Anmeldeseite auf schmale Geräte prüfen und deren Kopfbereich, Überschriften und Abstände anpassen.
- Die wichtigsten Seiten in Handy- und Desktopbreite visuell testen sowie aktuelle Fehlerprotokolle prüfen.

## Technische Details
- Vorhandene Tailwind-Breakpoints und Design-Komponenten bleiben bestehen.
- Tabellen bleiben bewusst horizontal scrollbar, damit Formeln und Spaltenstruktur vollständig erhalten bleiben.
- Keine Änderungen an Daten, Anmeldung oder Cloud-Speicherung.
