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

## Strang Konfiguration, Stufen (a) und (b) (13.11.2026; nur simuliert getestet)
Vorbereitung: `git pull`, `bash start.sh`; LiteRT-LM bei Bedarf neu starten: `litert-lm serve --cors-origin http://localhost:3000`. Danach Version im Dashboard-Menü prüfen.

**N. Zuordnung Modell → Konfiguration (Dashboard)**
- [ ] Dashboard: Modell `gemma2:2b` (oder ein anderes), Person Wilson, Kontextfenster verkleinern, Temperatur ändern. Menü, Konfiguration: Name „Test A“, Speichern, dann „Dem Modell zuordnen“. Erwartung: Knopf zeigt „Dem Modell zugeordnet (tippen zum Lösen)“; der Knopf „Im Heinz Chat verwenden“ bleibt unberührt.
- [ ] App komplett beenden und neu öffnen. Erwartung: Das Dashboard startet, das Modell lädt, danach schaltet es auf Wilson, Prompt, Ton und Kontextfenster der Konfiguration; ein Band nennt „… mit … geladen. Laufzeit gesetzt: Kontext …, Threads …“. Eine offene Unterhaltung einer anderen Person landet in der Liste (wie bisher).
- [ ] Anderes Modell ohne Zuordnung wählen. Erwartung: Kontextfenster geht auf den Standard (8192) zurück. Zurück auf das erste Modell: Konfiguration lädt wieder mit.
- [ ] Zuordnung lösen (zweiter Tipp), App neu starten. Erwartung: Dashboard startet auf Heinz mit dem Standard des Modells.

**O. Heinz Chat als eigenes Tool**
- [ ] Heinz Chat öffnen, Modellblatt (Tipp aufs Modell oben): Erwartung nur Anzeige (Konfiguration, Engine, Modell, Person, Prompt lesbar nicht änderbar, Ton, Laufzeit „Teil der Konfiguration“ (Threads 2, Kontext 4096), Status, „Zuletzt gesendet“, Link „Konfigurationen verwalten“). Keine Engine-Leiste, keine Modellliste, kein Schalter „Online erlauben“, kein „Auf Standard zurücksetzen“.
- [ ] Dashboard auf ein Ollama-Modell stellen, Heinz Chat mit einer LiteRT-LM-Konfiguration zuweisen (Dashboard-Menü „Im Heinz Chat verwenden“) und öffnen. Erwartung: Der Chat fragt LiteRT-LM an (nicht Ollama), Modell in der Kopfzeile ist das der Konfiguration. **Offen am Gerät:** ob LiteRT-LM das Modell beim Öffnen vorladen kann; bisher lädt es beim ersten Senden (Ring dann blau). Bitte beobachten, wie lange die erste Antwort braucht.
- [ ] LiteRT-LM absichtlich nicht starten, Chat mit LiteRT-Konfiguration öffnen. Erwartung: roter Ring und Hinweis „Die Engine … ist nicht erreichbar“, Senden ergibt eine Fehlermeldung, **nie** eine Antwort von Ollama.
- [ ] Zuweisung lösen (Dashboard-Menü, zweiter Tipp). Erwartung: Chat nutzt seine Standardkonfiguration (Markdown-Prompt, Ton 0,6/0,9/40, Threads 2, Kontext 4096, Qwen oder das früher gewählte Modell).
- [ ] Standardkonfiguration (Zuweisung lösen, in der Entwicklerkonsole `localStorage.removeItem('heinz_chat_default')`, Seite neu laden): Der Chat startet ohne Modellwahl mit `qwen2.5:3b`, Ton 0,6/0,9/40, Threads 2, Kontext 4096 (Modellblatt). Prüfen: Antworten kommen in sauberem Markdown (Liste, Tabelle, Code), er verweigert nicht ohne Grund und sagt offen, wenn er etwas nicht weiß; Tempo etwa wie im Tempo-Test (2 Threads).
- [ ] Dashboard, Menü Konfiguration: eine LiteRT-LM-Konfiguration laden, während Ollama aktiv ist. Erwartung: Das Dashboard wechselt auf LiteRT-LM, wählt das Modell, Hinweis „Engine auf … gewechselt“.
- [ ] **B2-Probe (LiteRT-LM):** `litert-lm serve --cors-origin http://localhost:3000` neu starten. Dashboard, Person Audit, Quelltext senden (Modell `gemma4-e2b`). Dann Heinz Chat mit einer Nativ-Konfiguration auf `gemma4-e2b` (im Dashboard Person Nativ, Konfiguration speichern, „Im Heinz Chat verwenden“) und „Hallo“ senden. Erwartung: antwortet normal, nicht im Wortlaut des Audit-Prompts. Der Chat sendet bei Nativ keine System-Nachricht (simuliert geprüft). Zeigt der Server trotzdem die alte Anweisung, melden: dann muss der Chat bei LiteRT-LM einen leeren Systemprompt ausdrücklich senden.
- [ ] Wechsel Dashboard (Modell A) → Heinz Chat (Modell B) → Dashboard: Ollama lädt jeweils neu (erwartet, kein Fehler); keine Fehlermeldung, die Antworten kommen.

## Strang Konfiguration, Stufen (c) und (d) (13.11.2026; nur simuliert getestet)
Vorbereitung: `git pull`, `bash start.sh`.

**P. Mauer Offline/Online**
- [ ] Dashboard, Menü Konfiguration: eine Konfiguration mit Online-Engine (zum Beispiel Google AI Studio mit gespeichertem Schlüssel) speichern und dem Heinz Chat zuweisen. „Online erlauben“ bleibt aus. Heinz Chat öffnen. Erwartung: Rückfrage „Diese Konfiguration nutzt einen Cloud-Dienst. Online für diese Sitzung zulassen?“, Senden ist gesperrt.
- [ ] „Nicht jetzt“: roter Ring und Hinweis, es geht nichts raus. „Für diese Sitzung zulassen“ (nach Neuladen): Ring wird blau, Antwort kommt.
- [ ] Heinz Chat schließen und neu öffnen (App im Hintergrund, nicht beendet): keine neue Rückfrage. Danach Dashboard öffnen: der globale Haken „Online erlauben“ ist weiter aus.
- [ ] Lokale Konfiguration zuweisen: nie eine Rückfrage.

**Q. Hub-Kachel „Konfigurationen“**
- [ ] Erste Karte ist die Standardkonfiguration („eingebaut, nicht löschbar“, ohne Löschen). Ohne Zuweisung trägt sie die Markierung „Heinz Chat“, mit Zuweisung die zugewiesene Karte.
- [ ] „Jetzt parametrieren“ an einer eigenen Konfiguration: Dashboard öffnet sich mit Person, Prompt, Ton, Kontext und Threads dieser Konfiguration (Hinweisband). Bei einer Konfiguration einer anderen Engine wechselt das Dashboard die Engine.
- [ ] „Jetzt parametrieren“ an der Standardkonfiguration: Qwen-Werte (0,6 / 0,9 / 40, Kontext 4096, Threads 2) im Dashboard; ändern, unter neuem Namen speichern, im Heinz Chat verwenden.
