# Modellquellen für AIUIheinz (Recherche)

Stand: 09.11.2026. Strang „AIUIheinz-Modelle“. Reine Recherche und Planungsgrundlage. **Nichts davon ist gebaut, entschieden oder auf dem Handy getestet.**

**Für andere Chats:** Diese Liste zeigt, welche Modelle und Anbieter später in der App wählbar sein könnten. Wer Funktionen auf Modelle abbildet (Chat, Sheet, Filter, Prüfung, Bild, Sprache), plant gegen die **Funktionsplätze** in Abschnitt I und nennt dort keinen festen Anbieter. Welche Quellen am Ende in die Auswahl kommen, entscheidet der Entwickler.

**Wie belastbar ist das?** Fast alle Zahlen stammen aus Drittquellen (Vergleichsseiten, Blogs, Foren) von August bis Oktober 2026, nur wenige direkt aus Anbieterdokus. Gratisstufen ändern sich oft (siehe Abschnitt G). Vor dem Einbau jeden Eintrag auf der Anbieterseite gegenprüfen. CORS (ob der Browser den Anbieter direkt aufrufen darf) ist bei keinem Anbieter geprüft; dafür ist der optionale Proxy in `server.py` (KONZEPT Abschnitt 7) vorgesehen.

## A Lokal und offline (Kern der App)
| Quelle | Was | Hinweis |
|---|---|---|
| Hugging Face LiteRT Community (`litert-community`) | `.litertlm`-Modelle, dieselbe Technik wie in AI Edge Gallery; Gemma 4 E2B 2,58 GB, Apache 2.0, Gemma 4 E4B | Import per `litert-lm import --from-huggingface-repo …`; Gallery ab Version 1.0.16 importiert auch per Hugging-Face-Community-URL |
| Community-Umwandlungen auf Hugging Face | z. B. Gemma 4 E2B in anderen Varianten als `.litertlm` | Nicht von Google geprüft; Herkunft und Lizenz je Eintrag ansehen |
| Ollama-Bibliothek und `hf.co/<nutzer>/<repo>` | GGUF-Modelle (Q4_K_M) aller Art, auch eigene Personas | Im Konzept schon vorgesehen (Modellmanager, `POST /api/pull`) |
| Kleine Modelle für Handys (Drittvergleich) | Phi-4 Mini 3,8B (~2,7 GB), Gemma 3 4B (~2,9 GB), Llama 3.2 3B (~2,2 GB), Qwen 3 1,7B und SmolLM2 1,7B (~1,1 GB), Gemma 3 1B (~0,7 GB) | Zahlen gelten für Q4_K_M; auf dem Pixel nicht gemessen |
| Einbettungsmodelle | `nomic-embed-text` (schon da), EmbeddingGemma 2 (740M, 485 MB, Text/Bild/Video/Audio, LiteRT) | Für Wikipedia-Suche und Medien-Suche offline |
| Weitere Laufzeiten | llama.cpp-Server (OpenAI-kompatibel), PocketPal AI, MLC Chat | Nur Ergänzung; die App spricht ohnehin Ollama und `litert-lm serve` |

Gallery-Funktionen als Ideenquelle: Agent Skills (per URL ladbar, Community auf GitHub), Thinking Mode, Prompt Lab, Mobile Actions (FunctionGemma 270M), Audio Scribe, Ask Image, Benchmark. Die Gallery-App selbst lässt sich von unserer Seite nicht ansprechen; die Modelldateien und `litert-lm` schon.

## B Cloud, gratis, ohne Konto und ohne Key
| Quelle | Zugang | Umfang | Schnittstelle | Datenschutz |
|---|---|---|---|---|
| Pollinations.ai (Berlin, Open Source) | kein Key nötig; kostenloser Key erhöht das Limit | anonym grob 1 Anfrage je 15 s (Drittangabe), „Fair Use“ | `https://gen.pollinations.ai/v1/chat/completions` (OpenAI-kompatibel); älterer Einfachaufruf `text.pollinations.ai/<prompt>` | Anfragen laufen laut Repo-Skizze über Drittanbieter (Scaleway, DeepSeek, Azure, Cloudflare); nur für unkritische Texte |
| AI Horde (Freiwilligen-Netz) | Key `0000000000` anonym, niedrigste Priorität; Konto gibt Priorität über „Kudos“ | gratis, Wartezeit je nach Auslastung | eigene REST-API; OpenAI-Vorsatz `https://oai.aihorde.net/v1` | Eingaben laufen auf fremden Rechnern der Freiwilligen. Nie private Daten senden |

## C Cloud, gratis mit Konto/Key
| Quelle | Gratis-Umfang | Schnittstelle | Hinweis |
|---|---|---|---|
| OpenRouter (`:free`-Modelle) | 20 Anfragen/min; 50/Tag, nach einmaligem Kauf von 10 $ Guthaben 1.000/Tag; je nach Quelle 16–30 Gratismodelle, wechseln ohne Vorwarnung | `https://openrouter.ai/api/v1` | Ein Key für viele Modelle; Zähler abrufbar über `GET /api/v1/key`; auch Bezahlmodelle günstig und unzensierte Varianten |
| Groq | kein Kartenzwang laut Drittquelle; gpt-oss-120b/20b: 30/min, 1.000/Tag, 200K Token/Tag (Stand 22.10.2026); Modellliste ändert sich (Juni 2026: mehrere Llama/Qwen entfernt) | `https://api.groq.com/openai/v1` | Sehr schnell; nur offene Modelle; auch Whisper |
| Cloudflare Workers AI | 10.000 „Neurons“ pro Tag (Reset 00:00 UTC), danach nur mit Workers Paid (ab 5 $/Monat) | REST; Modellkatalog ~50–80 offene Modelle inkl. Embeddings, Audio | Offizielle Doku bestätigt die 10.000; Reichweite hängt stark vom Modell ab |
| NVIDIA NIM (build.nvidia.com) | ~40 Anfragen/min, Entwicklerkonto, keine Karte; ~16 Gratismodelle (Nemotron, Qwen, DeepSeek) | `https://integrate.api.nvidia.com/v1` | Laut Forum und Drittquellen nur für Entwicklung, nicht für Produktion; Limit-Erhöhung für Gratiskonten nicht möglich |
| Z.ai (Zhipu), GLM-Flash | GLM-4.7-Flash, GLM-4.5-Flash, GLM-4.6V-Flash (mit Bild) dauerhaft kostenlos; 1 gleichzeitige Anfrage | OpenAI-kompatibel (`open.bigmodel.cn/api/paas/v4`; neuere Doku: `docs.z.ai`) | Anbieter sitzt in China; laut Doku kein Training mit API-Daten, außer man stimmt zu |
| Mistral La Plateforme | „Free mode“: Handynummer nötig, keine Karte; Limits nur in der Konsole sichtbar (ältere Angabe: 1 Anfrage/s, 1 Mrd. Token/Monat) | `https://api.mistral.ai/v1` | Gratisstufe nutzt Eingaben laut Drittquellen zum Training; Rechenzentren in Frankreich |
| Ollama Cloud | Gratisplan mit „leichter“ Nutzung, 1 gleichzeitiges Cloud-Modell; Limits nicht veröffentlicht (Quellen widersprechen sich zu 5-Stunden-/Wochenlimits). Bezahlplan Pro 20 $/Monat | gleiche Ollama-API, Tags `…:cloud` | Passt ohne Umbau in unsere Ollama-Schicht; funktioniert nicht offline |
| Google AI Studio (nur der Vollständigkeit halber) | Gratisstufe für Flash-Modelle, 2026 gekürzt | eigener und OpenAI-kompatibler Endpunkt | Gratis-Eingaben können zum Training genutzt werden; steht als erster Online-Anbieter schon im Konzept |

## D Startguthaben (einmalig, kein dauerhaft gratis)
| Quelle | Umfang | Hinweis |
|---|---|---|
| Cerebras | 5 $ Guthaben, 30 Tage gültig, nur mit hinterlegter Zahlungsart | Die offene Gratisstufe ist seit 21.07.2026 weg; ältere Seiten nennen noch „1 Mio. Token/Tag ohne Karte“ |
| Scaleway Generative APIs (Paris) | 1 Mio. Token für Neukunden | Daten nach Anbieterangabe nicht gespeichert |
| AKI.IO (Deutschland) | 10 € Guthaben | Nur Verzeichniseintrag gesehen, Angabe nicht geprüft |
| Together AI | wechselndes Startguthaben | Betrag schwankt je nach Aktion |
| Hugging Face Inference Providers | Gratiskonten bekamen 0,10 $/Monat; laut mehreren Quellen seit 15.10.2026 gestrichen, nur noch PRO (9 $/Monat, 2 $ Guthaben) | Quellen widersprechen sich (alte Seiten nennen noch 0,10 $); vor Einbau prüfen |

## E Günstig und bezahlt
Offene Modelle, Preis je Million Token (Eingabe/Ausgabe), Stand März bis Juli 2026 laut Vergleichsseiten:
| Anbieter | gpt-oss-120b | Hinweis |
|---|---|---|
| DeepInfra | ca. 0,04 $ / 0,19 $ | am günstigsten gelistet |
| Novita AI | 0,05 $ / 0,25 $ | sehr breiter Katalog (60+ Modelle) |
| Together AI, Fireworks, Groq | 0,15 $ / 0,60 $ | Together und Fireworks mit Feinabstimmung |

Stapelaufträge (Batch) kosten bei Together, Fireworks, Groq und Novita laut Drittquelle etwa die Hälfte, mit bis zu 24 Stunden Wartezeit.

Europäisch gehostet (Daten bleiben in der EU/Schweiz, Anbieter sprechen von keiner Speicherung):
- **Scaleway** (Paris), **IONOS AI Model Hub** (Deutschland), **OVHcloud AI Endpoints** (Frankreich, z. B. gpt-oss-120b ab 0,08 € / 0,40 €), **Infomaniak** (Schweiz), **Mistral** (Frankreich).
- Kleinere: Berget AI (Schweden), Cortecs (Österreich, Router), GreenPT, TensorX (ab 0,02 $/Mio.), AKI.IO.

Einschätzung: Der Preis ist hier kaum ein Problem. Ein Kleinverbrauch von wenigen Millionen Token im Monat kostet Cent-Beträge.

## F Community, Freiwilligen- und dezentrale Netze (Mitmachen)
| Quelle | Mitmachen | Stand |
|---|---|---|
| AI Horde | Eigene GPU als „Scribe“ bereitstellen (z. B. mit koboldcpp), dafür Kudos; Code Open Source (Haidra-Org) | aktiv. Ein Pixel 9 Pro ist als Worker zu schwach, bleibt Nutzer |
| Pollinations.ai | Open Source auf GitHub, Beiträge und Apps willkommen | aktiv |
| Chutes (Bittensor, Subnetz 64) | Preise teils 0–0,30 $/Mio., einzelne Modelle gratis; Betreiber mit eigener GPU können mitverdienen | Gratisumfang und Preise schwanken mit der Token-Ökonomie; Zuverlässigkeit unter Mainstream-Anbietern; braucht Konto |
| Google AI Edge Gallery / LiteRT Community | Skills und Modelle beisteuern (GitHub Discussions, Hugging Face) | aktiv |
| Verzeichnisse | `cheahjs/free-llm-api-resources`, `awesome-free-llm-apis`, `freellm.net` | Hier lässt sich per Pull Request Neues melden |
| Petals (Schwarm) | Freiwillige | Wartung laut Juli-2026-Bericht gering, Bandbreite zwischen Knoten das Hauptproblem; nicht empfohlen |

## G Nicht mehr verfügbar oder geändert (nicht einbauen)
- **GitHub Models**: seit 30.07.2026 eingestellt (Playground, Katalog, API).
- **Cerebras** offene Gratisstufe: seit 21.07.2026 weg (siehe D).
- **Hugging Face** Gratis-Guthaben: wohl seit 15.10.2026 gestrichen (siehe D).
- **Groq**: Modelle wechseln (im Juni 2026 u. a. llama-3.1-8b-instant und Kimi K2 entfernt). Modellliste nie fest verdrahten.

## H Vorschlag für die App (Anbieterschicht)
1. **Anbieter als Daten, nicht als Code.** Eine Datei `providers.json` mit je Anbieter: `id`, `name`, `baseUrl`, `format` (ollama / openai), `needsKey`, `keyUrl`, `kategorie`, `limitHinweis`, `datenHinweis`, `region`, `stand`. Der Nutzer kann eigene Einträge ergänzen (ein eigener OpenAI-kompatibler Endpunkt genügt für fast alle Quellen oben). Eine Schicht „openai-kompatibel“ deckt Pollinations, AI Horde (oai-Vorsatz), OpenRouter, Groq, NVIDIA, Z.ai, Mistral, Scaleway, IONOS, OVH, Together, DeepInfra, Novita und Chutes ab. Gesondert: Ollama (gibt es), Cloudflare (eigene REST-Form, ihren OpenAI-Endpunkt prüfen).
2. **Stufen der Offenheit.** Stufe 0 offline (Ollama, LiteRT-LM). Stufe 1 „Online erlauben“ ohne Key (Pollinations, AI Horde), mit deutlicher Warnung „Eingaben verlassen das Gerät, nur Unkritisches“. Stufe 2 mit eigenem Key oder Guthaben (OpenRouter als Einstieg, Groq, Mistral, Z.ai, EU-Anbieter). Standard bleibt aus.
3. **Datenschutzfeld je Anbieter sichtbar:** „trainiert mit Eingaben“, „Region“, „Speicherung“. Mistral-Gratis und Google-Gratis (Training) bekommen eine Warnung; EU-Anbieter mit Null-Speicherung den Vermerk „besser für Persönliches“.
4. **Nur kleine Pakete senden** (Beschluss des Projekts): Die Anbieterschicht bekommt nur den Auszug, nie die ganze Datenbank oder alle Chats. Als Test festhalten.
5. **Limit-Anzeige** aus Antwortköpfen (429) und bei OpenRouter über `/key`; Modelllisten per `/v1/models` abrufen statt fest eintragen.
6. **Schlüssel** bleiben im Browser (Beschluss 3 im Konzept), nie im Repo.

## I Nutzungsmöglichkeiten externer Cloud-KI (Vorschlag)
Leitidee: Die App arbeitet lokal. Cloud-KI ist eine **zubuchbare Fähigkeit**, die der Nutzer selbst einer Funktion zuordnet: „Hier zahle ich 10 € auf ein Konto ein“, „hier habe ich schon einen Schlüssel“, „dafür reicht ein Gratisdienst“. Vorbild ist INCIheinz: lokale KI-Funktionen, dazu ab und zu ein kurzer Auszug zur Prüfung an ein eigenes AI-Studio-Konto.

**Funktionsplätze (Slots).** Module rufen keinen Modellnamen auf, sondern einen Platz. Die Modelle-Seite zeigt je Platz, was zugeordnet ist (lokal oder Cloud), und der Nutzer ändert die Zuordnung dort. Ohne Zuordnung gilt lokal; ohne lokales Modell bleibt die Funktion aus. Vorschlag für Plätze:

| Platz | Zweck | Gut geeignet |
|---|---|---|
| `chat.main` | normales Gespräch | lokal; optional großes Cloud-Modell für schwere Fragen |
| `check.second` | Zweitmeinung zu einem lokalen Ergebnis (nur Auszug) | Gemini-Schlüssel des Nutzers, OpenRouter, Mistral |
| `sheet.translate` | Befehl in Tabellenaktion übersetzen | lokal (Standard); Cloud bei Fehlschlag |
| `filter.classify` | Zeilen klassifizieren | lokal; Cloud-Stichprobe zur Kontrolle der Trefferquote |
| `vision.read` | Foto: Etikett, Code, Tabelle, Text auslesen | Cloud-Modell mit Bild (z. B. GLM-4.6V-Flash gratis, Gemini Flash) |
| `audio.transcribe` | Sprache zu Text | lokal (Gallery/Whisper); Cloud-Whisper (Groq, Cloudflare) wenn zu schwach |
| `search.facts` | aktuelle Fakten, Websuche | Cloud mit Suche; es geht nur die Frage raus |
| `long.summarize` | lange Dokumente | Cloud mit großem Kontext, nach Schwärzung |
| `embed.local` | Einbettung für Wikipedia-/Listensuche | lokal (nomic, EmbeddingGemma 2) |
| `build.persona` | Systemprompts, Personas, Testprompts entwerfen | Cloud, einmalig, ohne private Daten |

**Konkrete Nutzungen:**
1. **Zweitmeinung auf Knopfdruck** (wie INCIheinz): Ergebnis der lokalen KI plus Auszug an ein Cloud-Modell „stimmt das?“. Im Sheet für die Befehlsübersetzung, im Filter als Stichprobe zur Kontrolle der Trefferquote.
2. **Eskalation bei Unsicherheit:** Zwei lokale Modelle widersprechen sich oder die Antwort bricht das Schema → die App fragt „An Cloud schicken?“ und zeigt das Paket vorher.
3. **Foto lesen:** Handyfoto von Etikett, Code oder Tabelle an ein Bildmodell, Ergebnis landet bereinigt in der Zwischenablage oder im Sheet (passt zur Projektidee „fotografieren und den Extrakt übernehmen“).
4. **Schwärzen durch Code, nicht durch das Modell:** Vor dem Senden ersetzt der Code Namen, Mengen, Adressen durch Platzhalter und setzt sie in der Antwort zurück. Nutzer sieht die Vorschau.
5. **Paketvorschau und Protokoll:** Vor jedem Cloud-Aufruf zeigt die App genau, was rausgeht (Auszug, geschätzte Token, geschätzte Kosten). Ein lokales Protokoll in `data/` listet, was wann an wen ging.
6. **Guthaben und Budget:** Zähler je Anbieter (Aufrufe, Token, Kosten), Monatsgrenze je Funktion („höchstens 3 €“), Sperre bei Erreichen. Ausgabenlimit am Key beim Anbieter selbst zusätzlich setzen, wenn der Anbieter das erlaubt (je Anbieter prüfen).
7. **Modellvergleich nebeneinander:** gleiche Frage an lokales und Cloud-Modell, Tempo, Länge, Kosten. Ergebnis in der Modelle-Seite und als Messwert in der Doku.
8. **Stapel über Nacht:** Große Listen zum halben Preis per Batch-Schnittstelle klassifizieren lassen (Filter), nur mit Auszügen.
9. **Aktuelles Wissen:** Lokale Modelle kennen nichts Neues; die App schickt nur die Suchfrage, nie die eigenen Daten.
10. **Schwere Umwandlungen:** Tabellen aus Fotos oder PDFs mit schwierigem Layout, Markdown/ePub-Bau (Projektidee) mit Cloud-Hilfe, wenn lokal Müll herauskommt.
11. **Persönlichkeiten entwerfen:** Cloud-KI schreibt Systemprompt und Testprompts, die lokalen Modelle führen sie aus.

**Wie der Nutzer bezahlt oder anbindet** (ein Eintrag je Anbieter in der Modelle-Seite):
- **Gratis ohne Konto:** Pollinations, AI Horde (nur Unkritisches).
- **Gratis mit Konto:** OpenRouter, Groq, Cloudflare, Z.ai, NVIDIA, Mistral.
- **Guthaben einzahlen** (z. B. 10 €): OpenRouter (hebt auch das Gratislimit), Scaleway/IONOS/OVH (EU), DeepInfra, Together.
- **Vorhandener Schlüssel:** AI Studio (Gemini), eigener OpenAI-kompatibler Endpunkt.
- **Vorhandenes Abo:** Ein Verbraucher-Abo (Chat-App) gibt meist **keinen** API-Zugang; bei Claude sind Abo und API laut Konzept getrennt. Ausnahme: Ollama Cloud Pro ist ein Abo, das über die Ollama-API läuft. Für alle anderen Abos eine **Kopierbrücke** statt Schlüssel: Die App baut ein Paket (Frage plus Auszug) für die Zwischenablage, der Nutzer fügt es in seine Chat-App ein und fügt die Antwort zurück. Kein Schlüssel, voller Überblick, passt zum Projektgedanken.

**Berührt das Fundament:** Die Anbieterschicht liegt im Chat-Strang (KONZEPT Abschnitt 7). Funktionsplätze und `providers.json` greifen in alle Module ein. Sie sind ein Fundamentthema und brauchen einen Beschluss des Entwicklers, bevor jemand baut.

## Offene Punkte
- CORS je Anbieter prüfen (direkt aus dem Browser oder nur über den Proxy in `server.py`).
- Qualität der Gratismodelle für Heinz-Aufgaben (Sheet, Filter) mit Testprompts messen, nicht nach Rangliste entscheiden.
- Aktuelle Limits direkt bei OpenRouter, Groq, Mistral, Cloudflare, NIM und Z.ai nachsehen, bevor ein Eintrag in `providers.json` kommt.
- Ob Pollinations und AI Horde angeboten werden, oder nur als „unkritisch“-Stufe.
- Funktionsplätze (Abschnitt I): Beschluss, Namen und Zuordnung der Plätze.

## Quellen (Auswahl)
- Vergleiche: openrouter.ai/blog/tutorials/free-llm-apis-compared, github.com/amardeeplakshkar/awesome-free-llm-apis, github.com/cheahjs/free-llm-api-resources, dataiku.com/blog/best-llm-apis-for-developers, dev.to/hassann/top-8-free-ai-apis-in-october-2026-5bb5
- OpenRouter: benchlm.ai/md/free-tier/openrouter.md, fast.io/resources/openrouter-rate-limit
- Cloudflare: developers.cloudflare.com/workers-ai/platform/pricing
- Cerebras: claudelog.com/faqs/is-cerebras-free, usagepricing.com (Einträge 21.07. und 05.10.2026)
- Hugging Face: huggingface.co/docs/inference-providers/pricing, usagepricing.com (Eintrag 15.10.2026)
- GitHub Models: klymentiev.com/blog/github-models-shutdown
- Mistral: help.mistral.ai (Experiment-Plan), developersdigest.tech/models/free-api/mistral
- Z.ai: developersdigest.tech/models/free-api/zai, blogs.novita.ai/glm-free-api
- NVIDIA NIM: fremodel.pages.dev/providers/nvidia-nim, forums.developer.nvidia.com
- Pollinations: github.com/pollinations/pollinations, free-llm.com/provider/pollinations-ai
- AI Horde: aihorde.net, github.com/Haidra-Org/AI-Horde, free-llm.com/provider/ai-horde
- Chutes: chutes.ai/docs, tokenmix.ai/blog/chutes-ai-api-keys-access-pricing-2026
- Ollama Cloud: github.com/RedBeret/awesome-ollama-models, devtoolhub.com/ollama-cloud-free-vs-pro-limits-pricing-2026
- EU: europeanpurpose.com/category/llm-api-providers, infrabase.ai/european
- Preise offene Modelle und Batch: blogs.novita.ai/inference-api-providers-for-open-source-models, cloudzero.com/blog/llm-inference-providers
- Lokal: developers.google.com/edge/litert-lm (Gemma 4, Model Management, Overview), huggingface.co/litert-community, apkmirror.com (Gallery 1.0.16), promptquorum.com/power-local-llm
