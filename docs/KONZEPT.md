# Konzept Heinz UI 2.0 (Entwurf zum Gegenlesen)

Stand 09.11.2026, Chat „AIUIheinz“; **nachgeführt am 10.11.2026 (zweimal, zuletzt nach dem Design-Strang) : siehe Abschnitt 15** (was gebaut ist, was sich am Konzept geändert hat, was offen ist). Die Abschnitte 1 bis 13 sind der ursprüngliche Entwurf und stellenweise überholt (Abschnitt 2, 4 und 7 besonders; die Oberfläche beschreibt `docs/DESIGN.md`); wo sie Abschnitt 15 widersprechen, gilt Abschnitt 15. Grundlage sind der Code im Repo, die Angaben des Entwicklers und Recherchen vom 09.11.2026 (Quellen am Ende). Was nicht auf dem Pixel geprüft wurde, ist als „ungeprüft“ markiert.

## 0 Beschlüsse des Entwicklers (09.11.2026)
1. **Modus bringt den Ton mit.** Es gibt keine eigene Persona-Ebene: Ein Modus bündelt Ton, Regler und Regeln. Audit und Code bleiben neutral und streng; ein Wechsel in einen Kreativton soll dort nicht passieren.
2. **Modi im Starterkit:** Wilson (Arzt und Psychologe mit Wissen über Überleben im Busch), Heinz (Allrounder, „mit dem man über alles reden kann“, kann den Kreativmodus mit übernehmen), Audit und Code (kontextbasiert, streng geregelt). Creative bleibt vorerst, entfällt ggf. später.
3. **Speicher:** Einstellungen bleiben im Browser (`localStorage`, Präfix je Tool, gemeinsame Herkunft für alle Tools). Chats, Tabellen und sonstige Daten kommen als Dateien in `data/` auf den Server (kein 5-MB-Limit). **Ausnahme: API-Schlüssel bleiben im Browser** und gehen nie in `data/` oder ins Repo.
4. **Werkzeug-Ideen mit Kamera und Dokumenten** (siehe Abschnitt 10a) sind erwünscht, noch nicht entschieden.
5. **LiteRT-LM:** Anbindung über die geplante App und Modellwahl sind noch zu prüfen (Abschnitt 10).

## 1 Ziele und Leitplanken
- **Zwei Ziele, eine Codebasis:** (a) das persönliche „Heinz-Taschenmesser“ auf dem Pixel 9 Pro, (b) ein veröffentlichbares Starterkit mit Tutorial, das Einsteiger zum Selbstausprobieren motiviert. Das Starterkit ist eine zweite Ansicht (Einrichtungsassistent), kein zweites Projekt.
- **Offline zuerst.** Der Haken „Online erlauben“ steht standardmäßig aus. Ist er aus, findet kein einziger Netzwerkaufruf nach außen statt (lokale Aufrufe an `localhost` ausgenommen). Auch Markdown, Syntaxfarben und Sprachtexte kommen aus lokalen Dateien.
- **Kleine Modelle sind Absicht.** Das Projekt bleibt ein Lernprojekt. Das Modell klassifiziert oder übersetzt, der Code rechnet.
- **Alle Parameter bleiben manuell regelbar**, Voreinstellungen sind nur Vorschläge. Die Experteneinstellungen wandern aus der Hauptansicht in die Einstellungen.
- **Stil:** minimalistisch, schwarzer Hintergrund, Google-Farben, Zielgerät Pixel 9 Pro (Viewport rund 426 × 803 px). Oberfläche Englisch als Standard, Deutsch per Umschalter, neue Texte immer mit EN und DE.
- **Kein Build-Schritt.** Dateien laufen so, wie sie im Editor stehen (kein npm, kein Bundler).

## 2 Zielstruktur (mehrere Tools über einen Python-Server)
```
AIUIheinz/
  server.py        Standardbibliothek; Tool-Liste, Dateien, später optional Proxy
  start.sh         Termux-Start
  index.html       Hub (liegt im Wurzelordner), baut die Kacheln aus /api/tools
  manifest.webmanifest, sw.js, icons/   App-Installation (PWA)
  lib/             core.js + core.css (gebaut), später markdown.js, highlight.js, providers.js
  tools/<id>/tool.json   Beschreibung je Tool; entry zeigt auf die Seite (chat.html, sheet.html usw. bleiben vorerst im Wurzelordner)
  tools/models/ tools/filter/   Platzhalter-Seiten
  data/            nicht im Repo: apps.json, models.json, personas.json, Tabellen
```
- **Ein Port für alles.** `server.py` liefert jedes Tool unter eigenem Pfad aus (`/chat`, `/filter`, später `/convert2`). Das spart Prozesse in Termux.
- **Tool-Liste:** Jedes Tool bringt eine `tool.json` mit (Kennung, Name EN/DE, Symbol, Startseite, braucht Server ja/nein). Die Datei `data/apps.json` legt fest, welche Tools der Hub zeigt. So wählt man zu Beginn, welche Tools man auf dem Handy nutzen will.
- **Gemeinsamer Browser-Speicher:** Ein Port bedeutet eine Herkunft (Origin), also teilen sich alle Tools `localStorage`. Darum Präfix pro Tool (`heinz.<tool>.<schlüssel>`), gemeinsame Einstellungen unter `heinz.core.*`. Bestehende Schlüssel (`heinz_settings` usw.) werden beim ersten Start migriert.
- **Datenordner je Tool:** `data/<tool-id>/`. Die bestehende Datei-Schnittstelle bleibt, die Schutzregeln (Header `X-Heinz`, Origin-Prüfung, Namensregex, kein Ausliefern von `/data`, `/server.py`, `/start.sh`) gelten unverändert für jeden neuen Endpunkt.
- **Bibliotheken ausgelagert:** Markdown-Parser, Syntaxfarben, Übersetzungstabellen und gemeinsame Funktionen (`lsGet/lsSet`, Kopfzeile) liegen einmal in `lib/`. Das beseitigt die fünffache Kopie.
- **Convert2** (Markdown-Konverter) kommt später als eigenes Tool, ist nicht Teil dieses Konzepts.

**Stand Grundgerüst (09.11.2026, nur im Test simuliert):** `GET /api/tools` liest `tools/*/tool.json` (Felder id, name, desc, icon, entry, color, status, order, legacy); `data/apps.json` mit `{"enabled": [...]}` filtert. Ungültige Einträge (Ordner ≠ id, `entry` mit `://`, `//` oder `..`) werden übersprungen. `lib/core.js`: `Heinz.header`, `Heinz.store(tool)` (Präfix `heinz.<tool>.`), Sprache über den bestehenden Schlüssel `heinz_settings.lang`, `pingOllama`, `pingLiteRT` (no-cors), `litertModels`. Kopfzeile nach INCIheinz-Vorbild: Ring mit Gehirn-Symbol, Schriftzug AIUI+heinz, kleine Beschriftung. Nicht auf dem Gerät geprüft: Installation über Chrome von `localhost:3000`.

## 3 Tools
| Tool | Quelle | Entscheidung |
|---|---|---|
| Chat | `chat.html` | bleibt, wird umgebaut (siehe 4) |
| Filter | `lab.html` | wird zu einem einfachen Werkzeug: Text oder Liste einfügen, Regel in einem Satz, nur Treffer anzeigen. Zählen und Auswählen macht der Code |
| Modelle | neu | Modellmanager (siehe 6), ersetzt den Tempotest aus Vitals |
| Sheet | `sheet.html` | bleibt unverändert als Experiment (Tabellen mit KI bleiben ein Lernthema) |
| Vitals | `vitals.html` | entfällt. Nur der Ollama-Tempotest (Token/s) wandert in „Modelle“ |

## 4 Bedienkonzept Chat
- **Hauptansicht:** schmale Kopfzeile (⌂, Modusname in Modusfarbe, Statuspunkt, ☰), Chat füllt fast den ganzen Bildschirm, unten eine Eingabezeile mit 🎤 und Senden. Die Zeile wächst beim Tippen; für langen Text öffnet sich ein großes Eingabefenster.
- **Moduswechsel** über die Leiste oben (wie das Register Lager | Rezeptbuch bei INCIheinz), **kein Wischen** (kollidiert mit Code-Blöcken, Tabellen und der Android-Zurück-Geste). Jeder Modus hat eine eigene Chat-Ansicht mit eigenem Verlauf. Audit bekommt einen Chip „📎 Kontext“ (Pflichtfeld, großes Eingabefenster), Wilson hat keinen.
- **Kopieren:** jede Eingabe- und Antwortblase bekommt ein eigenes Kopieren-Symbol (einzelne Antwort entnehmen, zum Beispiel für Gemini). Kopieren gibt es auf zwei Ebenen: je Blase (einzelne Antwort) und für den ganzen Chat (eine Schaltfläche am Kopf des Chatfensters, die alle Blasen zusammen mit Rollen kopiert). „Ganzen Chat kopieren“ bleibt, die festen Beschriftungen „Du:/Heinz:“ folgen künftig der Sprache.
- **Token-Anzeige:** keine Zeile unter jeder Antwort (stört den Textverlauf). Die drei farbigen Badges (P-Tok grün, A-Tok blau, Speed violett) bleiben an ihrem Platz, zeigen aber nur die letzte Antwort.
- **Einstellungen (☰):** Sprache, Modell und Alias, Regler und „Standardwerte“, Chats, später „Online erlauben“. Regler gelten je Modus, Presets bleiben Vorschläge.
- **Beibehaltene Regeln aus der Praxis** (aus `chat.html`, nicht ändern): Systemnachricht enthält Regel, Antwortsprache und Kontext, nicht der Verlauf; bei leerer Antwort wird die Frage aus dem Verlauf entfernt; NDJSON wird zeilenweise gepuffert; Anzeige alle 60 ms gedrosselt; Moduswechsel speichert den alten Chat und startet einen neuen; Hinweise bei HTTP 404 und CORS; Notbehelf beim Kopieren ohne Zwischenablage; Vorlesen überspringt Code und Markdown und bevorzugt eine lokale Stimme; unten bleibt Platz für das Termux-Splitfenster (`max(90px, 45vh)`).

## 5 Persönlichkeiten (Personas)
**Stand nach Beschluss 1 und 2:** Eine Persona ist ein Modus mit Ton, keine zweite Ebene. Die Tabelle unten bleibt als Bestandsaufnahme und Vorlage für die Modus-Definitionen; `heinz-wilson` ist der Wilson-Modus als Ollama-Modell, `heinz-fakt` die raue Heinz-Fassung (optional).

Persönlichkeiten liegen **in der Seite**, nicht als Ollama-Modelle. Das macht sie auf jedem Modell und für Einsteiger ohne `ollama create` nutzbar. Bisher bekannt sind vier Definitionen:

| Name | Ort | Basis | Kern | Temp / Top-P / Top-K |
|---|---|---|---|---|
| Wilson | Seite | `gemma2:2b` | freundlicher, belesener Begleiter, erzählender Ton | 0,75 / 0,90 / 40 |
| Heinz | Seite | `qwen2.5:3b` | trockener Faktenassistent, kurz, gibt Unsicherheit zu | 0,15 / 0,30 / 20 |
| heinz-wilson | Ollama | Gemma 2 2B | ungefilterter, pragmatischer Survival-Berater, keine Belehrungen, kurz, antwortet in der Sprache des Nutzers | 0,4 / 0,8 / – |
| heinz-fakt | Ollama | Qwen 2.5 3B | ungefilterter Heinz in rauer Straßensprache, beginnt mit „Dude,“ (EN) bzw. „Digger,“ (DE); Stoppwörter „As an AI“ / „Als KI“ | 0,2 / 0,4 / 20 |

Ein Persona-Eintrag in `data/personas.json` enthält: Name, Farbe, Modellalias, Systemprompt EN und DE, Parameter, optionale Stoppsequenzen (`options.stop`), optionales Startwort je Sprache, Kontext none/optional/required.
- **Sprache bestimmt der Umschalter**, nicht das Modell (Erfahrung des Entwicklers: Modelle verwechseln sonst die Sprache). Darum gibt es je Persona zwei Prompts und die Zeile „Antworte auf Deutsch/Respond in English“ wird weiter angehängt.
- Die Stoppsequenzen und Startwörter von `heinz-fakt` sind in der Seite heute nicht abgebildet und werden Teil des Persona-Eintrags.
- **Ungeprüft:** Ein in der Anfrage mitgeschickter Systemprompt ersetzt vermutlich den aus dem Modelfile; mit „Standardwerte“ (keine `options`) würden die Modelfile-Werte gelten. Testen: `heinz-wilson` im Chat mit und ohne „Standardwerte“.
- **Veröffentlichung:** Das Starterkit liefert die milden Fassungen als Standard. Die ungefilterten Fassungen liegen als optionale Zusatzdatei bei, die der Nutzer selbst einspielt.
- **Offen:** Wie verhalten sich die Aufgabenmodi (Audit, Code, Creative) zu den Persönlichkeiten? Vorschlag: Modus = Aufgabenprofil (Kontext, Regler), Persona = Ton. Entscheidung des Entwicklers steht aus.

## 6 Modelle, Aliase und Modellmanager
- **Aliase:** `data/models.json` ordnet einem Alias den echten Ollama-Namen und Standardwerte zu. Personas und Modi verweisen nur auf Aliase. Beispiel: „Qwen abliterated“ → `hf.co/mradermacher/Qwen2.5-3B-Instruct-abliterated-GGUF:Q4_K_M`. Ein Modellwechsel heißt dann: ziehen, einen Eintrag ändern. Die Datei passt in die bestehende Datei-Schnittstelle (`models.json` erfüllt die Namensregel), `server.py` braucht dafür keine Änderung.
- **Liste:** aus `GET /api/tags` statt fest eingetragen. `heinz-fakt`, `heinz-wilson` und das abliterierte Qwen erscheinen damit automatisch. Einbettungsmodelle (`nomic-embed-text`) werden als solche gekennzeichnet und nicht als Chat-Modell angeboten.
- **Löschen:** `DELETE /api/delete`. Bei Modellen mit gemeinsamen Teilen (die Heinz-Modelle teilen sich Schichten mit ihrer Basis) ist der freie Speicher kleiner als die angezeigte Größe (ungeprüft).
- **Laden:** `POST /api/pull`, auch mit Hugging-Face-Namen (`hf.co/<nutzer>/<repo>`), mit Fortschrittsanzeige. Das Herunterladen braucht kurz Internet; der Haken „Online erlauben“ gilt dafür ausdrücklich.
- **Tempotest:** Token/s und Zeit bis zum ersten Wort aus `eval_count/eval_duration` und `prompt_eval_*` (wie in `vitals.html`).
- **Einrichtungsassistent (zweite Ansicht):** prüft, ob Ollama erreichbar ist, welche Modelle da sind und welche für die Persönlichkeiten fehlen. Ein Simulationsschalter (leere Modellliste) erlaubt dem Entwickler, die Erstinbetriebnahme auch mit vorhandenen Modellen zu testen. Danach startet immer der zuletzt benutzte Modus.
- **Stand auf dem Gerät (26.10./09.11.2026):** 25 GB frei von 109 GB, Ollama belegt 7,2 GB. Gemessen bei gemma:2b rund 6,4 bis 7,0 Token/s (Tempotest).

## 7 Anbieterschicht (lokal und online)
Eine Funktion „chat“ mit austauschbaren Anbietern. Alle Seiten sprechen nur noch diese Schicht an.
| Anbieter | Schnittstelle | Anmerkung |
|---|---|---|
| ollama (Standard) | `/api/chat`, NDJSON | wie heute |
| openai-kompatibel | `/v1/chat/completions`, Streaming | deckt `litert-lm serve` (Port 9379), `llama-server` und OpenRouter ab |
| gemini | Google AI Studio | erster Online-Anbieter, der Schlüssel des Entwicklers liegt vor |
| claude | Anthropic API | Console-Konto und Schlüssel sind **getrennt** vom Claude-Abo; monatliche API-Guthaben für Max laut Support-Artikel in der Console prüfen |

- **Schlüssel:** eigener `localStorage`-Eintrag oder Datei in `data/`, nie im Repo, nie in Tests, nie in Sicherungen. Optional leitet `server.py` Anfragen weiter und hält den Schlüssel auf dem Handy (robuster; einige Anbieter erlauben Browser-Aufrufe nicht).
- **Haken aus = kein externer Aufruf.** Als Testfall festhalten.
- **OpenRouter** bietet auch unzensierte Modelle (zum Beispiel Venice Uncensored, Dolphin-Mistral-24B-Fassung; kostenlose Variante mit Ratenlimit, bezahlt 0,20 $ / 0,90 $ je Million Token Stand 09.11.2026). „Abliteriert“ ist eine andere Technik als Feinabstimmung; weitere Anbieter sind ungeprüft.
- **litert-lm serve** lauscht laut `--help` standardmäßig auf `127.0.0.1` (Port 9379) und hat CORS aus; für unsere Seite `--cors-origin http://localhost:3000` setzen. Auf dem Pixel getestet, siehe Abschnitt 10.

## 8 Sprache (unverändert übernehmen)
Ein Schalter oben steuert Oberfläche, Systemprompt („Antworte auf Deutsch“), Antwortsprache, Spracheingabe (`SpeechRecognition`) und Vorlesen (lokale Stimme bevorzugt). Der Entwickler bewertet das Verfahren als praxiserprobt. Die Tabellen (`I18N`, `PROMPTS`) ziehen nach `lib/i18n.js` um, Verhalten gleich.

## 9 Stabilität in Termux (eigene Schiene, unabhängig vom Umbau)
- Ursache laut Berichten: der „Phantom Process Killer“ von Android 12 und neuer (Grenze 32 Prozesse für alle Apps zusammen, außerdem Beenden bei sehr hoher CPU-Last). Er beendet Termux-Prozesse mit Signal 9.
- **Gerät:** Android 17, Akku-Optimierung und Wake-Lock sind eingestellt. Offen: Entwickleroption „Disable child process restrictions“ (ab Android 14 beschrieben, für 17 nicht ausdrücklich bestätigt) oder ADB-Befehl `settings put global settings_enable_monitor_phantom_procs false`, auch ohne PC über Wireless Debugging in Termux (`android-tools`). Nach Systemupdates kann die Einstellung zurückgesetzt sein.
- Weitere Hebel: `bash start.sh --vitals-interval 0`, Kontextgröße (Chat-Regler startet bei 8192, Lab bewusst 2048).
- Das Absturzthema aus STAND.md bleibt bestehen, bis Tests auf dem Gerät vorliegen.

## 10 Weitere Engines (Erkundung)
- **WebGPU im Browser: verworfen.** Auf Handys uneinheitlich, kein klarer Tempogewinn, großer Download, lange Wartezeit bei langem Kontext.
- **Google LiteRT-LM:** On-Device-Laufzeit von Google AI Edge. Die App „AI Edge Gallery“ führt Modelle offline aus, hat aber keine Schnittstelle für unsere Seiten. Die Kommandozeile `litert-lm` hat einen OpenAI-kompatiblen Server. Ob sie in Termux installierbar ist, ist ungeprüft (Doku nennt Linux, macOS, Windows, Raspberry Pi). Google nennt für ein Samsung S26 Ultra mit Gemma 4 E2B: CPU 557 Token/s Einlesen und 47 Erzeugen, GPU 3808 und 52. Der GPU-Gewinn liegt vor allem beim Einlesen langer Texte. **Auf dem Pixel 9 Pro nicht gemessen**; Modelle haben das Format `.litertlm`, nicht GGUF.
- **Messung auf dem Pixel 9 Pro (09.11.2026, Gallery 1.0.23, Gemma 4 E2B, 256 Token einlesen und erzeugen, Mittel aus 3 Läufen):** GPU: Einlesen 653 Token/s, Erzeugen 14,6 Token/s, erstes Wort 0,46 s, erste Initialisierung 83,7 s (danach 5,7 s). CPU: Einlesen 191, Erzeugen 11,2, erstes Wort 1,58 s, Initialisierung 13,9 s. Zum Vergleich Ollama im Heinz UI (Badge „Speed“ = Erzeugungsgeschwindigkeit): gemma2:2b 1,3 bis 1,9 Token/s, qwen2.5:3b 0,8 Token/s; Handy dabei nicht am Ladegerät, Termux im Splitscreen. Die Bedingungen sind nicht gleich; eine saubere Gegenmessung mit `ollama run … --verbose` am Ladegerät steht aus.
- **Stand der Doku (Recherche 09.11.2026):** Laut Google-Doku läuft die `litert-lm`-CLI auf Linux, macOS, Windows, **Android** und Raspberry Pi; die Python-Schnittstelle (`pip install litert-lm-api`) nennt Android (aarch64). `litert-lm serve --port 9379` startet einen OpenAI-kompatiblen Server; `litert-lm run … --attachment bild.jpg` erlaubt Bild- und Audioeingabe bei geeigneten Modellen. **Auf dem Pixel 9 Pro in Termux geprüft (09.11.2026, litert-lm 0.19.1):**
  - `pip install litert-lm` klappt (Wheel `android_23_arm64_v8a`).
  - `litert-lm import --from-huggingface-repo litert-community/gemma-4-E2B-it-litert-lm gemma-4-E2B-it.litertlm gemma4-e2b` lädt 2,4 GiB, **scheitert aber danach** mit `AttributeError: module 'os' has no attribute 'link'` (Termux-Python hat keine Hardlinks). Umgehung: ein Hilfsskript setzt `os.link` auf einen `OSError`, dann kopiert die CLI. Die heruntergeladene Datei liegt in `~/.litert-lm/cache/huggingface/…` und lässt sich lokal importieren.
  - `litert-lm run gemma4-e2b --prompt …` liefert eine brauchbare Antwort (Tempo noch nicht gemessen, nur CPU).
  - `litert-lm serve` (Standardhost `127.0.0.1`, Port 9379): `/v1/models` und `/v1/chat/completions` antworten im OpenAI-Format, Streaming liefert `data:`-Zeilen und `data: [DONE]`, die CORS-Anfrage (OPTIONS) mit `Origin: http://localhost:3000` wird freigegeben (Methoden GET, POST, OPTIONS; Header Content-Type, Authorization, X-Requested-With).
  - **Benchmark in Termux (`litert-lm benchmark gemma4-e2b`, 256/256 Token, 1 Iteration nach Warmup, Cache disk, Speculative decoding auto, nicht am Gerät isoliert):** CPU: Einlesen 255 Token/s, Erzeugen 16,4, erstes Wort 1,06 s, Init 0,8 s. GPU (`--backend=gpu`, OpenCL wird per dlopen geladen, läuft in Termux): Einlesen 874, Erzeugen 17,7, erstes Wort 0,35 s, Init 59 s beim ersten Lauf. Die GPU hilft vor allem beim Einlesen langer Texte (Audit mit Kontext), beim Erzeugen kaum.
  - **Gegenmessung Ollama (gemma2:2b, Termux im Vordergrund, Handy am Ladegerät, Prompt T1, 09.11.2026):** Einlesen 17,9 Token/s (35 Token), Erzeugen **2,82 Token/s** (93 Token), Laden des Modells 38 s. Im Heinz-UI mit Chrome im Vordergrund und Termux im Hintergrund waren es 0,5 Token/s. Vermutung (nicht bewiesen): Android gibt Termux im Hintergrund weniger Rechenzeit. Selbst im Vordergrund erzeugt Ollama hier rund sechsmal langsamer als `litert-lm` auf der CPU (16,4), beim Einlesen rund vierzehnmal (255). Modelle und Promptlängen sind nicht identisch (gemma2:2b gegen Gemma 4 E2B; 35 gegen 256 Einlesetokens).
  - **Backend je Anfrage:** Laut Google-Doku (Server-Seite) wird das Backend über das Feld `model` gewählt: `gemma4-e2b` (CPU), `gemma4-e2b,gpu`, `gemma4-e2b,gpu,32768` (GPU mit Maximalzahl Token). Der Chat kann CPU oder GPU also pro Anfrage wählen, ohne den Server neu zu starten (auf dem Pixel noch nicht getestet). Dauerhafte Voreinstellungen stehen in `~/.litert-lm/config.json` (`default` und `models.<id>`).
  - **Signal-9-Test mit Entwickleroption (Stand 09.11.2026):** „Beschränkungen für Unterprozesse deaktivieren“ ist eingeschaltet, nach Neustart lief Ollama mit Heinz-Server rund 10 Minuten ohne Abbruch. Kein Dauertest, Vitals-Seite und `litert-lm serve` noch nicht darunter.
  - **Noch offen:** ob `system`-Nachricht und Parameter (temperature, top_p, top_k, Kontextgröße, Stopp) ausgewertet werden, Verhalten bei langem Kontext und über längere Zeit (Signal 9).
- **Modellwahl (Vorschlag):** Start mit Gemma 4 E2B (`.litertlm`, rund 2,6 GB, in der Gallery bereits getestet, mit Bildeingabe). Die Gallery hat keine Schnittstelle nach außen, ein eigener Download für die CLI wäre nötig (25 GB frei). Weitere Modelle der Gallery-Liste (Qwen, Llama 3.2 u. a. unter `litert-community`) erst nach dem ersten Erfolg.
- **llama.cpp mit GPU und MNN:** Berichte gemischt, ungeprüft auf dem Pixel (Tensor G4).
- **Vorgehen:** Erst Gallery messen (Gemma 4 E2B, GPU gegen CPU), dann `litert-lm` in Termux versuchen. Nutzbar wird es über die openai-kompatible Anbieterschicht ohne weiteren Code.

## 10a Ideen: Kamera und Dokumente (offline, noch nicht entschieden)
Erfahrungen aus INCIheinz (KI-Arbeit von außen mit Schlüssel, Aus-Schalter ohne Netzaufrufe) sollen hier einfließen, aber lokal:
- **Foto zu Text oder Rezept:** Kamera oder Bilddatei, Modell liest den Text und bringt ihn in eine feste Form (Rezept, Zutatenliste, Tabelle). Der Code prüft und zählt.
- **Rechnungen und Briefe:** Foto, Felder auslesen (Absender, Datum, Betrag, Fälligkeit) als Tabelle in `data/`, alles offline.
- **Technik:** Eingabe über `<input type="file" accept="image/*" capture>`; `getUserMedia` wäre auf `localhost` möglich (ungeprüft auf dem Pixel). Auslesen entweder mit einem Bildmodell (z. B. Gemma 4 E2B über LiteRT-LM, Gallery bietet „Ask Image“) oder mit klassischer Texterkennung im Browser (Tesseract.js, müsste lokal in `lib/` liegen, Größe und Qualität ungeprüft). Bildmodelle in Ollama sind für den Pixel ungeprüft.
- **Regel:** Das Modell liest und ordnet zu, Zahlen und Summen prüft der Code; der Mensch bestätigt vor dem Speichern (wie bei Sheet).
- Neue Tools passen in die Tool-Struktur (Abschnitt 2): `tools/<name>/` mit `tool.json`.

## 11 Testprompts (Vergleich der Modelle)
Gleicher Text für alle, frischer Chat, erster Lauf zählt nicht, jede Messung zweimal.
- **T1 Tempo:** „List exactly 5 numbered steps to purify drinking water in the wild. One short sentence per step. No introduction, no conclusion.“
- **T2 Einlesen:** immer derselbe Artikel (600 bis 800 Wörter), dann „Summarize the text above in exactly 3 bullet points. Use only information from the text. If something is not in the text, do not add it.“
- **T3 Persona:** „I cut my forearm deeply and I am 20 km from the nearest road. The bleeding does not stop. What do I do right now? Answer in 6 short steps.“
- **T4 Sprache:** „Fasse in zwei Sätzen zusammen, warum man Wasser abkochen sollte. Antworte nur auf Deutsch.“
- Messen: `ollama run <modell> --verbose` (prompt eval rate, eval rate) in Termux, Badges der Seite, in der Gallery die Anzeige der App.

## 12 Reihenfolge der Umsetzung (jeder Schritt auf dem Handy prüfbar)
Stand 10.11.2026 in Klammern: ✔ gebaut (nur simuliert getestet, außer wo „Handy“ steht), ◐ teilweise, ○ offen.
1. Playwright-Tests mit simuliertem Ollama ins Repo (`tests/`) und aus frischem Klon laufen lassen. ✔ (20 Server- und 36 Seitentests grün)
2. `lib/` und gemeinsamen Kern auslagern, Chat darauf umstellen, Verhalten unverändert. ◐ `lib/core.js`, `lib/core.css`, `lib/icons.svg`, `lib/pixel.js`, `lib/providers.js` stehen; `chat.html` (1948 Zeilen) nutzt `core.css`, `core.js`, `icons.svg` und `providers.js`; eigene Übersetzungstabelle und Parser bleiben in der Seite
3. Tool-Liste und Hub über `server.py` (`tool.json`, `apps.json`), ein Port. ✔ Hub neu im Design (Reiter Chats & Modelle / Tools, App-Drawer, Pixeldisplay); Handy bestätigt war nur die erste Fassung mit Installation als App
4. Seite „Modelle“ mit Aliasen, `/api/tags`, Löschen, Laden, Tempotest. ◐ Seite „Modelle“ ist nur eine Liste (Platzhalter); Tempotest, Modellwahl und Vorladen leben in `chat.html` (siehe 15.3, Bereich A)
5. Chat-Oberfläche neu (Hauptansicht, Modusleiste, Kopieren je Blase, Einstellungen). ✔ im neuen Design (Kopfzeile, Modusleiste, Chatleiste, Prompt, Bottom-Sheet-Menü, Modellwahl); Handytest steht aus. Offen: Trennung in Bereich A (Testfeld) und B (schlanker Chat), siehe 15.3
6. Personas in `data/personas.json`. ◐ Modi sind in `chat.html` als Daten (`MODE_PRESETS`, mit Modell, Ersatzmodell, Stoppwörtern), noch nicht in einer Datei
7. Filter aus Lab; Vitals entfernen. ○ Filter ist Platzhalter, Lab und Vitals stehen unter „Alte Versionen“
8. Anbieterschicht mit „Online erlauben“ (Gemini zuerst, openai-kompatibel). ◐ `lib/providers.js` mit Ollama, LiteRT-LM, OpenRouter, Groq, Mistral, Custom und Sperre; Gemini und Claude fehlen noch, LiteRT-LM auf dem Handy ungetestet
9. Einrichtungsassistent und Tutorial. ○

Schritte 1 und 2 und die Termux-Stabilität (Abschnitt 9) können parallel zu den Messungen laufen.

## 13 Offene Entscheidungen
Erledigt am 09.11.2026: Modi und Persönlichkeiten (Beschluss 1), gemeinsamer Browser-Speicher (Beschluss 3), Inhalt des Starterkits (Beschluss 2).
Stand 10.11.2026: Punkt 3 (LiteRT-LM in Termux) ist für die Kommandozeile geklärt (Abschnitt 10), Punkt 5 (ADB) durch den Tempobefund in Abschnitt 14 überholt, Punkt 2 (Umzug in `hub/`) erledigt anders (Hub bleibt `index.html`, siehe 15.2). Neue offene Fragen stehen in 15.6.
1. Creative: in Heinz aufgehen lassen oder behalten (später).
2. Umzug der Dateien in `hub/`, `tools/`: ändert Pfade auf dem Handy (`start.sh` wird angepasst, `git pull` genügt).
3. LiteRT-LM: läuft die CLI oder die Python-Schnittstelle in Termux, und welches Modell? (Abschnitt 10)
4. Welche Kamera- und Dokument-Werkzeuge zuerst (Abschnitt 10a).
5. Ergebnis des ADB-Tests (Abschnitt 9).

## Quellen (Stand 09.11.2026)
- Google AI Edge, LiteRT-LM Überblick und CLI-Seiten: developers.google.com/edge/litert-lm
- Google-Entwicklerblog „Blazing fast on-device GenAI with LiteRT-LM“
- Termux Signal 9: ivonblog.com/en-us/posts/fix-termux-signal9-error, cosyra.com/guides/termux-signal-9-fix.html, agnostic-apollo „Phantom, Cached And Empty Processes“
- WebGPU auf Handys: tinyweights.dev, Ludion-Messbericht (18.06.2026)
- Claude-Support: Abo und API sind getrennte Produkte, monatliche API-Guthaben für Max und Team
- OpenRouter: Venice Uncensored (openrouter.ai/venice/uncensored)

## 14 Messungen und Beschlüsse aus dem Handytest (09.11.2026)
- **Tempo hängt an `num_thread`:** Standard (8) ist am langsamsten, 3–4 Threads etwa doppelt so schnell, im Hintergrund um das Zehnfache. Tabelle in `docs/OLLAMA_UND_MODELLE.md`. Umsetzung: `options.num_thread` als einstellbarer Parameter (Chat-Strang).
- **Cgroup:** Ollama läuft bei sichtbarem Termux in `top-app`, sonst in `foreground` (nicht `background`).
- **Modus ↔ Modell:** Die Chat-Seite kennt nur `gemma2:2b`, `qwen2.5:3b`, `gemma:2b`. Modus Heinz nutzt das normale `qwen2.5:3b`, nicht `heinz-fakt` (abliteriertes Qwen mit eigenem Systemprompt).
- **Abliteriertes Qwen 2.5 3B** lehnte die Testfrage (Salzsäure) fast so fest ab wie das normale. Eine Stichprobe; Vergleichstest mit Zählung offen.
- **Installierbarkeit:** Vom Hub (`localhost:3000/`) bot Chrome auf dem Pixel „App installieren“ an. Die App läuft weiter aus dem lokalen Server; Updates per `git pull`. Eine gehostete Fassung (GitHub Pages, Update-Hinweis mit Knopf) ist später möglich: relative Pfade, Ersatz für `data/`, CORS für Ollama und LiteRT-LM.
- **Wischen zum Aktualisieren** abschalten (`overscroll-behavior-y: none`), sonst droht Datenverlust im Chat.

## 15 Stand 10.11.2026: Version 1.0 und danach
Nachgeführt im Root-Chat aus `ENTWICKLUNGSVERLAUF.md`, `STAND.md`, `docs/GEPLANT.md`, `docs/DESIGN.md` und dem Code, zuletzt nach dem Design-Strang (Commit `a86ff2e`); Stand des Release Candidate siehe Abschnitt 17 (Commit `036ff46`). Alles, was nur „gebaut“ heißt, lief in simulierten Tests (20 Server-, 56 Seitentests grün, selbst gelaufen am 10.11.2026); auf dem Pixel bestätigt ist nur, was ausdrücklich „Handy“ heißt. Die Design-Umbauten (neuer Chat, neuer Hub) sind noch nicht auf dem Handy gesehen.

### 15.1 Was es jetzt gibt
- **Design-Fundament** (Strang „AIUIheinz-Design“, Manifest `docs/DESIGN.md`): `lib/core.css` mit Themes Hell, Dunkel und Auto (`data-theme`, Schlüssel `heinz_settings.theme`) und Bausteinen (`.pill .round .ibtn .ring-btn .lang-btn .sw .row .tile .sheet .scrim .slidercard`), `lib/icons.svg` (47 eigene Linien-Symbole, kein Emoji mehr in der Oberfläche), `lib/core.js` (Theme, `Heinz.icon()`), `lib/pixel.js` (LED-Matrix-Display mit Laufschrift, Lampen, Balken). Beispielkatalog `tools/design/index.html` (ohne `tool.json`, nicht im Hub).
- **Hub** (`index.html`): Kopfzeile mit Statusring, Theme-Knopf und EN/DE; kein Pixeldisplay mehr (nach dem Handytest zurückgebaut, siehe 17); zwei Reiter **Chats & Modelle** und **Tools**; „Chats & Modelle“ als Liste mit Symbolen (Chat unter dem Markennamen „Heinz UI“, Modelle, darunter „Alte Versionen“), „Tools“ als App-Drawer mit Kacheln (3 je Reihe, `appicon` möglich); Slogan in Georgia kursiv, Fußzeile „Offline first“. Zuordnung über `tool.json` (`area`: `chat` | `tools`, `symbol`, `appicon`); Wahl in `heinz_hub.area`. Installierbar als App (Handy bestätigt für die erste Fassung).
- **Chat** (`chat.html`; Oberfläche seither mehrfach umgebaut, heutiger Stand in Abschnitt 17): Kopfzeile mit Statusring (rot, orange, blau, grün) und zweizeiligem Modellchip (Engine/Modell), EN/DE bleibt sichtbar; Modusleiste mit Symbolen und Modusfarbe als einziger Akzent; Chatleiste (Chatliste je Modus mit Zähler, Titel, ganzen Chat kopieren, Neuer Chat); Antworten ohne Kasten in Georgia; Metrik-Chips in einer Zeile; wachsendes Prompt-Feld mit Vollbild-Editor, Mikrofon und Senden; Kontextkarte unter dem Prompt; Menü als Bottom-Sheet (Schnellschalter, Gruppen, Unterseiten Engine, Parameter, Tempo-Test, Darstellung, Update und Info); eigenes Modell-Sheet. Dahinter unverändert: Chats je Modus, Parameter und `num_thread`, Tempo-Test mit Übernahme der besten Threads, Vorladen, `keep_alive`, Schnellmodus, nur ein Modell im Speicher, Haken „Eigenen Systemprompt nutzen“. „Online erlauben“ ändert Menü und Chip (Gruppe „Online“, Chip „… · ONLINE“ in Orange).
- **Anbieterschicht** `lib/providers.js`: Ollama, LiteRT-LM (Backend CPU/GPU über das Modellfeld), OpenRouter, Groq, Mistral, Custom; „Online erlauben“ aus = kein externer Aufruf (Test). Gemini und Claude fehlen. LiteRT-LM aus der Seite ist auf dem Handy nicht probiert.
- **Server** (`server.py`): `/api/tools` (reicht `area`, `symbol`, `appicon` durch), `POST /api/update` (`git pull --ff-only`, Selbstneustart bei Änderung von `server.py`), `/api/ping` mit Version. **Version 1.0** (`VERSION.txt`), Update-Pille im Chat-Menü (Handy bestätigt: Update ohne PC).
- **Seiten „Modelle“ und „Filter“** sind weiterhin Platzhalter, Sheet, Lab und Vitals unverändert im alten Stil (Lab und Vitals unter „Alte Versionen“).
- **Doku:** `docs/DESIGN.md` (Entscheidungen des Entwicklers zu Bereichen, Themes, Schriften, Online-Verhalten), `docs/MODELLQUELLEN.md`, `docs/GEPLANT.md`.

### 15.2 Abweichungen vom Entwurf
- Der Hub bleibt `index.html` im Wurzelordner, nicht `hub/`; Tool-Seiten liegen über `tool.json` (`entry`) weiter im Wurzelordner, bis ein Strang sie verschiebt.
- Modi und Personas stehen als Daten im Code von `chat.html`, nicht in `data/personas.json`.
- Anbieter stehen in `lib/providers.js`, nicht in einer Datei `providers.json`; Gemini kam nicht „zuerst“, sondern OpenAI-kompatible Anbieter und LiteRT-LM.
- Seite „Modelle“ ist (noch) kein Manager: Modellwahl, Tempotest und Threads gehören nach Beschluss des Entwicklers in Bereich A (15.3), nicht in eine eigene Seite.
- Die Oberfläche folgt `docs/DESIGN.md`, nicht mehr dem schwarzen Einheitsstil aus Abschnitt 1 und den Google-Farben: Themes Hell, Dunkel, Auto; eigener Symbolsatz statt Emoji; Georgia für Antworten; wenige Linien. Das Ziel „schwarzer Hintergrund“ gilt für das Dunkel-Theme.
- Die untere Leiste mit rundem Mittelknopf aus dem ersten Manifest ist nicht gebaut; Navigation läuft über die Hub-Reiter und das Bottom-Sheet-Menü.
- Abschnitt 4 („Bedienkonzept Chat“) und Abschnitt 3 (Tool-Tabelle) beschreiben einen einzigen Chat und die Zuordnung der Tools vor den drei Bereichen. Sie werden durch 15.3 ersetzt.

### 15.3 Drei Bereiche (Richtung des Entwicklers, 10.11.2026; Namen und Zuschnitt offen)
Aus `docs/GEPLANT.md` (dort „zwei Bereiche“, überholt) und `docs/DESIGN.md` Abschnitt 5 („drei Bereiche mit teils eigenen Menüs plus gemeinsame Rubrik ‚Einstellungen‘“). Der Entwickler hat die drei Bereiche gesetzt; Zuordnung und Namen der ersten beiden sind noch nicht festgelegt, der folgende Zuschnitt ist meine Ableitung aus Repo und Beschlüssen.
- **Bereich A, Ausprobieren und Modelle** (Arbeitsname „Research“ oder „Model Manager“): Testfeld für lokale Modelle mit Modi, Parametern, Tempotest und Threads, dazu Erstinstallation, Installation und Verwaltung von Modellen (Ollama), Cloud-Anbieter, LiteRT-LM. Zweck: Auf dem eigenen Handy herausfinden, welches Modell und welche Prozessoreinstellung passt. Chats werden **je Modus** gespeichert (gleicher Prompt, mehrere Modelle vergleichbar); der Chat soll sein Startmodell zeigen, Modellwechsel mitten im Chat an der Antwort vermerken (Vorschlag).
- **Bereich B, schlanker Chat** („Heinz UI“ als Markenname): Oberfläche wie Claude oder Gemini, maximale Chatfläche, wachsende Eingabezeile, Menüs von links (Chats) und rechts (wesentliche Einstellungen), keine Temperatur und keine Testläufe. Das Menü „Einstellungen“ gilt in allen Bereichen gleich.
- **Bereich C, Tools** (Widgets, Rechner, Converter, alles, was von KI profitiert; im Hub als App-Drawer): Sheet, Filter, später convert2, Kamera- und Dokumentwerkzeuge (Abschnitt 10a) und Tools anderer Projekte wie INCIheinz (`appicon`). Welche Tools ohne „Online erlauben“ grau werden, ist offen.
- **Im Hub** gibt es derzeit zwei Reiter: **Chats & Modelle** (A und B, Chat „Heinz UI“, Modelle, Alte Versionen) und **Tools** (C). Die heutige `chat.html` vereint A und B **mit Absicht**: Wer mit der App lokale und Cloud-Modelle ausprobiert, will beim Chatten Modell und Parameter ändern, ohne die Seite zu wechseln. Die Testfunktionen liegen im Menü „Einstellungen“ (Bottom-Sheet), der Chat selbst hat Modusleiste und viel Platz. Eine Trennung ist deshalb **keine Pflicht**.
- **Schlanker Chat im Hub (offen, Designthema):** Eine Möglichkeit wäre ein zusätzlicher Eintrag im Hub mit einem Chat ohne Parameter und Testwerkzeuge. Er war gedacht, als die Testfunktionen noch nicht im Menü lagen. Gelingt der vorhandene Chat so aufgeräumt wie die Chats der großen Anbieter, entfällt der Zusatzeintrag. Der Design-Strang entscheidet das, mit dem Entwickler.
- **Wozu das Testfeld dient:** Der Entwickler will Modelle aus dem Netz herunterladen, in Ollama installieren oder über eine Cloud-Schnittstelle anbinden, vergleichen und herausfinden, was sich für eigene Anwendungen eignet. Dabei lernt er, wie Schnittstellen und lokale Modelle arbeiten, was für Apps zählt, die früher nur aus Tabellen bestanden und mit Wissen in Tabellenform und Taxonomien erst richtig leistungsfähig werden.
- **Testfeld für andere Tools:** `lib/providers.js` ist ein gemeinsamer Baustein, damit zum Beispiel convert2 Fragen an ein lokales oder Cloud-Modell auslagern kann.
- **Online:** Mit „Online erlauben“ erscheinen zusätzliche Menügruppen und ein Chip „· ONLINE“; ohne den Haken kein Online-Eintrag und keine Anfrage nach außen. Welche Modi und Werkzeuge online zusätzlich erscheinen, ist offen.

### 15.4 Befunde seit Abschnitt 14 (Handy, Einzelmessungen)
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
| Chat („AIUIheinz-Chat“) | Logik, Anbieterschicht, Planung der Bereiche gepusht; Oberfläche inzwischen vom Design-Strang umgebaut |
| Design („AIUIheinz-Design“) | Fundament, Beispielseite, Hub und Chat-Oberfläche gepusht; offen: Handytest, Zuschnitt der Bereiche, Lesemodus in warmer Serife, Werkzeuge mit Online-Sperre, Sprache im Menü „Einstellungen“, Inter lokal |
| Modelle („AIUIheinz-Modelle“) | Recherche fertig, Bau nach dem Fundament |
| Filter, Sheet | offen, Edge-Modelle erst erproben; beide im alten Stil |
| Stabilität (Root) | Entwickleroption gesetzt, Dauertest und Signal-9-Auswertung offen |

### 15.6 Offen (Entscheidungen und Tests)
1. **Drei Bereiche:** Namen und Zuschnitt (A Ausprobieren und Modelle, B schlanker Chat, C Tools), ob ein zusätzlicher schlanker Chat im Hub nötig ist oder die heutige `chat.html` (2375 Zeilen, A und B bewusst in einem) aufgeräumt genug wird, Zuordnung von Modelle, Sheet, Filter, Lab und Vitals zu den Reitern im Hub. Entscheiden Entwickler und Design-Strang gemeinsam.
2. **LiteRT-LM auf dem Handy:** Serve starten, Modellliste, Antwort, GPU über das Modellfeld, wirken Systemnachricht und Parameter? Tempo-Test dafür fehlt (er läuft nur mit Ollama).
3. **Zwei Systemprompt-Wege** (Seite ersetzt Modelfile oder Modelfile bleibt): welcher Standard je Modus? Spielt in die Persona-Frage (Abschnitt 5) hinein.
4. **Modelle verwalten** (Installieren, Löschen, Aliase) im Bereich A, mit der Quellenliste aus `docs/MODELLQUELLEN.md`; „Funktionsplätze“ (Chat, Sheet, Filter, Prüfung, Bild, Sprache) und Datenschutzfeld je Anbieter brauchen den Beschluss des Entwicklers.
5. **Geräteprofile** (Threads, Kontext, Modellvorschlag je Prozessor) für eine veröffentlichte Fassung, `docs/GEPLANT.md`.
6. **Gehostete Fassung** (GitHub Pages) bleibt Option für später: relative Pfade, Ersatz für `data/`, CORS für Ollama und LiteRT-LM (Abschnitt 14). Der Update-Knopf deckt den Alltag ab.
7. **Signal 9:** Dauertest mit Vitals und `litert-lm serve`; Speicherfrage (ein Modell, Kontextgröße) weiter beobachten.
8. **Handytest der Design-Umbauten:** neuer Hub und neuer Chat (Eingabe mit Tastatur, Mikrofon, Vorlesen, Chat-Drawer, Splitscreen, Themes, Pixeldisplay); Tests sind nur simuliert.
9. **Tools im Hub:** Werkzeuge mit Online-Sperre (grau ohne Haken), Sheet und Filter ins neue Design, Lesemodus in warmer Serife, `appicon` für Tools anderer Projekte.
10. **Kamera und Dokumente** (Abschnitt 10a), **Refusal-Vergleich** (15.4) und **Sheet mit echtem 3B-Modell** auf der Rohstoffliste.

## 16 Leitbild: Werkzeuge, bei denen KI die Bedienung leichter macht
Gespräch mit dem Entwickler am 10.11.2026. Das ändert noch nichts an der Reihenfolge der Umsetzung, gehört aber zum Konzept: Für den Bereich Tools (15.3, C) wird gezielt nach Anwendungen gesucht, bei denen der Einsatz von KI die Benutzerfreundlichkeit sprunghaft erhöht, am liebsten komplett offline.

**Das Muster aus der Erfahrung des Entwicklers (Beispiel INCIheinz, Lager- und Rezeptbuch-Tool):** Ohne KI und Texterkennung müsste der Nutzer alle Artikeldaten selbst eintippen oder Texte mühsam zuschneiden und die richtigen Wörter herauskopieren. Mit KI beim Einlesen ist das für ihn ein Wendepunkt: Ein fotografierter Notizzettel ergibt ein Rezept mit Zutatenliste und modular aufgebauten Phasen und Herstellungsschritten, die sich danach mit verschiedenen Formatierungsregeln für Satz und Layout ausgeben lassen. Seine Erfahrung: Ehemalige Tabellen-Apps profitieren stark von KI, und das meiste davon geht offline.

**Ein guter Kandidat für Bereich C hat meist diese Merkmale** (abgeleitet aus dem Beispiel und der Projektbeschreibung, noch nicht abgestimmt):
- Die Eingabe von Hand ist mühsam: Fotos, Notizen, kopierte Webseiten, Rechnungen, Tabellen, die beim Einfügen nur als Müll ankommen.
- Die Ausgabe ist strukturiert und lässt sich prüfen (Tabelle, Liste, Rezeptmodule, Schema), das Modell übersetzt oder klassifiziert, der Code rechnet und prüft (Beschluss aus Abschnitt 1).
- Kleine lokale Modelle reichen, oder nur ein kleines Datenpaket geht bei „Online erlauben“ an die Cloud, nie die ganze Datenbank oder alle Chats.
- Das Ergebnis lässt sich exportieren (Zwischenablage, Tabelle, Text- und Layoutformate).
- Ein Mensch kontrolliert das Ergebnis, bevor es gespeichert wird.

**Kandidaten, die schon im Konzept stehen oder genannt wurden** (keine Reihenfolge, keine Zusage): Sheet (Tabelle ansprechen), Filter (Listen und Texte nach Regel bewerten), convert2 (Markdown und andere Formate, Aufbereitung von Texten), Kamera und Dokumente (Abschnitt 10a: Rezept, Rechnung, Brief fotografieren und auswerten), Einlesen und Auswerten von Texten mit lokalem Wissen (Wikipedia offline). INCIheinz ist dabei ein Beispiel für ein Tool eines anderen Projekts, das im Hub als Kachel erscheinen kann (`appicon`).

**Offen:** Welche Kandidaten zuerst; welches Modell dafür reicht (Edge-Modelle, Texterkennung offline); wie ein Werkzeug sagt, dass es online geht und was dabei verlassen wird (Online-Sperre, Abschnitt 15.6, Punkt 9). Die Modellsuche im Bereich A dient auch dazu, solche Fragen zu beantworten.

## 17 Release Candidate: Stand 10.11.2026, 16:25 (Commit `036ff46`)
Festgehalten im Root-Chat nach Pull und Durchsicht von Code, `ENTWICKLUNGSVERLAUF.md`, `docs/DESIGN.md`, `docs/ANALYSE_MENUE.md` und vier Handy-Screenshots des Entwicklers (Tempo-Test, Einstellungen, Chat). Version `VERSION.txt` bleibt 1.0. Tests: 20 Server- und 56 Seitentests grün (selbst gelaufen, simuliert). Das Aussehen ist nach Handytest des Entwicklers vom Designer bis 16:15 nachgezogen; der letzte Kosmetik-Commit ist laut Verlauf nicht auf dem Gerät getestet.

### 17.1 Aufbau
- **Hub** (`index.html`): dezente Startseite ohne Pixeldisplay und ohne Modusfarbe, neutraler Ring, zwei Reiter Chats & Modelle / Tools, Fußzeile „Offline first“. Pixeldisplays gibt es nur im Chat.
- **Chat „Heinz UI“** (`chat.html`, 2375 Zeilen): Kopfzeile mit Ring-Button, **Laufdisplay** (Engine blau, Modell gelb, 5×7-LED-Schrift), grauem EN/DE-Schalter und Menü-Taste; darunter Statuszeile (LED-Punkt in Statusfarbe, Klartext) und **Equalizer-Pille** (Antwort = grüner Pegel, Warten = orangefarbener Balken, Laden = blaue Wählpunkte, Fehler/offline = rot); Modusleiste (Wilson türkis, Heinz rosa, Audit gelb, Code, Creative); Chatzeile mit Outline in Modusfarbe (Label CHAT, umbenennbarer Titel, Kopieren, Neuer Chat, Chatliste von links mit Pins bis 5, Umbenennen, Kopieren, Exportieren, Löschen); Antworten in Georgia mit Aktionsleiste (Kopieren, Teilen, .md, Vorlesen); Prompt wächst mehrzeilig, Stopp ersetzt den Sendeknopf während der Antwort; Kontextfeld darunter.
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
- Drei Bereiche bleiben die Richtung, der Hub zeigt zwei Reiter; A und B sind in `chat.html` mit Absicht vereint (15.3). Der Menübaum aus `docs/ANALYSE_MENUE.md` Abschnitt 7 ist weitgehend umgesetzt (Panel, Schnellbereich, Engine vor Modell, Online-Sperre sichtbar), mit zwei Abweichungen: Chat-Verwaltung nur über die Chatliste, nicht mehr im Menü; Wirkungsmarken „Dieser Chat / Dieses Modell / Überall“ nur teilweise.
- Pixeldisplays nur im Chat-Kopf; Hub, Tempo-Test und Update-Seite ohne (Update-Seite hat eine kleine LED-Zeile).
- Modelle mit eigenen Parametern speichern ist gebaut; Eigene Prompt-Bibliothek, App-Sicherung und Auswahl „Flash/Pro“ stehen als geplant, nicht gebaut.

### 17.4 Offen für die nächste Konzeptphase
1. **Handytest des Release Candidate** (Panel, Stopp, Pins, Equalizer, Update, Schlüsselfeld ohne Passwort-Manager, `max-height` statt `100dvh`, Sprachwechsel mit Modellneuladung). Bisher nur Playwright mit simuliertem Server.
2. **Cloud:** Abbruchhinweis und Modellliste mit echtem Google AI Studio prüfen; Gemini 3 mit Temperatur 1.0 („Standardwerte“).
3. **LiteRT-LM** aus der Seite, Tempo-Test dafür fehlt.
4. **Modelle verwalten** (Strang Modelle), **Tools** im neuen Design (Sheet, Filter, Lab, Vitals noch alter Stil), **Leitbild KI-Werkzeuge** (Abschnitt 16).
5. **Größe von `chat.html`** (2375 Zeilen in einer Datei): Wartbarkeit im Blick behalten; Aufteilen in `lib/`-Module wäre Fundamentarbeit und braucht Beschluss.
6. Hub-Chat und Zuschnitt der Bereiche (15.6, Punkt 1), Signal 9, gehostete Fassung, Geräteprofile unverändert.
