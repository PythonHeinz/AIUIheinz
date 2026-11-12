# Geplante Funktionen und Ideen

Stand 10.11.2026. Reihenfolge der konkreten Aufgaben steht in `docs/agent/STAND.md` („Nächste Aufgaben“). Hier steht, was darüber hinaus besprochen wurde. Nichts davon ist beschlossen, außer wo es „beschlossen“ heißt.

## Zwei Bereiche (Richtung des Entwicklers, 10.11.2026; im Konzept eingearbeitet in `docs/KONZEPT.md` Abschnitt 15.3, dort inzwischen als drei Bereiche; diese Fassung ist überholt)
Stand der Besprechung im Chat „AIUIheinz-Chat“. Namen und Zuschnitt sind offen; „beschlossen“ ist hier nur, was der Entwickler so gesagt hat, die Ableitungen sind als Vorschlag gekennzeichnet.

**Bereich A – Ausprobieren und Modelle (Arbeitsname offen: „Research“ oder „Model Manager“).** Zweck: Nutzer sollen auf ihrem Handy mit lokalen Sprachmodellen spielen und herausfinden, welche Modelle und Prozessor-Einstellungen am besten passen.
- Inhalt: die heutige Chat-Seite als Testfeld (Modi, Parameter, Tempo-Test, Threads), dazu Erstinstallation, Installation und Verwaltung lokaler Modelle in Ollama (Konzept Abschnitt 6, Archiv: `docs/archiv/KONZEPT_v1_entwurf.md`), Einbindung von Cloud-Anbietern und LiteRT-LM. Alles zusammen ein Bereich.
- **Chats werden je Modus gespeichert, nicht je Modell.** Grund: Derselbe Prompt soll in einem Modus mit mehreren Modellen verglichen werden können. Umgesetzt am 10.11.2026 (Liste je Modus, Umschalter auf alle Modi).
- **Modell am Chat erkennbar:** Der Chat soll zeigen, mit welchem Modell er gestartet wurde. Offen: Was gilt, wenn der Nutzer nach der Moduswahl das Modell von Hand ändert (in manchen Modi möglich)? Vorschlag: Der Chat bleibt im Modus, speichert das Startmodell und vermerkt einen Modellwechsel mitten im Chat an der Stelle der Antwort.
- **Testfeld für andere Tools:** Zum Beispiel soll convert2 Fragen zu Text und Aufbereitung kurzzeitig an ein Modell auslagern können, lokal oder per Cloud; hier wird erprobt, welches Modell dafür reicht. Vorschlag: Die Anbieterschicht (`lib/providers.js`) ist ein gemeinsamer Baustein für alle Tools, nicht Teil der Chat-Seite.
- **Später, nicht für die nächste Version:** Auswahl in der Chatzeile wie in professionellen Chat-Apps („Flash“ oder „Pro“). Eigene Parameter-Sets, die wir ermittelt haben, könnten als Optionen für ein Modell angeboten werden, sofern sinnvoll.

**Bereich B – Schlanker Chat (Name offen).** Oberfläche wie Claude oder Gemini: maximale Fläche für den Chat, eine minimale Eingabezeile, die beim Einfügen eines Prompts wächst, ein großes Chatfenster über den ganzen Bildschirm, dezente Symbole öffnen Menüs von links (Chats) oder rechts (wesentliche Chat-Einstellungen). Keine Temperatur, keine Parameter, keine Testläufe. Fokus auf gut lesbare Schrift, dunkler oder heller Hintergrund. Vorschlag: Bereich B nutzt die in Bereich A ermittelten Einstellungen (Modell, Threads, Modus) still im Hintergrund.

**Offene Abgrenzung online/offline (Entwickler stimmt sich mit dem Design-Chat ab).** Offline bleibt alles: Chat-Modi, Tabellenmodus, Labor, später convert2. Offen ist, welche Funktionen und Modi zusätzlich erscheinen, wenn „Online erlauben“ an ist (Standard aus), und wie die Leiste nicht überquillt, wenn alle Tools und Modi wählbar sind. Vorschläge: Bereichsumschalter (Chat | Werkzeuge), Modi nur im Chat-Bereich; ein Merkmal je Modus (zum Beispiel `braucht Cloud: ja/nein`), das Modi ohne Cloud-Zugang ausblendet oder grau zeigt.

**Folgen für die nächsten Schritte im Chat-Strang.** (1) Anbieterschicht samt LiteRT-LM bauen, so dass Bereich A und andere Tools sie nutzen können (berührt das Fundament `lib/`, vorher Freigabe einholen). (2) Parameter, Tempo-Test und Modellverwaltung gehören in Bereich A, nicht in Bereich B. (3) Hinweis an den Konzept-Chat: Konzept Abschnitt 4 (Archiv: `docs/archiv/KONZEPT_v1_entwurf.md`; „Bedienkonzept Chat“) beschreibt bisher eine Hauptansicht mit ☰-Einstellungen; mit zwei Bereichen wäre er zu teilen (Bereich A: Abschnitt 4 und 6, Bereich B: neu).

## Konkret in Arbeit oder als Nächstes
- **Sheet mit echtem 3B-Modell** auf einer realen Rohstoffliste (Lager Jakobswiese) erproben: Befehlsübersetzung („wie viele blaue Artikel?“, „7 entnehmen“) mit Qwen 2.5 3B. Bisher nur mit simuliertem Modell geprüft.
- **Vitals stabilisieren:** Termux-Abstürze (Signal 9) eingrenzen, Messdienst schonender machen (Sensor seltener), prüfen, welche Sensoren Android in Termux freigibt.
- **Tests ins Repo:** Playwright-Skripte mit simuliertem Ollama (bisher nur im Chat-Container, nicht gesichert).
- **`heinz-fakt:latest`** in die Auswahllisten aufnehmen, falls gewünscht.

## Ideen (besprochen, nicht begonnen)
- **Mail- und Newsfeed-Stimmung:** Betreffzeilen oder Feed-Einträge im Data Lab nach Regel bewerten lassen (Stimmung, Dringlichkeit, Spam, Thema). Der Entwickler hält das für 3B-Modelle nur bei wenigen Zeilen für tragfähig; Lab bleibt zum Experimentieren erhalten und wird nicht umgebaut.
- **Sensor-Dashboards über Termux:API:** Akku, Temperatur, Luftdruck, Bewegung im Verlauf (Grundlage ist der Vitals-Logger).
- **Spotify-Tempo neben Schlafzeiten:** Die Spotify-Audioanalyse-Schnittstelle wurde 2024 eingeschränkt (nicht neu geprüft); Schlafdaten sind aus Termux vermutlich nicht erreichbar (nicht geprüft).
- **Claude-ermittelte Werte regelmäßig tracken:** Weboberfläche, die extern ermittelte Werte in `data/` ablegt und im Verlauf zeigt.
- **Chat:** Chats speichern und später fortführen, Python-Code mit Farbmarkierung offline (Absicht des Entwicklers; Stand im Chat-Modul gegen `dashboard.html` prüfen).

## Ideen vom 10./11.11.2026 (Entwickler, nicht begonnen; Stand nach Design-Review 1)
**Entwickleroption „Brummen" (Modell-Traum-Anzeige)**
- Haken in den Entwickleroptionen (Standard aus, nicht für den Alltag). Statt „Bereit für Eingaben…" laufen in der Mitte des Chatbereichs ständig Wörter und Wortteile, die das eingestellte Modell zufällig auswirft; gedacht als Anzeige „was im Modell passiert" im Vordergrund, im Pixel-Display-Stil.
- Technik: Hintergrundanfrage mit leerem oder fast leerem Prompt, hohe Zufallswerte (Temperatur ca. 1,5 bis 2, top_k aus, top_p 1), neuer zufälliger Seed je Runde, kurze Runden (ca. 8 bis 20 Token), Streaming, jedes Stück einzeln anzeigen, gedrosselt (alle ein bis zwei Sekunden). Zugriff auf Gewichte oder Logits gibt es nicht, es ist echtes Sampling aus der Verteilung des Modells.
- Läuft nur, solange die App im Vordergrund ist, der Chat leer ist und keine Bildschirmabdunklung ausgelöst wurde. Bricht sofort ab bei Tipp auf einen Modus, Öffnen des Einstellmenüs, Tipp ins Chatfenster oder Beginn einer Eingabe, damit die echte Anfrage nicht ausgebremst wird.
- Nur lokale Engines. Bei Cloud-Modellen gesperrt (kostet Geld); eventuell als Sonderfall aktivierbar.
- Offen: Akku und Wärme beim Handytest messen, Drosselung festlegen.

**Weitere vorgemerkte Punkte (Sammlung)**
- (erledigt 11.11.2026) Mehrere eigene OpenAI-kompatible Engines mit eigenem Namen, Adresse und Schlüssel; das doppelte Auswahlfeld im Engine-Menü ist weg (Liste oben wählt aus). Handytest offen.
- Modus-Schieberegler am linken Rand (Halbkreis-Kragen, senkrechte Leiste mit farbigen Kreisen), Wichtigstes im Daumenbereich, Parameter-Schnellöffner: siehe `docs/DESIGN.md`, Abschnitt Design-Review 1, Planung für DR2.
- Zwei Stufen „Schnell/Tief" als Pille an der Eingabe und Reasoning für Cloud-Modelle: Auftrag `docs/agent/AUFTRAG_Modi.md`.
- App-Sprache (Oberfläche und Vorlesen, Englisch als Rückfall), Geräte- und CPU-Listen.
- Tempo-Test: Kerne gezielt zuweisen (zum Beispiel `taskset` über `server.py`); die Kacheln setzen heute nur die Thread-Zahl, die Farben sind ein Hinweis. Eventuell Streaming im Test für echten Fortschritt je Lauf.
- Schwellen für T/s und Startzeit (Farben der Telemetrie) mit Handy-Messwerten abgleichen.
- Verworfen aus dem externen Audit: Drawer-Breite 85 %, Bottom Sheet.

## Plattform
- **Geräteprofile für die veröffentlichte Fassung (Idee des Entwicklers, 09.11.2026):** Voreinstellungen je Handy-Prozessor (Threads, Kontext, Modellvorschlag), entweder zur Auswahl oder automatisch erkannt, damit die KI auf fremden Geräten direkt schnell läuft. Grundlage: `num_thread` hat sich auf dem Pixel 9 Pro als größter Tempohebel gezeigt. Ungeklärt: ob der Browser genug Geräteinfo liefert (Kernzahl über `navigator.hardwareConcurrency`, Chipname eher nicht); Messreihe je Gerät nötig.
- Zweites Gerät als reine Experimentierhardware für lokale Modelle (zunächst ein Pixel mit neuerem Tensor-Chip, später ein gebrauchtes Gerät mit 24 GB RAM und Snapdragon, mit Root oder alternativem System), um 4B bis 12B zu testen. Erfahrungen vom Pixel 9 Pro sollen übertragen werden.
- **Komfort für das spätere Kit (Idee des Entwicklers, 12.11.2026, nicht begonnen):** Für die veröffentlichte Fassung soll der Benutzer maximalen Komfort bekommen, zum Beispiel einen Knopf „Server neu starten“ in der Info-Seite des Dashboards (heute startet „Nach Updates suchen“ den Server nur neu, wenn sich `server.py` geändert hat; sonst Strg+C und `bash start.sh`). Berührt `server.py` (Fundament), braucht einen eigenen Strang. **Reihenfolge und Grund:** Die manuelle Vorgehensweise ist jetzt Absicht. Sie dient dem Entwickler zum Lernen und dazu, in jedem Modul die volle Kontrolle zu behalten, statt alles hinter einem Knopf zu verstecken, bei dem am Ende unklar ist, was er genau startet. Komfortfunktionen kommen deshalb erst nach den Modulen und dürfen die manuellen Wege nicht ersetzen: jeder Knopf zeigt, was er startet (Befehl oder Schritte), und der manuelle Weg bleibt daneben möglich.
- Das Projekt soll auch am PC laufen können (`python server.py --vitals-interval 0`), sobald dort ein Ollama zur Verfügung steht (nicht geprüft).

## Leitplanken (beschlossen)
- Komplett offline, autark („Schweizer Taschenmesser“ ohne Strom und Internet).
- Kleine Modelle bewusst, Antworten nativ Englisch; Deutsch nur per Umschalter.
- Alle Parameter immer manuell regelbar.
- Manuell vor bequem (12.11.2026): Komfortknöpfe erst später für das Kit; sie zeigen, was sie ausführen, und ersetzen nie den manuellen Weg (siehe „Komfort für das spätere Kit“ unter Plattform).
- Das Modell klassifiziert und übersetzt, der Code rechnet.
- Stil: minimalistisch, schwarzer Hintergrund, kräftige Google-Farben.
