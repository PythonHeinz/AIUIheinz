# Prüfliste für das Handy (Pixel 9 Pro)

Alles, was im Container nur simuliert getestet ist (Playwright, simulierte Server), muss einmal auf dem Gerät gesehen werden. Nach jedem Eintrag: Datum und Commit (`git log -1`) notieren. Vorbereitung: `git pull`, `bash start.sh`, Oberfläche http://localhost:3000; für LiteRT-LM `litert-lm serve --cors-origin http://localhost:3000`.

Format: `[ ] Prüfpunkt – Datum, Commit`

## Allgemein (jede Seite)

- [ ] Start der installierten App (Startbildschirm-Symbol): Seite erscheint, keine weiße Fläche
- [ ] Start im Browser-Tab, danach hartes Neuladen: gleiche Ansicht, Einstellungen bleiben
- [ ] Nach Neustart von Termux und Browser: Einstellungen und Unterhaltungen sind noch da
- [ ] Flugmodus (ohne „Online erlauben“): Seite lädt und arbeitet, keine Fehlermeldung zu Netz
- [ ] Hell, Dunkel, Automatisch: Farben lesbar, kein weißer Blitz beim Laden
- [ ] Aktualisieren-Knopf: meldet Stand, lädt nach Update neu
- [ ] Tastatur: Eingabefeld bleibt sichtbar, Leiste springt nicht

## Hub

- [ ] Kacheln erreichbar, jede öffnet ihre Seite und führt zurück
- [ ] Kopfzeile (Logo, Titel, Sprache EN/DE) auf allen Seiten gleich

## Heinz Chat (chat.html)

- [ ] Modell wählen, Modellblatt öffnet und schließt (Tippen daneben)
- [ ] Nachricht senden: erste Antwort nach 4–6 s, Text läuft, Cursor blinkt
- [ ] Abbrechen während der Antwort: Text bleibt, Eingabe frei
- [ ] Antwort mit Überschrift, Liste, Tabelle und Codeblock (z. B. „Gib mir eine Tabelle und ein Python-Beispiel“): Darstellung lesbar, Kopierknopf am Codeblock kopiert nur den Code
- [ ] Streamen bleibt flüssig (neu seit Phase 2: reicheres Markdown je Token)
- [ ] Unterhaltungsliste: keine Punkte, fünf Symbol-Pillen so breit wie der Eintrag, Tipp auf den Titel schließt nur die Pillen, langes Drücken wählt mehrere (Löschen, Abbrechen), Umbenennen, Anpinnen, Kopieren, Export, Löschen
- [ ] Unterhaltung laden nach Neustart: Verlauf vollständig
- [ ] Sprache EN/DE umschalten: alle Texte wechseln

## Heinz Dashboard (dashboard.html)

- [ ] Engine Ollama: Modell laden, Antwort, Kennzahlen (Token/s, Zeit bis zur ersten Antwort)
- [ ] Engine LiteRT-LM: dasselbe
- [ ] Regler (Temperatur, Kontext, Threads): Wert bleibt nach Neustart, „Standard“-Haken schaltet um
- [ ] Chatmenü: Gruppen und Geltungsbereich lesbar, Tippen daneben schließt
- [ ] Unterhaltungsliste: Suche, Alle/Modus, langes Drücken (Mehrfachauswahl), Moduspunkt
- [ ] Antwort: Kopieren, Herunterladen, Vorlesen, Testprotokoll
- [ ] Serie starten, stoppen, nach Neuladen fortsetzen
- [ ] Modellblatt (von rechts): Filter, Laden-Knopf

## Tool-Seiten

- [ ] Tabelle (sheet.html): Einfügen aus Zwischenablage, Export
- [ ] Lab (lab.html): Seite lädt, Eingabe, Ausgabe
- [ ] Vitals (vitals.html): Werte erscheinen
- [ ] Bild/Text auslesen und Zwischenablage (scan), Filter, Studio, Models, Setup: jeweils öffnen und eine Grundaktion ausführen

## Nur auf dem Gerät prüfbar (nie im Container)

Echte Modellantworten, Geschwindigkeit, Speicherdruck, Akku, Wake-Lock bei Serien, Zwischenablage-Rechte, Installation als App, Verhalten bei Hintergrund und Rückkehr.
