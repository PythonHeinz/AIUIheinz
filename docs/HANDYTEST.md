# Prüfliste für das Handy (Pixel 9 Pro)

Alles, was im Container nur simuliert getestet ist (Playwright, simulierte Server), muss einmal auf dem Gerät gesehen werden. Nach jedem Eintrag: Datum und Commit (`git log -1`) notieren. Vorbereitung: `git pull`, `bash start.sh`, Oberfläche http://localhost:3000; für LiteRT-LM `litert-lm serve --cors-origin http://localhost:3000`.

Format: `[ ] Prüfpunkt – Datum, Commit`

## Allgemein (jede Seite)

- [x] Start der installierten App (Startbildschirm-Symbol): Seite erscheint, keine weiße Fläche – bestätigt 19.11.2026 (Entwickler)
- [ ] Start im Browser-Tab, danach hartes Neuladen: gleiche Ansicht, Einstellungen bleiben
- [x] Nach Neustart von Termux und Browser: Einstellungen und Unterhaltungen sind noch da – bestätigt 19.11.2026 (Entwickler)
- [ ] Flugmodus (ohne „Online erlauben“): Seite lädt und arbeitet, keine Fehlermeldung zu Netz
- [x] Hell, Dunkel, Automatisch: Farben lesbar, kein weißer Blitz beim Laden – bestätigt 19.11.2026 (Entwickler)
- [x] Aktualisieren-Knopf: meldet Stand, lädt nach Update neu – bestätigt 19.11.2026 (Entwickler)
- [x] Tastatur: Eingabefeld bleibt sichtbar, Leiste springt nicht – bestätigt 19.11.2026 (Entwickler)

## Hub

- [x] Kacheln erreichbar, jede öffnet ihre Seite und führt zurück – bestätigt 19.11.2026 (Entwickler)
- [ ] Kopfzeile (Logo, Titel, Sprache EN/DE) auf allen Seiten gleich

## Heinz Chat (chat.html)

- [ ] Modell wählen, Modellblatt öffnet und schließt (Tippen daneben)
- [ ] Nachricht senden: erste Antwort nach 4–6 s, Text läuft, Cursor blinkt
- [ ] Abbrechen während der Antwort: Text bleibt, Eingabe frei
- [x] Antwort mit Überschrift, Liste, Tabelle und Codeblock (z. B. „Gib mir eine Tabelle und ein Python-Beispiel“): Darstellung lesbar, Kopierknopf am Codeblock kopiert nur den Code – bestätigt 19.11.2026 (Entwickler)
- [ ] Streamen bleibt flüssig (neu seit Phase 2: reicheres Markdown je Token)
- [ ] Unterhaltungsliste: keine drei Punkte; Tipp auf Titel oder Zeile darunter lädt, Tipp auf den zarten Kreis rechts zeigt/versteckt die fünf Symbol-Pillen (so breit wie der Eintrag); angepinnt = Punktbalken links, Dashboard-Modus = Farbbalken; langes Drücken wählt mehrere (Löschen, X)
- [ ] Unterhaltung laden nach Neustart: Verlauf vollständig
- [x] Sprache EN/DE umschalten: alle Texte wechseln – bestätigt 19.11.2026 (Entwickler)

## Heinz Dashboard (dashboard.html)

- [x] Engine Ollama: Modell laden, Antwort, Kennzahlen (Token/s, Zeit bis zur ersten Antwort) – bestätigt 19.11.2026 (Entwickler)
- [x] Engine LiteRT-LM: dasselbe – bestätigt 19.11.2026 (Entwickler)
- [ ] Regler (Temperatur, Kontext, Threads): Wert bleibt nach Neustart, „Standard“-Haken schaltet um
- [ ] Chatmenü: Gruppen und Geltungsbereich lesbar, Tippen daneben schließt
- [ ] Unterhaltungsliste: Suche, Alle/Modus, langes Drücken (Mehrfachauswahl), Moduspunkt
- [ ] Antwort: Kopieren, Herunterladen, Vorlesen, Testprotokoll
- [x] Serie starten, stoppen, nach Neuladen fortsetzen – bestätigt 19.11.2026 (Entwickler)
- [ ] Modellblatt (von rechts): Filter, Laden-Knopf

## Tool-Seiten

- [ ] Tabelle (sheet.html): Einfügen aus Zwischenablage, Export
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
- [x] Dashboard: Modell `gemma2:2b` (oder ein anderes), Person Wilson, Kontextfenster verkleinern, Temperatur ändern. Menü, Konfiguration: Name „Test A“, Speichern, dann „Dem Modell zuordnen“. Erwartung: Knopf zeigt „Dem Modell zugeordnet (tippen zum Lösen)“; der Knopf „Im Heinz Chat verwenden“ bleibt unberührt. – bestätigt 19.11.2026 (Entwickler)
- [x] App komplett beenden und neu öffnen. Erwartung: Das Dashboard startet, das Modell lädt, danach schaltet es auf Wilson, Prompt, Ton und Kontextfenster der Konfiguration; ein Band nennt „… mit … geladen. Laufzeit gesetzt: Kontext …, Threads …“. Eine offene Unterhaltung einer anderen Person landet in der Liste (wie bisher). – bestätigt 19.11.2026 (Entwickler)
- [x] Anderes Modell ohne Zuordnung wählen. Erwartung: Kontextfenster geht auf den Standard (8192) zurück. Zurück auf das erste Modell: Konfiguration lädt wieder mit. – bestätigt 19.11.2026 (Entwickler)
- [x] Zuordnung lösen (zweiter Tipp), App neu starten. Erwartung: Dashboard startet auf Heinz mit dem Standard des Modells. – bestätigt 19.11.2026 (Entwickler)

**O. Heinz Chat als eigenes Tool**
- [x] Heinz Chat öffnen, Modellblatt (Tipp aufs Modell oben): Erwartung nur Anzeige (Konfiguration, Engine, Modell, Person, Prompt lesbar nicht änderbar, Ton, Laufzeit „Teil der Konfiguration“ (Threads 2, Kontext 4096), Status, „Zuletzt gesendet“, Link „Konfigurationen verwalten“). Keine Engine-Leiste, keine Modellliste, kein Schalter „Online erlauben“, kein „Auf Standard zurücksetzen“. – bestätigt 19.11.2026 (Entwickler)
- [x] Dashboard auf ein Ollama-Modell stellen, Heinz Chat mit einer LiteRT-LM-Konfiguration zuweisen (Dashboard-Menü „Im Heinz Chat verwenden“) und öffnen. Erwartung: Der Chat fragt LiteRT-LM an (nicht Ollama), Modell in der Kopfzeile ist das der Konfiguration. **Offen am Gerät:** ob LiteRT-LM das Modell beim Öffnen vorladen kann; bisher lädt es beim ersten Senden (Ring dann blau). Bitte beobachten, wie lange die erste Antwort braucht. – bestätigt 19.11.2026 (Entwickler)
- [x] LiteRT-LM absichtlich nicht starten, Chat mit LiteRT-Konfiguration öffnen. Erwartung: roter Ring und Hinweis „Die Engine … ist nicht erreichbar“, Senden ergibt eine Fehlermeldung, **nie** eine Antwort von Ollama. – bestätigt 19.11.2026 (Entwickler)
- [x] Zuweisung lösen (Dashboard-Menü, zweiter Tipp). Erwartung: Chat nutzt seine Standardkonfiguration (Markdown-Prompt, Ton 0,6/0,9/40, Threads 2, Kontext 4096, Qwen oder das früher gewählte Modell). – bestätigt 19.11.2026 (Entwickler)
- [x] Standardkonfiguration (Zuweisung lösen, in der Entwicklerkonsole `localStorage.removeItem('heinz_chat_default')`, Seite neu laden): Der Chat startet ohne Modellwahl mit `qwen2.5:3b`, Ton 0,6/0,9/40, Threads 2, Kontext 4096 (Modellblatt). Prüfen: Antworten kommen in sauberem Markdown (Liste, Tabelle, Code), er verweigert nicht ohne Grund und sagt offen, wenn er etwas nicht weiß; Tempo etwa wie im Tempo-Test (2 Threads). – bestätigt 19.11.2026 (Entwickler)
- [x] Dashboard, Menü Konfiguration: eine LiteRT-LM-Konfiguration laden, während Ollama aktiv ist. Erwartung: Das Dashboard wechselt auf LiteRT-LM, wählt das Modell, Hinweis „Engine auf … gewechselt“. – bestätigt 19.11.2026 (Entwickler)
- [x] **B2-Probe (LiteRT-LM):** `litert-lm serve --cors-origin http://localhost:3000` neu starten. Dashboard, Person Audit, Quelltext senden (Modell `gemma4-e2b`). Dann Heinz Chat mit einer Nativ-Konfiguration auf `gemma4-e2b` (im Dashboard Person Nativ, Konfiguration speichern, „Im Heinz Chat verwenden“) und „Hallo“ senden. Erwartung: antwortet normal, nicht im Wortlaut des Audit-Prompts. Der Chat sendet bei Nativ keine System-Nachricht (simuliert geprüft). Zeigt der Server trotzdem die alte Anweisung, melden: dann muss der Chat bei LiteRT-LM einen leeren Systemprompt ausdrücklich senden. – bestätigt 19.11.2026 (Entwickler)
- [x] Wechsel Dashboard (Modell A) → Heinz Chat (Modell B) → Dashboard: Ollama lädt jeweils neu (erwartet, kein Fehler); keine Fehlermeldung, die Antworten kommen. – bestätigt 19.11.2026 (Entwickler)

## Strang Konfiguration, Stufen (c) und (d) (13.11.2026; nur simuliert getestet)
Vorbereitung: `git pull`, `bash start.sh`.

**P. Mauer Offline/Online**
- [ ] Dashboard, Menü Konfiguration: eine Konfiguration mit Online-Engine (zum Beispiel Google AI Studio mit gespeichertem Schlüssel) speichern und dem Heinz Chat zuweisen. „Online erlauben“ bleibt aus. Heinz Chat öffnen. Erwartung: Rückfrage „Diese Konfiguration nutzt einen Cloud-Dienst. Online für diese Sitzung zulassen?“, Senden ist gesperrt.
- [ ] „Nicht jetzt“: roter Ring und Hinweis, es geht nichts raus. „Für diese Sitzung zulassen“ (nach Neuladen): Ring wird blau, Antwort kommt.
- [ ] Heinz Chat schließen und neu öffnen (App im Hintergrund, nicht beendet): keine neue Rückfrage. Danach Dashboard öffnen: der globale Haken „Online erlauben“ ist weiter aus.
- [ ] Lokale Konfiguration zuweisen: nie eine Rückfrage.

**Q. Hub-Kachel „Konfigurationen“**
- [x] Erste Karte ist die Standardkonfiguration („eingebaut, nicht löschbar“, ohne Löschen). Ohne Zuweisung trägt sie die Markierung „Heinz Chat“, mit Zuweisung die zugewiesene Karte. – bestätigt 19.11.2026 (Entwickler)
- [x] „Jetzt parametrieren“ an einer eigenen Konfiguration: Dashboard öffnet sich mit Person, Prompt, Ton, Kontext und Threads dieser Konfiguration (Hinweisband). Bei einer Konfiguration einer anderen Engine wechselt das Dashboard die Engine. – bestätigt 19.11.2026 (Entwickler)
- [x] „Jetzt parametrieren“ an der Standardkonfiguration: Qwen-Werte (0,6 / 0,9 / 40, Kontext 4096, Threads 2) im Dashboard; ändern, unter neuem Namen speichern, im Heinz Chat verwenden. – bestätigt 19.11.2026 (Entwickler)
- [x] Hub, Knopf „Modelfile“ an der Standardkonfiguration: Datei lädt, enthält FROM, PARAMETER und SYSTEM. Optional in Termux: `ollama create heinz-test -f <Datei>`; danach `ollama rm heinz-test`. – bestätigt 19.11.2026 (Entwickler)

## Strang Design, MVP-Abschluss (17.11.2026; am Handy bestätigt vom Entwickler, 12:16: Start mit `heinz`, LED-Verhalten, Cursorfarbe, Modellblatt, Hub-Marken ohne Fehler; offen: Standard 2 Threads im Browsertab, Konfiguration einer anderen Person laden)
Vorbereitung: `heinz` in Termux (Alias aus der README: `git pull`, Ollama, LiteRT-LM und Server starten).

**R. Start und Standard**
- [x] Nach Beenden von Termux: ein Befehl (`heinz` oder `cd ~/AIUIheinz && bash start.sh`) startet Ollama, LiteRT-LM und die Seite; das Dashboard zeigt beide Engines erreichbar. (Am Handy bestätigt 17.11.2026: LiteRT-LM lief, nachdem der Port frei war.)
- [x] Im Browsertab (nicht der App) zeigt ein Modell ohne gespeicherte Werte 2 Threads. – bestätigt 19.11.2026 (Entwickler)
- [x] Konfiguration einer anderen Person laden: Person wechselt, die laufende Unterhaltung bleibt. – bestätigt 19.11.2026 (Entwickler)

**S. Personenleiste: Änderungs-LED** (am Handy bestätigt 17.11.2026)
- [x] Schlitz in dunkler Mulde unter jedem Namen; voll an bei geänderter Person, gedimmt bernsteinfarben bei einer mit Änderung verlassenen Person.
- [x] Zurück zur Person: Änderung kommt von selbst wieder. Tipp auf die aktive Person setzt zurück, danach beim Wechsel keine LED bei ihr.
- [x] Heller und dunkler Modus: Schlitz an und gedimmt gut erkennbar.

**T. Eingabefelder, Modellblatt, Hub**
- [x] Schreibcursor hat die Farbe der Person (Dashboard) beziehungsweise der Seite (Heinz Chat), hell und dunkel sichtbar.
- [x] Dashboard, Modellblatt (Engine ohne Modellliste): Label „Model name“ / „Modellname“, Hinweis steht als Platzhalter im Feld.
- [x] Heinz Chat, Modellname oben antippen: Tabelle der Fakten, nichts sieht bedienbar aus, Prompt ohne Ziehgriff, „Konfigurationen verwalten“ oben sichtbar.
- [x] Hub: Filter, Scan, Studio mit Marke „geplant“; Data Lab und Vitals mit „alt“; Sheet mit „Test“; beide Reiter, EN und DE.

## Strang convert2 (17.11.2026; nur im Container simuliert getestet, Playwright mit 426 × 803 und 426 × 400)

Vorher: `git pull`, `bash start.sh`, Seite `http://localhost:3000/tools/convert2/index.html` (Hub, Reiter Werkzeuge, Kachel Convert2).

**U. Convert2**
- [ ] Textdatei laden (Knopf „Datei“): Inhalt erscheint, Erkennung zeigt die Art (Markdown, CSV, JSON, HTML).
- [ ] Aus einer Webseite oder Tabelle kopieren und im Eingabefeld einfügen: Formatierung wird zu Markdown (Haken „Formatierung beim Einfügen bereinigen“ an), mit Haken aus bleibt der reine Text. Knopf „Einfügen“ fragt die Zwischenablage ab (Berechtigung des Browsers).
- [ ] Tabelle als Markdown eingeben, Format TSV wählen, „Kopieren“, in Google Sheets einfügen: Zellen landen in Spalten.
- [ ] Format EPUB wählen, „Herunterladen“, Datei im echten Reader des Handys öffnen (Google Play Books oder anderer): Titel, Inhaltsverzeichnis, Kapitel und Bilder prüfen. Nicht mit `epubcheck` geprüft.
- [ ] „Lesen“: Vollbild-Leser, Inhaltsverzeichnis, vor/zurück, Schrift größer/kleiner. Flugmodus an: weiter alles nutzbar.
- [ ] „Drucken / PDF“: Druckdialog des Handys, Ziel „Als PDF speichern“; nur das Blatt erscheint, keine Bedienelemente; Umbruch bei Tabellen und Überschriften.
- [ ] Großes Dokument (rund 1 MB Text): Tippen bleibt flüssig, Umwandlung ohne Absturz; Entwurf bleibt nach Neuladen erhalten.
- [ ] Hell, dunkel, EN und DE; kein waagerechtes Scrollen.
- [ ] Flugmodus: Seite, EPUB-Erzeugung, Lesen und Drucken ohne Netz (keine Bibliothek aus dem Netz nötig).

## Strang docHeinz, Phase 2c (18.11.2026; nur im Container simuliert getestet, echtes Modell nicht geprüft)

Vorher: `git pull`, `bash start.sh`, docHeinz neu laden. Im Heinz Dashboard ein lokales Modell wählen (Ollama läuft in Termux). Ein längeres Buch bereithalten.

**Y. docHeinz Markierungsleiste**
- [ ] Wort lang drücken und markieren: oben am Bildschirm erscheint die Leiste „Suchen, Erklären, Zusammenfassen“ (steht die Markierung selbst ganz oben, sitzt sie unten über dem Chrome-Suchfeld); sie stört weder das Android-Menü noch die Griffe. Tippen im Text blendet sie wieder aus.
- [ ] Suchen: Trefferliste mit Kapitel und Umgebung; Tipp auf einen Treffer springt auf die Seite, die Stelle ist gelb hervorgehoben; nächstes Umblättern löscht die Hervorhebung. Längere Markierung (über 80 Zeichen): „Suchen“ fehlt.
- [ ] Erklären eines Wortes und eines Satzes: Antwort läuft wörtlich ein, Stopp bricht ab, Kopieren legt sie in die Zwischenablage. Bei kaltem Modell dauert der erste Text; wie lange?
- [ ] Zusammenfassen eines längeren Absatzes: Qualität des kleinen Modells bewerten.
- [ ] „Weiter fragen“ unter der Antwort: Fenster „Analyse“ im Vollbild mit der Markierung oben; Frage tippen und senden (Enter sendet, Umschalt+Enter neue Zeile), Antwort läuft ein, Stopp bricht ab; Kopieren je Antwort; Tastatur verdeckt das Eingabefeld nicht.
- [ ] Schalter „Mit Seitentext“: Antworten beziehen sich spürbar auf die Seite; Zurück-Taste des Handys schließt zuerst das Fenster, dann erst bleibt das Buch an derselben Stelle.
- [ ] Ohne gewähltes Modell oder mit ausgeschalteter Engine: klarer Hinweis, nichts bleibt hängen.
- [ ] Cloud-Modell wählen: ohne „Online erlauben“ Hinweis und keine Anfrage; mit „Online erlauben“ steht „geht an …“, danach die Antwort.
- [ ] Wechsel zwischen docHeinz und Dashboard: Modell bleibt im Speicher (`ollama ps`, gleiche ID).

## Strang docHeinz, Phase 2b (18.11.2026; nur im Container simuliert getestet)

Vorher: `git pull`, `bash start.sh`, docHeinz neu laden. Ein EPUB mit Titelbild, eines ohne und eine Markdown-Datei bereithalten.

**X. docHeinz Titelbild**
- [ ] Neues EPUB mit Titelbild hinzufügen: in der Bibliothek erscheint das Bild als kleine Vorschau.
- [ ] Bücher, die schon vorher in der Bibliothek waren (Phase 1): Vorschau erscheint nach einmaligem Neuladen von selbst.
- [ ] Buch öffnen (noch nicht gelesen): erste Seite ist das Titelbild, Tippen rechts blättert zum Text, auf Text-Seite 1 führt Tippen links zurück zur Titelseite. Steuerung oben funktioniert auch dort.
- [ ] Buch ohne Bild (Markdown, Text, EPUB ohne Cover): Titelseite zeigt Titel und Autor, in Bibliothek bleibt der Buchstabe.
- [ ] Ein begonnenes Buch öffnet direkt an der Lesestelle, nicht auf der Titelseite.
- [ ] Bild sieht in Hell, Sepia, Dunkel und Schwarz sauber aus, ragt nicht über den Rand; Hochformat und Querformat probieren.
- [ ] Speicherzeile unten: Wert wächst pro Buch nur um das Buch (Bild nur Zehntel-MB).

## Strang docHeinz, Phase 2a (18.11.2026; nur im Container simuliert getestet)

Vorher: `git pull`, `bash start.sh`; docHeinz neu laden (ggf. Cache der App leeren). Ein EPUB und eine lange Markdown-Datei bereithalten.

**W. docHeinz Lesen**
- [ ] Buch öffnen: Seiten statt Scrollbalken, keine Kopfzeile, Text füllt den Schirm.
- [ ] Tippen rechts neben der Mitte: nächste Seite; links: zurück; Mitte: nichts. Über das Kapitelende hinaus geht es ins nächste Kapitel, zurück an dessen letzte Seite.
- [ ] Tippen oben: Steuerung erscheint (Zurück, Inhalt links oben, Einstellungen, Seite x von n, Balken); Text verschiebt sich nicht; nächster Tipp schließt sie, ohne zu blättern.
- [ ] Langes Drücken auf ein Wort: Markierung (das Menü des Handys; eigenes Menü kommt in 2c); beim Markieren wird nicht geblättert.
- [ ] Einstellungen: Schriftgröße ändert die Seitenzahl, die Lesestelle bleibt ungefähr; 7 Schriften probieren, Themen Hell, Sepia, Dunkel, Schwarz: Lesbarkeit auf dunklem Schirm bewerten.
- [ ] Umblätterknöpfe einschalten: erscheinen unten links/rechts und blättern; ausschalten: weg. Einstellung bleibt nach Neustart.
- [ ] Seite drehen (quer) und App wechseln: Lesestelle bleibt; Zurück-Taste schließt das Buch; Bibliothek zeigt den Prozentwert.
- [ ] Bilder und breite Tabellen: nichts ragt über die Seite oder wird abgeschnitten.

## Strang docHeinz, Phase 1 (17.11.2026; nur im Container simuliert getestet, Playwright mit 426 × 803 und 426 × 400)

Vorher: `git pull`, `bash start.sh`, Hub, Reiter Werkzeuge, Kachel docHeinz. Testdateien bereithalten: ein EPUB (klein und eines mit mehreren MB samt Bildern), eine Markdown-, eine Text- und eine HTML-Datei, eine PDF-Datei.

**V. docHeinz**
- [ ] „Bücher hinzufügen“: Dateidialog des Handys, mehrere Dateien auf einmal wählen; Meldung „n hinzugefügt“, jedes Buch erscheint mit Titel, Autor, Format, Größe.
- [ ] PDF wählen: klare Meldung „PDF wird noch nicht unterstützt“, keine leere Seite. Dieselbe Datei zweimal: Meldung „schon in der Bibliothek“.
- [ ] EPUB öffnen: Text, Bilder, Überschriften; Inhalt (Menü oben) springt zum Kapitel; Verweis im Text springt, Link nach außen tut nichts.
- [ ] Schrift mit dem Regler größer und kleiner (stufenlos), Themen Auto, Hell, Sepia, Dunkel, Schwarz; nach Neuladen gilt dieselbe Einstellung.
- [ ] Lesen, zurück zur Bibliothek (Pfeil und Zurück-Taste des Handys): Prozentzahl und Balken am Buch; erneut öffnen: der Text steht an derselben Stelle.
- [ ] Hintergrund und Rückkehr: Buch öffnen, in eine andere App wechseln, zurückkehren; Lesestelle und Fortschritt sind erhalten. App beenden und neu starten: ebenso.
- [ ] Große Datei (mehrere MB EPUB mit Bildern): Hinzufügen und Öffnen ohne Absturz, Scrollen bleibt flüssig.
- [ ] Löschen: Papierkorb, Rückfrage, danach ist das Buch weg und der Speicherwert unten sinkt.
- [ ] Suche und Sortierung in der Bibliothek (ab 2 Büchern sichtbar).
- [ ] Speicherdruck: Zeile „Speicher: … belegt“ unten; bei fast vollem Gerät erscheint die Warnung, ein zu großes Buch meldet „nicht genug Speicher“ statt still zu scheitern.
- [ ] Hell, dunkel, EN und DE; kein waagerechtes Scrollen; Flugmodus: alles nutzbar, kein Netz nötig.

## Y. Update-Knopf im Hub (18.11.2026, Strang AIUIheinz-Update, Aufgabe 1) – **am Handy bestätigt 19.11.2026 (Entwickler)**
1. `git pull`, `bash start.sh`, App neu öffnen. Im Hub unten steht der Knopf UPDATE und darunter das LCD mit `v… · Commit · Datum`; beides bleibt beim Scrollen am unteren Rand.
2. Tipp auf UPDATE ohne neuen Stand: LCD zeigt kurz PRÜFE GITHUB, dann AKTUELL (grün), nach 5 s wieder die Version.
3. Nach einem Push auf GitHub: Tipp auf UPDATE zeigt AKTUALISIERT und lädt den Hub neu; die Version im LCD ist neu.
4. Ohne Netz: LCD zeigt FEHLER (rot) und eine Zeile mit der Meldung, danach wieder die Version. Der Knopf im Dashboard (Menü Update) geht weiter wie vorher.
5. EN/DE-Umschalter: Texte unter dem LCD wechseln mit.


### Y2. docHeinz: Leiste, Platz unten, Modellwahl (19.11.2026) – **am Handy bestätigt 19.11.2026 (Entwickler)**
1. Reader öffnen, Einstellungen (oben tippen, Zahnrad): unter „KI-Modell für Erklären/Analyse“ ein Modell antippen (am besten 3B oder größer); „Verwendet: …“ erscheint.
2. Text markieren: Leiste erscheint unten über dem Chrome-Suchfeld (oder oben, wenn die Markierung unten liegt). Überdeckt das Android-Menü sie?
3. Erklären antippen: Blatt und „Weiter fragen“-Eingabe müssen über dem Chrome-Streifen liegen; sonst „Platz lassen“ prüfen.
4. Antwortqualität mit dem gewählten Modell beurteilen (nur das Handy zeigt das echte Verhalten).

### Y3. docHeinz: eigene Auswahl (19.11.2026) – **am Handy bestätigt 19.11.2026 (Entwickler)**
1. Reader öffnen, Finger auf ein Wort halten (ca. ½ s): Wort wird markiert, zwei Griffe erscheinen, kurze Vibration. Kein Android-Menü, kein Chrome-Suchfeld.
2. Finger gehalten weiterziehen oder Griffe ziehen: Markierung wächst; die Seite darf sich nicht verschieben.
3. Leiste: Suchen, Erklären, Zusammenfassen, Kopieren; sitzt über der Markierung, unter ihr bei Text ganz oben.
4. Einmal tippen hebt die Markierung auf, ohne zu blättern. Blättern per Zonen und Tippen oben wie bisher.
5. Kopieren: Text in ein anderes Feld einfügen. Wirkt Zoomen per Zwei-Finger-Geste nicht mehr? (touch-action: none, gewollt.)

### Y4. docHeinz: Satzspiegel (19.11.2026) – **am Handy bestätigt 19.11.2026 (Entwickler)**
1. Reader, Zahnrad: oben Umschalter „Alle Bücher / Nur dieses Buch“; Gruppen Abstände, Ränder und Breite, Text und Umbruch, Spalten, Farben, Profile aufklappen. Der Text über dem Blatt folgt live.
2. Zeilenabstand, Rand, Blocksatz, Silbentrennung ausprobieren; Zwei Spalten bei quer gehaltenem Handy.
3. Eigene Farben: Wirkt Thema „Eigene“, bleibt der Text lesbar? Helligkeit testen.
4. Profil speichern, etwas ändern, Profil anwenden. „Nur dieses Buch“: andere Bücher bleiben unverändert; „Zurücksetzen“ im Buch-Modus löscht nur die Überschreibung.
5. Zurück-Pfeil/-Geste: schließt zuerst das Blatt, dann erst das Buch.

## Y5 docHeinz: Vorab-Frage und Einstellungsmenü – **am Handy bestätigt 19.11.2026 (Entwickler)**
1. Text lang drücken: Leiste vollständig sichtbar (Search, Explain, Summarize, Copy).
2. Explain tippen: Fragefeld erscheint; leer senden = Antwort wie bisher; mit Frage = Antwort auf die Frage. Schalter „Vorab eine Frage stellen" aus = sofort Antwort.
3. Einstellungen: Formatierung / KI-Funktionen, Untermenüs öffnen per Tipp, Zurück-Pfeil geht eine Ebene zurück, Buch bleibt sichtbar (Live-Vorschau).

## Z. Filter (20.11.2026) – nur simuliert getestet, Handytest steht aus
Vorbereitung: `git pull`, `bash start.sh`, Ollama mit `qwen2.5:3b` und `gemma2:2b`; optional `litert-lm serve --cors-origin http://localhost:3000`.
1. Hub, Werkzeuge, Filter öffnen. „Beispiel“ tippen: 12 Einträge; Regel „Stimmung“; Auswerten. Tempo je Eintrag notieren (Sekunden), Ergebnis mit eigenem Urteil vergleichen.
2. Datei laden (CSV mit Kopfzeile aus dem Dateimanager): Spaltenwahl, Kontrollspalte wählen, Auswerten; Trefferquote und Verwechslungstabelle ansehen.
3. Einfügen aus der Zwischenablage (Tabelle aus Sheets, Text mit Zeilen): „Einfügen“ und Einfügen ins Feld.
4. Abbrechen mitten im Lauf, „Fortsetzen“; App in den Hintergrund schicken und zurückkehren; Seite neu laden: Eingabe und Ergebnisse sind da, Fortsetzen geht.
5. Mit Gemma (`gemma2:2b`) und mit LiteRT-LM wiederholen: Bei LiteRT-LM wird das Antwortformat nicht erzwungen; zählen „unklar“-Antworten, Hinweis im Ergebnis.
6. Kacheln antippen, „Nur die gewählten Einträge zeigen“, Export CSV/TSV/JSON/Markdown, „Für Sheets kopieren“ und in Sheets einfügen (Spalten korrekt?).
7. Online: Haken „Online erlauben“ aus: nur lokale Engines in der Liste. An: Online-Engine wählbar, vor dem Lauf kommt die Rückfrage.
8. Hell/Dunkel, EN/DE, quer gehaltenes Handy.
Messwerte (Tempo je Eintrag, Trefferquote an einem Testsatz) bitte an den Strang melden; sie kommen in `docs/OLLAMA_UND_MODELLE.md`.


## Y6 docHeinz Phase 3: Markierungen, Notizen, Export (nur simuliert getestet, 20.11.2026)
1. Text lang drücken, ziehen: Leiste mit Lupe, Erklären, Zusammenfassen, Markieren, Kopieren in einer Zeile.
2. „Markieren“: Stelle bekommt die zuletzt benutzte Farbe, darüber erscheint die Leiste (4 Farben, Stift, Mülleimer). Farbe wechseln, Notiz schreiben und speichern.
3. Auf markierten Text tippen: Leiste öffnet sich wieder; anderswo tippen schließt sie. Markierung bleibt nach Schriftgröße ändern, Kapitelwechsel, App neu laden.
4. Inhaltsfeld (Menü oben links): Register „Markierungen“, Tipp springt zur Stelle, Mülleimer löscht.
5. „Als Markdown exportieren“ (Datei `…-notes.md`) und „Als Markdown kopieren“; in einen Editor einfügen.
6. Erklären oder Zusammenfassen: „Als Notiz speichern“ im Blatt und im Fenster „Analyse“; Notiz erscheint mit „KI:“ in der Liste und im Export.
7. (Nachtrag Y6) Inhaltsfeld → „Markierungen & Notizen“ → „+ Notiz zu dieser Seite“: Notiz schreiben, speichern; in der Liste Tipp springt zur Seite zurück. „Nur mit Notiz“ filtert; Export enthält die Seitennotiz.

## Y7 docHeinz: Export je Buch (nur simuliert getestet, 20.11.2026)
1. Bibliothek: Symbol „Exportieren“ rechts neben dem Papierkorb, Formular in der Zeile (Format, ggf. Schalter für Notizen).
2. EPUB exportieren, in Google Play Books, Kobo-App oder einem anderen Reader öffnen: Titel, Kapitel, Bilder, Inhaltsverzeichnis.
3. Word (.docx): in Google Drive hochladen, mit Google Docs öffnen (Überschriften, Listen, Tabellen, Bilder).
4. Markdown und Text in einem Editor; HTML im Browser.
5. PDF: Druckdialog erscheint, „Als PDF speichern“ wählen; prüfen, ob große Bücher durchlaufen.
6. Mit angehängten Markierungen und Notizen: letzter Abschnitt vorhanden, Kapitelbezug richtig.
7. Ein großes Buch (50 MB und mehr) exportieren: Wartezeit, Speicher, kein Abbruch.

## Y8 docHeinz: PDF lesen und Originalansicht – am Handy bestätigt 20.11.2026 (Entwickler)
1. `git pull`, `bash start.sh`, docHeinz öffnen, ein PDF mit Text (Roman, Anleitung) in die Bibliothek legen.
2. Es öffnet sich im Leser: Absätze, Überschriften, Silbentrennung am Zeilenende aufgelöst, keine Seitenzahlen und Kopfzeilen im Text. Schrift, Farben, Markierungen, Notizen, Export wie bei EPUB.
3. Kapitel: bei PDFs mit Gliederung nach Gliederung, sonst je 10 Seiten. Wie lange dauert das Öffnen eines dicken PDFs (Seitenzahl notieren)?
4. Zweispaltiges PDF: Reihenfolge links vor rechts? Tabellen und Formeln sind nur Text, das ist bekannt.
5. Eingescanntes PDF: Hinweis „keine Textebene“, kein Absturz. (OCR folgt.)
6. Originalansicht (Knopf oben in der Leiste, nur bei PDF): Seiten wie gedruckt, mit zwei Fingern zoomen, Doppeltipp zoomt, Plus/Minus, ruckelt es? Zurück führt an dieselbe Stelle im Text.
7. Norm mit Tabellen (EU 2019/2015, Anhang II): Tabellen als Tabelle, Wörter ohne Lücken mitten im Wort?

## Y9 docHeinz: OCR für gescannte PDFs – am Handy bestätigt 20.11.2026 (Entwickler)
1. `git pull`, `bash start.sh`; ein eingescanntes PDF (Folien-PDF ohne Text) hinzufügen: es erscheint als Buch mit „Scan · Text erkannt 0 / N Seiten“ und Knopf OCR.
2. OCR antippen, Sprache wählen, Start. Bildschirm anlassen. Zeit je Seite notieren (Pixel 9 Pro) und ob der Akku/Wärme auffällt. Beim ersten Mal lädt der Kern und die Sprachdaten (wenige Sekunden).
3. Zwischendurch ■ drücken: es hält nach der Seite an, später mit OCR weitermachen. Seite neu laden und weitermachen geht ebenfalls.
4. Fertig: Buch öffnen, Text prüfen (Umlaute, Zahlen, Spalten). Originalansicht zeigt das Bild der Seite.

## Y10 docHeinz: Fotos von Buchseiten (nur simuliert getestet, 20.11.2026)
1. „Bücher hinzufügen“, im Dateiwähler Bilder (oder „Kamera“) wählen, mehrere Seiten auf einmal; Reihenfolge = Dateiname. Es entsteht ein Buch „Fotos …“, das Formular der Texterkennung öffnet sich.
2. Sprache wählen, Start. Zeit je Seite notieren. Danach lesen: Umlaute, Zahlen, Zeilenumbrüche, Silbentrennung?
3. Gutes Foto: Seite gerade, gleichmäßig hell, Schrift füllt das Bild. Wie schlecht wird es bei schiefem Foto oder Schatten? (Perspektivkorrektur gibt es noch nicht.)
4. Am Foto-Buch „+ Seite“: „Foto aufnehmen“ (Kamera, eine Seite je Aufnahme) und „Aus der Galerie“. Neue Seiten erscheinen hinten, danach OCR (nur die neuen Seiten).

### Y10 Nachtrag: mehrere Seiten nacheinander fotografieren (nur simuliert getestet)
1. Bibliothek, „Kamera“ antippen, Kamerazugriff erlauben.
2. Mehrere Seiten nacheinander mit dem Auslöser aufnehmen; Zähler und Miniaturen prüfen, „Letztes löschen“ testen.
3. „Fertig“: ein Buch „Fotos …“ mit allen Seiten in Aufnahmereihenfolge, OCR-Formular öffnet sich.
4. Mehrere Fotos aus der Galerie wählen: Reihenfolge = Aufnahmezeit.

### Y10 Nachtrag 2: gedrehte Fotos und Doppelseiten (nur simuliert getestet)
1. Eine Doppelseite quer und eine Einzelseite fotografieren (Telefon beliebig gehalten), OCR starten.
2. Erwartung: Text aufrecht erkannt, linke Seite vor rechter, kein Zeilenmix. Dauer je Seite notieren.

### Y10 Nachtrag 3: Cloud-Erkennung mit Gemini (nur simuliert getestet)
1. Im Dashboard „Online erlauben“ einschalten und den Google-Schlüssel eintragen.
2. Foto-Buch öffnen, OCR-Formular: Knopf „Mit Cloud-Modell erkennen (Google Gemini)“ muss da sein; ohne Haken/Schlüssel nur Hinweis.
3. Antippen: Bestätigung mit Seitenzahl und Modellauswahl, dann „Senden und lesen“. Text, Reihenfolge (links vor rechts) und Dauer je Seite mit der lokalen OCR vergleichen.
4. Haken wieder aus: kein Cloud-Knopf, keine Anfrage nach außen.

## U Heller Modus: Slider, Logo, LCD (24.11.2026; nur simuliert getestet)
- [ ] Hell: Heinz Chat, Logo mittig im Ring (vorher zu hoch), ebenso dunkel.
- [ ] Hell: Logo ohne schwarze Platte, dunkle Schrift „HEINZ UI“, Ring bleibt in Statusfarbe.
- [ ] Hell, Wilson: Einstellungen, Slider-Track hell wie bei Heinz, gefüllter Teil in Akzentfarbe, Daumen greifbar; Wert ändern und Person wechseln, Füllung folgt.
- [ ] Hell: Modell-Anzeige und Gleichzeitig-Pille hellgrau mit dunkler Schrift, gut lesbar; Wechsel auf dunkel und zurück zeichnet beide neu.
- [ ] Dunkel: alles unverändert.
- [ ] Hell: Personen-LED, Änderung (weiß mit Bernsteinhof) und behalten (ruhiges Bernstein) sind direkt zu unterscheiden, wie im dunklen Modus.
### Y11: Vollbild im Leser (nur simuliert getestet)
1. Ein Buch öffnen: Statusleiste und Navigationsleiste sollen verschwinden, nur der Text bleibt.
2. Vom Rand wischen oder die App wechseln, zurückkehren, einmal tippen: Vollbild kommt zurück.
3. Buch schließen: Leisten sind wieder da. Notieren, ob die Gestenleiste unten ganz weg ist.
