# AIUIheinz – Entwicklungsverlauf

Neueste Einträge unten. Gehalten werden nur die letzten rund 10 Tage; ältere Einträge (bis 09.11.2026, auch die Vorgeschichte aus dem Handy-Chat „Heinz UI“) stehen unverändert in `../archiv/ENTWICKLUNGSVERLAUF_bis_2026-11-09.md`.

## 10.11.2026 – Tempo-Maßnahmen im Chat (Chat „AIUIheinz-Chat“, nur `chat.html`)
- Grundlage: Messreihen des Entwicklers vom 09.11. (gemma2:2b und heinz-fakt, je Threadzahl; 2 Threads am stabilsten, 8 Threads mit Termux im Hintergrund 0,2–0,3 Token/s, erster Aufruf 25–30 s, davon 12–20 s Prompt-Verarbeitung durch den Modelfile-Prompt von heinz-fakt und 4–14 s Laden). Prompts der Seite sind klein (Wilson und Heinz je rund 50 Token); der Parser ist nicht der Engpass.
- **Systemprompt konstant:** Kontext steht jetzt vorn in der letzten Nutzernachricht statt im Systemprompt (`buildMessages`). Der Systemprompt (Modus, Sprache, Schnellmodus) bleibt gleich und damit im Ollama-Zwischenspeicher. Verhaltensänderung: Im Audit-Modus liegt der Kontext nicht mehr in der Systemnachricht, auf dem Handy prüfen, ob die Antwortqualität gleich bleibt.
- **Modell vorladen:** nach Seitenstart und bei Wechsel von Modus, Modell, Threads, Kontextgröße, Sprache, Schnellmodus, Eigenem Systemprompt (1,2 s Verzögerung, nicht doppelt bei gleichen Einstellungen, bricht beim Senden ab). Statuszeile „Modell wird vorbereitet / bereit“. Ein-/Ausschalter in ☰ (Standard an).
- **keep_alive 30 m** in jeder Anfrage (Standard von Ollama 5 min).
- **Schnellmodus** (☰): Bitte um knappe Antwort ohne Markdown im Systemprompt, `num_predict` (Standard 150, einstellbar 16–1024), Anzeige als Rohtext ohne Parser.
- Refaktor: `buildOptions` und `buildMessages` für echte Anfrage und Vorladen gemeinsam.
- Tests: 24 Seitentests grün (neu: Vorladen mit gleichen Optionen, nicht doppelt, folgt Modus und Threads, abschaltbar; Kontext verändert den Systemprompt nicht; Schnellmodus). Gegenprobe (Kontext im Systemprompt) schlägt fehl. Nur simuliert; Wirkung auf dem Handy offen: Zeit bis zur ersten Antwort nach Moduswechsel mit und ohne Vorladen (Start-Badge), Schnellmodus gegen normal (Gesamtzeit).
- Offen: Termux im Vordergrund (Termux:Float, Akku „Nicht eingeschränkt“, Wakelock) als Tempo-Test-Reihe; GPU/CPU-Schalter erst mit LiteRT-LM (Schritt 3); kürzerer Modelfile-Prompt von heinz-fakt nur nach Vergleichstest.

## 10.11.2026 – Modusleiste (Chat „AIUIheinz-Chat“, Schritt 2 als Grundfunktion, nur `chat.html`)
- Anstelle des Dropdowns steht oben eine Leiste mit Pillen je Modus (Emoji und Kurzname, aktiver Modus in der Modusfarbe, Höhe 40 px, alle fünf passen auf 426 px, auch auf Deutsch). Sie wird in `renderModeBar()` aus `MODE_PRESETS` gebaut, neue Modi erscheinen von selbst. Das Dropdown `#mode-select` bleibt unsichtbar als Zustandsträger.
- Verhalten unverändert: Moduswechsel = neuer Chat, der alte wird gespeichert, Modus und Preset-Modell wechseln; während einer laufenden Antwort oder des Tempo-Tests ignoriert die Leiste Tipps.
- Bewusst nicht gebaut (Grundfunktion, Feinschliff beim Design-Strang): eigener Verlauf je Modus, Gestaltung nach dem Manifest, Ausblenden von Modi je nach Online-/Offline-Betrieb. Dafür wäre ein Merkmal je Modus nötig (zum Beispiel `online: true/false`), das erst mit der Anbieterschicht (Schritt 3) und der Abgrenzung durch den Entwickler festgelegt wird.
- Tests: 26 Seitentests grün (neu: Leiste, Wechsel, Sprache, Neuladen, Sperre während der Antwort). Nur simuliert, Screenshot bei 426 × 803 px geprüft.

## 10.11.2026 – Korrektur nach Handytest: Absturz beim Moduswechsel, Audit-Kontext (Chat „AIUIheinz-Chat“, nur `chat.html`)
- Beobachtung des Entwicklers: Nach Wilson (gemma2:2b), Heinz (heinz-fakt) und Audit (qwen2.5:3b) in wenigen Minuten sprang der Statuspunkt auf Rot, alle Termux-Sitzungen waren weg (Android hat Termux beendet), die Audit-Anfrage endete mit „Failed to fetch“.
- Wahrscheinliche Ursache (nicht gemessen): Das Vorladen mit `keep_alive` 30 m ließ jedes besuchte Modell im Arbeitsspeicher; drei Modelle mit Kontext 11264 gleichzeitig reichen auf dem Handy offenbar für den Speicherdruck. Von mir mit dem Vorladen eingeführt.
- Fix: Vor Vorladen und vor jeder Anfrage entlädt die Seite alle anderen geladenen Modelle (`/api/ps`, `/api/generate` mit `keep_alive:0`, `unloadOthers`). Zusätzlich für Ollama selbst: `OLLAMA_MAX_LOADED_MODELS=1` vor dem Start setzen (nicht in `start.sh` eingebaut, Fundament).
- Audit: Die erste Anfrage mit Kontext im Nutzertext (Änderung „Kontext ans Nachrichtenende“) beantwortete qwen2.5:3b zweimal mit „Information not in context.“, obwohl 230 Zeichen Kontext da waren. Modi mit Pflicht-Kontext (`ctxInSystem`, bisher nur Audit) legen den Kontext deshalb wieder in die Systemnachricht; die übrigen Modi behalten ihn in der Nutzernachricht. Ursache nicht abschließend belegt (ein Fall).
- Tests: 27 Seitentests grün (neu: nur das gewählte Modell bleibt geladen; Audit-Kontext im System). Nur simuliert.

## 10.11.2026 – Chats je Modus (Chat „AIUIheinz-Chat“, nur `chat.html`)
- Fehler gefunden (Beobachtung des Entwicklers: gespeicherte Chats landen im „falschen“ Modus): Beim Moduswechsel wurde der alte Chat erst gespeichert, nachdem `settings.mode` und `settings.model` schon auf den neuen Modus gestellt waren, und trug dadurch Modus und Modell des neuen. Jetzt wird zuerst gespeichert, dann umgestellt (`updateModeUI`). Bereits vorhandene Einträge in `heinz_chats` bleiben mit dem damals falschen Modus gespeichert.
- Neu: Die Liste „Chats“ zeigt standardmäßig nur die Chats des aktiven Modus; ein Knopf darunter schaltet auf alle Modi. Aus der vollen Liste geladen, springt die Seite in Modus und Modell des Chats (wie bisher).
- Tests: 28 Seitentests grün (neu: Liste je Modus, Sprung beim Laden; der Test schlug vor der Korrektur fehl). Nur simuliert.
- Offen (Idee des Entwicklers): einen Chat eines Modus bewusst in einem anderen Modus weiterführen; bisher geht das über Kopieren in das Kontextfeld.

## 10.11.2026 – Ampel folgt dem Zustand, Planung „Zwei Bereiche“ (Chat „AIUIheinz-Chat“, `chat.html`, `docs/GEPLANT.md`)
- Ampel neben „Heinz UI“: Rot = Ollama nicht erreichbar, Orange = Ollama läuft, das gewählte Modell ist nicht geladen, Grün = gewähltes Modell ist im Arbeitsspeicher (`/api/ps`). Fehler: Der Zustand wurde nur beim Start und bei Modus- oder Modellwechsel geprüft, deshalb blieb sie nach dem Laden Orange. Jetzt Prüfung auch nach dem Vorladen, nach jeder Antwort und alle 10 s.
- Tests: 29 Seitentests grün (neu: Grün, Orange, Rot). Nur simuliert.
- `docs/GEPLANT.md`: neuer Abschnitt „Zwei Bereiche“ (Bereich A Ausprobieren und Modelle, Bereich B schlanker Chat, offene Abgrenzung online/offline, Folgen für die nächsten Schritte). Zur Weitergabe an den Konzept-Chat; im Konzept selbst noch nicht eingearbeitet.

## 10.11.2026 – Anbieterschicht und Engine-Wahl (Chat „AIUIheinz-Chat“; berührt Fundament `lib/`, Freigabe des Entwicklers)
- Neu `lib/providers.js` (`HeinzProviders`): Anbieter als Daten (Ollama, LiteRT-LM, OpenRouter, Groq, Mistral, Custom), `models`, `chat` (Ollama NDJSON, OpenAI-Schnittstelle mit SSE), `ping`, `loaded`/`unload`, Schalter „Online erlauben“ (`heinz_online`, Standard aus), Schlüssel im Browser (`heinz_keys`), einheitliche Statistik. Sperre: Adresse außer localhost wird ohne den Haken vor dem Senden abgelehnt.
- `chat.html`: Menü „Engine“ (Auswahl, Backend CPU/GPU für LiteRT-LM, Adresse für Custom, Schlüssel, Modellname und „Modellliste laden“, Haken „Online erlauben“ mit Hinweis). Online-Engines erscheinen erst mit dem Haken; wird er ausgeschaltet, springt die Seite auf Ollama. Senden, Vorladen, Entladen, Ampel und Modellliste laufen über die Schicht. Ampel: Blau für Online-Engines (nie von selbst angefragt), Grün erreichbar für LiteRT-LM. Chats speichern die Engine; ein Online-Chat öffnet sich ohne „Online erlauben“ lokal. Threads, Eigener Systemprompt, Vorladen und Tempo-Test gelten nur bei Ollama (ausgegraut, Hinweis).
- Tests: 36 Seitentests grün (neu: Online aus, Sperre, LiteRT-LM mit Modellliste, GPU-Feld, Statistik und Ampel, Online-Engine mit Schlüssel und „nur der aktuelle Chat“, Fehlertexte 401, Custom lokal/remote, Tempo-Test nur Ollama, Stream ohne Nutzungsangabe als ungefähr markiert). Gegenprobe: ohne Sperre schlagen die Sperr-Tests fehl. **Nur simuliert**: weder LiteRT-LM auf dem Handy noch ein echter Online-Anbieter wurden angesprochen; CORS der Anbieter ist offen.
- Offen: LiteRT-LM auf dem Handy testen (`litert-lm serve --cors-origin http://localhost:3000`, `/v1/models`, Antwort, CPU/GPU über `model`, `system`-Nachricht und Parameter wirksam?); Tempo-Test für LiteRT-LM; Modellverwaltung (Bereich A); Online-Anbieter mit echtem Schlüssel; Limit-Anzeige; Proxy in `server.py` falls CORS blockiert.

## 10.11.2026 – Konzept auf den Stand nach Version 1.0 gebracht (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md`: Kopfzeile verweist auf den neuen Abschnitt 15; Abschnitt 12 mit Stand je Schritt (✔ ◐ ○); Abschnitt 13 nachgeführt; neuer Abschnitt 15 (was gebaut ist, Abweichungen vom Entwurf, Zwei Bereiche A/B, Befunde seit Abschnitt 14, Strangstand, offene Punkte). Abschnitt 4 gilt als überholt und wird mit dem Design-Konzept neu gefasst.
- `docs/GEPLANT.md`: Hinweis „im Konzept noch nicht eingearbeitet“ ersetzt.
- Grundlage: `ENTWICKLUNGSVERLAUF.md`, `STAND.md`, `docs/GEPLANT.md`, Code bei Commit `1c265ce`; Tests 20 Server und 36 Seiten grün (selbst gelaufen, simuliert).

## 10.11.2026 – Design-Fundament und Umbau der Chat-Seite (Chat „AIUIheinz-Design“; Fundament `lib/`, `chat.html`, `docs/DESIGN.md`, Tests)
- Anlass: Kritik des Entwicklers an der Chat-Seite nach Screenshots (Kontextfeld mit Prompt verwechselt, umbrechende Zähler, Senden zu dominant, Kopfzeile und Burger-Menü überladen, Modellauswahl mit Gehirn-Emoji). Entwurf als klickbares Mockup besprochen, danach ausdrücklicher Auftrag zum Umbau.
- Neu `lib/icons.svg`: eigener Symbolsatz (47 Linien-Symbole, 24 × 24, Strich 1,8, `currentColor`), inklusive der fünf Modi und des Heinz-Zeichens.
- `lib/core.css` neu: Variablen für Dunkel, Hell und Auto (`data-theme`), Rand über `--ol`, Statusfarben, Schriftvariablen; Bausteine `.i .caps .pill .round .ibtn .ring-btn .lang-btn .sw .row .tile .sheet .scrim .slidercard`. Hub und Platzhalterseiten nutzen nun Variablen statt fester Grautöne und laufen in beiden Themes (noch altes Layout).
- `lib/core.js`: `Heinz.theme/setTheme/applyTheme` (Schlüssel `heinz_settings.theme`, wirkt beim Laden), `Heinz.icon()`.
- `chat.html` neu aufgebaut, Logik (Parser, Modi, Anbieterschicht, Vorladen, Tempo-Test, Update, Chats) unverändert übernommen: Kopfzeile mit Statusring (rot/orange/blau/grün), zweizeiligem Modellchip, EN/DE und Burger; Modusleiste mit Symbolen und Modusfarbe als einziger Akzent; Chatleiste (Chatliste mit Zähler, Titel, Kopieren, Neu); Antworten in Georgia ohne Kasten; Metrik-Chips in einer Zeile; wachsendes Prompt-Feld (bis 40 %, Vollbild-Editor) mit Mikrofon und Pfeil; Vorlesen/Stopp getrennt (Vorlesen wird „Vorlesen stoppen“); Kontextkarte unter dem Prompt, nur in Modi mit Kontext; Menü als Bottom-Sheet mit Schnellschaltern, Gruppen und Unterseiten (Engine, Parameter, Tempo-Test, Darstellung, Update und Info); Modellwahl als Sheet ohne Emoji; Chatliste als Drawer von links mit Suche, „Dieser Modus | Alle“ und Löschen im ⋯-Menü; Hell/Dunkel/Auto; bei wenig Platz und Fokus im Prompt Platz für den Chat (`body.kbd`). Alle neuen Texte EN und DE, Emojis aus der Oberfläche entfernt.
- Tests: 49 Seitentests und 20 Servertests grün (selbst gelaufen, simuliert). Bestehende Tests an das neue Layout angepasst (Hilfen `menu()`, `set_model()`, `set_free_model()`); neu: Kopfzeile in einer Zeile, Modellwahl, Metrik-Chips eine Zeile und wachsendes Prompt, Kontextkarte unter dem Prompt, Modusfarbe als Akzent, Themes (auch Auto hell), Menüseiten und Sprache, EN/DE bleibt im Chat, Chat-Drawer, Vorlesen-Schalter, alle Symbole vorhanden und kein Emoji, kurzer Viewport mit Tastatur. Screenshots bei 426 × 803 und 426 × 400 geprüft. Nicht auf dem Handy getestet.
- Entscheidungen des Entwicklers (in `docs/DESIGN.md`): drei Bereiche mit teils eigenen Menüs plus gemeinsame Rubrik „Einstellungen“; EN/DE bleibt in der Chat-Kopfzeile; Hell mit denselben dünnen Linien, im Dunkel teils Umrisse, möglichst wenige Linien; Systemschriften, besondere Schriften nur lokal im Repo; Online ändert Menü und Design.
- Geändert: `chat.html`, `lib/core.css`, `lib/core.js`, `lib/icons.svg` (neu), `docs/DESIGN.md`, `tests/test_pages.py`, `UEBERGABE.md`.
- Offen: Handytest (Eingabe mit Tastatur, Mikrofon, Vorlesen, Wischen im Drawer, Splitscreen); Beispielseite `tools/design/index.html`; Hub im neuen Stil; Zuschnitt und Namen der drei Bereiche; Lesemodus in warmer Serife; Werkzeuge mit Online-Sperre; Sprache der Oberfläche im Menü „Einstellungen“; Auswahl eines Modells für ein Nicht-Ollama-Engine ohne Liste nur im Menü Engine (Eingabefeld dort).

## 10.11.2026 – Design-Beispielseite (Strang AIUIheinz-Design)
- Neu `tools/design/index.html`: Katalog der Bausteine (Farben, Schrift, Knöpfe, Statusring, Zeilen/Schalter, Regler-Karte, alle Symbole, Bottom-Sheet) mit Umschalter Auto/Hell/Dunkel und EN/DE. Nur `lib/core.css`, `lib/core.js`, `lib/icons.svg`; kein `tool.json`, deshalb nicht im Hub.
- Test `test_design_page_blocks_symbols_theme_and_language`, Seite in `PAGES` (kein Fehler, keine externe Anfrage). 50 Seitentests grün (simuliert, nicht auf dem Handy).
- Konzept 15.3 (zwei Bereiche) und DESIGN.md (drei Bereiche) widersprechen sich; Abgleich mit dem Entwickler offen.

## 10.11.2026 – Hub im neuen Muster (Strang AIUIheinz-Design)
- `index.html` neu: Kopfzeile mit Statusring (rot/blau/grün nach Ollama), Titel, Theme-Knopf (Auto→Dunkel→Hell), EN/DE; zwei Bereichspillen **Chat & Modelle** und **Tools**; Werkzeuge als Zeilen mit Symbol statt Emoji-Kacheln; „Alte Versionen“ im Bereich Chat; Engine-Status unten. Auswahl in `heinz_hub.area`.
- `tool.json` bekommt `area` und `symbol`; `server.py` reicht beide Schlüssel in `/api/tools` durch (TOOL_KEYS). Alle sechs `tool.json` ergänzt.
- Tests: `test_hub_areas_switch_and_persist`, `test_hub_theme_button_cycles`; 51 Seiten- und 20 Servertests grün (simuliert, nicht auf dem Handy).

## 10.11.2026 – Pixeldisplay und Hub als Visitenkarte (Strang AIUIheinz-Design)
- Neu `lib/pixel.js`: LED-Matrix-Display (5×7-Schrift, Laufschrift, Lampen, Balken, Linie), Katalog in `tools/design/index.html`.
- Hub: Pixeldisplay mit Ollama/LiteRT-LM direkt unter der Kopfzeile (ersetzt die Statuszeilen; unsichtbarer Text für Screenreader und Tests), Bereiche als Reiter „Chats & Modelle“ / „Tools“, Tools als App-Drawer (Kacheln, `appicon` möglich), Chat-Eintrag heißt „Heinz UI“ (Arbeitsname), Slogan in Georgia kursiv, Fußzeile „Offline first“. `server.py` reicht `appicon` durch.
- Tests angepasst (51 Seiten-, 20 Servertests grün, simuliert; nicht auf dem Handy).


## 10.11.2026 – Konzept auf drei Bereiche und den Stand nach dem Design-Strang gebracht (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md`: Abschnitt 15 neu gefasst. 15.1 (was es gibt: Design-Fundament, neuer Hub mit Reitern und Pixeldisplay, neuer Chat, Anbieterschicht, Server), 15.2 (Abweichungen: Themes statt Einheitsschwarz, Symbolsatz, keine untere Leiste), 15.3 (drei Bereiche A, B, C; im Hub zwei Reiter), 15.5 (Strangstand), 15.6 (offene Punkte, neu: Handytest der Design-Umbauten, Tools im Hub). Abschnitt 12 mit aktuellem Stand je Schritt.
- Zuschnitt der drei Bereiche ist meine Ableitung aus `docs/DESIGN.md` und `docs/GEPLANT.md`; Namen und Zuordnung sind laut Design-Strang offen und gehören dem Entwickler.
- Grundlage: Commit `a86ff2e`; selbst gelaufen: 20 Server- und 51 Seitentests grün (simuliert).

## 10.11.2026 – Konzept: Begründung A/B, Hub-Chat, KI-Werkzeuge (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` 15.3: A und B sind in `chat.html` mit Absicht in einer Seite (Parameter und Modell beim Chatten ändern); Trennung keine Pflicht. Ob ein schlanker Chat im Hub zusätzlich nötig ist, ist ein Designthema und entfällt, wenn der vorhandene Chat aufgeräumt genug wird. Zweck des Testfelds (Modelle und Schnittstellen kennenlernen) ergänzt.
- Neuer Abschnitt 16: Leitbild „Werkzeuge, bei denen KI die Bedienung leichter macht“ mit dem INCIheinz-Beispiel (Notizzettel einlesen, Rezept mit Phasen, Ausgabe in Formaten), Merkmalen eines guten Kandidaten und der Liste der bisher genannten Kandidaten. Keine Änderung an der Umsetzungsreihenfolge.

## 10.11.2026 – Pixeldisplays im Chat, Hub-Lauftext mit Ampelmännchen (Strang AIUIheinz-Design)
- `lib/pixel.js`: Endlos-Lauftext (`loop`), Segmente mit Farben, `sprite`, `bar`, `run(draw,{live})` mit `wake()` (Schleife läuft nur bei Bewegung, pausiert bei verstecktem Tab), Sprites `SPRITES.stop/walk`.
- Hub: Anzeige vor der Rubrik mit Ampelmännchen + Lauftext je Bereich (ersetzt die zwei Zeilen unter der Kopfzeile).
- Chat: Modellchip als Pixeldisplay (Modus · Engine, Modell) mit Token-Puls (`pulse.e` wird in `onDelta` angehoben), Tempo-Test mit Balken je Lauf und Fortschritt, Update-Seite mit Lichtlauf/Balken. Fallstrick: die Klasse `.sr` ist in `chat.html` schon der Modus-Punkt der Chatliste, der unsichtbare Chip-Text heißt deshalb `.chip .hid`.
- Tests: 52 Seiten-, 20 Servertests grün (simuliert; Aussehen und Laufschrift auf dem Handy offen).

## 10.11.2026 – Rückbau von Pixeldisplays, Menüanalyse (Strang AIUIheinz-Design)
- Nach dem Handytest entfernt: Pixeldisplay im Hub (Lauftext, Ampelmännchen), im Tempo-Test und auf der Update-Seite. Der Modellchip im Chat mit Token-Puls bleibt. `lib/pixel.js` und der Katalog bleiben.
- Neu `docs/ANALYSE_MENUE.md`: Menüstruktur aus Sicht des Anwenders (Engine vor Modell, Online-Schalter, Parameter-Schnellzugriff, Farblogik, Chat-Titelzeile). Nur Analyse, nichts umgebaut.
- Tests: 52 Seiten-, 20 Servertests grün (simuliert).


## 10.11.2026 – Korrektur: Cloud-Antworten brachen ab, Modellliste uneinheitlich (Chat „AIUIheinz-Fix-Cloud“)
- Handytest (Google AI Studio über eigenen Endpunkt): Antworten wurden von Frage zu Frage kürzer und endeten mitten im Wort; die Modellliste war mal 5, mal 15 Einträge lang.
- Ursache Abbruch: nicht auf dem Gerät belegt. Wahrscheinlichster Grund laut Googles Dokumentation und Forum: Gemini-Modelle denken, und die Denk-Token zählen zur Token-Grenze (`max_tokens`). Die Seite sendet die Grenze nur im Schnellmodus (Standard 150), dort frisst das Denken die Antwort auf. Zweiter Verdächtiger: Gemini 3 empfiehlt Temperatur 1.0; die Modi senden 0.15 und top_p 0.30 (Google warnt vor Schleifen und schwächeren Antworten).
- Geändert (`lib/providers.js`): `chatOpenAI` liefert `stats.finishReason` (`stop`/`length`) und `stats.reasoningTokens`. (`chat.html`): bei `length` steht unter der Antwort ein Hinweis (EN/DE), nicht im Verlauf gespeichert; bei leerer Antwort und `length` statt „Keine Antwort“.
- Ursache Modellliste: mehrere Abrufe liefen gleichzeitig (Engine-Wechsel, Schlüssel-Feld, Knopf), der langsamere, ältere überschrieb den neueren. `loadModels` zählt jetzt Abrufe, bricht den alten ab, nur der jüngste gilt; Status „Modellliste wird geladen…“ und „geladen: n Einträge“.
- Tests: 2 neue (Abbruchhinweis, jüngster Abruf gewinnt), beide ohne Korrektur rot (Mutationsprüfung). 54 Seiten-, 20 Servertests grün (simuliert, nicht auf dem Handy; echtes Gemini nicht erreichbar).


## 2026-11-10 · AIUIheinz-Design · Einstellungen als Panel (Stufe 2)
- `chat.html`: Einstellungen als Panel von rechts (ca. 2/3 Breite, Tippen links schließt). Oben Schnellbereich "Jetzt": Reload-Kreis (aus dem Update-Menü hierher verschoben), Engine (gesperrte Online-Engines mit Schloss, Tippen → "Online erlauben?"), Modell, Parameter inkl. Threads mit "geändert"-Punkt, Zurück / Als Modell-Standard speichern / Werte kopieren (`settings.modelParams[provider|model]`).
- Rubriken: Gespräche, Antwort, Leistung, Verbindung, Datenschutz, App, je mit Geltungsbereich. Seite "Parameter" entfällt.
- Update-Seite: kleine LED-Zeile (Raster 2 px, 3x5-Schrift, dünner Balken) mit Zuständen prüfen/neu starten/fertig/aktuell/Fehler.
- Tests angepasst (54 + 20 grün, simuliert; nicht auf dem Handy geprüft).

## 2026-11-10 · AIUIheinz-Design · Ampel, Chat-Name, Equalizer (nach Handytest)
- Ring bei Cloud-Engines: rot (Online aus oder Schlüssel fehlt), grün (bereit, nichts wird vor dem Senden übertragen); beim Warten auf das erste Token orange, beim Antworten grün.
- Chat-Name in der Infozeile: Label "CHAT" in Modusfarbe, Titel fett, Haarlinien links/rechts als Abgrenzung.
- Equalizer (6 Balken) sitzt links unter dem Heinz-UI-Ring, der Statustext läuft rechtsbündig bis zum Rand.
- Tests angepasst (54 + 20 grün, simuliert).

## 2026-11-10 · AIUIheinz-Design · Statuszeile und Panel-Reihenfolge (nach Handytest)
- Statustext linksbündig unter dem Ring (gehört zum Ring), Equalizer rechts als kleines Rechteck (5 Balken, Rahmen, etwa Breite der Menü-Taste).
- Einstellungs-Panel: keine Symbole vor den Einträgen, Beschreibungen der Schalter ausgeblendet (kompakter). Reihenfolge: Engine, Modell, Parameter, Standardwerte, eigener Systemprompt, Schnellmodus, "Max. Antwort-Token" (ausklappbar), darunter Gespräche, Leistung, Verbindung, Datenschutz, App.
- Tests grün (54 + 20, simuliert).

## 2026-11-10 · AIUIheinz-Design · Einstellungen nach Skizze
- Kopf: Reload-Kreis links, Titel mittig, X rechts; auf der Update-Seite sitzt dort eine kleine Pille "UPDATE" (kein Symbol), die LED-Zeile zeigt die Version zentriert.
- Hauptseite: große Buttons "Engine" und "Modell" mit kleiner Info darunter. Engine öffnet eine eigene Seite mit Engine-Liste (Hinweise bleiben, Schloss = nicht verfügbar) und Verbindungsdetails darunter. Modell öffnet die Modellliste.
- Parameter-Fenster (abgesetzt): Standardwerte, kompakte Ein-Zeilen-Regler (Temp, Top-P, Top-K, Kontext, Threads), Reset/Speichern/Werte kopieren. Danach Gruppe Eigener Systemprompt, Schnellmodus, Max. Antwort-Token (ausklappbar). Danach Leistung, Datenschutz, App.
- Rubrik "Chats" aus den Einstellungen entfernt (Verwaltung über die Chat-Liste links).
- Equalizer: Pillenform (4 Balken) etwa unter der Menü-Taste; feste Farben: grün = Antwort (Pegel), orange = Denken (Welle) / Laden (Lichtlauf), rot = offline.
- App-Höhe: `height:100%` mit `max-height:100dvh` statt `100dvh` (Eingabezeile war auf dem Handy nach unten verrutscht, vermutlich dvh-Abweichung; nicht auf dem Gerät bestätigt).

## 2026-11-10 · AIUIheinz-Design · Feinschliff nach Handytest (14:10)
- Laufdisplay: Engine blau (#8ab4f8), Modell gelb (#fdd663), unabhängig vom Modus; die Buttons Engine/Modell im Einstellungs-Panel tragen dieselben Farben (zweizeilig: Label + aktueller Wert, 78 % Breite, zentriert).
- Kopfzeile: Laufdisplay, Sprachschalter (fast runde Segmente) und Menü-Taste 44 px hoch; Equalizer-Pille so breit wie Sprachschalter + Menü-Taste (Balkenzahl nach Breite), Statustext mit Abstand davor.
- Lesen/Stopp: beide Buttons immer sichtbar unter der Eingabe, je nach Zustand deaktiviert (Stopp nur beim Antworten, Vorlesen nur mit Ausgabe).
- Prompt mehrzeilig: Text läuft volle Breite, Mikro/Senden klein darunter rechts, Vollbild-Symbol oben rechts (Klasse `.multi`).
- Scrollen: der Chat folgt der Live-Ausgabe nur, solange nicht nach oben gescrollt wurde; Pfeil-Button (`#jump-bottom`) springt ans Ende.
- Antwort-Aktionen (Kopieren, Teilen wenn vom Browser unterstützt, Markdown herunterladen) unter jeder Modellantwort; Kopierbutton der eigenen Eingabe bleibt rechts am Modul.
- Update-Seite: Pille UPDATE und LED-Zeile mittig, 78 % Breite; LED-Text links, vertikal mittig.
- API-Schlüssel-Feld: `type=text` mit `-webkit-text-security` und Autofill-Sperrattributen, damit Android den Passwort-Manager nicht anbietet (nicht auf dem Gerät bestätigt).
- Neuer Test für Scrollverhalten und Aktionsleiste; Tests 55 + 20 grün (simuliert).

## 2026-11-10 · AIUIheinz-Design · Chat umbenennen, Pins, Equalizer-Modi, Typografie
- Chat-Titelzeile: Bearbeiten-Symbol, Umbenennen direkt in der Zeile (`currentName`, im gespeicherten Chat als `name`/`title`). Zeile jetzt fast schwarz mit dezent leuchtender Outline (Modusfarbe); die Linie unter der Modusleiste entfällt.
- Chat-Liste, Drei-Punkte-Menü: Umbenennen (inline), Anpinnen/Lösen (max. 5, Pins stehen oben, Pin-Symbol), Exportieren (.md), Löschen.
- Equalizer-Modi: Antwort/Vorlesen = Pegel (grün); Warten auf erstes Token = zuckender horizontaler Balken (orange); Laden/Verbindung = laufende Wählpunkte (orange); sonst Grundlinie in Statusfarbe.
- Engine-/Modell-Buttons als Pillen mit gleichen Abständen; Update-LED-Zeile mittig in Buttonbreite (`.led.updled`).
- Überschriften und Tabellen der Modellantwort in Serifen.
- Test für Umbenennen und Pin-Limit; Tests 56 + 20 (simuliert).

## 2026-11-10 · AIUIheinz-Design · Feinschliff 15:10
- Chat-Liste: Pin-Symbol vorangestellt, dünne Trennlinie unter dem Pin-Bereich; neue Option "Chat kopieren" im Drei-Punkte-Menü.
- Eingabe: Schrift 1.1 rem; Fenster expandiert, sobald die zweite Zeile umbricht (Zeilenhöhe aus Computed Style), bleibt dann expandiert.
- Equalizer: Laden/Verbindung = blaue Wählpunkte, Arbeiten = orangefarbener Balken, Antwort = grüner Pegel.
- Statuszeile: kleine LED in Statusfarbe vor dem Text (Variante A), Text mit Abstand zum Equalizer.
- Engine-/Modell-Pillen schlanker (50 px, 74 %) mit viel Schwarzraum und dezentem Glow; UPDATE-Pille gleicher Glow.
- Kopfzeile: Abstände um Sprachschalter angeglichen (Menü-Taste schmaler, rückt näher).

## 2026-11-10 – AIUIheinz-Design: Korrekturen Gruppe 1 (15:45-Meldung)
- LED-Punkte kleiner und schärfer (Raster, Zeichen- und Zellgröße unverändert): `Pixel` Punkt = 0,55 × Raster, Glow halbiert.
- Stopp: runder Knopf mit Quadrat ersetzt den Sendeknopf nur während der Ausgabe; Vorlesen als Symbol in der Aktionszeile unter der letzten Antwort. Die Zeile unter dem Eingabefeld entfällt.
- Farblogik: rot/orange = fehlende Verbindung/Information (Ollama ohne geladenes Modell: orange), blau = bereit und „denkt“ (Balken blau), grün nur beim Antworten. Cloud bereit = blau. Wählpunkte beim Vorbereiten orange. Keine Symbole mehr in den Statustexten.
- Ring-Button mit dunklem Rahmen wie die Equalizer-Pille; Update-LED über die volle Breite; Chatleiste enger, „Neuer Chat“ abgesetzt mit Hintergrund.
- Fehler behoben: Modellliste zeigte bei fremder Engine Ollama-Modelle (`modelsFor` merkt die Engine der Liste).
- Nicht auf dem Gerät getestet (nur Playwright, simulierter Server).
- Geplant (nicht gebaut): Modell-Standard vs. eigene Werte, App-Sicherung unter App → Info/Sicherung/Update, Prompt-Verwaltung (Prompt-Bibliothek: benannte Systemprompts, Auswahl je Modus/Chat, Schnellwahl, Export/Import) erst viel später.

## 2026-11-10 – AIUIheinz-Design: Kosmetik 16:15
- Sprachschalter oben grau (keine Modusfarbe). Chatmenü: fünf Symbol-Pillen in einer Zeile (Titel als Tooltip).
- Engine-/Modell-/Update-Pille identisch: 62 % Breite, kleinere Schrift, weicherer Glow. Ring-Fassung grauer (2 px #3c4043).
- Update-LED mit 5×7-Schrift (2 Pixel Rand oben/unten bei 11 Zeilen).
- Antwortsprache strikt: Systemprompt „strikt Englisch/Deutsch, auch bei fremdsprachiger Eingabe“. Sprachwechsel lädt das Modell neu (Preload, Prompt ändert sich) – bewusst.
- Nicht auf dem Gerät getestet.

## 10.11.2026 – Konzept: Release Candidate (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` Abschnitt 17: Stand des Release Candidate (Commit 036ff46) mit Aufbau, Farblogik, Handy-Messung des Tempo-Tests (qwen2.5:3b, 2 Threads am schnellsten) und offenen Punkten; Hub- und Chat-Beschreibung in 15.1 angepasst.
- `UEBERGABE.md`: Zeile „Designregeln“ verweist auf `docs/DESIGN.md` (Themes statt „schwarz und Google-Farben“), Designer-Fallstricke ergänzt. `docs/OLLAMA_UND_MODELLE.md`: Messung ergänzt.
## 2026-11-10 – AIUIheinz-Design: Korrekturen 16:50
- Eingabezeile: App-Höhe wird per JS aus `visualViewport` gesetzt (`--appH`, bei Laden, resize, pageshow und nach 0,15–2,5 s), unten 6 px Abstand. Ursache vermutet: falsche Viewport-Höhe direkt nach Laden/Update (nur simuliert geprüft, nicht auf dem Gerät).
- Heinz-UI-Logo im Ring als Pixelschrift (Canvas, 3×5-Schrift); Ring 52 px, Linie 2 px.
- Parameter-Fenster mit Reitern Parameter | Prompts (Platzhalter). Umschalter „Modell-Standard | Meine Werte“ ersetzt den Haken; bei Modell-Standard sind die Regler gesperrt; Speichern gilt je Modell und wird bei „Meine Werte“ automatisch geladen.
- Statustext: Tipp zeigt den vollen Text (8 s). „Modellliste geladen“ öffnet die Modellliste. Papierkorb-Pille invertiert. Erste Nachricht mehr Abstand, Modusnamen größer, Speedtest-Zeilen farbig.
- Antwortsprache wieder wie vorher („Respond in English.“), keine Verschärfung.

## 2026-11-10 – AIUIheinz-Design: Korrekturen 17:30
- Status gelb = Handshake offen (Cloud/eigene Engine, Modellliste noch nicht geladen), blau = bestätigt. Equalizer: blau = langsamer Ping, gelb = langsames Blinken. Vorladen gibt es weiter nur lokal.
- Heinz-UI-Logo als Strichschrift (SVG, 1,3 Einheiten dick), Ring-Fassung dünner. Segment Modell-Standard/Meine Werte schaltet sofort. Punkt vor dem aktiven Reiter; Reset heißt „Zurücksetzen“.
- „Modellliste laden“ nur, bis eine Liste da ist; danach ist die Statuszeile (unterstrichen) der Zugang. Statustext oben klappt per Tipp mehrzeilig auf, ohne den Equalizer zu verschieben.
- Tempo-Test: Termux-Haken statt Auswahl (Standard im Hintergrund), bei Cloud-Engines komplett ausgegraut; Zeilenfarbe je Thread-Zahl (beide Läufe gleich).
- Sprachschalter kleiner, Modus-Zeile 6 px tiefer. Nicht auf dem Gerät getestet.

## 2026-11-10 – AIUIheinz-Design: Korrekturen 18:00 + Sicherung
- Zoom-Fehler (Seite sprang nach Doppeltipp auf den Statustext stark vergrößert): `touch-action: manipulation`, `--appH` rechnet `visualViewport.scale` ein.
- Logo: Strichschrift mit abgeflachten Ecken (bevel/butt), „I“ nur ein Strich, mehr Abstand, per SVG exakt mittig. Ring-Fassung zweifarbig (dunkel außen, hell innen wie die LED-Pille), Abstand zum Leuchtring kleiner.
- Equalizer pulsiert nur bei sichtbarer App. Reiter-Punkt nur vor dem aktiven Reiter (orange Punkt entfernt), Knopf „Reset“. Engine-Liste: „Schlüssel vorhanden“. Sprachschalter 34 px hoch.
- Neu: App-Sicherung (Export/Import als JSON, Schlüssel nur auf Wunsch) unter Menü → Info, Sicherung, Update. Test: Rundlauf.
- Geplant: mehrere eigene OpenAI-kompatible Engines (Server + Schlüssel je Eintrag) – heute gibt es nur einen „custom“-Platz.
- Nicht auf dem Gerät getestet.

## 2026-11-10 – AIUIheinz-Design: Parameter in drei Ansichten (19:20)
- Parameter-Quellen getrennt: **Modell** (`/api/show` bzw. Ollama-Standard, gesperrt, es wird nichts gesendet), **Modus** (Vorgabe, gesperrt, wird gesendet), **Meine** (frei, Speichern/Reset nur hier). „Meine Werte“ gelten je Modell UND Modus (`modelParams["engine|modell|modus"]`, alte Schlüssel ohne Modus gelten als Rückfall); die Wahl der Ansicht merkt sich `paramSrcBy` je Schlüssel, vorhandene eigene Werte werden automatisch geladen.
- Fehler behoben: `modelParams` wurde beim Start nicht aus dem Speicher gelesen, gespeicherte Werte waren nach dem Neuladen weg.
- Reset/Speichern leuchten in der Auszeichnungsfarbe, wenn bedienbar. Hinweistext nennt Ziel (Modell · Modus).
- Aktionszeile unter der Antwort erst nach Ende der Ausgabe. Chatliste scrollt beim Öffnen der Symbolzeile; „Alle · N“ zeigt die Gesamtzahl. Logo als serifenlose Schrift. Equalizer antippbar: letzte drei Statusschritte.
- Nicht auf dem Gerät getestet.

## 2026-11-10 – AIUIheinz-Design: Prompts, Tiles, Korrekturen (19:50)
- Fehler: Die Klasse `full` des Statustexts kollidierte mit der Vollbild-Klasse `.full` (position: fixed, inset 0) – deshalb schwarze Seite beim Antippen. Umbenannt in `st-open`; Test sichert, dass Kopfzeile und Eingabe unverändert bleiben.
- Reiter „Prompts“: Quelle Modus | Modell | Meine (`settings.sysSrc`; „Modell“ = kein Systemprompt, wie das frühere „eigener Systemprompt des Modells“). Ein eigener Prompt (`ownPrompt`) wird wörtlich gesendet (im Schnellmodus plus Kurzantwort-Hinweis), ist kopierbar; „Kopie bearbeiten“ übernimmt den Modus-Prompt. Der Schalter „Eigener Systemprompt“ im Menü wählt „Meine“, öffnet bei leerem Prompt den Editor. Eingaben des Nutzers lassen sich weiter pro Nachricht kopieren.
- Tempo-Test: Thread-Auswahl als Kacheln mit Glow (violett = schneller Kern, blau = mittlere, grün = langsame), Kernkarte „Pixel 9 Pro: 1+3+4“. Gerätelisten später.
- Logo-Fassung dünner (1+1 px), Chatliste fährt Aktionen weiter ins Bild.
- Nicht auf dem Gerät getestet.

## 2026-11-10 – AIUIheinz-Design: Nur Modus-Vorgaben, Threads je Modell (20:30)
- Schalter „Eigener Systemprompt“ entfernt (der Reiter Prompts → Quelle „Modell“ deckt es ab). Neu: Schalter „Nur Modus-Vorgaben“ (`settings.modesOnly`): Prompt und Werte kommen allein aus dem Modus; eigene Werte, eigener Prompt und Modell-Einstellungen werden ignoriert, Auswahl-Knöpfe gesperrt. Threads bleiben Modell-Einstellung und gelten immer.
- Threads als eigener Block „Threads · Modell“ unter den Parametern (je Modell gespeichert, in jedem Modus, auch bei „Nur Modus-Vorgaben“).
- Tempo-Test-Kacheln im Knicklicht-Look (hellgrün, hellblau, hellviolett). Die Farben sind nur Hinweis auf die Kern-Cluster: der Test setzt nur die Thread-Zahl, der Android-Scheduler wählt die Kerne. Idee für später: Test auf bestimmte Kerne festnageln (z. B. `taskset` beim Start des Ollama-Servers durch `server.py`).
- Statuspunkt unter dem Ring zentriert, Logo-Text tiefer, Chatliste fährt Aktionen weiter ins Bild.
- Nicht auf dem Gerät getestet.

## 2026-11-10 (AIUIheinz-Design) – Chat-Liste, Schnellmodus-Kachel, Logo in lib/
- Chat-Liste: Ursache der abgeschnittenen Pillen war eine kaputte CSS-Regel (Scroll-Regel von `#saved-list` stand als ungueltiges `.saved-item { border-top flex:1 ...}`); Liste scrollt jetzt (flex, overflow, 150 px + Safe-Area Polster), Drawer-Hoehe folgt `--appH`, `revealRow` laeuft zweimal. Neuer Test.
- Einstellungen: "Nur Modus-Vorgaben" eigene Kachel; Schnellmodus + Max.-Antwort-Token (nur Schnellmodus, Standard 300) zusammen in einer Kachel.
- Speedtest-Kachel gruen: hellere, mildere Tuerkis-Mint-Toene (#b9f7d2).
- Logo/Metallring nach `lib/core.css` (`.ring-btn.metal`) und `lib/core.js` (`Heinz.ringLogo`), Werte in docs/DESIGN.md. Nur simuliert getestet (62+1 Seitentests, 20 Servertests), nicht auf dem Geraet.

## 2026-11-10 spaet (AIUIheinz-Design) – Design-Ueberarbeitung abgeschlossen
- Eigenes Auswahl-Popup statt Android-Liste (`Heinz.enhanceSelects`), Pillen der Chat-Liste 10 px tiefer.
- Tastatur: Kopfzeile gleitet weg; Kontextfeld einzeilig bis Fokus; Telemetrie In/Out mit Leistungsfarben (vorlaeufige Schwellen); eigene Modusfarben (Audit Sandgold, Creative Violett, getrennt vom Statusgelb).
- Tempo-Test: Balkenkarten, Tabelle klappbar, Uebernehmen-Button angeheftet.
- Neuer Auftrag fuer Folge-Chat: docs/AUFTRAG_Modi.md. Aufgeschobenes in docs/DESIGN.md. Nur simuliert getestet (67 Seitentests, 20 Servertests).
- Tempo-Test live: Balkenkarten stehen ab Start, laufender Balken bewegt sich mit Sekundenzaehler, Gesamtfortschritt oben; Pillen der Chat-Liste 20 px Abstand. DR1 abgeschlossen, DR2-Planung in docs/DESIGN.md.

## 10.11.2026 – Konzeptphase 2, Auftrag Modelle (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` Abschnitt 18: zwei Hub-Einträge (Heinz UI als Testumgebung, neuer schlanker Chat), Schnittstellenlücke bei Cloud-Anbietern, Grobplanung des Einrichtungsassistenten mit offenen Fragen; 15.3 verweist darauf.
- Neu `docs/AUFTRAG_Modelle.md` für den Strang „AIUIheinz-Modelle“ (Modellmanager). `docs/AUFTRAG_Modi.md` Punkt 3 mit Hinweis auf Abstimmung ergänzt.

## 10.11.2026 – Schnittstellen Google und LiteRT-LM (Chat „AIUIheinz-Modelle“, Phase 1, nur Dokumente)
- Neu `docs/SCHNITTSTELLEN.md`: Parameter-Matrix für Google AI Studio (kompatibel und nativ), Modellliste (`models.list` liefert `thinking`, `maxTemperature`, `topK`, Token-Grenzen), Denkstufen, LiteRT-LM serve (Endpunkte, Konfigurationsdatei, Einbettung), Gallery-Funktionen und ihre Erreichbarkeit, Sonden-Konzept. Jede Aussage mit Status belegt, Drittquelle, vermutet oder unbekannt.
- Wichtige Funde: Gemini 3.x: Temperatur bei 1,0 lassen, `frequency_`/`presencePenalty` ergeben laut Firebase-Referenz Fehler 400, Denken nicht abschaltbar, `thinking_level` und `thinking_budget` nicht zusammen. LiteRT-LM serve dokumentiert keinen einzigen Anfrageparameter; Sampling, Threads, Backend und Denken kommen aus `~/.litert-lm/config.json` je Modell-ID; `/v1/embeddings` existiert.
- `docs/MODELLQUELLEN.md`: Beschlüsse des Entwicklers (Datenschutzstufe als Hauptfilter, AI Horde zurückgestellt, Haltung) ergänzt.
- Nichts davon ist auf dem Gerät geprüft; die Sonde (Abschnitt 4) ist nur geplant. `lib/providers.js` blieb unberührt.
- (10.11.2026 abends, Strang Modelle) `docs/SCHNITTSTELLEN.md` Abschnitt 6: Beschlüsse des Entwicklers (Parameter je Schnittstelle ausgrauen, Modellvorgaben als Daten, Denken als ein Schalter, Token-Definition, NPU, Einbettung getrennt); `litert-lm serve --help` vom Handy (Host 127.0.0.1, `--config`, `--cors-origin`, Doku veraltet). Nur Dokumente.

## 10.11.2026 (nachts) – Fähigkeitendaten, Auftrag Chat, Konzept 19 (Chat „AIUIheinz-Modelle“)
- Neu `lib/capabilities.json` (nur Daten, Version 1): Zustände je Regler, Engine und Modell (`on`, `unknown`, `off`, `error`, `fixed`, `config`) mit Status der Quelle; Regeln für Gemini 3 (Temperatur 1,0 empfohlen, Penalties Fehler 400, Denken nicht abschaltbar) und Gemini 2.5; Denkstufen mit Schnell/Tief und `effortMap`; LiteRT-LM-Konfigurationsschlüssel; Token-Statistik-Definition. Neu `tests/test_capabilities.py` (6 Tests, mit Referenz-Auflöser), in `tests/run_all.sh` eingehängt.
- Neu `docs/AUFTRAG_Chat_Schnittstellen.md`: Auftrag für den Strang „AIUIheinz-Chat“ (Daten laden, Regler nach Zustand, Schnell/Tief über `reasoning_effort`, Token-Statistik, optional native Google-Modellliste, Export). Vorrang vor dem Denken-Teil von `AUFTRAG_Modi.md` (Entscheidung des Entwicklers).
- `docs/KONZEPT.md` Abschnitt 19 neu (Fähigkeiten als Daten, Denken, Token-Statistik, LiteRT-Konfiguration über `server.py`, Funktionsplätze, Wissensquellen mit Einbettung und Offline-Wikipedia, Reihenfolge, Offen); `docs/SCHNITTSTELLEN.md` Abschnitt 7.
- Kein Code der Seiten geändert; `lib/providers.js`, `chat.html` und `server.py` unberührt. Nichts auf dem Gerät geprüft.

## 10.11.2026 (abends) – Chat-Schnittstellen und Modellwahl je Engine (Chat „AIUIheinz-Chat“)
- Auftrag `docs/AUFTRAG_Chat_Schnittstellen.md` umgesetzt (Punkte 1 bis 4 und 6; Punkt 5, native Google-Modellliste, nicht gebaut). `lib/providers.js`: `HeinzCaps` (lädt `lib/capabilities.json` einmal, `cell`, `thinking`, gleiche Auflösung wie `tests/test_capabilities.py`; bei Ladefehler bleibt alles aktiv); `chatOpenAI` sendet `reasoning_effort`, Statistik jetzt mit `reasoningTokens`, `visibleTokens`, `totalTokens`, `tokensPerSecAll`, `source`.
- Chat: Regler nach Zustand. `unknown` normal mit Marke „unverified“ (Tippen zeigt den Hinweis), `off/error/fixed/config` ausgegraut, Tippen nennt den Grund, Wert wird nicht gesendet (Temperatur, top_p, top_k, num_ctx, stop, num_thread, Max.-Token). Empfehlung (Gemini 3: Temperatur 1,0) nur als Hinweis mit Knopf „Empfehlung übernehmen“, nie still gesetzt, Modusvorgaben unberührt.
- Denken: Schalter „Schnell | Tief“ im Chat nur bei Modellen mit `thinking`-Regel, Stufe je Engine und Modell gespeichert (`settings.thinkBy`), Standard = nichts senden; gesendet wird `reasoning_effort` (nie mit `thinking_level` oder `thinking_budget`).
- Kennzahlen: Denk-Token als eigener Chip, „~“ bei Schätzung, Tooltip mit beiden Geschwindigkeiten. `outputIncludesReasoning` ist unbekannt: nichts abgezogen, Export vermerkt „nicht vergleichbar“. Export (`paramsText`) um Zustand je Regler, Denkstufe und letzte Token-Werte ergänzt, nie Schlüssel.
- Modellwahl: „Einmal gewählt, bleibt gewählt“. `loadModels` ersetzt ein gewähltes Modell nie durch einen Listeneintrag; `switchProvider` speichert sofort (`persistCurrent`); `init` nimmt Engine und Modell als Paar. Ursache der abgeschnittenen Cloud-Antworten (Eintrag „Korrektur: Cloud-Antworten“ oben) vom Entwickler bestätigt: der Schnellmodus mit 150 Token.
- Tests: 7 neue Seitentests (gesperrte Regler grau und nicht im Body, `reasoning_effort` ohne `thinking_level`, kein Schalter ohne Regel, `unknown` aktiv mit Marke, Empfehlung, Denk-Token, Ladefehler, Online aus, Modell bleibt) mit gegengeprüften Gegenfällen; zwei Mutationen erkannt. Nur simuliert, nicht auf dem Gerät geprüft.

## 11.11.2026 – Handytest Schnittstellen, native Google-Modellliste (Chat „AIUIheinz-Chat“)
- Handytest (Entwickler, Gemini 3.8 flash): Regler-Zustände, Hinweise, Schnell/Tief-Schalter und Modellwahl je Engine arbeiten wie gedacht. Messwerte in `docs/SCHNITTSTELLEN.md` 8.1.
- Fehler gefunden: „Schnell“ sendete `minimal`, Google lehnt das bei `gemini-3.8-flash` mit 400 ab. Neue Regel `gemini-3.8-flash` in `lib/capabilities.json` mit `fast: low`.
- Native Google-Modellliste (`lib/providers.js`, `models()` und `modelMeta()`): nur Chat-Modelle (`generateContent`), Limits und Denk-Flag im Modellblatt und Export, Schlüssel nur im Header, bei Fehler Meldung und kompatible Liste.
- T/s bei Antworten unter 5 Token nicht mehr berechnet (zeigte 333 T/s bei 2 Token), Anzeige „–“.
- Offen: `top_k` wird auf der kompatiblen Route nicht gesendet; native Anfrage (`generateContent`) wäre ein größerer Umbau der Anbieterschicht. Nur simuliert getestet.
- (11.11.2026 nachts) Schnell = `low` für alle Gemini-3-Flash-Versionen (Regel `gemini-3-flash`, eigene 3.8-Regel entfällt). Export enthält jetzt „Last request“ (Body ohne Schlüssel, ohne Nachrichtentext) und „Last response“ (rohes `usage`, finish, Chunks, Zeiten): damit sind Temperatur und Denk-Token-Meldung prüfbar. Gewollt und per Test festgehalten: Online aus fällt auf Ollama, Online an bleibt lokal.
- (11.11.2026) Denk-Token werden aus `total_tokens` abgeleitet, wenn die Engine keine `reasoning_tokens` meldet (Chip „Think“ mit `~`, `stats.reasoningDerived`); Messung in `docs/SCHNITTSTELLEN.md` 8.4. Neu `docs/HINWEIS_Konzept_Chat.md` für den Konzept-Agenten (native Chat-Anfrage als Schwerpunkt, Bilder, Export-Entwurf).
- (11.11.2026) Testprotokoll je Antwort: Knopf (Symbol Terminal) in der Aktionszeile jeder Antwort der Sitzung, Momentaufnahme zum Sendezeitpunkt (`paramsText()` + `capsStates()` + `exchangeText()`), auch bei Fehlern. „Werte kopieren“ heißt jetzt „Parameter kopieren“ mit Hilfetext und enthält nur Parameter und Modelfile. Das Protokoll wird nicht gespeichert (nur im Speicher der Sitzung), damit der Browser-Speicher nicht wächst.
- (11.11.2026) Regler-Layout: die Hinweiszeile unter einem Regler (`.cap-row`) lag per Gitter-Reihenfolge zwischen Name und Regler und machte Temperatur und Top-K winzig; jetzt `order: 5`, alle Regler gleich breit, Name vorn. Temperatur-Regler heißt „T°“. Export-Notiz: bei abgeleiteten Denk-Token „outputTokens exclude the thinking tokens“; `capabilities.json` gemini-compat `outputIncludesReasoning: no` (gemessen). Test `test_sliders_use_full_width_with_short_label_even_when_hints_are_shown` (Mutation erkannt).

## 11.11.2026 – Native Google-Chat-Anfrage (Chat „AIUIheinz-Chat“)
- Neue Engine `google` („Google AI Studio (native)“) mit `chatGemini` in `lib/providers.js`: `streamGenerateContent`, `topK`, `thinkingConfig` (Level oder Budget nach Modellregel), echte Denk-Token aus `thoughtsTokenCount`, Schlüssel nur im Header, Modellliste nativ (nur Chat-Modelle). Die Custom-Engine mit OpenAI-kompatibler Google-Adresse bleibt unverändert.
- `lib/capabilities.json`: Engine `google`, `modelRulesFrom` (Modellregeln gemeinsam mit `gemini-compat`), Endpunktregel der kompatiblen Route auf `…/v1beta/openai` verengt; `tests/test_capabilities.py` und `HeinzCaps.modelRule` angepasst. Testprotokoll zeigt statt Nachrichtentext nur Anzahlen (`[1 contents]`, `[system]`).
- Tests: 4 neue Seitentests (FakeGemini), Mutation (Level statt Budget) erkannt. Nur simuliert, nicht am Gerät geprüft.

## 11.11.2026 – Konzept 20 generative KI, Nachtrag Auftrag Modelle (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` Abschnitt 20: Funktionsplätze nach dem SIM-Prinzip, Fähigkeit statt Modellname bei Abkündigungen, Orte in der App (Chat zuerst, Einlesen, Bildstudio, Sprache), Heimserver-Engine, Sprache auf zwei Wegen mit Browser-Rückfall, Medienspeicher (IndexedDB), Datenschutz, Kennzeichnung, Reihenfolge; Video ausgeschlossen (ferne Version).
- `docs/AUFTRAG_Modelle.md`: Nachtrag mit sieben Aufgaben (Fähigkeitendaten um Ein- und Ausgabearten, Modellwechsel-Auflösung, Bild und Sprache bei Google, Kennzeichnung, Browser-Sprache, Heimserver, Medienspeicher).

## 11.11.2026 – Konzept 20: Prüfung lokaler Sprache, Reihenfolge Einlesen vor Bildstudio (Chat „AIUIheinz“, nur Dokumente)
- Beschlüsse des Entwicklers eingetragen: Einlesen vor Bildstudio, IndexedDB-Medienspeicher, App prüft, ob Sprache lokal läuft, und weist sonst hin (Konzept 20.5); Auftrag Modelle Punkt 5 entsprechend ergänzt.

## 11.11.2026 – Handytest native Engine, Temperatur bis 2 (Chat „AIUIheinz-Chat“)
- Handytest (Entwickler, gemini-3.8-flash, nativ): HTTP 200 in Schnell und Tief; `thinkingLevel` in Kleinschreibung wird angenommen; Tief meldet `thoughtsTokenCount` 5679, Rechnung 76 + 153 + 5679 = 5908 geht auf, `candidatesTokenCount` enthält die Denk-Token also nicht (`outputIncludesReasoning: no` für `google`); bei Schnell fehlt `thoughtsTokenCount`. Erste Zeichen bei Tief nach 35,5 s, danach Burst (T/s bedeutungslos). `topK` 1 und 64 werden akzeptiert (200), Wirkung bei Gemini 3 noch offen (Prüfung mit Temperatur 2).
- Fehler: der Temperatur-Regler stand fest auf Maximum 1.0, der Entwickler konnte Temperatur 2 nicht einstellen. Neu `tempRange()` in `chat.html`: Obergrenze aus `maxTemperature` der Modellliste, sonst 2 bei Online-/Custom-Wegen, 1 bei lokalen Engines.
- Beschriftung: Hinweis unter dem Denken-Schalter und Testprotokoll nennen bei der nativen Engine `thinkingLevel`/`thinkingBudget` statt `reasoning_effort` (`thinkWire()`).
- Test `test_native_google_temperature_goes_up_to_two_while_local_engine_stays_at_one`. 90 Seitentests grün, nur simuliert.

## 11.11.2026 – Aufträge auf den Stand gebracht (Chat „AIUIheinz“, nur Dokumente)
- `docs/AUFTRAG_Modelle.md`, `docs/AUFTRAG_Chat_Schnittstellen.md`, `docs/AUFTRAG_Modi.md`, `docs/AUFTRAG_Tertius.md`: je ein Block „Stand 11.11.2026“ (erledigt, offen, Reihenfolge, Abstimmung). Modi: Reasoning und Schnell/Tief hat der Chat-Strang gebaut, Auftrag nicht ohne Rücksprache starten. Modelle: Medien-Nachtrag vorrangig. Chat: Aufgaben 1 bis 6 erledigt, nächste Schritte Anhänge und Medienspeicher.
- Im Projektordner (nur dort): `AUFTRAG_CHAT-SEITE.md` und `AUFTRAG_DESIGN.md` mit Stand-Block.
- (11.11.2026) top_k-Messung (Entwickler, gemini-3.8-flash, nativ, Temperatur 2, Top-P 1, „Schnell“, Frage „Nenne ein ungewöhnliches Tier“): mit topK 1 dreimal drei verschiedene Tiere (Blobfisch, Schnabeltier, Koboldmaki), mit topK 64 ebenfalls verschieden. topK wird zwar akzeptiert (HTTP 200), wirkt bei Gemini 3 aber nicht (bei topK 1 müssten die Antworten gleich sein). `lib/capabilities.json`: `top_k` bei `gemini-3-flash` auf `off` (belegt, gemessen, wird nicht gesendet); `gemini-3-pro` und `gemini-3-flash-lite` bleiben `unknown` mit Hinweis (nicht geprüft); Gemini 2.5 behält die Engine-Zelle (sendet topK). Tests angepasst, Gegenfall Gemini 2.5. 90 Seitentests und 7 Fähigkeitentests grün, nur simuliert.

## 11.11.2026 – Konzept 21 Testreihen (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` Abschnitt 21: automatisierte Parameterläufe in der Testumgebung. Beschluss des Entwicklers: erster Fall ein Modell mit vielen Parameterkombinationen, Auswertung zunächst nur durch Code, Hauptzweck ist der Export für den auswertenden Agenten. Bausteine, Betrieb (Bildschirm an, Termux sichtbar, Cloud-Obergrenze), Reihenfolge.
- `docs/AUFTRAG_Chat_Schnittstellen.md`: Schritt 1a (Testreihen) vor dem Anhang-Baustein.

## 11.11.2026 – Strang AIUIheinz-Tertius, Durchgang 1 (nur Dokument)
- Neu: `docs/TERTIUS.md` (Eindruck von außen, Befunde nach Gewicht, Eignung als Bachelor-/Masterarbeit, Qualifikationsprofil, Stellenbild, offene Fragen). Kein Code, keine fremden Dokumente geändert.
- Tests: `bash tests/run_all.sh` im Lauf grün (simuliert, nicht auf dem Gerät). Oberfläche mit simuliertem Ollama und Viewport 426 × 803 angesehen.

## 11.11.2026 – Strang AIUIheinz-Tertius, Durchgang 2 (nur Dokument)
- `docs/TERTIUS.md`: Durchgang 2 (Produktkandidaten und Kommerzialisierung, fachlicher Befund zum Label-Werkzeug, Voraussetzungen, Reihenfolge als Vorschlag). Kein Code, keine fremden Dokumente geändert.

## 11.11.2026 – Gerätetests Schnittstellen abgeschlossen (Chat „AIUIheinz-Chat“, nur Doku)
- Die offenen Fragen aus `docs/AUFTRAG_Chat_Schnittstellen.md` sind am Gerät beantwortet (gemini-3.8-flash, native Engine): `thinkingLevel` in Kleinschreibung wird angenommen (HTTP 200); `thoughtsTokenCount` kommt bei „Tief“ (bei „Schnell“ fehlt das Feld = 0); `topK` wird akzeptiert, wirkt aber nicht; CORS für `streamGenerateContent` läuft aus dem Browser (Header `x-goog-api-key`, 200 mit Stream). Einträge siehe oben („Handytest native Engine“, „top_k-Messung“).
- Nächster Schritt dieses Strangs: Testreihen (`docs/KONZEPT.md` 21), vorher Rückfrage zu 21.5.

## 11.11.2026 – Strang AIUIheinz-Modelle: Ein-/Ausgabearten, Funktionsplätze, Modellwechsel (Daten und Doku)
- `lib/capabilities.json` Version 2: neue Blöcke `media` (Medienarten, Aufrufarten, Regeln je Google-Modellname, Vorgaben je Engine, Funktionsplätze, Format der Zuordnung mit Auflösung) und `lifecycle` (Signale, Fehlermuster, Startliste für Ersatz). Alte Blöcke unverändert; es wurde kein Seitencode geändert.
- Fund: Die Denkregeln passen nach Namen auch auf TTS- und Bildmodelle; `mediaRule` muss vor der Denkregel gelten, nur `chatList: true` kommt in die Chat-Modellwahl.
- `docs/SCHNITTSTELLEN.md` Abschnitte 10 (Datenformat, Auflösung) und 11 (Modellwechsel, Recherche zu Abkündigungen). Nachtrag 3 (Bild und Sprache bei Google) folgt als Abschnitt 12.
- `tests/test_capabilities.py`: 10 neue Tests (Referenzauflösung `resolve_slot`, Medienregeln, Fehlermuster). Gesamtlauf grün (20 Server-, 16 Capabilities-, 90 Seitentests, alles simuliert, nichts am Gerät).
- Alle Eingabearten der Chatmodelle und die Angaben zu den übrigen Engines sind Vorwissen (`vermutet`), Quellen zu Abkündigungen teils nur Suchausschnitte oder Foren (`drittquelle`).

## 11.11.2026 – Testreihen Schritt 1 (Chat „AIUIheinz-Chat“)
- Entscheidungen des Entwicklers zu `docs/KONZEPT.md` 21.5: nur Browser-Speicher, ein Kopierblock mit Teilen bei Überlänge, höchstens 30 Läufe (festgehalten in 21.5a).
- Neu `lib/testreihe.js` (`HeinzSeries`: `parseList`, `expand`, `count`, `exportParts`, ohne DOM) und die Menüseite „Testreihe“ in `chat.html` (Läufer `srStart`, Hilfen `srSpec`, `srOptions`, `srRender`, `srExportParts`). Achsen: Temperatur, Top-p, Top-k, Threads (nur Ollama), Denken; Threads laufen als äußerste Achse (Modell lädt nicht neu), Wiederholungen innen. Dieselbe Anbieterschicht wie der Chat (`PV.chat`), aber ohne Chatverlauf, ohne Systemprompt, ohne Eingriff in `chatHistory`. Gesperrte Parameter (Zustand off/error/fixed/config) sind grau und gehören nicht zur Matrix; unbekannte bleiben nutzbar und stehen im Export unter „Capabilities“.
- Sicherungen: Cloud-Engines fragen mit Anzahl der Anfragen (zweites Tippen), 1,2 s Pause, nach drei Fehlern in Folge Abbruch, Wake Lock des Browsers, Online-Sperre gilt. Ergebnis wird in `heinz_series` gespeichert (Antworttexte auf 2000 Zeichen).
- `thinkEffort`/`thinkSend` haben jetzt Varianten mit Stufe (`thinkEffortFor`, `thinkSendFor`); Verhalten des Chats unverändert.
- Zahlen: Dezimalpunkt, Komma trennt Werte („0, 0.5“). Tempo-Test bleibt unverändert als eigener Weg.
- Tests: 5 neue (Logik, Matrix mit Ollama, Threads außen und Grenze 30, Stopp und drei Fehler, natives Google mit Denkstufen, gesperrtem Top-k und Bestätigung); Mutation (gesperrte Achse nicht ausgenommen) erkannt. 95 Seitentests grün, nur simuliert, nicht am Gerät geprüft.

## 11.11.2026 – Strang AIUIheinz-Modelle: Nachtrag 3, Google Bild und Sprache (nur Recherche, Daten, Doku)
- `docs/SCHNITTSTELLEN.md` Abschnitt 12: Bild lesen (inline 20 MB für die ganze Anfrage, PNG/JPEG/WebP), Bild erzeugen (Gemini-Bildmodelle über `generateContent`, Imagen über `:predict`, SynthID), Sprache ausgeben (`responseModalities AUDIO`, `speechConfig`, Ausgabe ist rohes PCM 24 kHz, kein abspielbares Format), Audio verstehen (WAV, MP3, AIFF, AAC, OGG, FLAC, 20 MB inline), Preise, Datenschutz der Gratisstufe, offene Sondenfragen.
- `lib/capabilities.json`: neuer Block `mediaGoogle` mit denselben Zahlen für Anhangsprüfung und Kostenanzeige.
- Stolperstein: Chrome-Aufnahmen (`audio/webm`) stehen nicht in der Formatliste von Google; Umrechnung zu WAV oder Sonde nötig.
- Hinweis: Google nennt die Interactions-API jetzt allgemein verfügbar (nicht gelesen); Entscheidung über einen Umstieg offen.
- Tests: 3 neue (`MediaGoogleTest`). Alles simuliert, Quellen überwiegend Suchausschnitte und Drittseiten, nichts am Gerät.
- (11.11.2026) Handytest Testreihe: Teil 1 (Ollama, 8 Läufe) lief durch, Messwerte in `docs/OLLAMA_UND_MODELLE.md` („Erste Testreihe“). Teil 2 (Google nativ) brach nach drei Fehlern ab: Der Entwickler hatte `2` ins Feld Top-p statt in die Temperatur geschrieben, Google lehnt `top_p` über 1 mit HTTP 400 ab. Neu `srRangeError` in `chat.html`: Werte außerhalb des Bereichs (Temperatur 0 bis Reglermaximum, Top-p 0 bis 1, Top-k und Threads ab 1) werden vor dem Start gemeldet, der Start bleibt gesperrt, auch `srStart` selbst sendet dann nichts. Platzhalter gesperrter Felder kurz („gesperrt“). Test `test_series_refuses_values_outside_the_allowed_range_before_any_request` (Mutation erkannt). 96 Seitentests grün, simuliert.
- (11.11.2026) Testreihe: Ein vom Nutzer abgebrochener Lauf stand mit ✓ und 0 Token in der Tabelle. Jetzt `aborted: true` im Lauf und im Export (`ok:false`), Tabelle zeigt „–“, Statustext „Gestoppt. n Läufe gespeichert (der letzte kann unvollständig sein).“ Test erweitert, 96 Seitentests grün, simuliert.
- (11.11.2026) Testreihe, Meldung des Entwicklers „ein Lauf ließ sich nicht mehr stoppen, auch nicht nach Neuladen“: im Simulator nicht nachgestellt (Stopp greift auch bei einer Anfrage, die nie antwortet). Gehärtet an zwei Stellen, die auf dem Gerät hängen konnten: Das Wake-Lock wird nicht mehr abgewartet (ein nie antwortendes `navigator.wakeLock.request` blockierte vor dem ersten Lauf, dann tat der Stopp nichts), und der Läufer prüft das Abbruchsignal vor jedem Lauf und in der Pause zwischen Cloud-Anfragen. Test `test_series_start_and_stop_do_not_wait_for_a_hanging_wake_lock` (Mutation erkannt). Ursache am Gerät nicht bestätigt, Rückfrage an den Entwickler offen. 97 Seitentests grün, simuliert.
- (11.11.2026) Testreihe, Klärung der Stopp-Meldung (Rückmeldung des Entwicklers: Google, kein Stopp-Knopf sichtbar, nach Neuladen schien weiter geprüft zu werden): Es lief nichts weiter. Die Seite zeigte beim Öffnen den Balken der zuletzt gespeicherten Reihe (`srRestore` → `srRender`) wie einen laufenden Test. Neu: Balken nur während des Laufs (bei vollständiger Reihe voll, sonst leer), jeder Lauf wird sofort mit `srSave(true)` gesichert (`unfinished`), beim Öffnen sagt der Status „Letzte Reihe: n von m Läufen gespeichert … Es läuft nichts.“, der Export vermerkt „app closed or page reloaded during the series“. Erste Google-Reihe am Gerät in `docs/KONZEPT.md` 21.5a. Test `test_series_after_reload_shows_no_running_bar_but_keeps_every_finished_run` (Mutation erkannt). 98 Seitentests grün, simuliert.
- 2026-11-11: Ideen des Entwicklers in docs/GEPLANT.md eingetragen (Entwickleroption Brummen, Sammlung offener Punkte). Nur Doku.

## 11.11.2026 – Testreihen Schritt 2: mehrere Prompts und Prüfregeln (Chat „AIUIheinz-Chat“)
- `lib/testreihe.js`: `parsePrompts` (ein Prompt pro Zeile, Prüfregeln nach `=>`, Trenner `|`, Kennung `p1`, `p2` …, Fehler mit Code für die Oberfläche) und `check` (contains, not, regex, number, json, min, max, stop; nur Code). Prompt ist die innerste Achse der Matrix und zählt zur Grenze von 30 Läufen.
- `chat.html`: Prompt-Feld mit mehreren Zeilen und Hilfetext (EN/DE), Läufer nimmt Prompt und Regeln je Zeile, Tabelle zeigt `fail` bei verfehlten Prüfungen, Statuszeile „Prüfungen: x von y Läufen bestanden“, Export mit Prompts im Kopf und `checks`/`pass` je Lauf. Läufe ohne Regeln zählen nicht mit. Ungültige Regeln sperren den Start (Meldung EN/DE).
- Tests: 2 neue (Regeln mit Gegenfällen, Reihe mit drei Prompts und Fehlschlag, ungültige Regel); Mutation (`contains` immer wahr) erkannt. 100 Seitentests grün, nur simuliert. Offen: Schritte 3 bis 5 (Fortsetzen, genauere Kosten und Zeit, Import und Export von Testreihen).

## 11.11.2026 – Testreihen Schritt 3: Fortsetzen und bessere Schätzung (Chat „AIUIheinz-Chat“)
- `chat.html`: `srStart(resume)` ist jetzt der gemeinsame Läufer. Beim Start werden `spec`, `maxTok`, `providerId` und alle nicht variierten Werte (`fixed`: Temperature, Top-P, Top-K, Kontext, Threads, Token-Grenze) in `srMeta` gesichert; `srOptions(params, maxTok, fixed)` nimmt diese Werte statt der Regler. Knopf „Fortsetzen (n offen)“ erscheint nur bei derselben Engine und demselben Modell und wenn Läufe fehlen. Abgebrochene und fehlgeschlagene Läufe zählen als offen und werden wiederholt, fertige bleiben (keine Doppelten). Cloud: dieselbe Bestätigung mit der Zahl der offenen Läufe.
- Schätzung: `HeinzSeries.estimateSec(rows, history, opts)` nimmt den Mittelwert je Denkstufe aus der letzten Reihe derselben Engine und desselben Modells (Fehler und Abbrüche zählen nicht), sonst feste Richtwerte (lokal 8 s, Schnell 4 s, Tief 12 s); Cloud +1,2 s Pause je Lauf. Die Planzeile nennt „nach der letzten Reihe“ und bei Cloud die höchstens möglichen Antwort-Token. Geld wird nicht geschätzt (keine Preisdaten).
- Tests: 3 neue (Schätzung mit Gegenfall ohne Verlauf, Fortsetzen nach Stopp und Neuladen mit geänderter Eingabe, Knopf weg bei anderem Modell); Mutation (alle Läufe wiederholen) erkannt. Nur simuliert, nicht am Gerät.
- (11.11.2026) Handytest Google nativ Schnell/Tief mit Token-Grenze 3000 ausgewertet: Tief scheitert an der Grenze (3000 und 8000), weil Denk-Token mitzählen; abgeschnittener Denktext landet in der Antwort und lässt `number:` zufällig bestehen, Abhilfe: Regel `stop` dazunehmen (Messung in `docs/KONZEPT.md` 21.5a). Nur Doku, kein Code geändert.

## 2026-11-11 (AIUIheinz-Design) – Mehrere eigene Engines
- `lib/providers.js`: beliebig viele eigene OpenAI-kompatible Engines (`heinz_engines` = [{id, name, baseUrl}], Schluessel je Engine in `heinz_keys`); neue Funktionen `userEngines/addEngine/updateEngine/removeEngine/isUserEngine`, `getCustomUrl(id)`/`setCustomUrl(u, id)`; der eingebaute Eintrag "Custom" bleibt unveraendert (`heinz_custom`).
- Engine-Menue: Knopf "Eigene Engine hinzufuegen", Namensfeld, Entfernen mit zweitem Tipp; das zweite Auswahlfeld unter "Verbindungsdaten" ist entfernt (`#provider-select` bleibt unsichtbar als Datenliste, Auswahl per Liste oben / `pickEngine`). Tests angepasst, neuer Test. Nur simuliert getestet (104 Seitentests, 20 Servertests).

## 11.11.2026 – Modelle: Nachtrag 5, 4, 6, 7 (Chat „AIUIheinz-Modelle“, nur Recherche, kein Seitencode)
- `docs/SCHNITTSTELLEN.md` neu: 13 Sprache im Browser (Eingabe Cloud-Standard, `processLocally` nur Desktop belegt, Android unbekannt; Ausgabe `localService`), 14 Kennzeichnung KI-Bilder (AI Act Art. 50, anwendbar 2.8.2026, Kodex 10.6.2026, Entwurf für die App, keine Rechtsberatung), 15 Heimserver als Engine (Ollama `OLLAMA_HOST`/`OLLAMA_ORIGINS`, Local Network Access, Mischinhalt), 16 Medien speichern (IndexedDB-Grenzen, stumme Räumung, `persist()`, Storage Buckets).
- Stärke der Aussagen: belegt nur, was Hersteller-/Blink-/web.dev-Seiten zeigen; Android-Spracherkennung lokal, LNA-Richtung Loopback→LAN, Ollama-CORS für `localhost:3000`, Persistenz im Termux-Tab und Bildgeneratoren im Heimnetz sind **vermutet oder nicht gelesen** und am Handy zu prüfen. Der Gesetzestext von Art. 50 wurde nicht gelesen.
- Keine Änderung an `lib/capabilities.json` in dieser Runde (Sprach-/Speicherwerte sind Messfragen für die Sonde). Tests: 104 grün (alle simuliert).
- 2026-11-11: DR2-Vorbereitung angelegt (docs/DESIGN_DR2.md): Gestaltungsbedarf aus Konzept 18 bis 21, Chat-Hinweis, Tertius; Menügliederung, fehlende Bausteine, Ablauf, Entscheidungen. Nur Doku.

## 11.11.2026 – Modelle: weitere Anbieter (Chat „AIUIheinz-Modelle“, nur Daten und Doku, kein Seitencode)
- `docs/SCHNITTSTELLEN.md` Abschnitt 17: Ollama `think` (Stufen, `/api/show`), OpenRouter (`reasoning`-Objekt, Parameter, ignorierte Felder), Groq (`reasoning_effort`/`reasoning_format`/`include_reasoning`), Mistral (`random_seed`, `reasoning_effort`), Ollama Cloud, llama.cpp (Sampling-Felder, Kontext/Threads als Startoptionen).
- `lib/capabilities.json`: neue Engines `openrouter`, `groq`, `mistral`, `ollama-cloud`, `llamacpp` (alle Parameterzellen, `stats`), Zelle `thinking` von `ollama` ausgefüllt, `endpointRules` um `ollama.com` ergänzt. OpenRouter/Groq/Mistral lösen über die Anbieterkennung auf (vorher allgemeine `openai`-Zellen); eigene Engines des Nutzers bleiben bei `openai`. `llamacpp` greift nur mit gleichnamiger Anbieterkennung.
- Tests: `ProvidersTest` (alle Parameter je Engine vorhanden, Zustände/Status gültig, Host-Auflösung, belegte Unterschiede); ein alter Test (`groq` → `openai`) auf die neue Regel angepasst. Volle Reihe grün (simuliert).
- Stärke: Herstellerseiten nur über Suchauszüge gelesen; Status `belegt` nur, wo der Auszug trägt. Nichts am Dienst geprüft. Offen: Modellregeln mit Denkstufen (`models`) für diese Engines, `outputIncludesReasoning`, CORS aller Dienste. Chat-Strang prüft am Gerät, ob die Regler mit den neuen Zellen wie gewünscht reagieren.
## 2026-11-11 (AIUIheinz-Design) – DR2 Phase A: neuer Hub, Heinz Chat, Einrichtung, Modus-Mockup
- Neu: `hub.html` (Tabs Chat/Werkzeuge/Einrichten, sachliche Fußzeile), `tools/heinz/index.html` (schlanker Chat, Modell und Chats im Schnellblatt von unten, eigene Speicher `heinz_slim`, `heinz_slim_chats`, Online nur mit „Online erlauben“), `tools/setup/index.html` (7 Schrittkarten, Befehle mit Kopieren, Live-Prüfung), `tools/design/modus.html` (Modus-Schieberegler), Platzhalter `tools/scan`, `tools/studio`. `tools/chat/tool.json` heißt jetzt „Heinz Prüfstand“.
- `lib/core.css/core.js`: `.notice`, `.bsheet`/`.bscrim`, `.step`, `.cmd`, `Heinz.copy`, `Heinz.sheetOpen/sheetClose`. Neue Tools haben `area: "hub2"` (alter Hub zeigt sie nicht).
- `docs/AUFTRAG_Menu.md` (neuer Strang AIUIheinz-Menu), `docs/DESIGN_DR2.md` um Entscheidungen ergänzt.
- Tests: 5 neue Seitentests, Servertest für die Toolliste angepasst. Nur simuliert, nicht am Gerät.


## 11.11.2026 – Modelle: Sonde als Testreihen (Entwurf) und Ollama-Denkregeln (Chat „AIUIheinz-Modelle“, nur Doku und Daten)
- `docs/SCHNITTSTELLEN.md` Abschnitt 18: Die Sonde wird keine eigene Seite, sondern fertige Testreihen S1 bis S8 für den Läufer (KONZEPT 21), fünf Konsolen-Proben (Speicher, Browser-Sprache, CORS der Anbieter, Heimnetz, `/api/show`), Regel für die Übernahme in die Daten (Feld `measured`), Aufwand (unter 5 600 Token je Modell), Liste der Läufer-Lücken (Achsen seed/max_tokens/stop/Penalties, Regel `same`, Fehlertext als Ergebnis, Sondenmodus). Alles dort ist Plan; gelesen wurde `lib/testreihe.js`, nichts davon ist auf dem Gerät gelaufen. Konsolen-Proben nur gegen Attrappen geprüft.
- `lib/capabilities.json`: zwei Regeln für Ollama (`ollama-gpt-oss` Stufen, `ollama-think-toggle` an/aus nach Familiennamen) unter dem Schlüssel **`thinkingDraft`**, den die Seite nicht liest. Grund: `chatOllama` sendet `think` nicht und verwirft `message.thinking`; eine Regel `thinking` würde einen Schnell/Tief-Schalter zeigen, der nichts sendet. Umbenennen erst, wenn der Chat-Strang beides baut. Zusätzlich Block `modelsDraftNote` mit dieser Erklärung.
- Tests: `test_ollama_think_drafts` (Namensabgleich mit Gegenfällen, kein Schlüssel `thinking`). Volle Reihe grün (simuliert).

## 11.11.2026 – Auftrag Fix Threads (Chat „AIUIheinz“, nur Doku)
- Handytest: Ollama im Heinz Chat langsamer als im Prüfstand. `docs/AUFTRAG_Fix_Threads.md` angelegt (Vermutung: Heinz Chat sendet kein `num_thread`, Prüfstand immer). Nichts gebaut, nichts am Gerät geprüft.

## 11.11.2026 – Repo-Adresse (Chat „AIUIheinz“, nur Doku)
- GitHub meldet beim Push „This repository moved“: maßgeblich ist `https://github.com/PythonHeinz/AIUIheinz.git`. In `UEBERGABE.md` (Quellen & Start) vermerkt, dazu der Befehl `git remote set-url origin …` für alte Klone (Termux, Container). Projekt-Briefing um das Dokument `claude/repo-adresse.md` ergänzt.

## 11.11.2026 – Fix Threads (Chat „AIUIheinz-Fix-Threads“)
- Befund des Entwicklers: Prüfstand mit Threads 0 ist langsam wie der Heinz Chat; bestätigt die Vermutung aus `docs/AUFTRAG_Fix_Threads.md` (Heinz Chat sendete kein `num_thread`).
- `lib/core.js`: neue gemeinsame Hilfen `Heinz.threadsFor(model)` (liest `heinz_settings.threads[Modell]`, gültig 0 bis 8, fehlend = 4 wie im Prüfstand) und `Heinz.ollamaOptions(provider, model)` (nur bei Ollama und Wert über 0 `{ num_thread }`, sonst `{}`). `chat.html` bleibt unberührt.
- `tools/heinz/index.html`: `PV.chat` bekommt `options: Heinz.ollamaOptions(S.provider, S.model)`. Cloud, LiteRT-LM und eigene OpenAI-Engines senden nichts Neues.
- Tests: 3 neue (Wert 2 im Request, Standard 4 und bei 0 nichts, andere Engines `{}`); Mutation (Zeile entfernt) erkannt. 112 Seitentests und Servertests grün, nur simuliert. Am Gerät nicht gemessen; Messwert nach dem Handytest in `docs/OLLAMA_UND_MODELLE.md` eintragen.
- Nebenbefund (nicht gebaut, gehört in den Design-Strang): Cursor im Heinz Chat blau-violett, Farbe offen.

## 11.11.2026 – Neuer Hub wird Startseite (Chat „AIUIheinz-Fix-Threads“, Freigabe des Entwicklers 12:28)
- Anlass: Nach dem Update in der App kam weiter der alte Hub, weil der neue als `hub.html` nur ein Entwurf war. Folge: Stände (Heinz Chat, Setup) waren in der App nicht erreichbar, der Ablauf „ändern, in der App aktualisieren, prüfen“ brach.
- `hub.html` (neuer Hub) ist jetzt `index.html`, der alte Hub ist entfernt (Git-Verlauf). `hub.html` bleibt als reine Weiterleitung auf `/`, damit alte Verweise gehen. Der neue Hub bekam Manifest, Icon und Apple-Touch-Icon des alten (Installierbarkeit), Ring und Zurück-Pfeile zeigen auf `/`.
- Neu: Versionszeile unten im Hub aus `/api/ping` (`v1.0 · Commit · Datum`), damit man nach dem Update sofort sieht, welcher Stand läuft.
- Tests: Hub-Tests auf den neuen Hub umgestellt, neu: Startseite ist der neue Hub und `/hub.html` leitet weiter, Versionszeile. 114 Seitentests grün, nur simuliert, am Gerät nicht geprüft.
- Regel künftig: Neue Seiten und Tools müssen in diesem Hub (Bereiche in `AREAS`) oder per `tool.json` erreichbar sein, sonst gibt es sie für den Entwickler nicht.

## 11.11.2026 – Stand festgehalten nach Fix Threads und Hub-Umstellung (Chat „AIUIheinz“, nur Doku)
- Stand: neuer Hub ist Startseite `/` (2d7f7df, `hub.html` nur Weiterleitung), Heinz Chat sendet `num_thread` an Ollama (20e9333), Repo-Adresse `PythonHeinz/AIUIheinz` (376cfc9). Alles nur simuliert getestet; Handytests gesammelt in `docs/HANDYTEST.md` (nach Freigabe des Entwicklers).
- `UEBERGABE.md` Grundgerüst: Regel ergänzt, dass neue Seiten und Tools über `AREAS` in `index.html` (und `tool.json`) im Hub erreichbar sein müssen. Auslöser: Der Entwickler sah nach dem Update den Stand nicht, weil der neue Hub zunächst `hub.html` hieß.

## 11.11.2026 – Gemeinsame Ollama-Laufzeit für alle Tools (Chat „AIUIheinz-Chat“)
- Anlass (Handytest des Entwicklers): Heinz Chat und Prüfstand sollen sich bei Ollama nicht in die Quere kommen. Ollama lädt ein Modell neu, wenn Threads oder Kontext zwischen zwei Anfragen abweichen; der Prüfstand sendete `num_ctx` und `keep_alive 30m` und entlud andere Modelle, der Heinz Chat nur `num_thread`.
- `lib/providers.js`: `HeinzProviders.runtime(id, model[, settings])` liefert `{ options, keepAlive }` (num_thread aus `heinz_settings.threads[Modell]`, 0 = nichts senden, fehlend = 4; num_ctx aus `heinz_settings.params.ctx`, fehlend 8192, bei „Modellwerte“ (`useDefault`) nichts; keep_alive 30m; für andere Engines leer). `HeinzProviders.prepare(id, model)` entlädt alle anderen geladenen Ollama-Modelle. Regel für jedes Tool, das ein Ollama-Modell lädt: Optionen und `keepAlive` aus `runtime()` nehmen und vorher `prepare()` aufrufen (steht im Kopfkommentar von `lib/providers.js`).
- `chat.html` (Prüfstand): `threadsFor`, `KEEP_ALIVE`, `unloadOthers` und die Laufzeit-Optionen in `buildOptions` kommen jetzt aus derselben Regel. Verhalten unverändert; die Sampling-Regler und die eigenen Werte der Tempo- und Testreihen bleiben seine eigene Sache.
- `tools/heinz/index.html` (Heinz Chat): ruft vor dem Senden `PV.prepare` auf und sendet `runtime()`-Optionen mit `keep_alive`. Die zwei Hilfsfunktionen `Heinz.threadsFor` und `Heinz.ollamaOptions` aus `lib/core.js` (Fix Threads, 12:22) sind entfallen; sie sind in `PV.runtime` aufgegangen.
- Hinweis: Der Heinz Chat liest die Werte nur; gepflegt werden sie im Prüfstand (Regler). Gilt im Prüfstand die Parameterquelle „Modus“, stehen dort die Modus-Werte als Kontext; der Chat sendet dann dieselben.
- Tests: 3 neue (Kontext und keep_alive im Chat, Entladen anderer Modelle, Prüfstand und Chat senden dieselben Laufzeit-Optionen) und 1 angepasst; Mutationen (Kontext nicht senden, nicht entladen) erkannt. Nur simuliert, nicht am Gerät.

## 11.11.2026 – Gemeinsamer Verbindungsstatus, Ring im Heinz Chat (Chat „AIUIheinz-Chat“)
- Anlass: Der grüne Punkt vor dem Modellnamen im Heinz Chat zeigte nur „lokal“ (grün) oder „online“ (orange), keine Verbindung. Der Entwickler wollte wie im Prüfstand eine Statusfarbe, die laufend sagt, was gerade passiert, als Ring um das Heinz-Logo.
- `lib/providers.js`: `HeinzProviders.status(id, model[, { handshake }])` liefert `{ code, color, key, names }`. Bedeutung der Farben für alle Tools: rot (`cloudOff`, `cloudNoKey`, `offline`), gelb (`handshake`, nur wenn die Seite `handshake: false` übergibt), orange (`asleep`: Ollama erreichbar, Modell nicht im Speicher), blau (`cloudReady`, `engineUp`, `loaded`). Grün setzt die Seite, solange das Modell antwortet. Online-Engines werden nie angefragt, nur Schalter und Schlüssel entscheiden. `key` ist der i18n-Schlüssel des Tooltips (`stCloudOff` … `stDefault`, `stOnline`), den jede Seite in EN und DE führt.
- `chat.html` (Prüfstand): `checkServer` ruft nur noch `PV.status`; Anzeige und Texte wie vorher.
- `tools/heinz/index.html` (Heinz Chat): Der Pfeil zurück ist jetzt der Ring mit dem Heinz-Logo (Link zum Hub, Farbe = Status, Tooltip = Klartext); der Punkt vor dem Modellnamen entfällt. Prüfung alle 5 Sekunden und bei Modellwechsel und nach jeder Antwort; während des Sendens blau „Denkt nach …“, ab dem ersten Wort grün „Antwortet“.
- Tests: 2 neue (Statuscodes und Farben für alle Engine-Arten inklusive Gegenfall Engine nicht erreichbar, Ring im Chat: blau, orange bei anderem Modell, blau beim Denken, rot bei ausgefallener Engine); Mutation (Modell immer „geladen“) erkannt. Nur simuliert, nicht am Gerät.

## 11.11.2026 – Auftrag Bausteinkatalog in AUFTRAG_Menu.md (Chat „AIUIheinz“, nur Doku)
- Anlass (Entwickler): Weitere Seiten und der Chat-Ausbau sollen die vorhandenen Bausteine (Schalter, Pillen, Felder, Blätter) wiederverwenden, damit weniger umgebaut werden muss. `docs/AUFTRAG_Menu.md` hat jetzt „Phase 0: Bausteinkatalog“ vor dem Menü (Katalogseite `tools/design/index.html`, Verhalten nach `lib/core.js`, Regel „erst im Katalog nachsehen“, Tests). Nichts gebaut.
- (11.11.2026) Gegenprobe am Handy: Oberfläche und `ollama run` liefern dieselbe Geschwindigkeit; Messwerte in `docs/OLLAMA_UND_MODELLE.md` („Gegenprobe Oberfläche gegen Ollama pur“). Nur Doku.
- (11.11.2026) Heinz Chat: Modellblatt zeigt, was an Ollama gesendet wird (Threads, Kontext, Haltezeit; Werte aus dem Prüfstand), damit Abweichungen zum Prüfstand sichtbar sind. 1 Test.

## 11.11.2026 – Heinz Chat lädt das gewählte Modell vor (Chat „AIUIheinz-Chat“)
- Befund des Entwicklers: Der Ring im Heinz Chat wurde erst nach dem ersten Prompt blau, die Wartezeit lag dann beim Laden. Ursache: Nur der Prüfstand lud Modelle vor; der Chat nie, der Ring blieb orange („Modell schläft“), bis die erste Frage das Modell lud.
- `lib/providers.js`: `HeinzProviders.preload(id, model[, signal])` lädt ein Ollama-Modell mit genau den `runtime()`-Werten und `prepare()` vorweg (ein Token, Antwort verworfen).
- `tools/heinz/index.html`: Beim Öffnen und bei jeder Modellwahl wird vorgeladen (Schalter „Vorladen“ des Prüfstands, Standard an, gilt auch hier). Ring orange mit „Modell wird vorbereitet …“, danach von selbst blau.
- Tests: 2 neue (Vorladen mit Threads, Kontext, keep_alive, Entladen anderer Modelle, Ring orange während des Ladens; Schalter aus: kein Laden); Mutation (Aufruf entfernt) erkannt. Nur simuliert.

## 11.11.2026 – Gemeinsame Modellwahl für Prüfstand und Heinz Chat (Chat „AIUIheinz-Chat“)
- Befund des Entwicklers (Qwen 2.5:3b im Chat gewählt): Beim Wechsel in den Prüfstand wurde Qwen wieder geladen. Ursache (vermutet, aus dem Code abgeleitet): Der Prüfstand lädt beim Öffnen das Modell vor, das in seiner eigenen Auswahl steht (zuvor gewählt, hier ein anderes), und entlädt dabei alle anderen; umgekehrt genauso. Nicht am Gerät nachgemessen.
- `lib/providers.js`: `HeinzProviders.activeModel()` / `setActiveModel(provider, model)`, neuer gemeinsamer Schlüssel `heinz_active` `{provider, model}`.
- `chat.html` (Prüfstand): übernimmt beim Öffnen einmal das gemeinsame Modell (nur bei gleicher Engine und wenn Ollama es kennt); `saveSettings` schreibt die Wahl zurück (erst nach der Übernahme, damit das Standardmodell sie nicht überschreibt). Der Modus-Preset bleibt als Systemprompt, setzt das Modell aber nur noch bei Moduswechsel.
- `tools/heinz/index.html`: übernimmt beim Start das gemeinsame Modell; `save()` schreibt es.
- Tests: 1 neuer (Chat wählt Qwen, Prüfstand öffnet mit Qwen und lädt es vor; Prüfstand wählt Gemma, Chat zeigt Gemma); Mutation (Übernahme entfernt) erkannt. Nur simuliert.

## 11.11.2026 – Diagnose: Was haben Prüfstand und Chat zuletzt an Ollama gesendet (Chat „AIUIheinz-Chat“)
- Befund des Entwicklers (Handy): Qwen im Prüfstand geladen, im Chat 24 s bis zum ersten Zeichen, beim Zurückwechseln in den Prüfstand wurde das Modell komplett neu geladen (Ring orange). Im Simulator senden beide Seiten dieselben Laufzeitwerte; die Ursache am Gerät ist noch offen.
- `lib/providers.js`: `HeinzProviders.noteRequest` merkt je Seite (Prüfstand/Chat) Modell, Threads, Kontext, Haltezeit und Uhrzeit der letzten Ollama-Anfrage (`heinz_lastreq`), `lastRequests()` liest sie.
- `tools/heinz/index.html`: Das Modellblatt zeigt zusätzlich „Zuletzt an Ollama gesendet“ für Prüfstand und Chat.
- Test: 1 neuer (beide Zeilen sichtbar, gleicher Kontext). Nur simuliert; die Ursache ist damit nicht behoben.

## 11.11.2026 – Vorladen überspringen, wenn das Modell schon mit denselben Werten geladen ist (Prüfstand und Heinz Chat; Chat „AIUIheinz-Chat“)
- Befund des Entwicklers (Handy): Nach dem Seitenwechsel braucht die erste Chat-Antwort über 30 s, danach wieder 3–4 s; `ollama ps` zeigt dabei dasselbe Modell mit derselben ID (kein Neuladen). Vermutete Ursache (aus der Funktionsweise von Ollama abgeleitet, nicht am Gerät gemessen): Jede Vorlade-Anfrage (Prüfstand mit Modus-Prompt, Chat mit „.“) ersetzt den Prompt-Zwischenspeicher von Ollama; die nächste Chat-Nachricht muss dann den ganzen Verlauf neu lesen.
- `lib/providers.js`: `HeinzProviders.loadedWith(id, model, options)` (Modell in `/api/ps` und letzte gesendete Threads/Kontext aus `heinz_lastreq` gleich); `preload()` sendet dann nichts. `chat.html` nutzt dieselbe Prüfung in `preloadModel` (Status „bereit“, andere Modelle werden weiter entladen). Bei geänderten Threads/Kontext oder nicht geladenem Modell wird wie bisher vorgeladen.
- Folge: Die erste Nachricht im Prüfstand liest den Modus-Prompt selbst (kein vorgewärmter Zwischenspeicher mehr, wenn das Modell schon geladen war).
- Tests: 2 neue (Prüfstand und Chat: kein Vorladen bei gleichen Werten, Vorladen bei geänderten Werten bzw. anderem Modell); Mutation erkannt. Nur simuliert.

## 11.11.2026 – Pflichtregeln für lokale Modelle, Abbruch beim Verlassen der Seite (Chat „AIUIheinz-Chat“)
- Auftrag des Entwicklers: Die Grundfunktion (schnelle lokale Antworten, Modell bleibt beim Seitenwechsel geladen) muss für alle Chats und neuen Module verbindlich sein; bei jeder neuen Seite darf die Performance nicht neu in Frage stehen.
- `docs/LOKALE_MODELLE.md`: neue Pflichtregeln (nur `HeinzProviders`, Laufzeitwerte, `prepare`, gemeinsame Modellwahl, Vorladen nur wenn nötig, Abbruch beim Verlassen, Status, Chat ohne Modus, Diagnose); Verweis oben in `UEBERGABE.md`.
- `lib/providers.js`: `HeinzProviders.chat` bricht die laufende Anfrage bei `pagehide` selbst ab (alle Engines), damit die nächste Seite das Modell frei vorfindet.
- `tests/test_rules.py` (in `run_all.sh`): Seiten außer einer Liste älterer Seiten (`chat.html`, `sheet.html`, `lab.html`, `vitals.html`) dürfen nicht direkt `/api/chat`, `/api/generate`, `num_thread` oder `keep_alive` verwenden; Regeldokument muss existieren und verlinkt sein. Dazu 1 Seitentest (pagehide bricht die offene Anfrage ab).
- Offen: `sheet.html`, `lab.html`, `vitals.html` auf `HeinzProviders` umstellen (gehört den jeweiligen Strängen). Nur simuliert getestet.

## 11.11.2026 – Fix: Prüfstand übernimmt auch Modelle, die nur die echte Modellliste kennt (Chat „AIUIheinz-Chat“)
- Befund des Entwicklers (Handy): Im Chat `heinz-fakt:latest` gewählt, im Prüfstand stand wieder Qwen (orange, wurde geladen). Ursache: Der Prüfstand füllt die Modellauswahl zuerst mit der kurzen Fallback-Liste (`gemma2:2b`, `qwen2.5:3b`, `gemma:2b`) und übernahm die gemeinsame Wahl dabei nicht, weil sie dort fehlte; danach überschrieb er sie mit seinem Moduswert.
- `chat.html`: Die gemeinsame Wahl wird erst übernommen, wenn die echte Liste von der Engine da ist (`modelsReal`); nach der Übernahme werden gespeicherte Regler und Vorladen für das neue Modell angewendet. Vor der Übernahme schreibt der Prüfstand die gemeinsame Wahl nicht mehr zurück.
- Test: 1 neuer (Modell nur in der echten Liste wird übernommen, gemeinsame Wahl bleibt erhalten); Mutation erkannt. Nur simuliert.
- Offen (Vermutung, nicht gemessen): Im Chat kommt nach Prüfstand-Nachrichten keine Antwort innerhalb einer Minute. Wahrscheinlich liest Ollama den langen Chat-Verlauf komplett neu, weil Prüfstand-Anfragen den Zwischenspeicher ersetzen. Test am Handy: neuer, leerer Chat (+).

## 11.11.2026 – Heinz Chat bietet keine Persona-Modelle an (Chat „AIUIheinz-Chat“)
- Beschluss des Entwicklers: `heinz-fakt:latest` und `heinz-wilson:latest` (Persona und Stichprobenwerte im Modelfile, nur für die alte Heinz UI angelegt) widersprechen dem Konzept für Ton und native Modelleinstellungen und sollen im neuen Chat nicht wählbar sein. Gelesene Modelfiles: `heinz-wilson` Gemma-Vorlage, Survival-Persona, Temp 0,4, Top-P 0,8; `heinz-fakt` Qwen-Vorlage, Straßensprache mit vier Beispielen, Temp 0,2, Top-K 20, Top-P 0,4, Stoppwörter „Als KI“ und „As an AI“.
- `tools/heinz/index.html`: Namen mit `heinz-` werden für Ollama aus der Modellliste gefiltert; ist ein solches Modell gewählt (z. B. vom Prüfstand übernommen), nimmt der Chat das erste verbleibende. In Ollama und im Prüfstand ändert sich nichts.
- `docs/LOKALE_MODELLE.md`: neue Regel 9. Test: 1 neuer. Nur simuliert.

## 11.11.2026 – Handytest bestätigt: schneller Seitenwechsel (Chat „AIUIheinz-Chat“)
- Entwickler (Pixel 9 Pro, Version `adf8889`): Modelle bleiben beim Wechsel zwischen Chat, Prüfstand und allen Modellen im Speicher; erste Antwort bei allen Modellen 4 bis 6 s, auf beiden Seiten gleich. Messwerte in `docs/LOKALE_MODELLE.md` und `docs/OLLAMA_UND_MODELLE.md`. Nur Doku.

## 11.11.2026 – Systemprompt je Modell im Heinz Chat, Regeln für Systemprompts (Chat „AIUIheinz-Chat“)
- Beschluss des Entwicklers: Der Chat bekommt einen kurzen Standard-Systemprompt, je Modell im Modellblatt änderbar, damit kleine Modelle ohne Modi natürlich antworten (z. B. keine unerwartete Sprache). Jedes Tool bringt seine eigenen Prompts für seine Aufgabe mit. Die Regeln sollen alle Agenten befolgen.
- `lib/providers.js`: `HeinzProviders.chat` nimmt `system` (wird vorangestellt, nur wenn die Nachrichten keine Systemnachricht haben); `DEFAULT_CHAT_SYSTEM`, `chatSystemFor(model)`, `setChatSystem(model, text|null)` (Schlüssel `heinz_chat_system`; leer = kein Prompt, null/Standardtext = Standard).
- `tools/heinz/index.html`: Modellblatt mit Feld „Systemprompt (dieses Modell)“ und „Auf Standard zurücksetzen“ (EN/DE); der Chat sendet `system: chatSystemFor(S.model)`.
- `docs/LOKALE_MODELLE.md`: Regeln 10 (Systemprompts frei, kurz, stabil, eigene Stelle im Tool, kein Vorladen mit Prompt) und 11 (Chat-Standardprompt); Regel 8 angepasst; `UEBERGABE.md` angepasst.
- Tests: 2 neue (Standardprompt wird gesendet, je Modell änderbar, leer, zurücksetzen; `chat` fügt den Text einmal ein und nur ohne vorhandene Systemnachricht); Mutation erkannt. Nur simuliert; Wirkung auf die Antworten (z. B. Sprache beim abliterierten Qwen) am Handy offen.

## 11.11.2026 – Personas aus den Modellen nach lib/personas.js (Chat „AIUIheinz-Chat“)
- Beschluss des Entwicklers: Lokale Modelle kommen nativ; was einen Modell-Systemprompt überschreibt, darf nicht ins Modell. `heinz-wilson` und `heinz-fakt` sollen aus Ollama gelöscht werden, ihre Wirkung im Prüfstand soll in den Modi Wilson und Heinz bleiben. Anlass: Im Heinz-Modus antwortete das native abliterierte Qwen nur noch „no“ (Modus-Prompt + enge Werte, ohne Persona aus dem Modelfile).
- Neu `lib/personas.js` (`HeinzPersonas.get/list`): Texte der beiden Modelfiles unverändert, Sampling (Wilson 0,4/0,8; Heinz 0,2/0,4/Top-K 20), Stoppwörter, bevorzugtes natives Modell.
- `chat.html`: Modus-Prompts Wilson und Heinz (EN und DE) sind die Persona-Texte (Sprachregel steht im Text); Presets Wilson (`gemma2:2b`, Temp 0,4, Top-P 0,8) und Heinz (nativ `hf.co/mradermacher/Qwen2.5-3B-Instruct-abliterated-GGUF:Q4_K_M`, sonst `qwen2.5:3b`; Temp 0,2, Top-P 0,4, Top-K 20, Stopp „Als KI“/„As an AI“).
- Regel 9 in `docs/LOKALE_MODELLE.md`, Abschnitt in `docs/OLLAMA_UND_MODELLE.md` (inkl. `ollama rm`), `UEBERGABE.md`.
- Tests: 3 neue/umgebaute (Heinz-Modus, Wilson-Modus, Personas als Daten mit Kopie); alter heinz-fakt-Test ersetzt. Nur simuliert; der Vergleich der Antworten mit früher am Handy steht aus. Löschen der Modelle macht der Entwickler am Handy.

## 11.11.2026 – Prüfstand: Moduswechsel ändert das gewählte Modell nicht mehr (Chat „AIUIheinz-Chat“)
- Entwickler: Der Prüfstand testet beliebige Modelle mit den fünf Modi; der Modus soll kein Modell mehr vorschreiben. Dazu kommt: Die Modellwahl gilt für alle Seiten, ein Moduswechsel würde sonst auch im Chat das Modell umladen.
- `chat.html` (`updateModeUI`): Das Preset-Modell wird nur noch gesetzt, wenn das gewählte Modell fehlt (Vorschlag); sonst bleibt die Wahl.
- Befund am Handy: Im Screenshot „In 36“ Token im Heinz-Modus zeigt, dass dort noch die Fassung vor den Personas lief (Persona-Prompt rund 340 Token); nach `git pull` und Neuladen soll „In“ bei rund 350 liegen.
- Tests: 2 neue/umgebaute (Modus behält Modell in allen fünf Modi und die gemeinsame Wahl; Preset nur Vorschlag bei fehlendem Modell); frühere Tests auf explizite Modellwahl angepasst. Nur simuliert.

## 2026-11-11 – Prüfstand: altes „Modell-Systemprompt“ wird einmalig zurückgesetzt (AIUIheinz-Chat)
- Handytest: Heinz-Modus mit nativem Qwen antwortete „no“, „In 36“. Ursache: gespeichertes `sysSrc: 'model'` (früher für heinz-fakt nötig) → keine Systemnachricht, Persona fehlt.
- Fix: einmalige Migration beim Start (`personasExternal` in `heinz_settings`): `sysSrc 'model'` → `'mode'`. Spätere bewusste Wahl bleibt erhalten.
- Test: `test_old_model_system_setting_is_reset_once_so_the_persona_is_sent` (simuliert; Gerätetest steht aus).

## 2026-11-11 – Prüfstand: „In den Chat übernehmen“ (AIUIheinz-Chat)
- Zweck laut Auftrag: Im Prüfstand ein Modell testen und parametrieren, dann den Chat damit bereitstellen.
- Neu: Einstellungen des Prüfstands, Gruppe „Heinz Chat“, Zeile „In den Chat übernehmen“ (`applyToChat()`). Schreibt für das gewählte Ollama-Modell (1) den Systemprompt in `heinz_chat_system` (Modus-Prompt ohne den Antwortsprache-Satz; „Mine“ = eigener Prompt; „Model“ = leer) und (2) die Sampling-Werte Temperatur, Top-P, Top-K, Stop in den neuen Schlüssel `heinz_chat_options` (`PV.setChatSampling`). Threads und Kontext teilen beide Seiten ohnehin über `PV.runtime`.
- Heinz Chat sendet `PV.chatSamplingFor(modell)` zusätzlich zu den Laufzeitwerten; Modellblatt zeigt die übernommenen Werte und „Prüfstand-Werte entfernen“.
- Bei „Standardwerte des Modells“ im Prüfstand werden vorhandene Chat-Werte gelöscht. Gerätetest steht aus.

## 12.11.2026 – Beschlüsse zur Struktur, drei neue Aufträge (Chat „AIUIheinz“, nur Doku)
- Anlass: Außenanalyse der Architektur (Entwickler hat sie geprüft). `docs/KONZEPT.md` 22 hält die Beschlüsse fest: eine Quelle der Wahrheit im Repo (`docs/agent/`), Dokumente schlank, Dogma „schlankes Web-UI“, IndexedDB, Reihenfolge der Stränge, Datenschutz zum Pfad.
- Neue Aufträge: `docs/AUFTRAG_Aufraeumen.md`, `docs/AUFTRAG_Pruefstand_Schlank.md`, `docs/AUFTRAG_Speicher.md`. Nichts gebaut, nichts verschoben. Prüfung der Analyse: keine Schlüssel in der Git-Historie (Muster für Google-, OpenAI-, Groq-Schlüssel ohne Treffer), nur ein Windows-Pfad und Heimnetz-Adressen.

## 12.11.2026 – Begriffe im Auftrag Aufräumen (Chat „AIUIheinz“, nur Doku)
- `docs/AUFTRAG_Aufraeumen.md` Schritt 4a: Das Wort „Chat“ (Strang, Heinz Chat, Prüfstand, Unterhaltung, Chatmenü) wird in den Dokumenten vereinheitlicht, mit Tabelle `docs/agent/BEGRIFFE.md`. Nur Doku, Oberfläche unberührt.

## 12.11.2026 – Aufräumen: eine Ablage, neue Ordnung (Strang AIUIheinz-Aufraeumen)
- Doppelablage PC-Ordner + Repo beendet: alle Steuerdateien liegen nur noch im Repo unter `docs/agent/` (STAND, UEBERGABE, TECHNIK, BEGRIFFE, ENTWICKLUNGSVERLAUF, NAECHSTER_CHAT, PROJEKTANWEISUNG, ARBEITSANWEISUNG_ENTWICKLER, alle `AUFTRAG_*.md`). Kein PC-Abgleich und kein `cmp` mehr.
- UEBERGABE.md nur noch Prozess, neu `TECHNIK.md` (Fallstricke, Strukturen, Designregeln, Tests), neu `BEGRIFFE.md` (Strang, Heinz Chat, Heinz Prüfstand, Unterhaltung, Chatmenü).
- Archiv `docs/archiv/` (unverändert, nichts gelöscht): Verlauf bis 09.11., KONZEPT Abschnitte 1 bis 14 (`KONZEPT_v1_entwurf.md`), alter STAND, alter Startprompt. `docs/KONZEPT.md` behält Abschnitte 15 bis 22.
- Abweichungen vom Auftrag: Archivdatei heißt `_bis_2026-11-09`; Sicherung als Branch `sicherung/vor-aufraeumen-2026-11-12` (Tag-Push blockiert vom Git-Proxy).
- `tests/test_rules.py`: nur Pfad zu UEBERGABE.md angepasst. Tests aus frischem Klon: 20 + 24 + 2 + 137 = 183 grün (nur simuliert, nicht auf dem Handy).
- PC-Ordner: alte Dateien nach `archiv_vor_2026-11-12\`, Hinweisdateien, neue README, `INDEX.md` angepasst; Sicherung `_Sicherung_vor_Aufraeumen_2026-11-12\`.

## 12.11.2026 – Design-Katalog, Phase 0 (Strang AIUIheinz-Menu; Fundament `lib/core.css`, `lib/core.js`, `tools/design/index.html`)
- Auftrag: `AUFTRAG_Menu.md` Phase 0. Der Entwickler hat am 12.11. klargestellt: **Das Menü des Prüfstands bleibt vorerst, wie es ist.** Nicht gebaut und nicht beauftragt: neue Menügliederung, Zustandsmarke mit Legende, Parameter-Schnellöffner, Modus-Schieberegler. Gebaut ist nur der Katalog.
- `tools/design/index.html` neu: datengetriebener Katalog (`CATALOG`, 26 Bausteine) mit Klassennamen, Verwendung (welche Seiten), lebendem Beispiel (Theme Auto/Hell/Dunkel, EN/DE) und Markup zum Kopieren; dazu Funktionen aus `lib/core.js` (`FUNCS`), Farben, Pixeldisplay, Symbole (direkt aus dem Sprite), eine Liste dessen, was nur auf einer Seite vorkommt, und bekannte Lücken (Auswahlliste mit Filter, einheitliche Fähigkeitsmarke, `.hint` gegen `.help`).
- `lib/core.css`: aus `chat.html` unverändert herausgezogen: `.grp`/`.caps.grp`/`.scope`, `.sr-only`, `.sep`, `.cnt`, `.spinner` (+ `@keyframes rotate`), Felder `select.sel`/`.inp`/`.fld`/`.help`, `.status-line`, `.chkrow` (**umbenannt aus `.chk`**, weil das Setup ein eigenes `.chk` für Statustext hat), `.seg2`, `.pw-tabs`, `.grpbox`, Fähigkeitsmarken `.cap-blocked`/`.cap-lock`/`.cap-tag`/`.cap-text`; aus `tools/setup/index.html` `.prog`. Alles in einem Abschnitt am Dateiende („moved from chat.html“).
- `lib/core.js`: neu `Heinz.setting/setSetting` (ein Wert aus `heinz_settings`), `Heinz.bindSwitch(input, key, {fallback, store, onChange})`, `Heinz.bindSlider(card, {fmt, onInput})`. Der Prüfstand nutzt sie noch nicht (er hat seinen eigenen `onSlider` mit Fähigkeitszuständen); neue Seiten sollen sie benutzen.
- **Verhalten der Seiten:** Vorher/Nachher-Screenshots von Prüfstand (Hauptansicht und alle fünf Menüunterseiten), Heinz Chat, Setup, Modelle und Hub, je Hell und Dunkel bei 426 × 803: Prüfstand und Heinz Chat sind pixelgleich; die übrigen Unterschiede (Statustexte, Hub-Lampen) treten auch bei zwei Läufen des Ursprungsstands auf und sind Zeitrauschen. **Eine bewusste Abweichung:** `tools/heinz/index.html` hat seine eigenen Regeln für `.fld`/`.inp` abgelegt und nimmt die gemeinsamen (Feldhöhe 46 statt 44 px, Radius 14 statt 12, 6 px Abstand über dem Feld); betrifft die Felder im Modellblatt des Heinz Chat. Auf dem Handy ansehen.
- Fallstrick, im Test festgehalten: Seiten, die `lib/core.css` einbinden, teilen alle Klassennamen. Ein nacktes `.sel` in `core.css` hätte im Heinz Chat die Zeilen `.row.sel` umgestaltet (deshalb `select.sel`); `.chk` wäre das Setup-Statuswort umgestaltet (deshalb `.chkrow`). Test `test_moved_blocks_work_in_the_test_bench_and_do_not_leak_into_other_pages` sichert beides.
- Regel „erst im Katalog nachsehen“ in `docs/DESIGN.md` 7, `docs/agent/TECHNIK.md` (Designregeln) und `UEBERGABE.md` (Arbeitsweise).
- Tests: 7 neue (jede im Katalog genannte Klasse steht in `core.css` und im Beispiel; Prüfung erkennt eine entfernte Klasse, auch wenn sie nur noch im Kommentar steht; Symbole im Sprite und jede genannte `Heinz`-Funktion existiert; beide Themes und Sprachen ohne seitliches Scrollen, Konsolenfehler und Fremdanfragen; Kopierknopf liefert Markup ohne Katalog-Interna; `bindSwitch`/`bindSlider`/`setting`; verschobene Bausteine im Prüfstand), 1 angepasst (Design-Seite). Mutation geprüft: `.seg2` aus `core.css` entfernt, der Katalogtest wird rot. Stand 20 + 24 + 2 + 144 = 190 Tests grün aus frischem Klon (nur simuliert, nicht am Handy).
- Offen: Handytest (siehe Meldung an den Entwickler); Umstieg des Prüfstands auf `Heinz.bindSlider`/`bindSwitch` ist eine spätere Aufgabe (Strang Pruefstand); `tools/design/index.html` hängt weiterhin nicht im Hub (nur per Adresse erreichbar).

## 12.11.2026 – Prüfstand schlank, Phase 2 Schritte 0 bis 3 (Strang AIUIheinz-Pruefstand; Fundament: neue Dateien in `lib/`)
- Freigabe des Entwicklers (12.11.): Fassade für die Tests, Tests anpassen, Dateien unter `lib/` anlegen. Sicherung vor dem Umbau: Branch `sicherung/vor-pruefstand-umbau-2026-11-12`. Inventur und Vorschlag: `docs/PRUEFSTAND_INVENTUR.md`.
- **Schritt 0, Fassade:** `window.HeinzBench` in `chat.html` (Funktionen, Konstanten, und per Zugriffsfunktionen die veränderlichen Werte `settings`, `chatHistory`, `generating` …, dazu `ready`). Die Tests greifen nur noch darüber zu (124 Zeichenketten in `tests/test_pages.py` per Skript umgeschrieben, Prüfung auf verbliebene freie Namen: keine).
- **Schritt 1, Daten und reine Funktionen:** `lib/markdown.js` (Markdown und Syntaxfärbung, Ausgabe bei Stichproben mit Konzept- und Technikdokumenten identisch zur alten); `lib/data/pruefstand.i18n.json` (alle Oberflächentexte EN/DE), `lib/data/modes.json` (Texte von Audit, Code, Creative und Modus-Presets; Wilson und Heinz ziehen Werte weiter aus `lib/personas.js`), `lib/data/bench.json` (Prüfsätze des Tempo-Tests, Achsen der Testreihe); Lader `lib/benchdata.js`. Die Seite wartet beim Start auf die Daten (`init` ist `async`); fertig gemeldet durch `HeinzBench.ready`. Vergleich alt gegen neu: Daten und Presets gleich (tief geprüft).
- **Schritt 3, Speicherschicht:** `lib/store.js` (`HeinzStore`: `open/get/set/remove/exportAll/importAll`, austauschbarer Speicher-Teil „backend“, Standard `localStorage`). Alle Zugriffe der Seite auf `heinz_settings`, `heinz_current`, `heinz_chats`, `heinz_speedtest`, `heinz_series` und die Sicherung laufen darüber; die Funktionen `lsGet/lsSet/lsRemove` entfallen. Lesen bleibt synchron (aus dem geöffneten Speicher), Schreiben und Öffnen sind Promises, damit der Strang Speicher nur das Backend tauscht (IndexedDB mit Zwischenspeicher).
- Abweichung vom Vorschlag: Die Bibliotheken sind klassische Skripte mit einem Namensraum (`HeinzMarkdown`, `HeinzStore`, `HeinzBenchData`), wie `lib/providers.js` und `lib/testreihe.js`; echte ES-Module folgen erst, wenn die Inline-Handler ersetzt sind (Schritt 6 des Vorschlags).
- Tests: `tests/test_pages.py` wartet nach `goto` und `reload` auf `HeinzBench.ready`. Stand 20 + 24 + 2 + 144 = 190 grün (nur simuliert, nicht am Handy). `chat.html`: 2897 statt 3141 Zeilen.
- Offen: Blöcke (Tempo-Test, Testreihe, Senden, …) aus dem Skript lösen; Inline-Handler; Handytest (`docs/HANDYTEST.md`).

## 12.11.2026 – Prüfstand schlank: Textumzug der Skriptblöcke nach `lib/bench/` (Strang AIUIheinz-Pruefstand)
- Das Skript von `chat.html` ist in 18 zusammenhängende Dateien zerlegt (`config`, `engine`, `i18n`, `state`, `settings`, `preload`, `status`, `speech`, `messages`, `conversations`, `send`, `update`, `speedtest`, `series`, `menu`, `pixelbar`, `quick`, `caps`), geladen in der ursprünglichen Reihenfolge als klassische Skripte mit gemeinsamem Namensraum. Reiner Umzug von Text (um 8 Leerzeichen eingerückt), kein Verhalten geändert. `chat.html` hat nur noch Markup, Stile, Fassade und Start (726 statt 3141 Zeilen).
- `tests/test_rules.py` prüft jetzt auch `lib/bench/*.js`; Ausnahmen für direkte Ollama-Aufrufe: `speedtest.js` und `series.js` (wie früher `chat.html`).
- Zuschnitt der Stränge (Beschluss des Entwicklers 12.11.): Strang Chat = Seite Heinz Chat; Strang Pruefstand = Seite `chat.html` mit allem, was prüft und einstellt (auch Chatfenster, Testreihen, Sonden). Register in `STAND.md` angepasst.
- Tests 20 + 24 + 2 + 144 = 190 grün (nur simuliert). Offen: Umstellung auf ES-Module und Ersatz der Inline-Handler, Handytest.

## 12.11.2026 – Fix: JSON-Dateien des Prüfstands fehlten im Repo (Strang AIUIheinz-Pruefstand)
- Handytest: Prüfstand startete nicht (aufgeblähter Equalizer, leerer Chip, Modusleiste fehlt). Die neue Startfehler-Anzeige nannte `lib/data/pruefstand.i18n.json: HTTP 404`.
- Ursache: `.gitignore` enthielt `data/` und schloss damit `lib/data/` aus; `lib/data/*.json` waren nie committet. Meine Tests liefen gegen den Arbeitsordner, nicht gegen das Repo, und blieben deshalb grün.
- Behoben: `.gitignore` auf `/data/`, die drei Dateien committet, neuer Test `test_no_file_of_the_app_is_hidden_from_git`, Startfehler werden auf der Seite angezeigt (Test dazu), Tests aus frischem Klon: 20 + 24 + 3 + 145 grün (nur simuliert). Regel in `TECHNIK.md`.


## 12.11.2026 – Umbenennung: Prüfstand heißt Dashboard (Strang AIUIheinz-Dashboard)
- Auf Wunsch des Entwicklers nach bestandenem Handytest: `chat.html` (bisher Prüfstand) ist jetzt `dashboard.html`; der Heinz Chat (bisher `tools/heinz/index.html`) liegt unter `chat.html`. `index.html` bleibt Startseite. Der Strang und sein Befehl heißen „Dashboard“.
- Ordner und Namen: `tools/chat` → `tools/dashboard`, `tools/heinz` → `tools/chat` (Hub-Kennungen `chat` und `dashboard`), `lib/bench/` → `lib/dashboard/`, `lib/benchdata.js` → `lib/dashboarddata.js`, `HeinzBench` → `HeinzDashboard`, `lib/data/pruefstand.i18n.json` → `dashboard.i18n.json`, `bench.json` → `dashboard.json`, Auftrag und Inventur umbenannt. Archiv und dieser Verlauf behalten die alten Namen.
- Fundament berührt: Hub (AREAS), `tool.json`, Setup-Seite, Servertest. Nutzerdaten bleiben (localStorage hängt am Ursprung, nicht am Seitennamen). Alte Lesezeichen auf `/chat.html` öffnen jetzt den Heinz Chat.
- Beim Test fiel ein vergessener Dateiname (`bench.json` in `dashboarddata.js`) auf; behoben. Alle Tests grün (simuliert, nicht am Gerät).

## 12.11.2026 – Speicher: IndexedDB für Unterhaltungen und Testreihen (Strang AIUIheinz-Speicher; Fundament: `lib/store.js`, Freigabe des Entwicklers)
- **Aufteilung (vom Entwickler bestätigt):** nach IndexedDB `heinz_chats`, `heinz_slim_chats`, `heinz_current`, `heinz_series`, `heinz_speedtest`; in `localStorage` bleiben `heinz_settings`, `heinz_online`, `heinz_active`, `heinz_slim`, `heinz_engines`, `heinz_custom`, `heinz_chat_system`, `heinz_chat_options`, `heinz_lastreq` und die API-Schlüssel `heinz_keys` (nie in Exporten ohne Haken, auch nicht im Rückfall).
- **`lib/store.js`:** Standard-Backend `defaultBackend`: Datenbank `heinz` (Version 1) mit den Objektspeichern `conversations`, `results` und `media` (leer, für Bilder und Audio später). `open()` lädt die beiden ersten Speicher einmal in den Arbeitsspeicher, damit `HeinzStore.get` synchron bleibt; `put` schreibt zuerst in den Arbeitsspeicher, dann nach IndexedDB und stellt den alten Wert wieder her, wenn das Schreiben scheitert (`QuotaExceededError` → Meldung `quota`). Neu: `HeinzStore.info()`, `status()` (Backend, `persisted`, `usage`, `quota`, migrierte Schlüssel), `onProblem(fn)` (Codes `fallback`, `quota`, `write`, `migrate`, `nearfull`). Beim Start `persisted()`, bei `false` einmal `persist()`; Warnung `nearfull` ab 80 % der Quote. Öffnen mit Zeitgrenze 4 s.
- **Migration:** je Schlüssel kopieren, zurücklesen, Text und Anzahl der Einträge vergleichen; erst dann zählt er als umgezogen und steht in `heinz_idb_migration` (`localStorage`, nicht im Export, nicht im Import). Alte Einträge bleiben stehen. Ein markierter Schlüssel wird nicht wieder kopiert (sonst käme eine später geleerte Liste aus der alten Kopie zurück). Schlägt eine Prüfung fehl: halbe Kopie wird gelöscht, die App arbeitet für alle Schlüssel aus `localStorage` weiter, Meldung `migrate`; nichts geht verloren.
- **Rückfall:** Fehlt IndexedDB oder öffnet nicht, arbeitet `HeinzStore` mit `localStorage`; Hinweisband `#store-note` im Dashboard und im Heinz Chat (EN/DE; Texte in `lib/data/dashboard.i18n.json`, Schlüssel `st*`, und im Wörterbuch `D` von `chat.html`, Schlüssel `st_*`). Das Dashboard zeigt unter Info (Seite „update“) eine Zeile mit Backend, Dauerhaftigkeit und Belegung; Importfehler der Sicherung melden `bkFail`.
- **Seiten:** `chat.html` (Heinz Chat) liest und schreibt `heinz_slim_chats` über `HeinzStore`, lädt `lib/store.js`, startet erst nach `HeinzStore.open()` (`heinzChatMain`, setzt `data-heinz-chat=ready`). Dashboard: nur Hinweisband, Info-Zeile und Fehlerfang in `menu.js`; `lib/core.js` (`Heinz.lsGet/lsSet`) und `lib/providers.js` blieben **unverändert**, weil sie nur Schlüssel lesen, die in `localStorage` bleiben (die geplante Umstellung von `core.js` war nicht nötig).
- **Tests:** neu `tests/test_store.py` (11 Tests, echtes IndexedDB in Chromium): Schreiben und Neuladen, Löschen, Migration (Kopie gleich, alte Einträge bleiben, Markierung, Anzahl), geleerte Liste kommt nicht zurück, abweichende Kopie wird erkannt, Rückfall ohne IndexedDB (beide Seiten, EN/DE), volle Quote (alter Wert bleibt, Meldung), Sicherung (Export ohne Schlüssel und Markierung, alte Sicherungsdatei wird eingespielt), Fehler beim Import, Status, Heinz Chat (alte Unterhaltungen gelesen, Änderung in IndexedDB). In `tests/test_pages.py` lesen die Tests der verschobenen Schlüssel jetzt über `HeinzStore`; Heinz-Chat-Tests warten auf `data-heinz-chat=ready`. **Mutationen geprüft:** Vergleich der Kopie abgeschaltet und Kopie ganz weggelassen: beides macht Tests rot. Stand 20 + 24 + 3 + 11 + 145 = 203 grün (nur simuliert, nicht am Handy).
- **Grenzen:** Zwei Tabs mit derselben Seite teilen den Arbeitsspeicher nicht; wie bisher gewinnt der letzte Schreibzugriff je Schlüssel. Medien (Bild, Audio) sind nicht gebaut, nur der leere Objektspeicher. Quote, `persist()` und stumme Räumung am Pixel sind nicht gemessen (nur Chromium am Testrechner).
- **Handytest (Entwickler, 12.11.2026, installierte App):** Alle Unterhaltungen und gespeicherten Daten blieben nach dem Update erhalten und auch nach mehrfachem Beenden der App. Info zeigt „IndexedDB · permanent: yes · used 1.1 MB of 10.7 GB“. Nicht geprüft: normaler Browsertab, Neustart von Termux ohne laufenden Server.
- **Offen:** `docs/HANDYTEST.md` gibt es noch nicht (wird nach Go des Entwicklers angelegt), die Punkte stehen hier. Alte Einträge in `localStorage` löschen erst eine spätere Version nach Freigabe.
- **Handytest abgeschlossen (Entwickler, 12.11.2026, Root-Strang):** auch im normalen Browsertab getestet, Daten und Speicher in Ordnung. Befund: Im Browsertab lädt das Modell mit 8 statt der in der App eingestellten 2 Threads (vermutlich getrennter Speicher von App und Tab, dort Standardwerte); als Aufgabe 2b in `STAND.md` vermerkt, nichts gebaut.

## 12.11.2026 – Layout-Wünsche des Entwicklers (Strang AIUIheinz-Design)
- **Dashboard, Unterhaltungsliste:** Mehrfachauswahl per langem Drücken (500 ms) auf eine Zeile (`bindLongPress`, `selStart/selToggle/selEnd/selDelete` in `lib/dashboard/conversations.js`); danach wählt ein Tipp an oder ab, das ⋯ verschwindet, unten die Leiste `#sel-bar` (Zähler, Löschen mit Rückfrage, Abbrechen). Bewusst **kein „Alle wählen“** (Wunsch des Entwicklers: kein versehentliches Löschen von allem). Drawer schließen beendet die Auswahl. Texte `selCount`, `selDelete`, `selCancel`, `confirmDelSel` (EN/DE).
- **Heinz Chat, Unterhaltungsliste im Schnellblatt:** ⋯ je Zeile öffnet dieselben fünf Pillen wie im Dashboard (Umbenennen, Anpinnen bis 5, Kopieren, Exportieren, Löschen); angepinnte Unterhaltungen stehen oben; `persist()` behält einen eigenen Namen (`name`). Mehrfachauswahl dort nicht gebaut (nicht gewünscht).
- **Bausteine:** die Zeilen-Regeln (`.saved-item`, `.acts2`, `.pin-sep`, `.inline-edit`) liegen jetzt in `lib/core.css` (vorher in `dashboard.html`), dazu `.sel` und `.selbar`; Eintrag „Unterhaltungszeile“ im Design-Katalog.
- **Kopfzeile Dashboard, Zeile 2:** Der blaue Statuspunkt sitzt mit der Mitte auf der linken Kante des Modell-LCDs (`margin-left: calc(52px + 12px - 4px)`, vorher auf der Logo-Mitte); der Statustext ist eine unsichtbare Pille von der Höhe des Equalizers (28 px), Punkt, Text und Equalizer teilen die Mittellinie.
- **Tests:** drei neue (Geometrie Punkt/LCD/Equalizer, Mehrfachauswahl ohne „Alle wählen“, fünf Pillen im Heinz Chat); zwei bestehende angepasst. 148 Tests grün, nur simuliert, nicht am Gerät.
- **Nachtrag 12.11.2026, 22:00 (Handyrückmeldung):** Der Statuspunkt sitzt jetzt auf dem Einzug des Pixeltexts im LCD, nicht auf dessen Außenkante. Die Abhängigkeiten stehen als Variablen in `dashboard.html` (`--ring-d`, `--top-gap`, `--lcd-indent` = 9,5 px, `--sdot-d`); bei anderen Bildschirmbreiten oder Schriftgrößen nur dort ändern. Der Wert 9,5 px ist nach Augenmaß aus dem Screenshot gesetzt (nicht am Gerät gemessen). Mehrfachauswahl vom Entwickler am Handy bestätigt („funktioniert einwandfrei“).
- **Sortierung der Unterhaltungslisten:** Umschalter „Neueste | A–Z“ im Dashboard-Drawer und im Heinz Chat (gemeinsamer Schlüssel `heinz_chat_sort`, Standard `time`). A–Z sortiert nach Titel ohne Groß-/Kleinschreibung mit natürlichen Zahlen (`Chat 2` vor `Chat 10`); angepinnte stehen immer oben. Zweck: Projektname am Titelanfang ergibt eine Taxonomie. Tests: `test_chat_lists_sort_alphabetically_with_project_prefix_and_pins_stay_on_top`, `test_heinz_chat_list_sorts_alphabetically`.
- **Befund (nicht behoben, Strang Speicher):** `test_update_button_reports_states_and_reloads_after_update` ist unregelmäßig rot, auch ohne diese Änderungen (Unterhaltung geht beim Neuladen verloren, vermutlich schreibt IndexedDB asynchron und die Seite lädt davor neu). Zu prüfen, ob das auf dem Gerät eine Unterhaltung kosten kann (`HeinzStore.set` abwarten vor `location.reload`).

## 12.11.2026 – Schritt 6: Inline-Handler ersetzt, Testläufe schneller (Strang AIUIheinz-Dashboard)
- Alle 88 `onclick`/`oninput`/`onchange` in `dashboard.html` sind `data-click`/`data-input`/`data-change` (Zusatzwert `data-arg`). Neue Datei `lib/dashboard/actions.js`: Tabelle `ACTIONS` (Name → Funktion) und je ein Listener pro Ereignisart auf dem Dokument, der vom Ziel nach oben läuft. Fünf zusammengesetzte Handler wurden kleine Funktionen (`reload`, `pickBackupFile`, `openModelsFromPanelIfAny`, `toggleFastCard`, `onContextInput`). `send.js` setzt `data-click` statt `onclick` am Sendeknopf, `caps.js` sucht `button[data-click="toggleFull"]`. Verhalten und Aussehen unverändert.
- Tests: `test_every_control_of_the_dashboard_has_an_action_and_no_inline_handler_remains` (neu); `test_rules.py` durchsuchte noch `lib/bench` (seit der Umbenennung ohne Wirkung), jetzt `lib/dashboard`. In `test_pages.py` Knopfsuche über `data-click`, selbst ausgelöste Ereignisse mit `bubbles: true`.
- Unregelmäßiger Test `test_update_button_reports_states_and_reloads_after_update`: Ursache war der Test selbst (Zählung der Nachrichten vor Ende des Seitenaufbaus nach dem Neuladen); er wartet jetzt auf `HeinzDashboard.ready`. Sechs Wiederholungen grün.
- `tests/run_all.sh`: Schnellauswahl `bash tests/run_all.sh <Wort>`; voller Lauf mit parallelen Teilen der Seitentests (`HEINZ_SHARD=i/n` in `test_pages.py`, Standard Anzahl Kerne, höchstens 4): 119 s statt 180 bis 220 s auf 2 Kernen. Regeln in `UEBERGABE.md` und `TECHNIK.md`.
- Offen: ES-Module mit ausdrücklichem Zustand. Alles lief nur simuliert (Playwright), nicht am Gerät.

## 12.11.2026 – Umstellung auf ES-Module (Strang AIUIheinz-Fundament)
- **Umfang (fünf Schritte, je ein Commit, vor jedem Push alle Tests grün):** (1) Dashboard: 19 Dateien plus `base`, `state`, `persist`, `init`, `main`, `failsafe` unter `lib/dashboard/`, `dashboard.html` lädt nur noch `main.js`; (2) Heinz Chat: `lib/chat/*.js`, zwei Inline-Handler über `data-click` und `ACTIONS`; (3) Hub und Tool-Seiten: Inline-Skript als `type="module"`, Inline-Handler im Design-Katalog durch Listener ersetzt (`id="open-bsheet"`); (4) Bibliotheken `markdown`, `pixel`, `dashboarddata`, `store`, `testreihe`, `personas`, `providers` (mit `HeinzCaps`) exportieren ihr Objekt, `window.X` bleibt; (5) Regeltests und Doku.
- **Abweichung vom Auftrag:** `lib/core.js` bleibt ein klassisches Skript im `<head>` (Kopf-Block). Es setzt Thema und Sprache vor dem ersten Zeichnen; als Modul liefe es erst danach (Aufblitzen). Der Auftrag nennt den Kopf-Block selbst als Ausnahme. `window.Heinz` bleibt die Brücke; `base.js` liest sie.
- **Aufbau:** Zustand in einem Objekt `state` je Bereich, `settings` als `export const`, nie `export let`. Das Dashboard bleibt eine zusammenhängende Gruppe mit Kreisen (frühere Namensgemeinschaft), abgesichert durch einen Test, der jede Datei als erstes Modul lädt; Heinz Chat ist azyklisch. Fassade `window.HeinzDashboard` und Sicherheitsnetz `failsafe.js` (klassisch, rotes Band) bleiben. Einzelheiten `docs/MODULE.md`.
- **Befunde:** Tests benutzten freie Globals (Funktionen der Seite über `evaluate`), obwohl der Auftrag das nicht annahm; ersetzt durch Fassade, Ereignisse oder Browser-Mocks. Zwei Tests waren schon vorher unregelmäßig (Löschen einer Unterhaltung im Heinz Chat vor dem Neuladen, Systemprompt je Modell im Modellblatt) und sind stabilisiert (Warten auf Schreiben beziehungsweise Auswahl). Der Design-Katalog setzt `window.CATALOG` und `window.FUNCS` für Tests; er zeigt weiter alle Bausteine (Tests grün).
- **Neue Regeln in `tests/test_rules.py` (je mit Mutationstest rot gesehen):** ein Einstiegsmodul je Modulseite, kein Inline-Skript oder -Handler, jede `data-click` hat einen Eintrag in `ACTIONS`, nur `base.js` importiert aus `../` und liest `window.Heinz`, kein `export let`, Bibliotheken exportieren und importieren nichts, kein klassisches Skript außer `lib/core.js`, `failsafe.js` und den drei alten Seiten (`LEGACY_PAGES`). Neu in `test_pages.py`: jede Datei lädt einzeln als erstes Modul.
- **`sw.js` geprüft:** Netz zuerst ohne Vorabliste, `server.py` sendet für statische Dateien `Cache-Control: no-cache`. Online kommen alle Dateien eines Neuladens frisch vom Netz, ein Mischstand aus altem und neuem Modulgraphen kann nur entstehen, wenn einzelne Dateien beim Laden ausfallen und aus dem Cache kommen (Netzabbruch beim Update). Dann zeigt `failsafe.js` das rote Band, Neuladen behebt es. Keine Änderung an `sw.js`.
- **Nicht umgesetzt (Auftrag):** `lab.html`, `sheet.html`, `vitals.html` (nur nach Rücksprache), Behebung der Kreise im Dashboard, Zusammenführung der doppelten Teile von Dashboard und Heinz Chat.
- **Handytest (Entwickler, installierte App und Browsertab, nach `git pull`, `bash start.sh` und hartem Neuladen):** Dashboard öffnet, Modell laden und antworten, Regler, Unterhaltungen bleiben erhalten, „In den Chat übernehmen“, Heinz Chat öffnet und antwortet (Modellblatt, Unterhaltungsliste, Systemprompt je Modell, Schließen der Blätter), Hub-Kacheln, Design-Katalog (Bausteine, Schnellblatt-Beispielknopf, Pixel-Anzeigen), Setup, Update-Knopf. Zeit bis zur ersten Antwort 4 bis 6 s darf nicht schlechter werden. Alles bisher nur simuliert (Playwright, simuliertes Ollama), nichts am Gerät bestätigt.

## 13.11.2026 – Fundament Phase 2 (Strang AIUIheinz-Fundament)
- **Schritt 0a:** leerer orange Balken im Heinz Chat behoben (`.notice[hidden] { display: none; }` in `lib/core.css`).
- **Schritt 1:** Kreise im Dashboard abgebaut. Importgraph in Ebenen, Importe gehen nur abwärts. Rückrufe nach oben laufen über `lib/dashboard/hooks.js` (Tabelle benannter Rückrufe, je Name eine Umsetzung in `init.js`, nur für „neu zeichnen“ und „Zustand geändert“). Neue Dateien `clipboard`, `sliders`, `params`, `build`, `protocol`. Tests in `tests/test_rules.py`: kein Kreis in `lib/dashboard` und `lib/chat`, jeder Hook ist gelistet, registriert und aufgerufen, Graph in `docs/MODULE.md` ist aktuell (`tests/modulegraph.py --write`).
- **Schritt 2 (Inventur, dann Beschluss des Entwicklers):** Markdown gemeinsam (Dashboard-Verfahren, `lib/shared/markdown.js`, Stile in `lib/core.css`); Zeile der Unterhaltungsliste gemeinsam (`lib/shared/conversations.js`, Chat bleibt bei Symbolen ohne Text, Dashboard mit Beschriftung, Moduspunkt nur Dashboard); Nachrichten zeichnen und Modellblatt getrennt. Tests: gleiche Ausgabe in beiden Seiten, gleiche Stile, Kopierknopf im Chat, gleiche Struktur der Zeile; Regel, dass `lib/shared` weder Dashboard noch Chat kennt. Katalogeintrag „Markdown output“ im Design-Katalog.
- **Schritt 3:** `docs/HANDYTEST.md` angelegt, Testlücken in `docs/MODULE.md`.
- **Befunde:** `esc` bleibt in zwei Varianten (Dashboard maskiert keine Anführungszeichen); der Chat erzeugte `<p><pre>`, jetzt entfallen. Beim Streamen rendert der Chat das reichere Markdown je Token neu (Tempo am Handy prüfen).
- **Nur simuliert getestet (Playwright), nichts am Gerät.** B1 und B2 nicht berührt.
- Handytest-Zwischenstand 13.11.2026 (Entwickler): Chat-Pillen bleiben Symbol-only; Wünsche für Schritt 2b (Chatliste ohne Punkte, Pillen so breit wie der Eintrag, Titel-Tipp schließt nur die Pillen, Mehrfachauswahl auch im Heinz Chat, gleiche Liste in beiden Seiten) und Beobachtung roter Statusring beim Seitenwechsel notiert.
