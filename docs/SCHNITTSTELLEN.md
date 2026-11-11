# Schnittstellen der Engines (Fähigkeitenübersicht)

Strang „AIUIheinz-Modelle“, Phase 1. Stand: 10.11.2026. Reine Recherche aus Anbieterdokus, **nichts davon ist auf dem Handy geprüft**. Zweck: Die App soll später je Engine und Modell zeigen, welcher Regler wirkt, ignoriert wird oder nur lokal gilt (KONZEPT 18.2). Quellen, Preise und Gratisstufen stehen in `docs/MODELLQUELLEN.md`; hier nur, was die Schnittstelle betrifft.

**Status je Aussage:** **belegt** = in der Anbieterdoku gelesen (Quelle genannt). **Drittquelle** = Forum, Blog, Fremd-Referenz, nicht vom Anbieter. **vermutet** = Schluss aus Verwandtem. **unbekannt** = nicht gefunden. Alles Vermutete und Unbekannte geht in die Sonde (Abschnitt 4).

Bisher bearbeitet: Google AI Studio (Gemini API) und LiteRT-LM serve. Offen: Ollama (im Code und in `docs/OLLAMA_UND_MODELLE.md` bekannt, hier noch nicht als Matrix), OpenRouter, Groq, Mistral, Ollama Cloud, llama.cpp-Server.

---

## 1 Google AI Studio (Gemini API)

Zwei Wege zum selben Dienst. Schlüssel kommt aus Google AI Studio.

| | OpenAI-kompatibel | nativ |
|---|---|---|
| Basis | `https://generativelanguage.googleapis.com/v1beta/openai/` | `https://generativelanguage.googleapis.com/v1beta/` |
| Chat | `POST …/chat/completions`, Kopf `Authorization: Bearer <Schlüssel>` | `POST …/models/<modell>:generateContent` (und `:streamGenerateContent`), Kopf `x-goog-api-key` |
| Modellliste | `GET …/openai/models` (Felder unbekannt, vermutet nur `id`) | `GET …/models` (siehe 1.2) |
| Parameter | OpenAI-Namen plus `extra_body.google.…` | `generationConfig` mit Gemini-Namen |

Quelle: ai.google.dev/gemini-api/docs/openai, ai.google.dev/api/models (belegt).

Google empfiehlt selbst, den nativen Weg zu nehmen, wenn man keine OpenAI-Bibliothek braucht (belegt, Compat-Seite).

### 1.1 Parameter (Matrix)

| Parameter | OpenAI-kompatibel | nativ (`generationConfig`) | Status / Bemerkung |
|---|---|---|---|
| Temperatur | `temperature` | `temperature` | belegt. Bereich je Modell: 0 bis `maxTemperature` (aus Modellliste). **Gemini 3:** Google rät dringend, bei 1.0 zu bleiben; niedrigere Werte können zu Schleifen und schlechterer Leistung führen (belegt, Gemini-3-Leitfaden). Eine Firebase-Referenz markiert für 3.x `temperature` und `topK` als „wird ignoriert“; Auszug nicht eindeutig lesbar (Drittquelle). **Sonde.** |
| top_p | `top_p` | `topP` | belegt (Feld in der Modellliste), Wirkung bei 3.x wie oben unklar |
| top_k | nicht Teil von OpenAI; vermutet ignoriert | `topK` | Modellliste nennt `topK`-Vorgabe (belegt). Im kompatiblen Weg **unbekannt**: vermutlich ignoriert oder nur über `extra_body`. Sonde |
| max. Token | `max_tokens`, `max_completion_tokens` (Drittquelle) | `maxOutputTokens` | Obergrenze je Modell `outputTokenLimit` in der Modellliste (belegt). **Bei Denkmodellen zählen Denk-Token vermutlich mit** (Vorwissen, nicht geprüft): zu kleiner Wert kann eine leere Antwort ergeben. Sonde |
| Stoppsequenzen | `stop` (Drittquelle) | `stopSequences` (bis 5, Firebase-Referenz) | belegt für nativ, Drittquelle für kompatibel |
| Seed | vermutet ja | `seed` | nativ belegt (Vertex-Doku: „bestmöglich gleich, nicht garantiert“). Kompatibel unbekannt |
| frequency_/presence_penalty | vermutet ja | `frequencyPenalty`, `presencePenalty` | **Gemini 3.x: Anfrage mit diesen Feldern endet mit Fehler 400** (Firebase-Referenz, Drittquelle). Bei 2.5 möglich. Das ist der wichtigste Stolperstein für unsere Regler. Sonde |
| Anzahl Antworten | `n` | `candidateCount` | 3.x: wird ignoriert, „stattdessen parallele Anfragen“ (Firebase-Referenz) |
| Systemrolle | `role: "system"` (belegt, Beispiel der Doku) | `systemInstruction` | belegt |
| Denkaufwand | `reasoning_effort` | `thinkingConfig.thinkingLevel` / `thinkingBudget` | siehe 1.3 |
| Streaming | `stream: true` | `:streamGenerateContent` | belegt. Token-Zählung: siehe 1.4 |
| JSON-Ausgabe | `response_format` (`json_schema` oder `text`; Drittquelle) | `responseMimeType: "application/json"`, `responseSchema` / `responseJsonSchema` | belegt für nativ |
| Bild-Eingabe | `image_url` (URL oder Base64) | `inlineData` / Datei | vermutet ja bei den meisten Modellen (Modellliste sagt nur `supportedGenerationMethods`, nicht Fähigkeiten) |
| Werkzeuge | `tools`, `tool_choice` | `tools` | belegt (Compat-Seite zeigt Beispiel) |
| Kontextfenster | nicht einstellbar | nicht einstellbar | fest je Modell: `inputTokenLimit` (belegt) |
| Unbekannte Parameter | **offen** (Doku nennt nur für Bilder: unbekannte Felder werden still ignoriert) | meist Fehler 400 bei Feldern, die das Modell nicht kennt (Gemini-3-Penalties als Beleg) | **Das ist der Kern der Sonde** |

### 1.2 Modellliste (nativ) belegt

`GET /v1beta/models` liefert je Modell (belegt, ai.google.dev/api/models):
- `name` (`models/<id>`), `baseModelId`, `version`, `displayName`, `description`
- `inputTokenLimit`, `outputTokenLimit`
- `supportedGenerationMethods` (zum Beispiel `generateContent`, `countTokens`, `embedContent`): damit lassen sich Chatmodelle von Einbettungs- und Bildmodellen trennen
- **`thinking`** (Boolean: Modell kann denken)
- **`temperature`** (Vorgabe), **`maxTemperature`**, `topP`, `topK` (Vorgaben)

Seiten: Standard 50 je Aufruf, höchstens 1000, weiter mit `pageToken` (belegt).

Folgerung für die App: Modellliste **nativ** abrufen, auch wenn der Chat über den kompatiblen Weg läuft. Daraus lassen sich Temperaturschieber (0 bis `maxTemperature`), Token-Obergrenze, „Modell denkt“ und Chat-tauglich ableiten, ohne Modellnamen fest zu verdrahten. Was die Liste **nicht** sagt: Bild- oder Audiofähigkeit, Preise, Gratislimits, welche `generationConfig`-Felder das Modell ablehnt (unbekannt, Sonde).

### 1.3 Denken (Reasoning)

Belegt (ai.google.dev/gemini-api/docs/openai und …/gemini-3):
- **Gemini 3:** `thinking_level` mit `minimal`, `low`, `medium`, `high`. Gemini 3.1 Pro kennt kein `minimal`; Gemini 3 Flash und 3.1 Flash-Lite kennen alle vier. Standard ist `high` (dynamisch), bei Flash-Lite `minimal`. `minimal` heißt „wahrscheinlich kein Denken“, nicht garantiert. **Denken lässt sich bei 3.x nicht ausschalten.**
- **Gemini 2.5:** `thinking_budget` (Token; 0 schaltet ab, -1 dynamisch; bei 2.5 Pro nicht abschaltbar, 2.5 Flash-Lite ab 512).
- **`thinking_level` und `thinking_budget` zusammen in einer Anfrage ergeben Fehler 400.** In der kompatiblen Schnittstelle dürfen auch `reasoning_effort` und `thinking_level`/`thinking_budget` nicht gleichzeitig stehen.
- Zuordnung `reasoning_effort` (kompatibel), nach aktueller englischer Doku: `minimal` → 3.1 Pro `low`, Flash-Lite und 3 Flash `minimal`, 2.5 Budget 1.024; `low` → `low`, 1.024; `medium` → `medium`, 8.192; `high` → `high`, 24.576. `none` nur für 2.5. Ältere Doku-Fassungen kennen nur `low` und `high` bei Gemini 3 (Widerspruch zwischen Fassungen: Stand der Seite prüfen).
- Denkzusammenfassung: nativ `thinkingConfig.includeThoughts`, kompatibel `extra_body.google.thinking_config.include_thoughts` (belegt).
- Gedanken-Signaturen (`thoughtSignature`) bei Gemini 3: bei Mehrschritt-Werkzeugaufrufen zurückschicken (belegt); für reinen Chat nach Doku nicht nötig, **Sonde bestätigen**.

### 1.4 Token-Zählung und Kosten

- Kompatibel: `stream_options: {include_usage: true}` wird laut Google-Forum (Mitarbeiter-Antwort) unterstützt, ist aber **nicht Standard**; ein anderer Nutzer sah die Nutzung ohne den Parameter im letzten Block. Widerspruch, Sonde (Drittquelle).
- Nativ: Antwort enthält `usageMetadata` (Eingabe-, Ausgabe-, Denk-Token). Vorwissen, in dieser Sitzung nicht gelesen: **vermutet**.
- Preise liefert keine der beiden Listen. Preise je Modell nur aus der Preisseite (Handarbeit oder Datei).

### 1.5 Was für die Oberfläche folgt (Vorschlag, noch Phase 2)
- Für Gemini die Regler **Temperatur** (mit Hinweis bei 3.x „Standard 1,0 empfohlen“), **Max. Token**, **Stopp**, **Denkaufwand** (je nach Modell `minimal/low/medium/high` oder Budget) anbieten.
- **top_k** nur nativ; **Penalties** bei Gemini 3 ausgrauen mit Grund „führt zu Fehler 400“ (nach Bestätigung durch die Sonde); **Kontext** nicht einstellbar (fest).
- Die jetzige Anbieterschicht sendet nur `temperature`, `top_p`, `max_tokens`, `stop` (KONZEPT 18.2): das ist für Gemini ungefährlich, aber `top_p` bei 3.x ist ungeklärt.
- Ein dritter Weg ist möglich: nativ sprechen (eigener Block in `lib/providers.js`). Vorteil: `topK`, `seed`, `thinkingConfig`, Modellliste aus einer Quelle. Nachteil: eigenes Format neben dem OpenAI-Format. Entscheidung beim Entwickler.

---

## 2 LiteRT-LM (`litert-lm serve`)

Quelle: ai.google.dev/edge/litert-lm (CLI, OpenAI-Compatible Server, CLI Configuration; belegt, sofern nicht anders vermerkt). Die Dokumentation zum Server ist **sehr knapp**.

### 2.1 Server
- Start: `litert-lm serve`. Lädt alle importierten Modelle der lokalen Registry dynamisch.
- **Optionen laut `litert-lm serve --help` auf dem Handy (Ausgabe des Entwicklers, 10.11.2026, gemessen):** `--config FILE` (eigene `config.json` statt `~/.litert-lm/config.json`), `--host` (Standard **127.0.0.1**), `--port` (Standard 9379), `--cors-origin TEXT` (erlaubte CORS-Ursprünge, mehrfach angebbar; Standard: keine, CORS aus), `--verbose`. Die Doku-Seite nennt dagegen `--host 0.0.0.0` als Standard und kennt weder `--config` noch `--cors-origin`: **die Doku ist älter als die installierte Version, die Messung auf dem Gerät gilt.**
- `--cors-origin` liefert keine Werte, sondern erlaubt dem Browser den Zugriff: Die Seite auf `http://localhost:3000` darf `serve` nur aufrufen, wenn dieser Ursprung angegeben ist. Mit der Thread-Verteilung hat das nichts zu tun (Threads: `cpu_thread_count` in der Konfiguration).
- `--config FILE` erlaubt mehrere getrennte Konfigurationsdateien (Profile), ohne `~/.litert-lm/config.json` anzufassen: nützlich für `server.py` (siehe 2.3).
- Endpunkte: `GET /v1/models`, `POST /v1/chat/completions` (Streaming unterstützt; wie man es einschaltet, zeigt die Seite nicht), **`POST /v1/embeddings`** (nur wenn ein Einbettungsmodell geladen wird; Eingabe Text, Bild, Audio oder gemischt; Beispiel `embedding-gemma-v2.litertlm,gpu`).
- Modellname im Request: Beispiel `gemma4-12b` (Alias beim Import). In Beispielen steht auch `gemma4-12b,gpu` bzw. `embedding-gemma-v2.litertlm,gpu`: ein **Suffix nach dem Komma wählt offenbar das Backend**; die Syntax ist nirgends beschrieben (**vermutet**, Sonde).

### 2.2 Parameter: Server-Konfiguration statt Anfrage
Die Doku zur Konfiguration (`~/.litert-lm/config.json`, ab Version 0.15.0) sagt: Eine OpenAI-Anfrage enthält keine LiteRT-LM-eigenen Parameter wie das Backend. Deshalb löst `serve` die Einstellungen **aus der Datei** auf, anhand des `model`-Feldes (Eintrag `models.<id>` überschreibt `default`). So lassen sich **Aliase mit verschiedenen Leistungsprofilen** definieren, ohne den Client zu ändern.

Schlüssel (alle optional, belegt): `backend` (`cpu`, `gpu`, `npu`), `audio_backend`, `vision_backend`, `cpu_thread_count`, `gpu_decode_steps_per_sync`, `cache` (`disk`, `memory`, `no`), `max_num_tokens` (Prompt plus Ausgabe), `temperature`, `top_p`, `top_k` (ab 1), `seed`, `speculative_decoding` (Multi-Token-Prediction), `thinking` (Boolean), `thinking_budget` (-1 = unbegrenzt/Standard), `activation_data_type` (`fp32`, `fp16`, `int16`, `int8`). Rangfolge: Laufzeit-Argument vor Modelleintrag vor `default` vor Modell-Metadaten vor Engine-Standard (CPU). Die Doku warnt: Nicht unterstützte Backends können die Initialisierung scheitern lassen.

**Unbekannt (Sonde):**
- Ob `serve` `temperature`, `top_p`, `top_k`, `seed`, `max_tokens`, `stop` **aus der Anfrage** übernimmt oder nur aus der Konfiguration. Die Doku nennt keinen einzigen Anfrageparameter.
- Systemrolle, `stream_options`/`usage` in der Antwort, Fehlerverhalten bei unbekannten Feldern.
- Bild-, Audio- und Werkzeugeingabe über `/v1/chat/completions` (die Doku zeigt Bilder und Audio nur für Einbettungen und für die Kommandozeile).

### 2.3 Folgerung für die App
- **Nur anzeigen, was wirkt:** Für LiteRT-LM Regler zunächst als „unbekannt“ kennzeichnen, bis die Sonde Klarheit bringt. Die Regler, die per Konfigurationsdatei wirken (Threads, Backend, Denken, Kontext, Seed), wirken **nicht** über die Seite, solange `server.py` die Datei nicht schreibt. Idee (Fundament, Beschluss nötig): ein Endpunkt in `server.py`, der `~/.litert-lm/config.json` lesen und für ein Modell ändern darf, dazu Neustart von `serve`. Der Tempo-Test (Threads) ließe sich so auch für LiteRT-LM bauen.
- **Einbettung:** `/v1/embeddings` mit EmbeddingGemma wäre die lokale Grundlage für die Wikipedia-Suche (siehe MODELLQUELLEN A). Noch nicht geprüft.

---

## 3 Spezialfunktionen der Gallery-Modelle: erreichbar über unsere App?

Aufstellung nach Doku (Gallery-Repo, App-Store-Beschreibung, Drittberichte). „Erreichbar“ bezieht sich auf die HTTP-Schnittstelle `litert-lm serve`, wie unsere Anbieterschicht sie nutzt.

| Funktion in der Gallery | Was dahintersteckt | Über `serve` erreichbar? |
|---|---|---|
| **Thinking Mode** (AI Chat) | Gemma 4 mit Denken | Konfiguration `thinking`, `thinking_budget` belegt; ob die Denkausgabe in der HTTP-Antwort ankommt, **unbekannt** |
| **Ask Image** | Bildeingabe (Gemma 4 E2B/E4B sind multimodal) | **unbekannt** (CLI kann Bilder: `litert-lm run … --attachment bild.jpg --vision-backend gpu`) |
| **Audio Scribe** | Spracheingabe, Transkription und Übersetzung; laut Drittquelle Clips bis etwa 30 s | **unbekannt** (CLI kennt Audio-Anhänge, `--audio-backend`) |
| **Mobile Actions** | Feinabstimmung von FunctionGemma 270M für Gerätebefehle, App-intern | nein als Fertigfunktion. Funktionsaufruf als Technik ist in der CLI über `--preset datei.py` (Python-Werkzeuge, Systemanweisung) belegt, über `serve` **unbekannt** |
| **Agent Skills** | App-seitige Bausteine (Wikipedia, Karten, Erinnerungen, Kalender, MCP experimentell), Skills per URL ladbar, Community auf GitHub | nein: Funktion der App, kein Teil der Engine. Als Vorlage nützlich, nicht erreichbar |
| **Prompt Lab** | Parameter Temperatur und top-k einstellen | ja im Prinzip (siehe 2.2), Anfrageparameter unbekannt |
| **Tiny Garden** | Spielerei mit FunctionGemma | uninteressant |
| **Benchmark** | Messung auf dem Gerät | `litert-lm benchmark <modell>` (CLI belegt); über `serve` nein. Passt zu unserem Tempo-Test, wäre ein Server-Aufruf (Fundament) |
| **Multi-Token-Prediction** | schnelleres Decodieren (Gemma 4), vor allem auf GPU | Konfiguration `speculative_decoding` belegt |
| **Einbettung** | EmbeddingGemma 2 | ja: `/v1/embeddings` (belegt) |

Ehrliches Fazit: Mit den Daten aus der Doku ist über die App bisher **nur Text-Chat und Einbettung** als erreichbar belegt. Bild, Audio, Werkzeuge und Denkausgabe können nur auf dem Handy geprüft werden. Die CLI kann mehr als der Server; ein Weg wäre, dass `server.py` die CLI als Unterprozess aufruft (Fundament, Beschluss nötig).

---

## 4 Sonde (Konzept, noch nichts gebaut)

Ziel: Der Entwickler prüft mit eigenem Schlüssel auf dem Handy, was die Schnittstelle tut. Ergebnis als Tabelle oder JSON **ohne Schlüssel** zum Kopieren und zum Eintragen in diese Datei.

**Ablauf je Anbieter und Modell:**
1. Modellliste roh speichern (bei Google nativ und kompatibel, damit man den Unterschied sieht).
2. Eine Grundanfrage („Antworte mit OK“, höchstens 5 Ausgabe-Token; bei Denkmodellen mit niedrigem Denkaufwand) als Referenz.
3. Je Parameter eine Anfrage mit genau einem Zusatz: Ergebnis **angenommen** (Wirkung sichtbar?), **ignoriert** (gleiche Antwort, kein Fehler) oder **Fehler** (Text speichern).
4. Wo Wirkung messbar ist: `seed` zweimal gleich, `max_tokens` klein (Abbruch sichtbar?), `stop` (Abbruch beim Zeichen), `temperature` 0 gegen 2 (Streuung bei drei Wiederholungen).

**Offene Fragen, die die Sonde klären soll:**
- Google, kompatibel: `top_k`, `seed`, Penalties, `stop`, `max_tokens` bei Denkmodellen (leere Antwort?), `stream_options`, Verhalten bei `temperature` ≠ 1 und `top_p` unter Gemini 3.
- Google, nativ gegen kompatibel: Unterschied bei denselben Werten; Fehler 400 bei Penalties unter 3.x; `usageMetadata`.
- Google: Felder der kompatiblen Modellliste; Preise gibt es nirgends.
- LiteRT-LM: Anfrageparameter (alle), Systemrolle, `usage`, Bild/Audio/Werkzeuge in `/v1/chat/completions`, `--cors-origin`, Suffix `,gpu`, Streaming-Schalter.
- CORS: Darf der Browser (localhost:3000) den Anbieter direkt aufrufen? Google: unbekannt, sonst Proxy in `server.py`.

**Kosten:** Fünf Ausgabe-Token je Anfrage; bei etwa 30 Anfragen je Modell sind das Cent-Bruchteile. Der Entwickler wird vor dem Bau eine Schätzung bekommen. Bauen erst nach Freigabe (Auftrag Phase 2).

---

## 5 Quellen (abgerufen 10.11.2026)
- OpenAI-Kompatibilität Gemini API: ai.google.dev/gemini-api/docs/openai (Weiterleitung nach aistudio.google.com/docs/openai; nur über Suchausschnitte gelesen)
- Modelle (`models.list`): ai.google.dev/api/models
- Denken: ai.google.dev/gemini-api/docs/thinking und …/gemini-3
- Gemini-3-Leitfaden (Temperatur, Denkstufen, Signaturen): ai.google.dev/gemini-api/docs/gemini-3; Vertex-Prompting-Leitfaden Gemini 3 (Temperatur 1,0)
- GenerationConfig (Gemini 3.x: Penalties Fehler 400, `candidateCount` ignoriert): firebase.google.com/docs/reference/js/ai.generationconfig (Drittquelle für die Gemini-Developer-API, nur als Ausschnitt gelesen)
- Seed: docs.cloud.google.com/vertex-ai/…/content-generation-parameters (Vertex, nicht AI Studio)
- Forum `stream_options`: discuss.ai.google.dev („Gemini OpenAI compatibility … stream_options“)
- LiteRT-LM: ai.google.dev/edge/litert-lm (CLI, OpenAI-Compatible Server, CLI Configuration, Usage), developers.google.cn Spiegelseiten, linuxcommandlibrary.com/man/litert-lm (Drittquelle, CLI-Optionen)
- Gallery: github.com/google-ai-edge/gallery, App-Store-Beschreibung, Drittberichte (pasqualepillitteri.it, taxheal.com)

---

## 6 Beschlüsse und Klarstellungen des Entwicklers (10.11.2026 abends)

1. **Anbindung heute:** Die App spricht Google AI Studio bisher **über die OpenAI-kompatible Schnittstelle** (Engine „Custom“, nur `POST …/chat/completions`, `lib/providers.js`), nicht nativ über `generateContent`. Der Schlüssel aus AI Studio gilt nach Vorwissen (nicht in dieser Sitzung geprüft) für das ganze Google-Cloud-Projekt und damit für beide Wege; ein zweiter Schlüssel ist nicht nötig.
2. **Parameter je Schnittstelle:** Der Chat bleibt in seinen Parameternamen und ist darüber kompatibel. Was die Schnittstelle des gewählten Modells zulässt, ist regelbar; alles andere ist **ausgegraut** (mit Grund).
3. **Modellwissen vorab:** Erkenntnisse wie die zu Gemini 3 (Temperatur 1,0 empfohlen, Penalties führen zu Fehler 400, Denken nicht abschaltbar) werden als **Vorgaben je Modell in der App hinterlegt**, auch wenn die Modellliste sie nicht liefert (Daten, z. B. `lib/capabilities.json`, Erkennung über Modellnamen-Muster plus Felder der Modellliste).
4. **Denken als eigener Schalter:** `thinking_level`, `thinking_budget` und `reasoning_effort` werden als **ein** Schalter „Denken“ gedacht, dessen Stufen vom Modell abhängen. In der Chatzeile entspricht **Schnell** einer niedrigen und **Tief** der hohen Stufe (Strang „AIUIheinz-Modi“, Auftrag Punkt 3; Abstimmung zwischen Modi und Modelle nötig, beide berühren `lib/providers.js`). Über die kompatible Schnittstelle genügt `reasoning_effort`.
5. **Token-Zählung vereinheitlichen:** Die Anbieterschicht liefert schon Eingabe-, Ausgabe- und Denk-Token und ein Zeichen „geschätzt“ (`lib/providers.js`, `include_usage` wird gesendet). Offen ist, ob die Ausgabe-Token die Denk-Token enthalten (bei OpenAI ja, bei Gemini kompatibel unbekannt). Die Dashboards brauchen eine feste Definition: Eingabe, sichtbare Ausgabe, Denken, Gesamt, Quelle (Anbieter oder Schätzung), Tempo getrennt für sichtbare Ausgabe und für Ausgabe plus Denken. Die Sonde klärt je Anbieter die Lage.
6. **LiteRT-LM:** Backend `cpu` und `gpu` sind in der App schon einstellbar, `npu` soll als weiterer Wert dazukommen (in der Konfiguration belegt; ob die NPU des Pixel in Termux nutzbar ist, ist **unbekannt**, nur durch Ausprobieren). Konfiguration der Engine über `server.py` ist **beschlossen als Richtung** (Beschluss und Abstimmung mit den anderen Strängen vor dem Bau, weil Fundament).
7. **Einbettungsmodelle** werden gesondert erfasst, nicht in der Chat-Modellliste, sondern im geplanten Bereich für Wissensquellen (offline Wikipedia, andere Wikis wie ein VW-T4-Wiki). Recherche dazu (Kiwix/ZIM, Wiki-Auszüge, Einbettung und Suche auf dem Handy) steht noch aus.
8. **Ausprobieren:** Ob Bild, Audio oder Funktionsaufrufe über `litert-lm serve` ansprechbar sind, wird später per Versuch geklärt (Teil der Sonde, Abschnitt 4).
9. **Noch nicht testbar:** Eine weitere Google-Schnittstelle (nativ `generateContent`, neue Interactions-API in Beta, Live-API) hat der Entwickler noch nicht angebunden; die Recherche zu `generateContent` bleibt als Grundlage für eine native Anbindung stehen.

---

## 7 Festgelegte Werte (Version 1 von `lib/capabilities.json`, 10.11.2026 nachts)

Aus diesem Bericht ist die Datei `lib/capabilities.json` entstanden (nur Daten, kein Code; geprüft durch `tests/test_capabilities.py`). Sie ist die maschinenlesbare Fassung der Abschnitte 1 und 2. Der Chat-Strang liest sie (Auftrag `docs/AUFTRAG_Chat_Schnittstellen.md`).

**Zustand je Regler, Engine und Modell:**
| Zustand | Bedeutung in der Oberfläche |
|---|---|
| `on` | regelbar, wird gesendet |
| `unknown` | **regelbar und gesendet, aber als „ungeklärt“ gekennzeichnet** (damit man es ausprobieren kann; Ergebnis kommt in die Sonde) |
| `off` | ausgegraut, wird nicht gesendet (Engine hat es nicht oder ignoriert es), mit Grund |
| `error` | ausgegraut, wird nicht gesendet (Anfrage würde abgelehnt), mit Grund |
| `fixed` | ausgegraut, zeigt den festen Wert des Modells |
| `config` | gehört nicht in die Anfrage, sondern in die Serverkonfiguration (LiteRT-LM, `server.py` nötig); bis dahin ausgegraut mit Hinweis |

Jede Zelle trägt den **Status** der Quelle: `belegt` (Anbieterdoku), `drittquelle`, `code` (eigener Code), `vermutet`, `unbekannt`.

**Sicher festgelegt (belegt oder aus eigenem Code):**
- **Ollama:** Temperatur, top_p, top_k, Kontext, Threads, max. Token, Stopp, Seed sind regelbar (Code). Penalties und Denken: ungeklärt.
- **Alle Cloud-Engines (OpenAI-Weg):** Threads sind aus (läuft beim Anbieter); Kontext ist je Modell fest.
- **Google, kompatibel:** Temperatur, top_p, max. Token, Stopp regelbar; Kontext fest (aus `inputTokenLimit`); Threads aus; Denken über `reasoning_effort` (belegt), niemals zusammen mit `thinking_level` oder `thinking_budget`.
- **Gemini 3 (alle Varianten Pro, Flash, Flash-Lite):** Temperatur regelbar, aber **Vorgabe 1,0 mit Hinweis**; Penalties **gesperrt** (Fehler 400, Drittquelle).
- **Denken, Gemini 3:** Stufen `low`/`medium`/`high` (Pro) und `minimal`/`low`/`medium`/`high` (Flash, Flash-Lite); Standard `high` (Flash-Lite: `minimal`); nicht abschaltbar. **Schnell** = niedrigste Stufe (Pro `low`, Flash `minimal`), **Tief** = `high`.
- **Denken, Gemini 2.5:** Token-Budget; Flash und Flash-Lite abschaltbar (0), Pro nicht. Zuordnung `none` 0, `minimal`/`low` 1.024, `medium` 8.192, `high` 24.576. **Schnell** = `low` (Flash-Lite: `none`), **Tief** = `high`. Wertebereich von 2.5 Pro unbekannt.
- **LiteRT-LM:** Kontext (`max_num_tokens`), Threads (`cpu_thread_count`) und Denken (`thinking`, `thinking_budget`) sind `config`; Backends `cpu`, `gpu` (Code), `npu` (in der Konfiguration genannt, auf dem Gerät unbekannt). Die Anfrageparameter sind ungeklärt.

**Bewusst offen gelassen:** top_k und seed bei Google (kompatibel), alle Penalties außerhalb Gemini 3, Parameter von OpenRouter, Groq, Mistral einzeln, Denken bei Ollama und den übrigen Cloud-Anbietern. Die Datei enthält dafür `unknown`, nie eine geratene Sperre.

**Token-Statistik (Vorschlag, Block `stats` der Datei):** Eingabe, Ausgabe (wie die Engine zählt), Denken, sichtbare Ausgabe, Gesamt, Quelle (Anbieter oder Schätzung), Tempo für sichtbare Ausgabe und für Ausgabe plus Denken. Ob die Ausgabezahl die Denk-Token enthält, ist je Engine offen (`outputIncludesReasoning`); das klärt die Sonde, bis dahin zeigt die Anzeige beide Zahlen getrennt und rechnet nicht ab.

## 8 Umsetzung im Chat und offene Messungen (10.11.2026, Strang Chat)

Der Chat liest `lib/capabilities.json` (Regler nach Zustand, Schnell/Tief über `reasoning_effort`, Denk-Token getrennt). **Gemessene Funde gibt es noch keine**: alles lief nur gegen simulierte Server. Auf dem Handy (Google AI Studio, Gemini 3.x) sind zu prüfen und danach hier einzutragen:
- Kommt `reasoning_effort` an und ändert „Schnell“ gegenüber „Tief“ die Denk-Token (`reasoningTokens`)?
- Sind `outputTokens` inklusive oder exklusive Denk-Token (`outputIncludesReasoning`)? Bis dahin zieht die Seite nichts ab.
- Nimmt die kompatible Route `top_k` an oder lehnt sie es ab (Regler steht auf „unverified“)?
- Verhalten bei Temperatur unter 1,0 bei Gemini 3 (Empfehlungsknopf).
Der Export im Parameterfenster („Parameter kopieren“) liefert Zustand je Regler, Denkstufe und die letzten Token-Werte, nie Schlüssel.

### 8.1 Gemessen am Pixel 9 Pro, Google AI Studio, `gemini-3.8-flash` (11.11.2026, Heinz-Modus, Prompt „Antworte nur mit dem Wort OK.“)
- **Modell-IDs:** Die Modellliste der kompatiblen Route liefert Namen mit Präfix (`models/gemini-3.8-flash`). Es gibt kein `gemini-3-flash`, nur `gemini-3-flash-preview`, `gemini-3.5-flash`, `…3.6/3.7/3.8-flash`. Die Liste enthält auch Embedding-, TTS-, Bild-, Live- und Robotik-Modelle, die nicht chatten können.
- **Standard (nichts gesendet):** Antwort „OK.“, In 63, Out 2, Start 2,6 s. **Tief** (`reasoning_effort: high`): Antwort „OK“, In 63, Out 1, Start 2,7 s. In beiden Läufen **kein** `reasoning_tokens` im Stream (der Think-Chip blieb aus). Ob die kompatible Route Denk-Token nicht meldet oder das Modell bei dieser Frage nicht denkt, ist **offen**; `outputIncludesReasoning` bleibt `unknown`.
- **Schnell (`reasoning_effort: minimal`): Fehler 400** „Thinking level MINIMAL is not supported for this model“ (`INVALID_ARGUMENT`). Daher hat `gemini-3.8-flash` in `capabilities.json` eine eigene Regel mit `fast: low`; `gemini-3-flash` und `-flash-preview` behalten `minimal` (dort nicht widerlegt).
- **Token-Grenze:** Mit Schnellmodus (150 Token) und Frage nach drei Primzahlen kam nur „1“ und der Abbruch (`finish_reason: length`). Eine Antwort von drei Zeilen braucht weit weniger als 150 Token, also **zählen Denk-Token zur Grenze** (am Gerät bestätigt), auch wenn sie nicht als `reasoning_tokens` gemeldet wurden.
- **Temperatur:** 1,0 (Empfehlung) lief ohne Auffälligkeit. Der Lauf mit 0,3 ist nicht eindeutig dokumentiert (Export fehlt); drei Antworten zum Allgäu waren sauber, ohne Schleifen.
- **`top_k`:** Wird auf der kompatiblen Route **gar nicht gesendet** (der Adapter schickt nur temperature, top_p, max_tokens, stop, reasoning_effort). Der Regler hat dort also keine Wirkung; erst eine native Anfrage (`generateContent`, `topK`) würde ihn nutzen.
- **Geschwindigkeit:** Bei Antworten unter 5 Token ist T/s nicht aussagekräftig (333 T/s bei 2 Token); die Seite zeigt dann „–“.

### 8.2 Native Modellliste (11.11.2026, simuliert getestet, am Gerät noch offen)
`GET https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000` mit Kopfzeile `x-goog-api-key` (Schlüssel nie in der URL), nur hinter „Online erlauben“. Gefiltert auf `generateContent`; je Modell werden `inputTokenLimit`, `outputTokenLimit`, `thinking`, `topK`, `maxTemperature` gelesen und im Modellblatt und im Export gezeigt. Bei Fehler (z. B. CORS) steht in der Statuszeile „Native Google-Liste nicht lesbar“ und die kompatible Liste wird gezeigt; es gibt keinen Umweg.

### 8.3 Zweiter Handytest (11.11.2026 nachts, gemini-3.8-flash, kompatible Route)
- **Native Liste am Gerät bestätigt:** 48 Einträge, mit Eingabe-/Ausgabegrenze und Denk-Flag; `models/gemini-3.8-flash`: Eingabe 1.048.576, Ausgabe 65.536, `thinking` true, `topK` 64, `maxTemperature` 2. Der Browser darf `generativelanguage.googleapis.com/v1beta/models` also lesen (CORS ist kein Hindernis).
- **Schnell (`low`) funktioniert** (kein 400 mehr; „OK“, 1 Token).
- **Tief (`high`), Primzahlfrage:** In 77, Out 112, `reasoningTokens` 0 (also nicht gemeldet), 10 s Wartezeit bis zum Text, danach kam die Antwort fast auf einmal (313 T/s sind kein echter Wert). Das lange Warten zeigt, dass gedacht wurde; die kompatible Route meldet die Denk-Token aber nicht (oder in einem Feld, das wir nicht lesen). Die rohe Antwort-Nutzung steht ab jetzt im Export („Last response: usage …“).
- **Gemini 3.x flash:** „Schnell“ nutzt für alle Versionen `low` (Beschluss des Entwicklers, `minimal` nur bei 3.8 widerlegt); `flash-lite` unverändert.
- **Verhalten Online aus/an (gewollt, Beschluss 11.11.2026):** Online aus fällt auf die lokale Engine zurück; Online wieder an kehrt **nicht** zur Cloud-Engine zurück (Standard ist offline).

### 8.4 Dritter Handytest (11.11.2026): Temperatur, Denk-Token, Zeiten (gemini-3.8-flash, Tief, Temperatur 0,3, Primzahlfrage)
- **Gesendeter Body:** `temperature 0.3`, `top_p 0.3`, `stop ["As an AI","Als KI"]`, `reasoning_effort high`, kein `top_k`, kein `num_ctx`. Die Anfrage lief mit HTTP 200: die Temperatur 0,3 wird akzeptiert (Auffälligkeiten bei der Antwortqualität sind bei dieser Frage nicht dokumentiert).
- **`usage`:** `{"completion_tokens":165,"prompt_tokens":78,"total_tokens":5563}`: **keine** `completion_tokens_details`. Prompt plus Ausgabe sind 243, die Gesamtsumme ist 5563. Die Differenz von 5320 sind Denk-Token, die nur in der Summe stecken. Die Seite leitet sie daraus ab und markiert sie.
- **Zeiten:** erster Text nach 30 135 ms, gesamt 30 951 ms, 8 Chunks: Denken dauert, der Text kommt dann fast auf einmal. T/s (201) ist daher kein Maß für die Erzeugungsgeschwindigkeit.
- **Folge für `outputIncludesReasoning`:** In diesem Lauf enthält `completion_tokens` die Denk-Token nicht. Ein Lauf; weitere Läufe stehen aus.

### 8.5 Vierter Handytest (11.11.2026): Temperatur 1,0 gegen 0,4, Tief (gemini-3.8-flash, Frage nach Zahlenreihen)
- Beide Anfragen liefen mit HTTP 200; `temperature` stand mit 1 bzw. 0.4 im gesendeten Body. Die Antwort war in beiden Läufen sauber (kein Schleifen-Effekt bei 0,4 beobachtet; ein Lauf je Wert, kein Qualitätsvergleich).
- Lauf 1 (T 1,0): `usage` 73 / 352 / total 1272 → Denk-Token abgeleitet 847; erster Text nach 8,9 s, gesamt 11,4 s.
- Lauf 2 (T 0,4): `usage` 73 / 387 / total 1423 → Denk-Token abgeleitet 963; erster Text nach 9,5 s, gesamt 12,8 s.
- In allen vier bisher gemessenen Läufen (8.3, 8.4, 8.5) ist `total_tokens` größer als `prompt_tokens + completion_tokens`; ein Feld `reasoning_tokens` kam nie. `completion_tokens` enthält die Denk-Token demnach nicht. `capabilities.json` trägt dies für `gemini-compat` jetzt als `outputIncludesReasoning: "no"` mit Messvermerk (vorher `unknown`).
- Die Denk-Menge schwankt stark mit der Frage (5320 bei der Primzahlfrage, rund 850 bis 960 hier).
