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
Empfehlung (vorläufig): `num_thread` 3 oder 4 setzen statt den Ollama-Standard zu nutzen. Details in `ENTWICKLUNGSVERLAUF.md`.

**Bestätigung in der Chat-Seite (09.11.2026, Beobachtung des Entwicklers, Chrome auf dem Pixel, Regler „CPU-Threads“, `heinz-fakt` bzw. Modell des Modus; ein Gespräch, keine Messreihe):** Mit 4 Threads antworteten Einstiegsfragen „so schnell wie noch nie“; ein Lauf zeigte Prompt 190 Token, Antwort 12 Token, 4,8 Token/s. Auf 8 Threads gestellt dauerte die nächste Antwort „elend lange“ (keine Zahl abgelesen), zurück auf 4 war die Antwort wieder schnell. Mehrere kurze Fragen nacheinander funktionierten, der Gesprächsverlauf wurde berücksichtigt („Auch ein Hund …“). Nicht festgehalten: ob Termux dabei sichtbar war. Beschluss: `num_thread` bleibt dauerhaft ein einstellbarer Parameter der Chat-Seite.
