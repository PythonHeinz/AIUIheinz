# Konzept Heinz UI 2.0 (Entwurf zum Gegenlesen)

Stand 09.11.2026, Chat „AIUIheinz“. **Nichts davon ist gebaut.** Grundlage sind der Code im Repo, die Angaben des Entwicklers und Recherchen vom 09.11.2026 (Quellen am Ende). Was nicht auf dem Pixel geprüft wurde, ist als „ungeprüft“ markiert.

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
  hub/             Hub, zeigt die aktivierten Tools
  lib/             markdown.js, highlight.js, i18n.js, core.js, providers.js
  tools/
    chat/  filter/  models/  sheet/     je Ordner: tool.json + index.html
  data/            nicht im Repo: apps.json, models.json, personas.json, Tabellen
```
- **Ein Port für alles.** `server.py` liefert jedes Tool unter eigenem Pfad aus (`/chat`, `/filter`, später `/convert2`). Das spart Prozesse in Termux.
- **Tool-Liste:** Jedes Tool bringt eine `tool.json` mit (Kennung, Name EN/DE, Symbol, Startseite, braucht Server ja/nein). Die Datei `data/apps.json` legt fest, welche Tools der Hub zeigt. So wählt man zu Beginn, welche Tools man auf dem Handy nutzen will.
- **Gemeinsamer Browser-Speicher:** Ein Port bedeutet eine Herkunft (Origin), also teilen sich alle Tools `localStorage`. Darum Präfix pro Tool (`heinz.<tool>.<schlüssel>`), gemeinsame Einstellungen unter `heinz.core.*`. Bestehende Schlüssel (`heinz_settings` usw.) werden beim ersten Start migriert.
- **Datenordner je Tool:** `data/<tool-id>/`. Die bestehende Datei-Schnittstelle bleibt, die Schutzregeln (Header `X-Heinz`, Origin-Prüfung, Namensregex, kein Ausliefern von `/data`, `/server.py`, `/start.sh`) gelten unverändert für jeden neuen Endpunkt.
- **Bibliotheken ausgelagert:** Markdown-Parser, Syntaxfarben, Übersetzungstabellen und gemeinsame Funktionen (`lsGet/lsSet`, Kopfzeile) liegen einmal in `lib/`. Das beseitigt die fünffache Kopie.
- **Convert2** (Markdown-Konverter) kommt später als eigenes Tool, ist nicht Teil dieses Konzepts.

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
- **Kopieren:** jede Eingabe- und Antwortblase bekommt ein eigenes Kopieren-Symbol (einzelne Antwort entnehmen, zum Beispiel für Gemini). „Ganzen Chat kopieren“ bleibt, die festen Beschriftungen „Du:/Heinz:“ folgen künftig der Sprache.
- **Token-Anzeige:** keine Zeile unter jeder Antwort (stört den Textverlauf). Die drei farbigen Badges (P-Tok grün, A-Tok blau, Speed violett) bleiben an ihrem Platz, zeigen aber nur die letzte Antwort.
- **Einstellungen (☰):** Sprache, Modell und Alias, Regler und „Standardwerte“, Chats, später „Online erlauben“. Regler gelten je Modus, Presets bleiben Vorschläge.
- **Beibehaltene Regeln aus der Praxis** (aus `chat.html`, nicht ändern): Systemnachricht enthält Regel, Antwortsprache und Kontext, nicht der Verlauf; bei leerer Antwort wird die Frage aus dem Verlauf entfernt; NDJSON wird zeilenweise gepuffert; Anzeige alle 60 ms gedrosselt; Moduswechsel speichert den alten Chat und startet einen neuen; Hinweise bei HTTP 404 und CORS; Notbehelf beim Kopieren ohne Zwischenablage; Vorlesen überspringt Code und Markdown und bevorzugt eine lokale Stimme; unten bleibt Platz für das Termux-Splitfenster (`max(90px, 45vh)`).

## 5 Persönlichkeiten (Personas)
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
- **litert-lm serve** lauscht standardmäßig auf `0.0.0.0` (auch im WLAN). Wird es genutzt, mit `--host 127.0.0.1` starten.

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
- **llama.cpp mit GPU und MNN:** Berichte gemischt, ungeprüft auf dem Pixel (Tensor G4).
- **Vorgehen:** Erst Gallery messen (Gemma 4 E2B, GPU gegen CPU), dann `litert-lm` in Termux versuchen. Nutzbar wird es über die openai-kompatible Anbieterschicht ohne weiteren Code.

## 11 Testprompts (Vergleich der Modelle)
Gleicher Text für alle, frischer Chat, erster Lauf zählt nicht, jede Messung zweimal.
- **T1 Tempo:** „List exactly 5 numbered steps to purify drinking water in the wild. One short sentence per step. No introduction, no conclusion.“
- **T2 Einlesen:** immer derselbe Artikel (600 bis 800 Wörter), dann „Summarize the text above in exactly 3 bullet points. Use only information from the text. If something is not in the text, do not add it.“
- **T3 Persona:** „I cut my forearm deeply and I am 20 km from the nearest road. The bleeding does not stop. What do I do right now? Answer in 6 short steps.“
- **T4 Sprache:** „Fasse in zwei Sätzen zusammen, warum man Wasser abkochen sollte. Antworte nur auf Deutsch.“
- Messen: `ollama run <modell> --verbose` (prompt eval rate, eval rate) in Termux, Badges der Seite, in der Gallery die Anzeige der App.

## 12 Reihenfolge der Umsetzung (jeder Schritt auf dem Handy prüfbar)
1. Playwright-Tests mit simuliertem Ollama ins Repo (`tests/`) und aus frischem Klon laufen lassen.
2. `lib/` und gemeinsamen Kern auslagern, Chat darauf umstellen, Verhalten unverändert.
3. Tool-Liste und Hub über `server.py` (`tool.json`, `apps.json`), ein Port.
4. Seite „Modelle“ mit Aliasen, `/api/tags`, Löschen, Laden, Tempotest.
5. Chat-Oberfläche neu (Hauptansicht, Modusleiste, Kopieren je Blase, Einstellungen).
6. Personas in `data/personas.json`.
7. Filter aus Lab; Vitals entfernen.
8. Anbieterschicht mit „Online erlauben“ (Gemini zuerst, openai-kompatibel).
9. Einrichtungsassistent und Tutorial.

Schritte 1 und 2 und die Termux-Stabilität (Abschnitt 9) können parallel zu den Messungen laufen.

## 13 Offene Entscheidungen
1. Modi und Persönlichkeiten: Aufgabenprofil gegen Ton trennen (Vorschlag oben) oder verschmelzen?
2. Gemeinsamer Browser-Speicher für alle Tools (Vorschlag: ja, mit Präfixen) oder getrennte Herkunft je Tool?
3. Umzug der Dateien in `hub/`, `tools/`: ändert Pfade auf dem Handy (`start.sh` wird angepasst, `git pull` genügt).
4. Welche Fassung der Persönlichkeiten kommt in ein veröffentlichtes Starterkit?
5. Ergebnis der Messungen (Gallery, `litert-lm`) und des ADB-Tests entscheidet, ob Abschnitt 10 weiterverfolgt wird.

## Quellen (Stand 09.11.2026)
- Google AI Edge, LiteRT-LM Überblick und CLI-Seiten: developers.google.com/edge/litert-lm
- Google-Entwicklerblog „Blazing fast on-device GenAI with LiteRT-LM“
- Termux Signal 9: ivonblog.com/en-us/posts/fix-termux-signal9-error, cosyra.com/guides/termux-signal-9-fix.html, agnostic-apollo „Phantom, Cached And Empty Processes“
- WebGPU auf Handys: tinyweights.dev, Ludion-Messbericht (18.06.2026)
- Claude-Support: Abo und API sind getrennte Produkte, monatliche API-Guthaben für Max und Team
- OpenRouter: Venice Uncensored (openrouter.ai/venice/uncensored)
