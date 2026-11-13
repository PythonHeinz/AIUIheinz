# Konzept Heinz UI 2.0 (Entwurf zum Gegenlesen)

Stand 09.11.2026, Root-Strang „AIUIheinz“; **nachgeführt am 10.11.2026 (zweimal, zuletzt nach dem Design-Strang) : siehe Abschnitt 15** (was gebaut ist, was sich am Konzept geändert hat, was offen ist). Die früheren Abschnitte 1 bis 14 (ursprünglicher Entwurf, stellenweise überholt; die Oberfläche beschreibt `docs/DESIGN.md`) stehen seit dem 12.11.2026 unverändert in `docs/archiv/KONZEPT_v1_entwurf.md`; Verweise auf sie tragen hier den Zusatz „(Archiv)“. Wo der Entwurf Abschnitt 15 ff. widerspricht, gilt Abschnitt 15 ff. Grundlage sind der Code im Repo, die Angaben des Entwicklers und Recherchen vom 09.11.2026 (Quellen im Archiv). Was nicht auf dem Pixel geprüft wurde, ist als „ungeprüft“ markiert.

## 0 Beschlüsse des Entwicklers (09.11.2026)
1. **Modus bringt den Ton mit.** Es gibt keine eigene Persona-Ebene: Ein Modus bündelt Ton, Regler und Regeln. Audit und Code bleiben neutral und streng; ein Wechsel in einen Kreativton soll dort nicht passieren.
2. **Modi im Starterkit:** Wilson (Arzt und Psychologe mit Wissen über Überleben im Busch), Heinz (Allrounder, „mit dem man über alles reden kann“, kann den Kreativmodus mit übernehmen), Audit und Code (kontextbasiert, streng geregelt). Creative bleibt vorerst, entfällt ggf. später.
3. **Speicher:** Einstellungen bleiben im Browser (`localStorage`, Präfix je Tool, gemeinsame Herkunft für alle Tools). Unterhaltungen, Tabellen und sonstige Daten kommen als Dateien in `data/` auf den Server (kein 5-MB-Limit). **Ausnahme: API-Schlüssel bleiben im Browser** und gehen nie in `data/` oder ins Repo.
4. **Werkzeug-Ideen mit Kamera und Dokumenten** (siehe Abschnitt 10a (Archiv)) sind erwünscht, noch nicht entschieden.
5. **LiteRT-LM:** Anbindung über die geplante App und Modellwahl sind noch zu prüfen (Abschnitt 10 (Archiv)).

## 15 Stand 10.11.2026: Version 1.0 und danach
Nachgeführt im Root-Strang aus `docs/agent/ENTWICKLUNGSVERLAUF.md`, `docs/agent/STAND.md`, `docs/GEPLANT.md`, `docs/DESIGN.md` und dem Code, zuletzt nach dem Design-Strang (Commit `a86ff2e`); Stand des Release Candidate siehe Abschnitt 17 (Commit `036ff46`). Alles, was nur „gebaut“ heißt, lief in simulierten Tests (20 Server-, 56 Seitentests grün, selbst gelaufen am 10.11.2026); auf dem Pixel bestätigt ist nur, was ausdrücklich „Handy“ heißt. Die Design-Umbauten (neuer Dashboard, neuer Hub) sind noch nicht auf dem Handy gesehen.

### 15.1 Was es jetzt gibt
- **Design-Fundament** (Strang „AIUIheinz-Design“, Manifest `docs/DESIGN.md`): `lib/core.css` mit Themes Hell, Dunkel und Auto (`data-theme`, Schlüssel `heinz_settings.theme`) und Bausteinen (`.pill .round .ibtn .ring-btn .lang-btn .sw .row .tile .sheet .scrim .slidercard`), `lib/icons.svg` (47 eigene Linien-Symbole, kein Emoji mehr in der Oberfläche), `lib/core.js` (Theme, `Heinz.icon()`), `lib/pixel.js` (LED-Matrix-Display mit Laufschrift, Lampen, Balken). Beispielkatalog `tools/design/index.html` (ohne `tool.json`, nicht im Hub).
- **Hub** (`index.html`): Kopfzeile mit Statusring, Theme-Knopf und EN/DE; kein Pixeldisplay mehr (nach dem Handytest zurückgebaut, siehe 17); zwei Reiter **Chats & Modelle** und **Tools**; „Chats & Modelle“ als Liste mit Symbolen (Dashboard unter dem Markennamen „Heinz UI“, Modelle, darunter „Alte Versionen“), „Tools“ als App-Drawer mit Kacheln (3 je Reihe, `appicon` möglich); Slogan in Georgia kursiv, Fußzeile „Offline first“. Zuordnung über `tool.json` (`area`: `chat` | `tools`, `symbol`, `appicon`); Wahl in `heinz_hub.area`. Installierbar als App (Handy bestätigt für die erste Fassung).
- **Dashboard** (`dashboard.html`; Oberfläche seither mehrfach umgebaut, heutiger Stand in Abschnitt 17): Kopfzeile mit Statusring (rot, orange, blau, grün) und zweizeiligem Modellchip (Engine/Modell), EN/DE bleibt sichtbar; Modusleiste mit Symbolen und Modusfarbe als einziger Akzent; Unterhaltungsleiste (Unterhaltungsliste je Modus mit Zähler, Titel, ganze Unterhaltung kopieren, neue Unterhaltung); Antworten ohne Kasten in Georgia; Metrik-Chips in einer Zeile; wachsendes Prompt-Feld mit Vollbild-Editor, Mikrofon und Senden; Kontextkarte unter dem Prompt; Menü als Bottom-Sheet (Schnellschalter, Gruppen, Unterseiten Engine, Parameter, Tempo-Test, Darstellung, Update und Info); eigenes Modell-Sheet. Dahinter unverändert: Unterhaltungen je Modus, Parameter und `num_thread`, Tempo-Test mit Übernahme der besten Threads, Vorladen, `keep_alive`, Schnellmodus, nur ein Modell im Speicher, Haken „Eigenen Systemprompt nutzen“. „Online erlauben“ ändert Menü und Chip (Gruppe „Online“, Chip „… · ONLINE“ in Orange).
- **Anbieterschicht** `lib/providers.js`: Ollama, LiteRT-LM (Backend CPU/GPU über das Modellfeld), OpenRouter, Groq, Mistral, Custom; „Online erlauben“ aus = kein externer Aufruf (Test). Gemini und Claude fehlen. LiteRT-LM aus der Seite ist auf dem Handy nicht probiert.
- **Server** (`server.py`): `/api/tools` (reicht `area`, `symbol`, `appicon` durch), `POST /api/update` (`git pull --ff-only`, Selbstneustart bei Änderung von `server.py`), `/api/ping` mit Version. **Version 1.0** (`VERSION.txt`), Update-Pille im Chatmenü (Handy bestätigt: Update ohne PC).
- **Seiten „Modelle“ und „Filter“** sind weiterhin Platzhalter, Sheet, Lab und Vitals unverändert im alten Stil (Lab und Vitals unter „Alte Versionen“).
- **Doku:** `docs/DESIGN.md` (Entscheidungen des Entwicklers zu Bereichen, Themes, Schriften, Online-Verhalten), `docs/MODELLQUELLEN.md`, `docs/GEPLANT.md`.

### 15.2 Abweichungen vom Entwurf
- Der Hub bleibt `index.html` im Wurzelordner, nicht `hub/`; Tool-Seiten liegen über `tool.json` (`entry`) weiter im Wurzelordner, bis ein Strang sie verschiebt.
- Modi und Personas stehen als Daten im Code von `dashboard.html`, nicht in `data/personas.json`.
- Anbieter stehen in `lib/providers.js`, nicht in einer Datei `providers.json`; Gemini kam nicht „zuerst“, sondern OpenAI-kompatible Anbieter und LiteRT-LM.
- Seite „Modelle“ ist (noch) kein Manager: Modellwahl, Tempotest und Threads gehören nach Beschluss des Entwicklers in Bereich A (15.3), nicht in eine eigene Seite.
- Die Oberfläche folgt `docs/DESIGN.md`, nicht mehr dem schwarzen Einheitsstil aus Abschnitt 1 (Archiv) und den Google-Farben: Themes Hell, Dunkel, Auto; eigener Symbolsatz statt Emoji; Georgia für Antworten; wenige Linien. Das Ziel „schwarzer Hintergrund“ gilt für das Dunkel-Theme.
- Die untere Leiste mit rundem Mittelknopf aus dem ersten Manifest ist nicht gebaut; Navigation läuft über die Hub-Reiter und das Bottom-Sheet-Menü.
- Abschnitt 4 (Archiv) („Bedienkonzept Chat“) und Abschnitt 3 (Archiv) (Tool-Tabelle) beschreiben eine einzige Seite (das Dashboard) und die Zuordnung der Tools vor den drei Bereichen. Sie werden durch 15.3 ersetzt.

### 15.3 Drei Bereiche (Richtung des Entwicklers, 10.11.2026; Namen und Zuschnitt offen)
Aus `docs/GEPLANT.md` (dort „zwei Bereiche“, überholt) und `docs/DESIGN.md` Abschnitt 5 („drei Bereiche mit teils eigenen Menüs plus gemeinsame Rubrik ‚Einstellungen‘“). Der Entwickler hat die drei Bereiche gesetzt; Zuordnung und Namen der ersten beiden sind noch nicht festgelegt, der folgende Zuschnitt ist meine Ableitung aus Repo und Beschlüssen.
- **Bereich A, Ausprobieren und Modelle** (Arbeitsname „Research“ oder „Model Manager“): Testfeld für lokale Modelle mit Modi, Parametern, Tempotest und Threads, dazu Erstinstallation, Installation und Verwaltung von Modellen (Ollama), Cloud-Anbieter, LiteRT-LM. Zweck: Auf dem eigenen Handy herausfinden, welches Modell und welche Prozessoreinstellung passt. Unterhaltungen werden **je Modus** gespeichert (gleicher Prompt, mehrere Modelle vergleichbar); die Unterhaltung soll ihr Startmodell zeigen, Modellwechsel mitten in der Unterhaltung an der Antwort vermerken (Vorschlag).
- **Bereich B, Heinz Chat** („Heinz UI“ als Markenname): Oberfläche wie Claude oder Gemini, maximale Fläche für die Unterhaltung, wachsende Eingabezeile, Menüs von links (Unterhaltungen) und rechts (wesentliche Einstellungen), keine Temperatur und keine Testläufe. Das Menü „Einstellungen“ gilt in allen Bereichen gleich.
- **Bereich C, Tools** (Widgets, Rechner, Converter, alles, was von KI profitiert; im Hub als App-Drawer): Sheet, Filter, später convert2, Kamera- und Dokumentwerkzeuge (Abschnitt 10a (Archiv)) und Tools anderer Projekte wie INCIheinz (`appicon`). Welche Tools ohne „Online erlauben“ grau werden, ist offen.
- **Im Hub** gibt es derzeit zwei Reiter: **Chats & Modelle** (A und B, Dashboard „Heinz UI“, Modelle, Alte Versionen) und **Tools** (C). Die heutige `dashboard.html` vereint A und B **mit Absicht**: Wer mit der App lokale und Cloud-Modelle ausprobiert, will im Gespräch Modell und Parameter ändern, ohne die Seite zu wechseln. Die Testfunktionen liegen im Menü „Einstellungen“ (Bottom-Sheet), das Dashboard selbst hat Modusleiste und viel Platz. Eine Trennung ist deshalb **keine Pflicht**.
- **Heinz Chat im Hub (am 10.11.2026 entschieden, siehe 18.1; ältere Fassung dieses Punktes):** Eine Möglichkeit wäre ein zusätzlicher Eintrag im Hub mit einer schlanken Seite ohne Parameter und Testwerkzeuge. Er war gedacht, als die Testfunktionen noch nicht im Menü lagen. Gelingt der vorhandene Dashboard so aufgeräumt wie die Oberflächen der großen Anbieter, entfällt der Zusatzeintrag. Der Design-Strang entscheidet das, mit dem Entwickler.
- **Wozu das Testfeld dient:** Der Entwickler will Modelle aus dem Netz herunterladen, in Ollama installieren oder über eine Cloud-Schnittstelle anbinden, vergleichen und herausfinden, was sich für eigene Anwendungen eignet. Dabei lernt er, wie Schnittstellen und lokale Modelle arbeiten, was für Apps zählt, die früher nur aus Tabellen bestanden und mit Wissen in Tabellenform und Taxonomien erst richtig leistungsfähig werden.
- **Testfeld für andere Tools:** `lib/providers.js` ist ein gemeinsamer Baustein, damit zum Beispiel convert2 Fragen an ein lokales oder Cloud-Modell auslagern kann.
- **Online:** Mit „Online erlauben“ erscheinen zusätzliche Menügruppen und ein Chip „· ONLINE“; ohne den Haken kein Online-Eintrag und keine Anfrage nach außen. Welche Modi und Werkzeuge online zusätzlich erscheinen, ist offen.

### 15.4 Befunde seit Abschnitt 14 (Archiv; Handy, Einzelmessungen)
- **Tempo:** `num_thread` ist der größte Hebel; der Ollama-Standard (8) ist am langsamsten (Hintergrund bis 0,2–0,3 Token/s). Je nach Modell sind 2 bis 4 Threads am besten (2 Threads am stabilsten, 3 und 4 Messreihen teils gegenläufig); deshalb der Tempo-Test mit Übernahme der besten Werte. Termux im Vordergrund (Splitscreen) hilft zusätzlich. Daten: `docs/OLLAMA_UND_MODELLE.md`.
- **Erste Antwort lang:** Ursache sind Laden (4–14 s) und die Verarbeitung des Modelfile-Prompts von `heinz-fakt` (rund 340 Token, 12–20 s). Gegenmaßnahmen gebaut: konstanter Systemprompt, Vorladen, `keep_alive`. Wirkung auf dem Handy offen.
- **Absturz beim Moduswechsel (Handy):** Mit Vorladen und 30 Minuten `keep_alive` blieben mehrere Modelle im Speicher; Android beendete Termux. Gegenmaßnahme: nur ein Modell im Speicher, dazu `OLLAMA_MAX_LOADED_MODELS=1` empfohlen. Die Zahl 1 gilt als wahrscheinlich, nicht bewiesen.
- **Systemprompt:** Eine Systemnachricht der Seite ersetzt den `SYSTEM` des Modelfiles (mit `curl` gezeigt); mit dem Haken „Eigenen Systemprompt nutzen“ antwortet `heinz-fakt` mit „Digger, …“ (Handy).
- **Audit-Modus:** Der Kontext im Nutzertext (statt im Systemprompt) führte bei `qwen2.5:3b` zu „Information not in context“; Pflicht-Kontext-Modi bekamen den Kontext zurück in den Systemprompt. Das kostet Zwischenspeicher-Treffer; Abwägung offen.
- **Ablehnung:** Das abliterierte Qwen lehnte die Testfrage fast so fest ab wie das normale (Einzelstichprobe); Vergleichstest mit Zählung steht aus.

### 15.5 Strangstand
| Strang | Stand |
|---|---|
| Grundgerüst | fertig |
| Strang „AIUIheinz-Chat“ | Logik, Anbieterschicht, Planung der Bereiche gepusht; Oberfläche inzwischen vom Design-Strang umgebaut |
| Design („AIUIheinz-Design“) | Fundament, Beispielseite, Hub und Oberfläche des Dashboards gepusht; offen: Handytest, Zuschnitt der Bereiche, Lesemodus in warmer Serife, Werkzeuge mit Online-Sperre, Sprache im Menü „Einstellungen“, Inter lokal |
| Modelle („AIUIheinz-Modelle“) | Recherche fertig, Bau nach dem Fundament |
| Filter, Sheet | offen, Edge-Modelle erst erproben; beide im alten Stil |
| Stabilität (Root) | Entwickleroption gesetzt, Dauertest und Signal-9-Auswertung offen |

### 15.6 Offen (Entscheidungen und Tests)
1. **Drei Bereiche:** Namen und Zuschnitt (A Ausprobieren und Modelle, B Heinz Chat, C Tools), ob ein zusätzlicher Heinz Chat im Hub nötig ist oder die heutige `dashboard.html` (2375 Zeilen, A und B bewusst in einem) aufgeräumt genug wird, Zuordnung von Modelle, Sheet, Filter, Lab und Vitals zu den Reitern im Hub. Entscheiden Entwickler und Design-Strang gemeinsam.
2. **LiteRT-LM auf dem Handy:** Serve starten, Modellliste, Antwort, GPU über das Modellfeld, wirken Systemnachricht und Parameter? Tempo-Test dafür fehlt (er läuft nur mit Ollama).
3. **Zwei Systemprompt-Wege** (Seite ersetzt Modelfile oder Modelfile bleibt): welcher Standard je Modus? Spielt in die Persona-Frage (Abschnitt 5 (Archiv)) hinein.
4. **Modelle verwalten** (Installieren, Löschen, Aliase) im Bereich A, mit der Quellenliste aus `docs/MODELLQUELLEN.md`; „Funktionsplätze“ (Chat, Sheet, Filter, Prüfung, Bild, Sprache) und Datenschutzfeld je Anbieter brauchen den Beschluss des Entwicklers.
5. **Geräteprofile** (Threads, Kontext, Modellvorschlag je Prozessor) für eine veröffentlichte Fassung, `docs/GEPLANT.md`.
6. **Gehostete Fassung** (GitHub Pages) bleibt Option für später: relative Pfade, Ersatz für `data/`, CORS für Ollama und LiteRT-LM (Abschnitt 14 (Archiv)). Der Update-Knopf deckt den Alltag ab.
7. **Signal 9:** Dauertest mit Vitals und `litert-lm serve`; Speicherfrage (ein Modell, Kontextgröße) weiter beobachten.
8. **Handytest der Design-Umbauten:** neuer Hub und neuer Dashboard (Eingabe mit Tastatur, Mikrofon, Vorlesen, Unterhaltungsliste (Drawer), Splitscreen, Themes, Pixeldisplay); Tests sind nur simuliert.
9. **Tools im Hub:** Werkzeuge mit Online-Sperre (grau ohne Haken), Sheet und Filter ins neue Design, Lesemodus in warmer Serife, `appicon` für Tools anderer Projekte.
10. **Kamera und Dokumente** (Abschnitt 10a (Archiv)), **Refusal-Vergleich** (15.4) und **Sheet mit echtem 3B-Modell** auf der Rohstoffliste.

## 16 Leitbild: Werkzeuge, bei denen KI die Bedienung leichter macht
Gespräch mit dem Entwickler am 10.11.2026. Das ändert noch nichts an der Reihenfolge der Umsetzung, gehört aber zum Konzept: Für den Bereich Tools (15.3, C) wird gezielt nach Anwendungen gesucht, bei denen der Einsatz von KI die Benutzerfreundlichkeit sprunghaft erhöht, am liebsten komplett offline.

**Das Muster aus der Erfahrung des Entwicklers (Beispiel INCIheinz, Lager- und Rezeptbuch-Tool):** Ohne KI und Texterkennung müsste der Nutzer alle Artikeldaten selbst eintippen oder Texte mühsam zuschneiden und die richtigen Wörter herauskopieren. Mit KI beim Einlesen ist das für ihn ein Wendepunkt: Ein fotografierter Notizzettel ergibt ein Rezept mit Zutatenliste und modular aufgebauten Phasen und Herstellungsschritten, die sich danach mit verschiedenen Formatierungsregeln für Satz und Layout ausgeben lassen. Seine Erfahrung: Ehemalige Tabellen-Apps profitieren stark von KI, und das meiste davon geht offline.

**Ein guter Kandidat für Bereich C hat meist diese Merkmale** (abgeleitet aus dem Beispiel und der Projektbeschreibung, noch nicht abgestimmt):
- Die Eingabe von Hand ist mühsam: Fotos, Notizen, kopierte Webseiten, Rechnungen, Tabellen, die beim Einfügen nur als Müll ankommen.
- Die Ausgabe ist strukturiert und lässt sich prüfen (Tabelle, Liste, Rezeptmodule, Schema), das Modell übersetzt oder klassifiziert, der Code rechnet und prüft (Beschluss aus Abschnitt 1 (Archiv)).
- Kleine lokale Modelle reichen, oder nur ein kleines Datenpaket geht bei „Online erlauben“ an die Cloud, nie die ganze Datenbank oder alle Unterhaltungen.
- Das Ergebnis lässt sich exportieren (Zwischenablage, Tabelle, Text- und Layoutformate).
- Ein Mensch kontrolliert das Ergebnis, bevor es gespeichert wird.

**Kandidaten, die schon im Konzept stehen oder genannt wurden** (keine Reihenfolge, keine Zusage): Sheet (Tabelle ansprechen), Filter (Listen und Texte nach Regel bewerten), convert2 (Markdown und andere Formate, Aufbereitung von Texten), Kamera und Dokumente (Abschnitt 10a (Archiv): Rezept, Rechnung, Brief fotografieren und auswerten), Einlesen und Auswerten von Texten mit lokalem Wissen (Wikipedia offline). INCIheinz ist dabei ein Beispiel für ein Tool eines anderen Projekts, das im Hub als Kachel erscheinen kann (`appicon`).

**Offen:** Welche Kandidaten zuerst; welches Modell dafür reicht (Edge-Modelle, Texterkennung offline); wie ein Werkzeug sagt, dass es online geht und was dabei verlassen wird (Online-Sperre, Abschnitt 15.6, Punkt 9). Die Modellsuche im Bereich A dient auch dazu, solche Fragen zu beantworten.

## 17 Release Candidate: Stand 10.11.2026, 16:25 (Commit `036ff46`)
Festgehalten im Root-Strang nach Pull und Durchsicht von Code, `docs/agent/ENTWICKLUNGSVERLAUF.md`, `docs/DESIGN.md`, `docs/ANALYSE_MENUE.md` und vier Handy-Screenshots des Entwicklers (Tempo-Test, Einstellungen, Dashboard). Version `VERSION.txt` bleibt 1.0. Tests: 20 Server- und 56 Seitentests grün (selbst gelaufen, simuliert). Das Aussehen ist nach Handytest des Entwicklers vom Designer bis 16:15 nachgezogen; der letzte Kosmetik-Commit ist laut Verlauf nicht auf dem Gerät getestet.

### 17.1 Aufbau
- **Hub** (`index.html`): dezente Startseite ohne Pixeldisplay und ohne Modusfarbe, neutraler Ring, zwei Reiter Chats & Modelle / Tools, Fußzeile „Offline first“. Pixeldisplays gibt es nur im Dashboard.
- **Dashboard „Heinz UI“** (`dashboard.html`, 2375 Zeilen): Kopfzeile mit Ring-Button, **Laufdisplay** (Engine blau, Modell gelb, 5×7-LED-Schrift), grauem EN/DE-Schalter und Menü-Taste; darunter Statuszeile (LED-Punkt in Statusfarbe, Klartext) und **Equalizer-Pille** (Antwort = grüner Pegel, Warten = orangefarbener Balken, Laden = blaue Wählpunkte, Fehler/offline = rot); Modusleiste (Wilson türkis, Heinz rosa, Audit gelb, Code, Creative); Unterhaltungszeile mit Outline in Modusfarbe (Label CHAT, umbenennbarer Titel, Kopieren, neue Unterhaltung, Unterhaltungsliste von links mit Pins bis 5, Umbenennen, Kopieren, Exportieren, Löschen); Antworten in Georgia mit Aktionsleiste (Kopieren, Teilen, .md, Vorlesen); Prompt wächst mehrzeilig, Stopp ersetzt den Sendeknopf während der Antwort; Kontextfeld darunter.
- **Einstellungen** als Panel von rechts (zwei Drittel der Breite, Tippen daneben schließt): Reload-Kreis, große Pillen **Engine** (blau) und **Modell** (gelb); abgesetztes Parameterfenster (Standardwerte-Schalter, Regler Temp, Top-P, Top-K, Kontext, Threads, Zurück, Speichern, Werte kopieren; „geändert“-Punkt); Eigener Systemprompt, Schnellmodus, Max. Antwort-Token; Leistung (Modell vorladen, Tempo-Test), Verbindung, Datenschutz (Online erlauben), App (Darstellung, Update und Info). Gesperrte Online-Engines erscheinen mit Schloss. Threads werden je Modell automatisch gespeichert; weitere Werte je Modell über „Speichern“ (`settings.modelParams`).
- **Farblogik** (festgelegt): Modusfarbe nur an Linien, Pillen und Sendeknopf; Status nur über Signalfarben: Rot = fehlende Verbindung oder Online gesperrt, Orange = Modell fehlt oder lädt, Blau = bereit und denkt, Grün = antwortet.
- **Antwortsprache** strikt wie der Sprachschalter (Systemprompt „strikt Englisch/Deutsch, auch bei fremdsprachiger Eingabe“); ein Sprachwechsel lädt das Modell wegen des geänderten Prompts neu (bewusst).
- **Cloud:** `lib/providers.js` meldet `finishReason` und `reasoningTokens`; bei Abbruch durch die Token-Grenze (Denk-Modelle) steht ein Hinweis unter der Antwort; Modellliste: nur der jüngste Abruf zählt. Ursache der kurzen Gemini-Antworten ist wahrscheinlich, aber nicht auf dem Gerät belegt (Denk-Token zählen zum Limit, Schnellmodus 150).

### 17.2 Messung vom Handy (Tempo-Test, Screenshot 10.11.2026 16:22)
`qwen2.5:3b`, Ollama, Termux im Hintergrund, kurzer Prompt (~20 Token), 32 Token Ausgabe, Temperatur 0, mit Entladen vorweg. Gen = Token/s, Lauf 1 = nach Laden, Lauf 2 = warm.

| Threads | Laden Lauf 1 | Gen Lauf 1 | Gen Lauf 2 | Gesamt Lauf 2 |
|---|---|---|---|---|
| 2 | 8,1 s | 8,3 | 8,9 | 7,0 s |
| 3 | 9,9 s | 7,0 | 3,6 | 12,1 s |
| 4 | 9,2 s | 4,5 | 1,5 | 25,4 s |
| 8 | 14,4 s | 0,3 | 0,3 | 106,5 s |

Der Test empfiehlt 2 Threads (8,9 Token/s). Das bestätigt 15.4: Mit Termux im Hintergrund fällt die Leistung mit mehr Threads, 8 Threads sind unbrauchbar. Einzelmessung eines Modells; die Werte schwanken zwischen Läufen. Im Einstellungsfenster stand zugleich der Regler auf 5 Threads (vor der Übernahme der Testempfehlung) und Kontext 14336: beides Werte, die auf diesem Gerät wohl schlechter sind als der Test-Vorschlag. Offen: Soll die Seite beim ersten Start des Tempo-Tests die Empfehlung gleich als Standard je Modell setzen, und ist 14336 als Kontextvorgabe für 3B-Modelle sinnvoll (Speicher, Signal 9)?

### 17.3 Entschieden seit der Konzeptphase (aus Verlauf und Design-Manifest)
- Drei Bereiche bleiben die Richtung, der Hub zeigt zwei Reiter; A und B sind in `dashboard.html` mit Absicht vereint (15.3). Der Menübaum aus `docs/ANALYSE_MENUE.md` Abschnitt 7 ist weitgehend umgesetzt (Panel, Schnellbereich, Engine vor Modell, Online-Sperre sichtbar), mit zwei Abweichungen: Verwaltung der Unterhaltungen nur über die Unterhaltungsliste, nicht mehr im Menü; Wirkungsmarken „Dieser Chat / Dieses Modell / Überall“ nur teilweise.
- Pixeldisplays nur im Kopf des Dashboards; Hub, Tempo-Test und Update-Seite ohne (Update-Seite hat eine kleine LED-Zeile).
- Modelle mit eigenen Parametern speichern ist gebaut; Eigene Prompt-Bibliothek, App-Sicherung und Auswahl „Flash/Pro“ stehen als geplant, nicht gebaut.

### 17.4 Offen für die nächste Konzeptphase
1. **Handytest des Release Candidate** (Panel, Stopp, Pins, Equalizer, Update, Schlüsselfeld ohne Passwort-Manager, `max-height` statt `100dvh`, Sprachwechsel mit Modellneuladung). Bisher nur Playwright mit simuliertem Server.
2. **Cloud:** Abbruchhinweis und Modellliste mit echtem Google AI Studio prüfen; Gemini 3 mit Temperatur 1.0 („Standardwerte“).
3. **LiteRT-LM** aus der Seite, Tempo-Test dafür fehlt.
4. **Modelle verwalten** (Strang Modelle), **Tools** im neuen Design (Sheet, Filter, Lab, Vitals noch alter Stil), **Leitbild KI-Werkzeuge** (Abschnitt 16).
5. **Größe von `dashboard.html`** (2375 Zeilen in einer Datei): Wartbarkeit im Blick behalten; Aufteilen in `lib/`-Module wäre Fundamentarbeit und braucht Beschluss.
6. Heinz Chat im Hub und Zuschnitt der Bereiche (15.6, Punkt 1), Signal 9, gehostete Fassung, Geräteprofile unverändert.

## Planung (Stand 2026-11-10, Strang AIUIheinz-Design)
Reihenfolge: (1) Korrekturen, (2) Modellwerte „Modell-Standard / Meine Werte“ (gebaut), (3) App-Sicherung unter App → Info/Sicherung/Update, (4) Prompt-Verwaltung viel später.
- **Prompt-Verwaltung** (Reiter „Prompts“ im Parameter-Fenster, bisher Platzhalter): benannte Systemprompts, Auswahl je Modus/Unterhaltung, Schnellwahl, Modellprofile, Export/Import.
- **App-Sprache** (nur Oberfläche und Vorlesen, unabhängig von der Antwortsprache): zusätzliche Sprache neben EN/DE im Menü Einstellungen; Englisch bleibt Rückfall. Der Sprachschalter oben könnte später diese Sprache tragen.
- **App-Sicherung**: Unterhaltungen, Einstellungen, Modellwerte exportieren/importieren; Schlüssel nur auf ausdrücklichen Wunsch.

### Änderungswünsche aus dem Test vom 10.11.2026, 19:00 (noch nicht umgesetzt, warten auf Beschluss zu den Parametern)
1. Unterhaltungsliste: Öffnet man die Aktionszeile (Symbole) beim letzten Eintrag, muss die Liste mitscrollen, damit nichts abgeschnitten wird.
2. Unterhaltungsliste, Reiter „Alle“: Gesamtzahl aller Unterhaltungen anzeigen (in der Unterhaltungsleiste steht nur die Zahl des Modus).
3. Parameter: drei Quellen sauber trennen (Modell-Standard aus dem Modell, Modus-Vorgabe, eigene Werte), Reset/Speichern eindeutig (siehe Beschluss).
4. Reset-Knopf in Auszeichnungsfarbe, wenn bedienbar, sonst grau (zuerst erledigen).
5. Logo „HEINZ UI“: echte serifenlose Schrift mit gleichmäßiger Strichstärke und „I“ als Strich (statt gezeichneter Pfade); Zentrierung per Textmessung.
6. Equalizer antippbar: kleines graues Fenster mit den letzten drei Statusschritten in Kurzform und Statusfarbe (z. B. Server gestartet, Modell wird bereitgestellt, Modell im RAM).
7. Mehrere eigene OpenAI-kompatible Engines mit je Server und Schlüssel (Muss).

## 18 Konzeptphase 2 (10.11.2026, nach dem Design-Review 1)
Stand: Die Oberfläche ist lauffähig und bereinigt (Commit `3d13228`, 67 Seiten- und 20 Servertests simuliert grün). Der Entwickler hat Google AI Studio mit eigenem Schlüssel über das Menü Engine angebunden: Modellliste korrekt, viele Gemini-Modelle wählbar, schnell, Kosten im Gespräch sehr gering. Daraus und aus dem Test folgt die weitere Richtung.

### 18.1 Zwei Einträge im Hub statt einem
- **Heinz UI (Testumgebung):** die heutige `dashboard.html` mit Modi, Parametern, Tempo-Test, Engine-Verwaltung und Sicherung. Zweck: Modelle ausprobieren und prüfen, weil Nutzer in **eigenen Tools und Apps** lokale und Cloud-KI einsetzen wollen, um Formate und Eingaben zu verarbeiten und das Ergebnis an den Rechner zurückzugeben. Die Testwerte (Modell, Parameter, Prompt, Messwerte) sollen sich exportieren lassen. Die Schnittstellenkenntnis dafür fehlt noch (18.2).
- **Neuer Hub-Eintrag: Heinz Chat** (damals Arbeitsname „schlanker Chat“; der Markenname „Heinz UI“ aus 15.3 gehört jetzt der Testumgebung): größtmögliche Textfläche mit schöner Typografie, nur ein kleines Einstellungsmenü zur **Modellwahl**, keine Parameter und Testwerkzeuge. Es soll sich nicht wie eine selbstgebastelte App anfühlen. Im Hintergrund werden Modelle gewechselt „wie die Unterhosen“: Wahl und Wechsel zwischen lokalen und Cloud-Modellen einfach, ohne Technik zu zeigen. Er nutzt dieselbe Anbieterschicht (`lib/providers.js`) und dieselben Engine-Einträge wie die Testumgebung. Offen: Namen beider Einträge; welche Modelle und Engines im Heinz Chat wählbar sind (nur freigegebene? Standardmodell je Engine); ob Unterhaltungen geteilt oder getrennt liegen; die Online-Sperre muss sichtbar bleiben, Schlüsseldialoge nicht. Zuständig: Design-Strang oder neuer Strang, nach der Modellmanager-Phase 1.
- Hub-Reiter heute: Chats & Modelle, Tools. Mit dem neuen Eintrag stehen unter „Chats & Modelle“ zwei Unterhaltungseinträge (Heinz Chat, Testumgebung) und die Alten Versionen; A, B, C aus 15.3 bleibt als Denkmodell.

### 18.2 Schnittstellenkenntnis (Strang Modellmanager)
- **Befund:** Die Oberfläche zeigt für alle Engines dieselben Regler. Wirksam sind die meisten nur bei Ollama; an OpenAI-kompatible Anbieter gehen derzeit nur Temperatur, `top_p`, `max_tokens` und Stoppsequenzen (`lib/providers.js`). Es gibt keine Information, welche Parameter ein Anbieter oder Modell annimmt, ignoriert oder ablehnt, und die Modellliste wird nicht auf Metadaten ausgewertet.
- **Auftrag:** `docs/agent/AUFTRAG_Modelle.md` (Phase 1 Recherche und Fähigkeitenübersicht `docs/SCHNITTSTELLEN.md`, Sonde auf dem Handy; Phase 2 Daten in der App, mehrere eigene Engines, Modelle in Ollama installieren). Der Strang „AIUIheinz-Modi“ nutzt das Ergebnis für den Denkaufwand bei Cloud-Modellen.
- **Ziel für die Oberfläche:** Im Parameterfenster zeigt jeder Regler, ob er für das gewählte Modell wirkt, ignoriert wird oder nur lokal gilt; der Export enthält diese Angabe.
- **Kosten:** Der Entwickler sieht in Google AI Studio kaum Kosten. Eine Kostenanzeige je Antwort (Token mal Preis aus der Modelldatenbank) wäre eine spätere Idee, nicht beschlossen.

### 18.3 Einrichtungsassistent (zu dimensionieren, noch kein Strang gestartet)
Ziel: Ein neuer Nutzer kommt ohne Vorwissen vom frischen Handy bis zum ersten Gespräch mit einem lokalen Modell. Das Konzept enthält bisher nur den kleinen Assistenten aus Abschnitt 6 (Archiv) (prüft Ollama und fehlende Modelle). Hier die erste Grobplanung; **was automatisch geht und was nur Textanleitung bleibt, ist offen und die erste Aufgabe des Assistenten-Strangs.**

| Schritt | Inhalt | Automatisierbar? (Annahme, zu prüfen) |
|---|---|---|
| 1 | F-Droid installieren (APK laden, „Unbekannte Apps“ erlauben) | nein, Textanleitung mit Bildern |
| 2 | Termux aus F-Droid installieren (nicht aus dem Play Store) | nein, Anleitung |
| 3 | In Termux Pakete installieren, Repo klonen, Server starten | **ein kopierbarer Befehl** („Bootstrap-Zeile“: `pkg install git python`, `git clone`, `bash start.sh`); Einfügen durch den Nutzer, Ausführung automatisch |
| 4 | Ollama installieren und starten, Skripte und Datenordner anlegen | ja per Skript, sobald Schritt 3 lief (`start.sh` startet Ollama schon) |
| 5 | Android-Einstellungen: Akku „Nicht eingeschränkt“, Phantom-Prozess-Beschränkung, Termux sichtbar halten (Tempo, siehe 15.4) | nein, Textanleitung; die App kann prüfen und warnen (zum Beispiel über den Tempo-Test) |
| 6 | Modell wählen und installieren: Suche in der Ollama-Bibliothek und auf Hugging Face (`hf.co/<nutzer>/<repo>`), Größe gegen freien Speicher und RAM prüfen, `POST /api/pull` mit Fortschritt | halbautomatisch: der Server zieht, der Nutzer wählt und bestätigt; die Suche braucht „Online erlauben“ |
| 7 | Erstes Gespräch und Tempo-Test (Threads) | ja, vorhanden |

Offene Fragen:
- **Henne und Ei:** Bevor der Server läuft, gibt es keine App auf dem Handy. Die Anleitung muss außerhalb liegen (README, gehostete Seite wie GitHub Pages, Abschnitt 14 (Archiv)). Ob eine gehostete Seite später den lokalen Server und Ollama erreicht (Browser-Regeln für `localhost`, CORS, `OLLAMA_ORIGINS`), ist ungeklärt.
- Wie viel kann der Python-Server als Termux-Prozess selbst ausführen (Pakete installieren, Umgebung setzen), ohne Rechte zu brauchen, die er nicht hat?
- Sicherheit: Ein „Befehl zum Einfügen“ verlangt Vertrauen; Befehl und Quelle offen zeigen, nichts mit `curl | sh` verstecken.
- Zielgruppe und Umfang: der Weg des Entwicklers (Pixel 9 Pro) oder jedes Android-Gerät; Geräteprofile (15.6, Punkt 5) spielen hinein.
- Reihenfolge: zuerst Dimensionierung mit Probelauf auf einem frischen Termux (Zweitgerät oder Neuinstallation), dann Text, dann Automatisierung.

Vorschlag: eigener Strang „AIUIheinz-Assistent“, erste Aufgabe nur Dimensionierung (Tabelle prüfen, Probelauf, Ergebnisbericht), noch kein Code. Für Schritt 6 greift er auf den Modellmanager zu.

### 18.4 Offen in dieser Phase
1. Namen der Hub-Einträge (Testumgebung, Heinz Chat) und Zuständigkeit für den Heinz Chat.
2. Reihenfolge der Stränge: Modellmanager Phase 1 (nur Doku) kann sofort laufen; Modi und Modellmanager Phase 2 berühren beide `lib/providers.js` und laufen nacheinander.
3. Handytest des Release Candidate und der Cloud-Anbindung (Abbruchhinweis, Modellliste, Gemini-Parameter) bleibt Voraussetzung für Aussagen „auf dem Gerät“.

## 19 Schnittstellenwissen, Denken, Wissensquellen (10.11.2026 nachts, Strang Modelle, Entscheidungen des Entwicklers)
Grundlage: `docs/SCHNITTSTELLEN.md` (Fähigkeiten von Google AI Studio und LiteRT-LM, Sonden-Konzept) und `lib/capabilities.json` (Daten). Vorschlag und Rückfragen der Recherche sind vom Entwickler beantwortet; dies ist der Beschluss, noch nichts davon gebaut außer den Daten.

### 19.1 Fähigkeiten als Daten, Regler nach Schnittstelle
- Das Dashboard bleibt mit seinen Parameternamen kompatibel zu allen Engines. Was die Schnittstelle des gewählten Modells zulässt, ist **regelbar**; was sie ablehnt oder nicht hat, ist **ausgegraut** (mit Grund). Was nicht geklärt ist (`unknown`), bleibt **regelbar und wird als „ungeklärt“ gekennzeichnet**, damit es sich ausprobieren lässt; die Ergebnisse tragen wir in `docs/SCHNITTSTELLEN.md` und dann in die Daten ein.
- Erkenntnisse über ein Modell werden als **Vorgabe je Modell in der App hinterlegt**, auch wenn die Modellliste sie nicht liefert (Beispiel Gemini 3: Temperatur 1,0 empfohlen, Penalties gesperrt, Denken nicht abschaltbar). Erkennung über Engine plus Modellnamen-Muster, ergänzt durch Felder der Modellliste, wo es sie gibt (Google nativ: `thinking`, `maxTemperature`, Token-Grenzen).
- Die Daten stehen in `lib/capabilities.json` (Zustände `on`, `unknown`, `off`, `error`, `fixed`, `config`; Status `belegt`, `drittquelle`, `code`, `vermutet`, `unbekannt`). Sie wachsen mit jedem recherchierten Anbieter und jeder Sondenmessung; sie sind **Daten**, nicht Seitenlogik.

### 19.2 Denken: ein Schalter „Schnell | Tief“
- Für Cloud-Modelle mit Denkoption steht in der Unterhaltungszeile ein Schalter Schnell | Tief (wie bei den großen Modellen). Pro Modell legt die Datei fest, welche Stufen es gibt (Stufen bei Gemini 3, Token-Budget bei Gemini 2.5, Schalter und Budget bei LiteRT-LM), was Schnell und Tief bedeuten und ob Denken abschaltbar ist. `thinking_level`, `thinking_budget` und `reasoning_effort` sind **ein** Schalter mit modellabhängigen Stufen und dürfen nie gemeinsam gesendet werden.
- Entscheidung des Entwicklers: Die Bewertung aus dem Modelle-Strang gilt vor der aus dem Modi-Strang (der hatte noch keine Modellkenntnis); Umsetzung im Strang AIUIheinz-Chat nach `docs/agent/AUFTRAG_Chat_Schnittstellen.md`, Modi folgt auf dieser Grundlage.

### 19.3 Eine Token-Statistik für alle Engines
Die Dashboards brauchen vergleichbare Werte, auch wenn jede Engine anders zählt und streamt: Eingabe, Ausgabe (wie die Engine zählt), Denken, sichtbare Ausgabe, Gesamt, Quelle (Anbieter oder Schätzung), Tempo für sichtbare Ausgabe und für Ausgabe plus Denken (Block `stats` der Daten). Ob die Ausgabezahl die Denk-Token enthält, ist je Engine offen und wird gemessen; bis dahin zeigt die Anzeige beide getrennt und rechnet nicht ab.

### 19.4 LiteRT-LM über `server.py` konfigurieren (Richtung beschlossen)
- LiteRT-LM bezieht Threads (`cpu_thread_count`), Backend (`cpu`, `gpu`, `npu`), Kontext (`max_num_tokens`), Denken, Sampling und Seed aus einer Konfigurationsdatei je Modell-ID, nicht aus der Anfrage. `litert-lm serve --config FILE` erlaubt getrennte Profile. Der Python-Server soll diese Datei lesen und ändern dürfen (zum Beispiel `GET`/`PUT` auf einen Endpunkt der Seite, Prüfung der Schlüssel gegen die Liste der Daten, Neustart von `serve` auf Wunsch). Damit werden Regler wirksam, die heute `config` sind, und der Tempo-Test (Threads) lässt sich auch für LiteRT-LM bauen. `npu` kommt als schaltbare Option dazu; ob die NPU des Pixel in Termux läuft, ist offen und nur durch Ausprobieren zu klären.
- Das ist **Fundament** (`server.py`, Engine-Aufrufe): Es baut nur ein Strang zur Zeit, nach dem Auftrag aus 19.2.
- Später per Versuch zu klären (Sonde): Ob Bild, Audio und Funktionsaufrufe über `litert-lm serve` ansprechbar sind (die Kommandozeile kann Bild- und Audio-Anhänge und Python-Werkzeuge; die Server-Doku nennt dazu nichts).

### 19.5 Funktionsplätze (schon beschlossen als Richtung, siehe 15.6 Punkt 4)
Modul ruft einen Platz (`chat.main`, `check.second`, `vision.read`, `embed.local` …), der Nutzer ordnet lokal oder Cloud zu; Vorschlag und Nutzungsideen in `docs/MODELLQUELLEN.md` Abschnitt I. Wichtiger Zusatz des Entwicklers: Viele Nutzer der App sind selbst Entwickler, die **KI für ihre eigenen Apps und Tools** anbinden wollen; die Plätze und der Export der Testwerte sind dafür gedacht. Die Datenschutzstufe ist der wichtigste Filter der Quellenliste (Abstufung in `docs/MODELLQUELLEN.md`).

### 19.6 Wissensquellen und Einbettung (Planung, Umsetzung in einer späteren Version)
Ziel: Offline-Wikipedia auf dem Handy und eine lokale KI, die darin sucht und antwortet; dieselbe Technik für andere Wikis (Beispiel: ein VW-T4-Wiki), eigene Dokumentensammlungen und Listen.
- **Einbettungsmodelle** werden gesondert erfasst und erscheinen nicht in der Modellliste des Dashboards. Bekannt: `nomic-embed-text` (Ollama), EmbeddingGemma 2 über `litert-lm serve` (`/v1/embeddings`, belegt in der Doku, nicht auf dem Handy geprüft).
- **Eigene Bestände (Vormerkung 12.11.2026):** Dasselbe Verfahren gilt für strukturierte eigene Daten wie Rezepte, Artikel und Notizen in INCIheinz (Gespräche auf dem eigenen Bestand; Bestandsfragen rechnet der Code); Einordnung und offene Punkte in `docs/GEPLANT.md`, „Ideen vom 12.11.2026“.
- **Offene Entscheidung Tool oder Seite:** (a) eigener Hub-Eintrag „Wissen“ (`tools/knowledge/`), der Quellen verwaltet, durchsucht und mit einem Modus kombiniert; (b) Bereich innerhalb der Modelle-Seite. Vorschlag: (a), weil Quellen (Speicherplatz, Format, Aktualisierung) und Suche ein eigenes Thema sind und Modelle-Seite und Dashboard entlastet bleiben; die Entscheidung fällt, wenn über die Bereiche (15.6 Punkt 1) entschieden wird. Bis dahin Planung ohne Bau.
- **Offene Fragen (noch nicht recherchiert):** Format und Größe einer Offline-Wikipedia (zum Beispiel ZIM-Dateien von Kiwix, Teilmengen nach Thema), Import eines MediaWiki (XML-Dump oder Seitenexport) für fremde Wikis, Volltextsuche gegen Einbettungssuche (Speicher und Rechenzeit auf dem Pixel), wo der Index liegt (`data/`), Lizenzen (Wikipedia CC BY-SA; bei anderen Wikis die jeweilige Lizenz prüfen), Datenschutz (alles bleibt lokal; nur der Auszug für eine Frage darf, nur mit „Online erlauben“, an eine Cloud-Engine).
- **Reihenfolge:** Recherche im Strang Modelle, danach Bereiche und Entscheidung Tool oder Seite, dann ein kleiner Prototyp mit einer Quelle.

### 19.7 Reihenfolge
1. `lib/capabilities.json` und Regler/Denken-Schalter in der Oberfläche (Strang AIUIheinz-Chat, `docs/agent/AUFTRAG_Chat_Schnittstellen.md`), Handytest durch den Entwickler.
2. Sonde (Strang Modelle) und Nachtragen der Ergebnisse in die Daten; weitere Anbieter (Ollama, OpenRouter, Groq, Mistral, Ollama Cloud) in `docs/SCHNITTSTELLEN.md` und in die Daten.
3. LiteRT-Konfiguration über `server.py` (19.4).
4. Wissensbereich (19.6) und Funktionsplätze (19.5), nach der Bereichsentscheidung.

### 19.8 Offen
- Antwort der Sonde auf: top_k/seed bei Google kompatibel, Verhalten von Gemini 3 bei Penalties und bei `temperature` ≠ 1, Token-Zählung inklusive Denken, LiteRT-Anfrageparameter, CORS von Google aus dem Browser.
- Ob die App Google zusätzlich **nativ** (`generateContent`) anspricht: Der Entwickler hat dafür bereits Python-Skripte mit demselben AI-Studio-Schlüssel genutzt (Bildauswertung, Gesichtserkennung), also funktioniert der Weg mit dem Schlüssel. Vorteil nativ: `topK`, `seed`, Denkbudget, Modellmetadaten; Nachteil: ein zweites Format neben dem OpenAI-Format. Entscheidung nach der Sonde.

## 20 Generative KI: Bild, Sprache, Medien (11.11.2026, Beschlüsse des Entwicklers im Root-Strang)
Anlass: Der native Google-Weg (`generateContent`) ist der nächste Schritt im Strang AIUIheinz-Chat und öffnet Bild- und Audio-Ein- und -Ausgabe. Dieser Abschnitt legt fest, wie die App damit umgeht. Gebaut ist davon nichts.

### 20.1 Grundidee: Funktionsplätze wie bei den SIM-Karten
- Ein Beitrag in einer Unterhaltung kann aus **Text, Bild und Audio** bestehen. Module und Tools fragen nach einer **Funktion**, nicht nach einem Modell: `vision.read` (Bild lesen), `image.make` (Bild erzeugen oder bearbeiten), `speech.say` (Sprache ausgeben), `speech.hear` (Sprache erkennen), `embed.local` (Einbettung), `chat.main`, `check.second` und weitere (Abschnitt 19.5).
- Der Nutzer legt je Funktion fest, **welche Engine und welches Modell** sie übernimmt, so wie man früher wählte, welche SIM-Karte für Daten und welche für SMS gilt. Zuordnung gespeichert in den Einstellungen, einsehbar und änderbar.
- Eine Zuordnung besteht nicht aus einem Modellnamen, sondern aus **Wunschliste und Bedingungen** (siehe 20.2).

### 20.2 Modellwechsel beim Anbieter: Fähigkeit statt Name
Anbieter kündigen Modelle ab und ersetzen sie (Beispiel: die alten Veo-Modelle sind zum 30.06.2026 abgeschaltet). Der Entwickler will nicht jedes Mal nachsehen müssen, ob ein Modell noch existiert.
- Der Funktionsplatz speichert **die gewünschte Fähigkeit** (zum Beispiel „Bildausgabe“ oder „Sprachausgabe“) und optional eine **Rangfolge** (bevorzugtes Modell, Ersatz, „neuestes seiner Familie“).
- Die App löst die Zuordnung **bei jedem Start und bei jedem Abruf der Modellliste** gegen die aktuelle Liste auf (Felder wie `supportedGenerationMethods`, Eingabe- und Ausgabearten, Namensmuster aus `lib/capabilities.json`). Fehlt das bevorzugte Modell, tritt das nächste ein, und die Oberfläche **sagt es** („Bildmodell ersetzt: A durch B“); nichts geschieht lautlos, die Wahl bleibt änderbar.
- Gibt es nirgends ein passendes Modell, zeigt der Platz „nicht verfügbar“ mit Grund; das Tool bleibt nutzbar, soweit es ohne diese Funktion geht.
- Fähigkeitendaten wachsen deshalb um **Ein- und Ausgabearten** je Modell (`in`, `out`: Text, Bild, Audio, Video) und um die **Aufrufart** (`chat`, `generateContent` mit Bild, Imagen `predict`, Sprache, Transkription, Einbettung). Das gehört zuerst in die Daten (Auftrag Modelle).

### 20.3 Wo es in der App landet
- **Heinz UI (Testumgebung):** Anhang-Knopf an der Eingabe (Bild, Audio), Antworten dürfen Bilder und Audio enthalten, die Modellwahl zeigt, was ein Modell kann, das Testprotokoll nennt die Medienarten. Später ein **Modellvergleich**: derselbe Prompt oder dasselbe Bild an mehrere Modelle, Ergebnisse nebeneinander.
- **Heinz Chat:** Foto aufnehmen oder anhängen, Bild in der Antwort, Vorlesen; hängt ein Bild an, bleiben nur Modelle wählbar, die Bilder können.
- **Bilderzeugung zuerst in der Unterhaltung (Dashboard und Heinz Chat)** (Beschluss), ein eigenes **Bildstudio** im Hub folgt, wenn die Unterhaltungsansicht nicht mehr reicht (Serien, Galerie, Seitenverhältnis, Kostenanzeige).
- **Einlesen** (Hub-Tool, Bild zu Text oder Tabelle: Rezept, Rechnung, Brief, Code): Das Bild wird zuerst **lokal** gelesen (Gemma über LiteRT-LM, klassische Texterkennung, wenn das Handy es kann), die Cloud ist zuschaltbar. Das Ergebnis ist Text und Daten, die weiter in Sheet, Export oder Zwischenablage gehen. Es ist kein Vorschritt für das Bildstudio: Einlesen wertet Bilder aus, das Bildstudio erzeugt neue. Eine Kette (Einlesen, dann Text als Prompt ins Bildstudio) ist möglich, aber kein Muss.
- **Sprache:** siehe 20.5. **Medien auswerten** (Audio und Video-Datei zu Zusammenfassung): nur Cloud, später, gehört mit dem Wissensbereich (19.6) zusammen.
- **Videoerzeugung: ausgeschlossen.** Für eine sehr ferne Version vermerkt (siehe 20.9).

### 20.4 Heimserver statt Cloud (Idee des Entwicklers)
- Der Entwickler möchte Bildfunktionen so einstellen können, dass sie **nur verfügbar sind, wenn er zu Hause ist und der eigene PC erreichbar ist**; die Bilder gehen dann zur Verarbeitung an diesen PC, nicht an die Cloud.
- Klarstellung: Die App läuft auf dem Handy und schickt ein Bild heute **direkt vom Browser an die Engine** (Google, OpenRouter und so weiter). Ein Zwischenserver ist nicht nötig. Ein eigener PC wäre eine **weitere Engine** („Heimserver“: Adresse im WLAN, zum Beispiel Ollama mit Bildmodell oder ein Bildgenerator auf dem PC), die wie die anderen im Menü Engine steht.
- „Nur zu Hause“ lässt sich als **Bedingung am Funktionsplatz** ausdrücken: Der Platz `image.make` ist an die Engine „Heimserver“ gebunden und gilt als verfügbar, solange sie antwortet; sonst grau mit Grund, oder Rückfall nach Wahl (Cloud nur mit „Online erlauben“).
- Zu klären (Auftrag Modelle): PC-Seite (Ollama im Netz, `OLLAMA_HOST`, `OLLAMA_ORIGINS`), Browserregeln für Zugriffe von `localhost` auf Adressen im Heimnetz (CORS, Mischinhalt, Chromes Regeln für lokale Netze), Erkennung „bin ich zu Hause“ (einfach: Server antwortet), Sicherheit im WLAN (Schlüssel oder Token).

### 20.5 Sprache: immer zwei Wege, Browser als Rückfall
- `speech.say` und `speech.hear` laufen **sowohl über die Browserfunktionen als auch über Gemini (Cloud)**. Mit Schlüssel einer nativen API und „Online erlauben“ steht der Mehrwert der Cloud bereit; ohne Schlüssel oder online gesperrt fällt die App auf die **Browserfunktion offline** zurück. Der Nutzer sieht, welcher Weg gerade arbeitet.
- **Zu prüfen, weil es die Datenschutzzusage berührt:** Die Spracherkennung des Browsers (Web Speech API in Chrome auf Android) sendet Audio **nach meinem Wissen zur Erkennung an Google**, wenn nicht ein lokales Sprachpaket auf dem Gerät liegt. Die Sprachausgabe (`speechSynthesis`) läuft mit installierten Stimmen offline. Der Auftrag Modelle belegt das; wo „offline“ nicht stimmt, steht es in der Oberfläche, sonst gilt das Versprechen „nichts verlässt das Gerät“ für diesen Weg nicht.

- **Prüfung und Hinweis in der App (Beschluss 11.11.2026):** Der Entwickler hat lokale Sprachpakete auf seinem Pixel geladen. Die App soll selbst feststellen, ob Sprache lokal läuft, und sonst hinweisen, wie man es ändert. Der Browser kann nicht in die Systemeinstellungen sehen, aber die Stimmenliste der Sprachausgabe (`speechSynthesis.getVoices()`, je Stimme `localService`) zeigt, ob Stimmen auf dem Gerät liegen oder über das Netz kommen; für die Erkennung kennen neuere Chrome-Versionen eine Verfügbarkeitsabfrage mit lokaler Verarbeitung (Stand und Version im Auftrag Modelle zu belegen, am Gerät zu prüfen). Ergebnis: Anzeige je Weg „lokal“ oder „über das Netz“ und ein Hinweis mit Anleitung (Sprachpaket in den Android-Einstellungen laden), wenn nur Netzstimmen oder keine lokale Erkennung verfügbar sind.

### 20.6 Medienspeicher (IndexedDB)
- Bilder und Audio sind zu groß für den bisherigen Speicher der Unterhaltungen (`localStorage`, rund 5 MB, nur Text). Dafür ein **Medienspeicher im Browser (IndexedDB, vom Entwickler am 11.11.2026 beschlossen)**, der Unterhaltungen nur auf Medien-IDs verweisen lässt, plus Export (Medien mit in die App-Sicherung, Größe anzeigen) und Aufräumen. Alternative `data/` über den Server ist denkbar; Entscheidung im Fundament (Strang AIUIheinz-Chat).
- Erklärung: IndexedDB ist eine **Datenbank im Browser**, die große Daten (Bilder, Audiodateien, ganze Dokumente) als Objekte ablegt und nach Schlüsseln wieder holt. Sie ist unabhängig vom Server, bleibt beim Neuladen erhalten und fasst deutlich mehr als `localStorage` (typisch einige hundert MB, abhängig vom freien Speicher; Chrome kann sie bei Platzmangel räumen, wenn der Speicher nicht als dauerhaft angefordert ist). Zugriff nur über JavaScript (asynchron), je Adresse getrennt (`localhost:3000` und die Heimserver-Seite hätten getrennte Speicher).

### 20.7 Datenschutz und Kennzeichnung
- **Vor jedem Cloud-Aufruf mit Medien ein Hinweis**, was das Gerät verlässt (Bild, Audio), und ein Schalter „nicht mehr fragen je Engine“. Ohne „Online erlauben“ geschieht nichts; die Sperre in `lib/providers.js` gilt auch für Medien.
- **Vor dem Senden verkleinern und Metadaten entfernen:** Bild neu zeichnen (Größe begrenzen), dabei fallen Ortsdaten (EXIF) weg. Das spart Datenmenge und Kosten.
- **Personenbezug:** Fotos mit Personen, Gesichtserkennung und Ähnliches brauchen vorher eine Klärung (Datenschutz, Zweck); nichts davon ohne ausdrücklichen Beschluss.
- **Kennzeichnung erzeugter Bilder:** laut Entwickler inzwischen Pflicht. Die Quelle ist im Auftrag Modelle zu prüfen (Pflicht je nach Einsatz, Art der Kennzeichnung: sichtbar, in den Metadaten, Wasserzeichen des Anbieters). **Umsetzung, sobald das erste Bild erzeugt wird:** Vermerk „KI-erzeugt“ in der Oberfläche, im Export und in der Datei, soweit zulässig.

### 20.8 Reihenfolge
1. Nativer Google-Adapter (Strang AIUIheinz-Chat, läuft).
2. **Fähigkeitendaten um Ein- und Ausgabearten und Aufrufarten erweitern** (Strang Modelle), dazu die Recherche aus dem Nachtrag in `docs/agent/AUFTRAG_Modelle.md`.
3. Anhang-Baustein und Bild-Eingabe im Dashboard; Medienspeicher.
4. Funktionsplätze mit Wunschliste und Ersatzregel (20.1, 20.2).
5. **Einlesen-Tool vor dem Bildstudio** (Beschluss 11.11.2026).
6. Bildausgabe im Dashboard mit Kennzeichnung, danach Bildstudio.
7. Sprache über beide Wege.
8. Modellvergleich, Heimserver-Engine, Medien auswerten.

### 20.9 Ferne Version (nicht planen, nur vermerkt)
Videoerzeugung und -auswertung. Der Entwickler will sie offen lassen für den Fall, dass sie in einigen Jahren lokal auf dem Handy läuft; dann würde sie als weiterer Funktionsplatz (`video.make`) einziehen.

### 20.10 Offen
Namen der Plätze und der Hub-Einträge; Wunschliste je Platz in der Oberfläche (wie einfach?); ob der Medienspeicher in den Browser oder in `data/` gehört; Browser-Spracherkennung offline oder Cloud (20.5); Pflicht und Form der Kennzeichnung; Heimserver-Details (20.4); Kosten je Bild und je Audiominute in der Anzeige.

## 21 Testreihen: automatisierte Parameterläufe (11.11.2026, Idee und Beschlüsse des Entwicklers)
Anlass: Der Entwickler kopiert Testläufe bisher von Hand zwischen App und Strang und liest die Testaufgabe mühsam über dem Eingabefeld. Eine Testautomation soll Läufe unter vielen Parametereinstellungen selbst durchlaufen und die Streaming-Daten einsammeln.

### 21.1 Beschlüsse
- **Erster Anwendungsfall:** **ein Modell mit vielen Parameterkombinationen durchfahren** (zum Beispiel Temperatur × top_k × Threads × Denkstufe). Der Modellvergleich mit demselben Prompt-Satz kommt später, er ist derselbe Läufer mit einer anderen Matrix.
- **Auswertung zunächst nur durch Code.** Für den Entwickler zählt das **Ergebnis, das der Agent des jeweiligen Strangs auswertet**. Der Hauptzweck ist deshalb ein **Export für Agenten**, keine schöne Vergleichsansicht in der App. Eine Vergleichstabelle und Diagramme sind nachrangig.

### 21.2 Bausteine
1. **Testreihe als Datei** (JSON): Name, Engine und Modell, Prompt-Satz (eigene oder die Testprompts aus Abschnitt 11 (Archiv), je Prompt eine ID), Matrix der Parameter (Liste je Parameter; Kombinationen als Kreuzprodukt oder als frei gewählte Zeilen), Wiederholungen je Zeile, optionale Prüfregeln je Prompt, Obergrenze für Laufzeit und Kosten. Testreihen lassen sich importieren und exportieren (später auch zum Teilen, passend zum Starterkit).
2. **Läufer:** Er ruft dieselbe Anbieterschicht (`lib/providers.js`) wie das Dashboard auf, Zeile für Zeile, ohne Gesprächsverlauf zu verändern. Er ist die Verallgemeinerung des Tempo-Tests, der ein Sonderfall bleibt (Threads, Kurzprompt, zwei Läufe). Reihenfolge nach Modell und Parameter geordnet, damit nicht unnötig neu geladen wird. Abbrechen und Fortsetzen möglich, Fortschritt sichtbar.
3. **Protokoll je Lauf:** das, was das Testprotokoll je Antwort heute schon enthält (Parameter, Fähigkeitenzustand, gesendeter Body ohne Nachricht und Schlüssel, rohes `usage`, Zeiten bis zum ersten Token und gesamt, Tokenzahlen, Abbruchgrund, Fehler), dazu der **volle Antworttext**, die Zeilen- und Wiederholungsnummer und der Zeitpunkt.
4. **Prüfregeln durch Code** (je Prompt, optional): enthält oder enthält nicht, regulärer Ausdruck, Zahl stimmt, gültiges JSON, Längengrenzen, Abbruchgrund `stop`. Ergebnis je Lauf bestanden oder nicht, mit Grund. Kein zweites Modell als Bewerter in dieser Stufe.
5. **Export für den Agenten:** **eine** Datei oder ein Kopierblock mit Kopf (App-Version, Gerät, Zeitpunkt, Engine, Modell, Testreihe) und allen Läufen, Markdown für das Lesen und JSON für das Rechnen. Länge im Blick: Der Block muss in eine Nachricht an den Strang passen; ist er zu lang, werden Antworttexte gekürzt (mit Hinweis) oder die Läufe in mehrere Teile geteilt. Schlüssel nie, Antworttexte optional.
6. **Speicher:** Ergebnisse im Medien- und Datenspeicher (IndexedDB, Abschnitt 20.6), nicht im Gesprächsverlauf; Export, Löschen und Größe sichtbar.

### 21.3 Betrieb und Fallstricke
- **Bildschirm an und App sichtbar:** Der Läufer hält den Bildschirm wach (Wake Lock des Browsers). Lokal bleibt **Termux sichtbar**, sonst verfälscht Androids Prozessverwaltung das Tempo (Abschnitt 14 (Archiv), 15.4). Die Testreihe sagt das vor dem Start.
- **Cloud:** Vor dem Start Schätzung von Anfragen, Token und Kosten, eine **Obergrenze** und eine Bestätigung; die Online-Sperre gilt. Gratisstufen haben Anfragegrenzen, der Läufer macht Pausen und wiederholt bei Fehlern begrenzt (Abbruchgrund `429`). Denken dauert 10 bis 35 s je Anfrage (gemessen, `docs/SCHNITTSTELLEN.md` 8), die Zeitschätzung muss das einrechnen.
- **Zufall:** Temperatur 0 oder Seed, wo die Schnittstelle ihn annimmt (Ollama ja, bei Google offen), sonst Wiederholungen; der Export nennt, ob ein Seed galt.
- **Nur ein Modell im Speicher** (Ollama): Modellwechsel mitten in der Reihe bedeutet Laden und kostet Zeit und Stabilität (Signal 9).
- **Parameter nach Fähigkeitendaten:** Die Matrix bietet nur Parameter an, die laut `lib/capabilities.json` wirken; als „ungeklärt“ markierte werden als solche in den Export geschrieben, ausgegraute fehlen. So wird die Testreihe zugleich zur **Sonde** für die Schnittstellen (Abschnitt 19, `docs/SCHNITTSTELLEN.md` 4).

### 21.4 Wo und wann
- Teil von **Heinz UI (Testumgebung)**, im Menü unter Leistung neben dem Tempo-Test. Strang **AIUIheinz-Chat**, weil es Fundament (Anbieterschicht, Dashboard) berührt; ein Strang zur Zeit.
- **Reihenfolge:** nach den offenen Gerätetests und parallel zur Medien-Vorbereitung im Strang Modelle (Daten); vor dem Anhang-Baustein, weil der Läufer die Messmethode für alles Weitere liefert: ein Gerüst, um Antworten reproduzierbar zu messen, auch für Bild und Sprache später. Schritte: (1) Läufer mit Matrix und Export (Tempo-Test als Sonderfall), (2) Prüfregeln, (3) Fortsetzen, Kosten und Zeit, (4) Import und Export von Testreihen, (5) Vergleichsansicht nur auf Wunsch.
- **Nutzen für das Projekt:** Reproduzierbare Messreihen statt Einzelstichproben (Abschnitt 14 (Archiv) und 15.4 haben bisher nur solche). Das stärkt die Doku und die Eignung als Lehr- oder Abschlussarbeit (Auftrag Tertius).

### 21.5a Beschlüsse und Stand 11.11.2026 (Entwickler, Strang AIUIheinz-Chat)
- Testreihen und Ergebnisse liegen **nur im Browser** (`localStorage` `heinz_series`, Antworttexte auf 2000 Zeichen gekürzt; IndexedDB folgt mit dem Medienspeicher). Export als **ein Kopierblock, bei Überlänge in nummerierte Teile** (je Teil rund 12000 Zeichen, Antwort je Lauf auf 600 Zeichen gekürzt). Matrix **höchstens 30 Läufe** (Werte mal Wiederholungen).
- **Schritt 1 gebaut** (nur simuliert getestet): `lib/testreihe.js` (Matrix, Export), Menüseite „Testreihe“ in `dashboard.html`. Ein Prompt, Achsen Temperatur, Top-p, Top-k, Threads (nur Ollama), Denken (Modellstandard, Schnell, Tief, nur wo die Regel ein `thinking`-Objekt hat), Wiederholungen, Obergrenze Antwort-Token. Kein Systemprompt, kein Gesprächsverlauf. Gesperrte Parameter sind grau und nie Teil der Matrix. Cloud: zweites Tippen bestätigt nach Nennung der Anfragezahl; Pause 1,2 s zwischen Anfragen; Abbruch nach drei Fehlern in Folge; Wake Lock. Offen: Schritte 2 bis 5 (Prüfregeln, Fortsetzen, Kosten und Zeit genauer, Import/Export von Testreihen, mehrere Prompts je Reihe).

- **Erste Google-Reihe am Gerät (11.11.2026, `gemini-3.8-flash` nativ, Prompt „Name one unusual animal in one sentence.“, Temperatur 0 und 2, Schnell und Tief, Top-p 0,85, höchstens 1000 Token):** alle 4 Läufe HTTP 200. Schnell: 31 bis 35 Ausgabe-Token, 0 Denk-Token, 1,7 bis 1,9 s. Tief: 432 und 483 Denk-Token (`thoughtsTokenCount`), 4,8 bis 5,4 s, bei diesem kurzen Prompt also weit unter den 35 s der Primzahlfrage. Ausgabe-Token enthalten die Denk-Token nicht (9 + 41 + 483 = 533). Die T/s-Werte (154 bis 298) sind wegen des Bursts bedeutungslos. Bei Temperatur 0 kamen je Denkstufe andere Tiere (Axolotl, Aye-Aye): Gemini 3 ist bei Temperatur 0 nicht deterministisch über Denkstufen hinweg. Einzelstichprobe, keine Wiederholungen.
- **Fehlerbild am Gerät und Korrektur:** Nach Schließen der App oder Neuladen zeigte die Seite den Balken der zuletzt gespeicherten Reihe und wirkte wie ein laufender Test ohne Stopp-Knopf; nichts lief tatsächlich weiter. Jetzt Balken nur während des Laufs (voll bei vollständiger Reihe), jeder Lauf wird sofort gesichert, die Seite sagt „Es läuft nichts“, der Export vermerkt eine unterbrochene Reihe.

- **Schritt 2 gebaut (11.11.2026, simuliert getestet):** mehrere Prompts je Reihe (einer pro Zeile, Kennung `p1`, `p2` …, als innerste Achse der Matrix) und **Prüfregeln durch Code** nach `=>`, getrennt mit `|`: `contains:Text`, `not:Text`, `number:16` (ganze Zahl, nicht Teil einer größeren), `regex:Muster`, `json` (auch in Codeblock), `min:n`, `max:n` (Zeichen), `stop` (Abbruchgrund). Ergebnis je Lauf `checks` mit `ok` und `why`, `pass` im Export, Kopf „checks: x of y runs passed all checks“, Tabellenspalte „fail“. Ungültige Regeln sperren den Start. Kein zweites Modell als Bewerter.

- **Zweite Google-Reihe am Gerät (11.11.2026, `gemini-3.8-flash` nativ, Schnell und Tief, Temperatur 0,15, Top-p 0,3, höchstens 1000 Token, Prüfregeln):** 4 von 4 Läufen bestanden. Primzahlfrage (1000 bis 1100, richtig 16): **Schnell** (`thinkingLevel` low) dachte trotzdem 259 Token und brauchte 3,7 s, **Tief** 959 Token und 9,3 s; beide antworteten 16. Tierfrage (ein Wort): Schnell 0 Denk-Token, 1,5 s; Tief 242 Denk-Token, 7,1 s. Schnell heißt bei Gemini 3 also „wenig“, nicht „kein“ Denken, und Tief denkt auch bei Trivialfragen. Bei diesen Aufgaben kein Qualitätsunterschied; die Frage ist zu leicht, um Schnell und Tief zu trennen. Zeit bis zum ersten Zeichen gleich Gesamtzeit (Burst nach dem Denken), Tempo wird bei Antworten unter 5 Token nicht berechnet.

- Schritt 3 (11.11.2026, simuliert): Reihe nach Abbruch oder Neuladen fortsetzen (nur gleiche Engine und gleiches Modell, gesicherte Werte, offene Läufe wiederholt) und Zeitschätzung aus dem Verlauf der letzten Reihe. Offen: Schritt 4 (Dateien) und 5 (Vergleich nur auf Wunsch).
- Messung Google nativ, gemini-3.8-flash, Schnell gegen Tief (11.11.2026, Handy, Primzahlen zwischen 10000 und 10100 bzw. 10200, je 2 Wiederholungen, Temperature 0.15, Top-P 0.3; drei Reihen, jede mit 8 Läufen):
  - Token-Grenze 3000 (zweimal): Schnell 4 von 4 richtig (Denk-Token 200 bis 1906, 2,5 bis 13 s). Tief 1 von 4 bzw. 1 von 4: Denk-Token 2876 bis 2882, drei von vier Läufen mit `finish: length`.
  - Token-Grenze 8000: Schnell 4 von 4 richtig (3 bis 45 s; ein Ausreißer mit 44,6 s bei nur 857 Denk-Token, also Wartezeit auf Seite der API). Tief 0 von 4 echten Antworten: alle vier Läufe `finish: length`, Denk-Token 7676 bis 7680, Dauer 49 bis 54 s.
  - Folge 1: `maxOutputTokens` zählt bei Google die Denk-Token mit (Denken + Antwort ≈ Grenze, z. B. 7680 + 316 bei 8000), obwohl `candidatesTokenCount` sie nicht enthält. Tief füllt die Grenze bei 3000 und bei 8000 fast vollständig aus; ob es mit 30000 oder mehr fertig wird, ist offen.
  - Folge 2: Wird das Denken abgeschnitten, steht halbfertiger Denktext (Teilungsrechnungen, Primzahllisten, einmal mit vorangestelltem „thought“) in der sichtbaren Antwort. Die Regel `number:11` bestand dann in 3 von 4 Tief-Läufen nur zufällig, weil die Zahl irgendwo im Denktext vorkam („7 von 8 bestanden“ ist damit zu hoch). Für Prüfreihen mit Denkmodellen immer die Regel `stop` dazunehmen (`number:11 | stop`).
  - Die Tokens-pro-Sekunde-Werte (141 bis 257) sind bei Tief irreführend, weil Denk-Token nicht mitzählen.
- Idee daraus (offen, nicht gebaut): Warnhinweis in Tabelle und Unterhaltung, wenn `finish: length` und die Denk-Token mindestens 80 % der Grenze ausmachen („Denken hat die Token-Grenze aufgebraucht“).

### 21.5 Offen
Format und Länge des Export-Blocks, wie viele Läufe in eine Nachricht an den Strang passen, Obergrenze für die Matrix (Zeilen mal Wiederholungen), ob Testreihen im Repo (`data/` ist ignoriert) oder nur im Browser liegen, Name des Menüpunkts.

## 22 Beschlüsse zur Struktur (12.11.2026, Entwickler)
Anlass: Eine Außenanalyse der Architektur (Doppelablage, Dokumenten-Wildwuchs, `dashboard.html` mit über 3000 Zeilen, Daten in `localStorage`) wurde vom Entwickler geprüft. Beschlossen:
1. **Eine Quelle der Wahrheit:** Alle Steuerdateien (STAND, UEBERGABE, ENTWICKLUNGSVERLAUF, AUFTRAG_*, NAECHSTER_CHAT) liegen nur im Repo (`docs/agent/`). Der PC-Ordner ist ein Klon plus `INDEX.md`. Abgleich per `cmp` entfällt. Umsetzung: Strang AIUIheinz-Aufraeumen (`docs/agent/AUFTRAG_Aufraeumen.md`).
2. **Dokumente schlank:** Überholte Konzeptabschnitte 1 bis 14 und alter Verlauf wandern ins Archiv; `docs/agent/UEBERGABE.md` wird in Prozess und Technik getrennt. Ergebnis sind eine neue Projektanweisung und eine Arbeitsanweisung für den Entwickler.
3. **Schlankes Web-UI (Dogma):** Seiten zeigen an und bedienen. Prüfprozeduren, Prompts, Regeln und Matrizen sind **Daten** im Repo; Unterhaltungen, Testreihen und Ergebnisse liegen im Browser-Speicher und gehen per Export nach außen. Eine neue Prüfprozedur ist eine neue Datendatei, nicht neuer Code in `dashboard.html`. Umsetzung: Strang AIUIheinz-Dashboard (`docs/agent/AUFTRAG_Dashboard_Schlank.md`).
4. **IndexedDB** für Unterhaltungen und Testreihen (später Medien), `localStorage` nur für kleine Schalter; Migration ohne Datenverlust. Umsetzung: Strang AIUIheinz-Speicher (`docs/agent/AUFTRAG_Speicher.md`).
5. **Reihenfolge** (nacheinander, Fundament nur ein Strang): Aufraeumen, Menu (mit Bausteinkatalog), Dashboard, Speicher. Modelle und Tertius laufen nach dem Aufräumen daneben, solange sie `dashboard.html` und `lib/core.*` nicht berühren.
6. **Datenschutz:** Neue Texte nennen den Benutzernamen im Pfad nicht. Die Git-Historie wird nicht umgeschrieben (nur ein Windows-Pfad und Heimnetz-Adressen, keine Schlüssel, geprüft 12.11.2026).
7. **Speicher umgesetzt (12.11.2026, Strang AIUIheinz-Speicher; Beschlüsse des Entwicklers im Strang):** In IndexedDB liegen `heinz_chats`, `heinz_slim_chats`, `heinz_current`, `heinz_series`, `heinz_speedtest`; in `localStorage` bleiben Einstellungen, Engine-Listen, `heinz_keys` und die kleinen Schalter. Fällt IndexedDB aus, arbeitet die App aus `localStorage` mit sichtbarem Hinweis. Die Migration kopiert, prüft und lässt die alten Einträge stehen (endgültig löschen erst nach Freigabe in einer späteren Version). Ob Chrome auf dem Pixel im Termux-Tab `persist()` gewährt, ist am Gerät offen (`docs/SCHNITTSTELLEN.md` 16). Antwort auf die offene Frage in 20.10: Der Medienspeicher gehört in den Browser (IndexedDB, Objektspeicher `media` ist vorbereitet, noch ohne Funktion).

## 23 Zielstand und Umgang mit den Vormerkungen (12.11.2026 nachts, Beschlüsse des Entwicklers im Root-Strang)
Anlass: Ein unbeteiligter Dritter (Strang Tertius) merkt an, die Liste der Vormerkungen wachse schneller, als sie abgearbeitet wird, und rät zu einem benannten Zielstand; außerdem seien die alten Seiten (Sheet, Lab, Vitals) näher an einem greifbaren Nutzen. Beschlossen:
1. **Die Liste der Vormerkungen ist ein Becken für Ideen und Verbesserungsvorschläge**, die dem Entwickler erst in der laufenden Entwicklung einfallen. Sie darf wachsen. Ein Wachsen ist kein Fehler; sie wird in eine logische Reihenfolge gebracht, nicht abgearbeitet wie eine Aufgabenliste.
2. **Zielstand „MVP intern“:** Hub (Startseite), Heinz Chat und Heinz Dashboard laufen **perfekt auf dem Konzept und auf der neuen modularen Struktur** (ES-Module, `AUFTRAG_Fundament.md`). Erst dann sind globale Design-Änderungen mit einem Schritt möglich, und erst dann wird das Werkzeug einer zweiten Person gezeigt.
3. **Überprüfung der Vormerkungen nach der Fundament-Umstellung** (Root-Strang): jede Vormerkung (`STAND.md` Nächste Aufgaben, `docs/GEPLANT.md`, Abschnitt 15.6 und 20) wird eingeordnet in (a) nötig für den MVP intern, (b) danach, (c) Becken. Danach wird sie von Zeit zu Zeit wieder hinterfragt, zum Beispiel nach jedem Meilenstein.
4. **Reihenfolge nach dem MVP:** zuerst Funktionalität im Fundament, dann auf den Modulen Hub, Chat und Dashboard. Danach convert2 vollständig in die Webseite aufnehmen und portieren. Dann Sheet. Die übrigen Seiten (Data Lab, Sheet, Phone Vitals) werden zum Schluss eine nach der anderen bei Bedarf auf das neue Fundament portiert. Der Umbau der INCIheinz-App steht weit nach der Fertigstellung der Grundmodule an. Neue Apps entstehen danach auf diesem Konzept.
5. **Folge für die Strangreihenfolge:** Der Strang Sheet wird nicht vor die Fundament-Umstellung geschoben und startet auch nicht sofort danach. Die Umstellung der alten Seiten auf `HeinzProviders` (Verstoß gegen die Pflichtregel, bisher als Ausnahme in `tests/test_rules.py` geführt) bleibt dokumentierte Ausnahme bis dahin.
6. **Workflow „Modell laden, einstellen, übernehmen“ (Beschluss 13.11.2026, 02:35, Entwickler; ersetzt die Fassung „nach dem MVP“):** Die Regel liegt **jetzt** vor und gehört zum MVP: `docs/agent/ANWEISUNG_Personenleiste.md` (Entwurf von Tertius aus den Beschlüssen des Entwicklers), umgesetzt nach `docs/agent/AUFTRAG_Personen.md` (Phase 1 bis 3). Kern: vier Begriffe **Modell, Laufzeit, Person, Ton**; Dashboard startet immer mit Heinz und der zum Modell passenden Laufzeit; die Person ist in der Kopfzeile ein fester Rücksprungpunkt (Nativ = Herstellerwerte, ohne Systemprompt); „geändert“ ist ohne Text erkennbar; der Heinz Chat liest nur seinen **Chat-Standard** (Kopie von Heinz, ändert sich nur durch „Für den Heinz Chat speichern“, Rückfall „Auslieferzustand“). Damit entfallen die früheren Festlegungen zur Übernahme von Werten und zur Belegung der Modus-Tasten. Die Befunde B1 und B2 (`STAND.md` „Offen“) sind **nicht** behoben, sondern an diese Phasen gebunden; B2 gilt erst nach Bestätigung am Handy als erledigt.
   **Nachtrag 13.11.2026 (nach Handytest der Personen):** Der Chat-Standard wird durch **Konfigurationen** ersetzt (`docs/BEDIENKONZEPT_DASHBOARD.md`, `docs/agent/AUFTRAG_Konfiguration.md`): Das Dashboard ist die Werkbank, die Konfiguration gehört zum Modell, der Heinz Chat ist ein eigenes Tool mit genau einer zugewiesenen Konfiguration und liest das Dashboard nicht. „In den Chat übernehmen“ entfällt. Die Laufzeit bleibt geteilt, der Chat liest sie nur.

