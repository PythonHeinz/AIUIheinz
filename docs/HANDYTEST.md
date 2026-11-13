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
- [ ] Unterhaltungsliste: keine drei Punkte; Tipp auf Titel oder Zeile darunter lädt, Tipp auf den zarten Kreis rechts zeigt/versteckt die fünf Symbol-Pillen (so breit wie der Eintrag); angepinnt = Punktbalken links, Dashboard-Modus = Farbbalken; langes Drücken wählt mehrere (Löschen, X)
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

## Heinz Dashboard: Personenleiste, Prompt, Ton (Strang Personen, 13.11.2026)

Du brauchst nichts vorher zu wissen. Jeder Schritt sagt, was du tippst und was du sehen sollst. Regel: Orange LED = „hier ist etwas anders als die Vorgabe“.

**A. Start**
- [ ] App öffnen. Sieh die Leiste: sechs Knöpfe. Heinz ist in seiner Farbe gefüllt (gewählt) und hat eine helle Fläche dahinter. Keine orange LED irgendwo.

**B. Person wechseln**
- [ ] Tippe Wilson. Wilson ist in seiner Farbe gefüllt, Heinz nicht mehr, hat aber weiter die helle Fläche. Noch keine LED im Knopf.

**C. Ton ändern und zurücksetzen**
- [ ] Menü öffnen (Burger), Reiter „Ton“. Schiebe Temperatur irgendwohin. Erwartung: orange LED am Reiter „Ton“ und eine orange LED unten in der Mitte des Knopfes Wilson (auch sichtbar, wenn du das Menü schließt); der Reiter „Prompt“ hat keine LED.
- [ ] Tippe „Reset“ unter den Reglern. Erwartung: Regler springen zurück, beide LEDs und die LED im Knopf aus.

**D. Prompt ändern und zurücksetzen**
- [ ] Reiter „Prompt“, tippe ans Ende des Textes „xx“. Erwartung: orange LED am Reiter „Prompt“ und LED unten im Knopf Wilson; Reiter „Ton“ ohne LED.
- [ ] Tippe „Reset“ unter dem Prompt. Erwartung: „xx“ ist weg, Wilson-Prompt steht wieder da, beide LEDs und die LED im Knopf aus.

**E. Beides ändern, mit einem Tipp zurück**
- [ ] Ändere Prompt („xx“) und Temperatur. Beide Reiter-LEDs leuchten und die LED im Knopf Wilson.
- [ ] Tippe im Menü zu, dann nochmal auf den leuchtenden Knopf Wilson. Erwartung: beide Änderungen weg, alle LEDs und die LED im Knopf aus.

**F. Person wechseln mit Änderungen**
- [ ] Wilson, Prompt „xx“. Tippe Heinz. Erwartung: Heinz-Prompt, „xx“ ist weg (ohne Rückfrage), keine LED.

**G. Nativ**
- [ ] Tippe Nativ. Reiter „Prompt“ ist leer, bei „Ton“ stehen die Werte des Modells (oder „–“). Stelle eine Frage: Antwort kommt ohne Persönlichkeit. Schiebe einen Regler: LED am Reiter „Ton“ und LED im Knopf Nativ; Reset: aus.

**H. Laufzeit bleibt**
- [ ] Reiter „Ton“, ganz unten steht „Laufzeit (gilt für jede Person)“ mit Kontextfenster und Threads. Stelle Kontextfenster auf 4096. Wechsle Wilson, Nativ, Heinz: der Wert bleibt 4096.

**I. Namen**
- [ ] Das Feld über dem Eingabefeld heißt „Quelltext“ (Audit: Pflicht). Das Wort „Kontext“ steht nirgends allein.
- [ ] Menüpunkt „Prompt + Ton in den Chat übernehmen“: nimmt beides zusammen; im Heinz Chat sind Prompt und Ton danach gesetzt.

**J. Ansicht**
- [ ] Bei Hell und Dunkel, EN und DE: Leiste überlappt nicht, LEDs gut sichtbar.
- [ ] Nur LiteRT-LM: Schritt B und G wiederholen (B2 offen).

**K. Laufzeit**
- [ ] Menü, „Laufzeit“: schiebe das Kontextfenster auf 4096. Erwartung: orange LED an der Überschrift „Laufzeit“, der Personenknopf bekommt keine LED. „Reset“ in diesem Abschnitt: zurück auf 8192, LED aus.

**L. Letzter Stand**
- [ ] Wilson, Prompt „xx“ und Temperatur ändern. Tippe Heinz, dann wieder Wilson: Vorgabe ist da, keine LED.
- [ ] Menü, „Letzten Stand laden“ tippen: „xx“ und die Temperatur sind zurück, LEDs leuchten. Bei Audit ist der Knopf ausgegraut (dort wurde nichts geändert).
- [ ] App schließen, neu öffnen, Wilson wählen: „Letzten Stand laden“ ist weiter möglich.

**M. Konfigurationen** (Entwickler: bestanden, 13.11.2026)
- [ ] Dashboard, Menü, Abschnitt „Konfiguration“: Stelle Person, Prompt, Ton ein. Schreibe einen Namen („Meine erste“) und tippe „Speichern“. Erwartung: Hinweis „Als … gespeichert“, die Konfiguration steht in der Auswahl daneben.
- [ ] Ändere etwas (andere Person). Wähle die Konfiguration, tippe „Laden“. Erwartung: Person, Prompt, Ton und Kontextfenster wie beim Speichern, LEDs leuchten, wenn sie von der Vorgabe abweichen.
- [ ] Startseite, Bereich „Einrichten“: neue Kachel „Konfigurationen“. Öffnen: deine Konfiguration steht mit Modell, Engine und Person da.
- [ ] Tippe „Im Heinz Chat verwenden“ (geht auch im Dashboard-Menü unter der Auswahl; der Knopf zeigt dann „Im Heinz Chat“), dann Heinz Chat öffnen: Er startet mit dem Modell der Konfiguration und antwortet mit deinem Prompt und Ton. Zurück, nochmal tippen: der Chat nutzt wieder seine eigenen Einstellungen.
- [ ] Umbenennen (Namen im Feld ändern), „Exportieren“ (Datei mit dem Modellnamen), „Aus Datei importieren“ (neuer Eintrag), „Löschen“ (zweiter Tipp nötig).
