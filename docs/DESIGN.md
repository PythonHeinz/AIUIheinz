# Design-Manifest Heinz UI

Stand: 10.11.2026 (Strang „AIUIheinz-Design“, Schritt 1–3 umgesetzt: Variablen und Themes, Symbolsatz, `chat.html` neu). Quellen: Wünsche des Entwicklers und seine Screenshots (Heinz UI, INCIheinz, Convert2), Farben und Schriften aus INCIheinz. Was hier steht, ist gebaut oder als „Zielbild“ markiert.

## 1 Grundsätze
- **Reines HTML, CSS und JavaScript, ohne Build, ohne Bibliotheken.** Alles läuft offline. Gemeinsam: `lib/core.css`, `lib/core.js`, `lib/icons.svg`.
- **Wenige Linien.** Hell: Flächen werden durch Füllung getrennt, Bedienelemente haben keinen Rand (`--ol: transparent`), nur dünne Haarlinien (`--line`) trennen Bereiche („Google-clean“). Dunkel: dieselbe Gliederung, aber Pillen, Chips und Felder bekommen einen dünnen grauen Umriss (`--ol: #3c4043`). Neue Elemente bekommen Rand nur über `var(--ol)`, nie fest.
- **Deckende Flächen.** Keine Verläufe, keine Weichzeichner-Schatten. Der Statusring hat einen flachen Hof (3 px, gleiche Farbe, kein Blur).
- **Pillen und Bubbles** statt eckiger Kästen: Pillen 99 px, Karten 14–18 px, Sheets 26 px oben. Eine Form pro Funktion.
- **Listen statt Tabellen.** Menüzeile = Symbolkachel, Titel, grauer Untertitel, rechts Schalter oder Pfeil. Tabellen nur für echte Spalten.
- **Symbole statt Emojis** (eigener Satz, siehe 4). Emojis nur noch in Alt-Seiten, die noch nicht umgebaut sind (Hub, Lab, Sheet, Vitals).
- **Ein Daumen-Bedienkonzept** für den Pixel 9 Pro (rund 426 × 803 px): Eingabe unten, Menü als Bottom-Sheet, Chatliste von links (nur Antippen, kein Randwischen).

## 2 Farben und Themes
Hell, Dunkel, Auto (folgt dem System): `<html data-theme="auto|lt|dk">`, gesetzt von `lib/core.js` (`Heinz.setTheme`, Schlüssel `heinz_settings.theme`) schon im `<head>`, damit nichts flackert. Auswahl im Menü „Darstellung“.

| Variable | Dunkel | Hell |
|---|---|---|
| `--bg` Seite | `#000` | `#f4f6f8` |
| `--surf` Flächen, Sheets | `#121212` | `#fff` |
| `--card` Kacheln, Pillen | `#202124` | `#eceff3` |
| `--line` Haarlinie / `--edge` Umriss | `#2a2a2a` / `#3c4043` | `#e1e4e8` / `#dadce0` |
| `--ol` Rand an Bedienelementen | `#3c4043` | transparent |
| `--txt` / `--sub` / `--muted` | `#e8eaed` / `#9aa0a6` / `#6f757b` | `#202124` / `#5f6368` / `#80868b` |
| `--pri` Links, Häkchen | `#8ab4f8` | `#1a73e8` |
| Status | `--blue #4285f4 --green #34a853 --yellow #fbbc05 --orange #fb8c00 --red #ea4335` | gleich |

- **Eine Akzentfarbe je Modus:** `--acc` (und `--onacc` für Schrift darauf) setzt `applyModeStyling()`. Sie färbt Sendepfeil, Schalter, Eingabefeld-Rand, Zähler, Anzeige des aktiven Modus. Wilson `#4285f4`, Heinz `#e91e63`, Audit `#fbbc05` (dunkle Schrift), Code `#6b8ba4`, Creative `#a142f4`. Gelb nie als Textfarbe auf Hell.
- **Statusring** (Kopfzeile): Rot = Engine nicht erreichbar, Orange = Modell lädt, Blau = bereit, Grün = antwortet. Klassen `s-red/s-orange/s-blue/s-green`.
- Hub und Platzhalterseiten nutzen die Variablen schon (laufen in beiden Themes), sind aber noch nicht im neuen Stil gebaut.

## 3 Schrift
- **Oberfläche:** `Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` (`--font`). Nur Systemschriften, nichts aus dem Netz. Käme eine besondere Schrift dazu, liegt sie lokal im Repo.
- **Antworttext im Chat und späterer Lesemodus:** Georgia (`--serif`), ohne Kasten. Kühl (serifenlos) = Werkzeuge und Entwickler-Test, warm (Serife) = Assistent und Lesen.
- **Monospace** (`--mono`) für Code und Zahlen (Metrik-Chips, Slider-Werte).
- **Versalien-Überschriften** (`.caps`): 0,69 rem, Sperrung 0,16 em, Nebenfarbe (Menügruppen, „KONTEXT · OPTIONAL“, Modellname des Chips klein darüber).

## 4 Bausteine (`lib/core.css`) und Symbolsatz
- **Symbole `lib/icons.svg`:** eigener Satz, 24 × 24, Linien 1,8, runde Enden, `currentColor`. Einbinden: `<svg class="i"><use href="lib/icons.svg#i-menu"/></svg>` (`.i`, Größen `.sm` 18 px, `.lg` 26 px). Enthalten: Menü, Kopieren, Plus, Chats, Senden, Mikro, Lautsprecher, Stopp, Pfeile, X, Häkchen, Suche, Punkte, Vollbild, Dokument, CPU, Wolke (auch durchgestrichen), Terminal, Blitz, Rakete, Regler, Tacho, Stoppuhr, Schlüssel, Kontrast, Download, Aktualisieren, Papierkorb, Merken, Stift, Globus, Info, Schloss, Ebenen, Sprache, Funke, die fünf Modi (`i-m-wilson/heinz/audit/code/creative`) und das Heinz-Zeichen. Neues Symbol = neues `<symbol id="i-…">` in der Datei, Test `test_every_symbol_used_exists_in_the_sprite` prüft, dass jedes benutzte vorhanden ist.
- **Bausteine:** `.pill` (`.acc`, `.danger`), `.round`, `.ibtn`, `.ring-btn`, `.lang-btn` (EN/DE-Umschalter), `.sw` (Schalter 46 × 28), `.row` mit `.tile`, `.caps`, `.scrim` + `.sheet` (Bottom-Sheet, Seiten mit Zurückpfeil), `.slidercard` (große Regler-Karte).
- **Chat-Seite (`chat.html`):** Kopfzeile 76 px (Ring 52 px mit „Heinz UI“ und Link zum Hub, zweizeiliger Modellchip Engine/Modell, EN/DE, Burger); Modusleiste (Symbol zentriert in 52 × 30-Pille mit Modusfarbe, Name darunter); Chatleiste 44 px (Chatliste mit Zähler links, Titel, Gesamten Chat kopieren, Neuer Chat); Antworten ohne Kasten in Georgia; vier Metrik-Chips in einer Zeile (`P`, `A`, `T/s`, `Start`); Prompt = wachsendes Textfeld bis 40 % der Höhe mit Vollbild-Editor, rundem Mikrofon und rundem Pfeil-nach-oben; darunter Vorlesen (wird zu „Vorlesen stoppen“) und der rote Stopp nur während der Antwort; Kontext als gestrichelte Karte **unter** dem Prompt, nur in Modi mit Kontext („KONTEXT · OPTIONAL/PFLICHT“), mit eigenem Vollbild.
- **Menü (Bottom-Sheet):** oben Schnellschalter (Engine, Online erlauben, eigener Systemprompt, Schnellmodus, Modell vorladen), dann Gruppen in Versalien (Gespräche, Modell und Leistung, Online nur bei „Online erlauben“, App). Untermenüs ersetzen den Inhalt im selben Sheet mit Zurückpfeil: Engine, Parameter (große Regler-Karten), Tempo-Test, Darstellung, Update und Info.
- **Modellwahl:** eigenes Sheet statt Auswahlliste, Name groß, Variante darunter, „im Speicher“ mit grünem Punkt, Häkchen am gewählten, Filterfeld ab 8 Modellen, kein Emoji. Das versteckte `<select id="model-select">` bleibt der Zustandsträger.
- **Online ändert die Oberfläche:** mit „Online erlauben“ erscheint die Gruppe „Online“ im Menü, und eine Online-Engine zeigt am Chip „… · ONLINE“ in Orange. Ohne den Haken kein Online-Eintrag. Welche Werkzeuge ohne Online grau werden, ist offen (kommt mit dem Werkzeug-Bereich).

## 4a Pixeldisplay (`lib/pixel.js`)
- LED-Matrix auf `<canvas>`: Raster 3 px, Punkte 2 px, ausgeschaltete LEDs als schwache Quadrate sichtbar, Feld in **beiden** Themes dunkel (es leuchtet). 5×7-Pixelschrift, nur Großbuchstaben, EN/DE inkl. Ä Ö Ü ß. API: `new Heinz.Pixel(canvas,{rows,pitch})`, `text`, `ticker` (läuft nur, wenn der Text nicht passt), `lamp` (5×5), `bars`, `spark`, `rect`, `run(drawFn)`. Farben = Statusfarben (Rot/Orange/Blau/Grün/Gelb).
- **Hub:** Eine Anzeige **vor der Rubrik** (unter den Reitern), nicht zwei Zeilen unter der Kopfzeile: Ampelmännchen (`Heinz.Pixel.SPRITES`: rot stehend = Ollama nicht erreichbar, grün gehend = Ollama läuft) plus Endlos-Lauftext mit dem Wichtigsten des gewählten Bereichs (Chats & Modelle: Engines und geladenes Modell; Tools: Anzahl und Stand der Werkzeuge). Weitere Meldungen (z. B. wichtige Mails mit Betreff) kommen als Segmente `[[Text, Farbe], …]` in `tickerItems()`. Für Screenreader steht der Zustand unsichtbar in `#status`.
- **Chat-Kopfzeile:** Der Modellchip ist ein Pixeldisplay (Raster 2 px): oben Modus in Modusfarbe · Engine (Orange bei Online), darunter der Modellname; rechts der **Token-Puls** (6 Balken: grün und lebhaft bei Antwort, orange Lichtlauf beim Laden, sonst nur Grundlinie) und ein Pfeil. Lange Namen laufen als Lauftext.
- **Tempo-Test:** Anzeige im Menü: Kopfzeile (`4 THR · RUN 2/2 · 10 S`, am Ende `BEST …`), ein Balken je Messlauf (Generier-t/s, Farbe je Thread-Zahl, der laufende Lauf pulsiert), unten ein Fortschrittsbalken (Schätzung nach der Dauer der fertigen Läufe).
- **Update und Info:** Anzeige mit Lichtlauf beim Prüfen, Balken beim Warten auf den Server-Neustart, voll grün/rot am Ende.
- Noch offen: Parameter-Verlauf als Balken/Linie (braucht Messwerte je Antwort), weitere Sprites (z. B. Lade-Animation), Mail-Meldungen im Hub.

## 5 Navigation (Zielbild und Stand)
- **Bereiche (Beschluss 10.11.2026):** Umgeschaltet wird auf der Startseite (Hub) mit zwei Reitern: **Chats & Modelle** (Liste: der Chat unter seinem Markennamen „Heinz UI“, Modelle, darunter „Alte Versionen“) und **Tools** (Widgets, Rechner, Converter, alles was von KI profitiert) als **App-Drawer**: Kacheln (3 je Reihe) mit eigenem App-Symbol; `tool.json` kann `appicon` (Bildpfad im Repo) statt `symbol` setzen, z. B. für INCIheinz. Zuordnung über `tool.json` (`area`: `chat` | `tools`); Wahl in `heinz_hub.area`. Der Hub ist die persönliche Visitenkarte: ruhig, dezent, Slogan in Georgia kursiv, Pixeldisplay als Statusfeld direkt unter der Kopfzeile, Fußzeile „OFFLINE FIRST“. Die Rubrik „Einstellungen“ steht in allen Bereichen gleich. Der Konzept-Planer kennt diesen Beschluss noch nicht (KONZEPT 15.3: „zwei Bereiche“).
- **EN/DE bleibt in der Chat-Kopfzeile sichtbar** (schnell dieselbe Frage in der anderen Sprache prüfen, Sprachtest), nicht im Menü versteckt.
- Kein Wischen zwischen Bereichen und kein Wischen zum Aktualisieren (`overscroll-behavior-y: none`).
- Zielbild später: untere Leiste mit runder Mitteltaste, Bereichsumschalter unter der Kopfzeile.

## 6 Splitscreen mit der Konsole und Tastatur
- Die Seite füllt `100dvh` (mindestens 560 px, darunter scrollt sie). Feste Leisten bleiben dünn (Kopfzeile 76, Chatleiste 44, Modusleiste 62).
- **Wenig Platz** (Tastatur offen oder Splitscreen, Höhe unter 560 px) **und Fokus im Prompt:** Modusleiste, Metrik-Chips, Aktionszeile und Kontext werden ausgeblendet, der Chat bekommt den Platz (`body.kbd`). Fokus im Kontext blendet nur Modusleiste, Chips und Aktionen aus (`body.kbd-ctx`). Viewport-Meta mit `interactive-widget=resizes-content`.
- Jede neue Seite bei 426 × 803 und 426 × 400 prüfen.

## 7 Regeln für neue Seiten
- `lib/core.css`, `lib/core.js` (im `<head>`, wegen des Themes) und bei Symbolen `lib/icons.svg` einbinden.
- Farben nur über Variablen, Ränder nur über `var(--ol)`, Texte immer EN und DE, Symbole aus `lib/icons.svg`.
- Relative Pfade, Server nur über `/api/...`.
- Vor dem Umbau einer bestehenden Seite kurz fragen; Hub, Kopfzeile und `lib/` gehören zum Fundament (ein Chat zur Zeit).

## 8 Umsetzung
Strang „AIUIheinz-Design“: (1) Manifest geschärft ✔, (2) Variablen, Themes und Symbolsatz in `lib/` ✔, (3) Bausteine als Beispielseite `tools/design/index.html` ✔ (ohne `tool.json`, nicht im Hub; erreichbar unter `/tools/design/index.html`), (4) Hub im neuen Stil ✔ (Bereichsumschalter, Zeilen mit Symbolen), (5) Chat-Seite ✔ (vorgezogen auf ausdrücklichen Wunsch, der Chat-Strang hatte schon gepusht). Offen: Zuschnitt der drei Bereiche, Lesemodus in warmer Serife, Werkzeuge mit Online-Sperre, Sprache der Oberfläche im Menü „Einstellungen“, ob Inter lokal mitgeliefert wird.
