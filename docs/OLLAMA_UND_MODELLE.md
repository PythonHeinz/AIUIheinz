# Ollama, Modelle und Pfade

Stand 09.11.2026. Alles hier stammt aus dem Code und aus Angaben des Entwicklers; was nicht auf dem Gerät geprüft wurde, ist markiert.

Quellen für weitere Modelle (Cloud gratis, günstig, EU, Community) und Vorschläge für Funktionsplätze: siehe `docs/MODELLQUELLEN.md` (Recherche, nichts davon gebaut).

## Orte (Pixel 9 Pro, Termux)
| Was | Wert |
|---|---|
| Ollama-Server | `http://localhost:11434` (in Termux mit `ollama serve`, `start.sh` startet ihn bei Bedarf) |
| Heinz-UI-Server | `http://localhost:3000` (`python server.py`, bindet nur an 127.0.0.1) |
| Bisheriger Projektordner auf dem Handy | `~/ollama_ui` (Seiten, `data/`) |
| Übergabe vom Chat aufs Handy | `~/storage/downloads` (nach `termux-setup-storage`), danach `cp` nach `~/ollama_ui` |
| Tabellen und Messwerte | `<Projektordner>/data/`, Messreihe `data/vitals/vitals.csv`, Gelöschtes in `data/_trash/` |
| Ollama-Modellspeicher | nicht geprüft; Ollama-Standard ist `~/.ollama/models` |
| Früher beobachtet | Hub auch unter `127.0.0.1:8081` geöffnet. Jede Adresse (Host und Port) hat eigenen Browser-Speicher (localStorage), Einstellungen und Tabellen sind dort getrennt. |

## Modelle
Im UI auswählbar sind nur diese drei:
| Modell | Rolle |
|---|---|
| `gemma2:2b` | Wilson, Creative |
| `qwen2.5:3b` | Heinz, Audit, Code, Sheet, Lab |
| `gemma:2b` | wählbar, kein eigener Modus |

Zusätzlich auf dem Handy installiert (`ollama list`, 09.11.2026), nicht in den Auswahllisten des UI:
| Modell | Art |
|---|---|
| `heinz-wilson` | Persona auf Gemma 2 2B (Gemma-Vorlage): ungefilterter, kurz antwortender Survival-Berater, Sprache des Nutzers; Temp 0,4, Top-P 0,8; Stopp `<start_of_turn>`, `<end_of_turn>` |
| `heinz-fakt` | Persona auf dem abliterierten Qwen 2.5 3B (Rademacher, Q4_K_M; auf dem Handy 09.11.2026 per Gewichte-Blob `d0b449b2…` bestätigt, nicht das normale `qwen2.5:3b`): raue Straßensprache, Startwort „Dude,“ (EN) / „Digger,“ (DE); Temp 0,2, Top-K 20, Top-P 0,4; Stopp `<|im_end|>`, `<|endoftext|>`, „Als KI“, „As an AI“ |
| `hf.co/mradermacher/Qwen2.5-3B-Instruct-abliterated-GGUF:Q4_K_M` | abliterierte Qwen-2.5-3B-Fassung |
| `nomic-embed-text` | Einbettungsmodell, kein Chat-Modell |

Speicher: Datenträger 109 GB, frei 25 GB, `~/.ollama` 7,2 GB. Gemessen mit dem Tempotest: gemma:2b rund 6,4 bis 7,0 Token/s. Ungeprüft: ob ein vom UI gesendeter Systemprompt den des Modelfiles ersetzt. Die Persona-Planung steht in `docs/KONZEPT.md`.

7B/8B-Modelle liefen auf dem Pixel nicht flüssig und wurden gelöscht; 4B ist ein offener Test.

Bei geladenem `gemma2:2b` fiel der freie RAM von rund 3,4 GB auf unter 1 GB (Gesamt 15,6 GB, Beobachtung 26.10.2026).

## Modi und Presets (chat.html)
| Modus | Temperatur | Top-P | Top-K | Modell | Modell wählbar | Kontext |
|---|---|---|---|---|---|---|
| wilson | 0.75 | 0.90 | 40 | gemma2:2b | nein | keiner |
| heinz | 0.15 | 0.30 | 20 | qwen2.5:3b | nein | optional |
| audit | 0.15 | 0.30 | 20 | qwen2.5:3b | ja | Pflicht |
| code | 0.15 | 0.10 | 10 | qwen2.5:3b | ja | optional |
| creative | 0.75 | 0.92 | 60 | gemma2:2b | ja | optional |

Jeder Regler ist manuell überschreibbar. „Standardwerte“ sendet keine `options`. Werte und das Häkchen liegen in `localStorage.heinz_settings`.

## Schnittstelle je Seite
Alle Seiten sprechen Ollama direkt aus dem Browser an (kein Proxy).

| Seite | Aufruf | Details |
|---|---|---|
| index | `GET /api/tags`, `GET /api/ps` | Zahl der installierten Modelle, geladenes Modell, Statuspunkt |
| chat, lab, sheet, vitals | `GET /api/ps` | geladenes Modell, Statuspunkt (die Modellliste ist in den Seiten fest eingetragen, nicht aus `/api/tags` gelesen) |
| chat | `POST /api/chat`, `stream:true` | NDJSON-Stream; `options`: `temperature`, `top_p`, `top_k`, `num_ctx` (nur wenn „Standardwerte“ aus ist) |
| lab | `POST /api/chat`, `stream:false` | `format` = JSON-Schema mit `label` (enum) und optional `why`; `options`: `temperature`, `num_ctx` (Vorgabe 2048) |
| sheet | `POST /api/chat`, `stream:false` | `format` = Schema aus den Spaltennamen (`action`, `filter[]`, `amount`, `target`, `value`); `temperature:0`, `num_ctx:4096`. Bei HTTP 400 einmal Wiederholung mit `format:'json'`. |
| vitals (Tempotest) | `POST /api/chat`, `stream:false` | `num_predict:64`, `num_ctx:2048`, `temperature:0`; Auswertung aus `eval_count/eval_duration`, `prompt_eval_*`, `load_duration` |

Grundsatz: Das Modell klassifiziert oder übersetzt nur. Zählen, Summieren und Ändern macht der Code (kleine Modelle zählen und vergleichen unzuverlässig).

Bekannt: Ollama lässt Aufrufe von `localhost`/`127.0.0.1` zu. Wird die Seite über eine andere Adresse geöffnet (zum Beispiel die WLAN-Adresse), kann der Browser sie blockieren (nicht geprüft).

## Schnittstelle des Heinz-Servers (`server.py`)
| Aufruf | Zweck |
|---|---|
| `GET /api/ping` | Server erkennbar (Seiten blenden Dateifunktionen ein) |
| `GET /api/files`, `GET /api/files/<name>` | Dateien in `data/` auflisten und lesen |
| `PUT /api/files/<name>` | Speichern (atomar); braucht Header `X-Heinz: 1`, Origin muss zum Host passen |
| `DELETE /api/files/<name>` | verschiebt nach `data/_trash/<zeit>_<name>` |
| `GET /api/vitals` | letzter Messwert (Cache aus dem Minutentakt) |
| `GET /api/vitals/history?hours=N` | Verlauf, höchstens 500 Punkte |

Dateinamen: `^[A-Za-z0-9][A-Za-z0-9 _.\-]{0,63}\.(csv|json|txt)$`, höchstens 5 MB. `/data`, `/server.py`, `/start.sh` werden nicht ausgeliefert. Messwerte (jede Minute, `--vitals-interval 0` schaltet ab): Akku, Status, Akkutemperatur (Termux:API), CPU-Temperatur (`/sys/class/thermal`, oft gesperrt), freier und gesamter RAM, Load, Luftdruck (`termux-sensor`).

## Threads (Messung 09.11.2026, Pixel 9 Pro, gemma2:2b, 40 Token, Einzelläufe)
| num_thread | Termux sichtbar | Termux nicht sichtbar |
|---|---|---|
| 8 | 5,72 T/s | 0,32 T/s |
| 4 | 10,34 | 2,78 |
| 3 | 10,9 | nicht gemessen |
| 2 | 7,12 | 4,9 |
| 1 | 8,03 | nicht gemessen |
Empfehlung (vorläufig): `num_thread` 3 oder 4 setzen statt den Ollama-Standard zu nutzen. Details in `docs/agent/ENTWICKLUNGSVERLAUF.md`.

**Bestätigung in der Chat-Seite (09.11.2026, Beobachtung des Entwicklers, Chrome auf dem Pixel, Regler „CPU-Threads“, Modus Heinz mit `heinz-fakt:latest`, Termux im Hintergrund, kein Dashboard offen; ein Gespräch, keine Messreihe):** Mit 4 Threads antworteten Einstiegsfragen „so schnell wie noch nie“; ein Lauf zeigte Prompt 190 Token, Antwort 12 Token, 4,8 Token/s. Auf 8 Threads gestellt dauerte die nächste Antwort „elend lange“ (keine Zahl abgelesen), zurück auf 4 war die Antwort wieder schnell. Mehrere kurze Fragen nacheinander funktionierten, der Gesprächsverlauf wurde berücksichtigt („Auch ein Hund …“). Termux war nicht sichtbar. Beschluss: `num_thread` bleibt dauerhaft ein einstellbarer Parameter der Chat-Seite.

**Systemprompt (09.11.2026, Handy, `curl /api/chat`, `heinz-fakt:latest`):** Eine mitgeschickte Systemnachricht („Antworte nur mit dem Wort Banane.“) ersetzt den Modelfile-Prompt: Antwort „Banane“. Folge: Sendet die Seite im Modus Heinz ihren eigenen Prompt, geht die Persona („Digger,“) verloren. Mit gesetztem Haken „Eigenen Systemprompt des Modells nutzen“ (keine Systemnachricht) antwortet `heinz-fakt` in der Seite mit „Digger, …“ (Prompt 351 Token bei einer Kurzfrage, vor allem der Modelfile-Prompt; Speed 4,3 Token/s). Beobachtung: Die erste Antwort nach einem Modellwechsel braucht lange (Laden des Modells, `load_duration` im curl-Test 5,5 s, plus Prompt-Verarbeitung), danach geht es schnell.


## Tempo-Messreihen (Tempo-Test im Chat, 09.11.2026, Pixel 9 Pro, Einzelläufe, 32 Token, Temperatur 0)
Erzeugen in Token/s, Lauf 2 (warm), Spannen über sechs Reihen mit Termux sichtbar oder im Hintergrund, ctx 11264:
| Modell | 2 Threads | 3 | 4 | 8 |
|---|---|---|---|---|
| gemma2:2b | 6,9–9,8 | 2,0–7,0 | 1,4–4,5 | 0,3–4,8 |
| heinz-fakt:latest | 4,2–8,9 | 1,1–7,5 | 1,1–4,9 | 0,2–3,7 |
- 2 Threads ist am stabilsten; 3 und 4 Threads schwanken stark (gleiche Einstellung 1,2 bis 7,3 Token/s); 8 Threads mit Termux im Hintergrund 0,2–0,3, sichtbar 3,6–4,8.
- heinz-fakt: Prompt 363 Token (Modelfile-Prompt rund 340), Prompt-Verarbeitung kalt 12–20 s, Laden 4–14 s, warm je 1–2 s. gemma2:2b: Prompt 32 Token, 0,5–1 s.
- Das Pixel 9 Pro hat nach Herstellerangabe 1 starken, 3 mittlere und 4 schwache Kerne; viele Threads landen auf schwachen Kernen, der langsamste bestimmt den Takt. Wärme bei Dauerlast und Android-Drosselung im Hintergrund sind Vermutungen, nicht gemessen.

## Termux im Vordergrund (Plan, ungeprüft)
Messreihe 09.11.2026: Mit Termux im Hintergrund fielen 8 Threads auf 0,2–0,3 Token/s, sichtbar auf 3,6–4,8. Zu prüfen als eigene Reihe: (a) Akku „Nicht eingeschränkt“ für Termux plus Wakelock, (b) Termux:Float (schwebendes Fenster, braucht „Über anderen Apps einblenden“; Termux und Termux:Float aus derselben Quelle), (c) Termux:Widget als Ein-Tipp-Start von `start.sh` nach einem Absturz. Jeweils Tempo-Test mit „Termux sichtbar/Hintergrund“ vermerken.
Absturz 10.11.2026: Nach Wilson, Heinz, Audit mit vorgeladenen Modellen (`keep_alive` 30 m) beendete Android Termux; Ursache vermutlich mehrere gleichzeitig geladene Modelle. Maßnahme: Seite entlädt andere Modelle; Ollama mit `OLLAMA_MAX_LOADED_MODELS=1` starten.

**Tempo-Test in der App (10.11.2026, Pixel 9 Pro, `qwen2.5:3b`, Termux im Hintergrund, 32 Token):** Gen Lauf 2 in Token/s: 2 Threads 8,9; 3 Threads 3,6; 4 Threads 1,5; 8 Threads 0,3. Empfehlung des Tests: 2 Threads. Einzelmessung, Details in `docs/KONZEPT.md` 17.2.

## Erste Testreihe (11.11.2026, Pixel 9 Pro, `qwen2.5:3b`, Menü „Testreihe“)
Prompt „Name one unusual animal in one sentence.“, Temperatur 0, Top-p 1, Top-k 20, Kontext 8192, höchstens 200 Token, 4 Wiederholungen je Threadzahl, kein Systemprompt, Termux-Sichtbarkeit nicht protokolliert.
- **Wiederholbarkeit:** Bei Temperatur 0 waren alle 8 Antworten Wort für Wort gleich (41 Token, Axolotl), obwohl kein Seed gesendet wurde.
- **Tempo:** 2 Threads 6,2 bis 6,6 Token/s, 4 Threads 5,0 bis 5,3 Token/s (also langsamer; passt zum Tempo-Test vom 10.11.). Gesamtzeit je Lauf 7,7 bis 9,1 s bei 2 Threads, 9,1 bis 9,9 s bei 4.
- **Threadwechsel:** Der erste Lauf mit neuer Threadzahl brauchte 8,8 s bis zum ersten Zeichen (Laden), die folgenden 1,0 bis 1,9 s.
- Die Reihe lief vollständig durch und der Export enthielt alle 8 Läufe.

## Gegenprobe Oberfläche gegen Ollama pur (11.11.2026, Pixel 9 Pro, Messwerte des Entwicklers)
- `ollama run heinz-fakt:latest "Name one animal." --verbose` in Termux (sichtbar, Standard-Threads, Kontext 4096, kalt): Laden 5,2 s, Prompt 344 Token in 11,3 s (30 Token/s), Erzeugen 4,6 Token/s (nur 6 Token, grobe Zahl), gesamt 17,8 s. `ollama ps`: 2,3 GB, 100 % CPU, Kontext 4096. Der Tempo-Test der Chat-Seite für dasselbe Modell (12:22, Termux im Hintergrund, 2 Threads, Kontext 8192, kalt) ergab 4,3 Token/s, Prompt 28,5 s, Laden 19 s. Die Oberfläche ist damit nicht langsamer als Ollama pur; die Langsamkeit des Modells stammt vom Modelfile-Prompt (rund 340 Token) und vom Prozessor.
- Tempo-Test `qwen2.5:3b` (12:31, Termux sichtbar, kalt, 32 Token, kurzer Prompt 52 Token): Erzeugen Lauf 2 bei 2 Threads 7,4 Token/s, bei 3 Threads 3,9, bei 4 Threads 2,2 (Lauf 1: 8,0 / 6,6 / 2,8). Bestätigt: 2 Threads am schnellsten, mehr Threads langsamer. Laden 4 bis 8 s, warm 0,4 bis 0,6 s.
- Vergleich mit früheren Reihen (siehe oben): heinz-fakt 4,2 bis 8,9 Token/s bei 2 Threads, qwen2.5:3b 8,9. Die neuen Werte liegen im selben Bereich. Der große Sprung („20-mal schneller“) war der Wechsel vom Ollama-Standard (8 Threads, im Hintergrund 0,2 bis 0,3 Token/s) auf 2 Threads.

## Seitenwechsel Heinz Chat und Prüfstand (Handy, 11.11.2026)
- Mit gemeinsamer Modellwahl (`heinz_active`), gleichen Laufzeitwerten (Threads 2, Kontext 8192, Haltezeit 30 m) und ohne Vorladen bei schon geladenem Modell: Das Modell bleibt beim Wechsel im Speicher (`ollama ps`: gleiche ID), erste Antwort bei allen getesteten Modellen 4 bis 6 s, auf beiden Seiten gleich. Regeln: `docs/LOKALE_MODELLE.md`.
- Vorher: Chat 24 bis über 60 s bis zum ersten Zeichen, Prüfstand lud nach dem Wechsel neu (Qwen und `heinz-fakt`). Ursachen laut Code: getrennte Modellwahl je Seite und Vorlade-Anfragen, die Ollamas Zwischenspeicher ersetzen (Prompt-Verarbeitung rund 30 Token/s, langer Verlauf kostet dann Sekunden bis Minuten).

## Personas nicht mehr als Ollama-Modelle (11.11.2026)
- Beschluss des Entwicklers: Lokale Modelle kommen nativ. `heinz-wilson` (Persona auf Gemma 2 2B) und `heinz-fakt` (Persona auf dem abliterierten Qwen 2.5 3B von Rademacher) werden aus Ollama gelöscht. Ihre Texte und Werte (Modelfiles, am Handy mit `ollama show … --modelfile` gelesen) stehen unverändert in `lib/personas.js` und werden mit der Anfrage gesendet (Prüfstand: Modi Wilson und Heinz).
- Löschen am Handy (Termux): `ollama rm heinz-wilson:latest heinz-fakt:latest`. Die Gewichte des Rademacher-Modells bleiben, weil es ein eigenes Modell ist (`hf.co/mradermacher/Qwen2.5-3B-Instruct-abliterated-GGUF:Q4_K_M`); `ollama list` danach prüfen.
- Werte aus den Modelfiles: Wilson Temperatur 0,4, Top-P 0,8; Heinz Temperatur 0,2, Top-K 20, Top-P 0,4, Stopp „Als KI“ und „As an AI“. Der Heinz-Prompt (rund 340 Token mit vier Beispielen) wird bei der ersten Anfrage gelesen (rund 11 s kalt bei 30 Token/s), danach liegt er im Zwischenspeicher.
- Noch nicht am Gerät geprüft: ob die Antworten im Prüfstand in den Modi Wilson und Heinz denen von früher entsprechen.
