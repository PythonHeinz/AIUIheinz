# Auftrag für den Strang „AIUIheinz-Chat“ (Entwicklungsstrang Dashboard)

## Stand 11.11.2026 02:15 (Root-Strang): dieser Auftrag ist weitgehend erledigt
Anbieterschicht, Bedienung des Dashboards, Modi als Daten, Tempo-Test, Threads, Update-Pille und Schnittstellenwissen sind gebaut (siehe `docs/agent/STAND.md`, `docs/agent/ENTWICKLUNGSVERLAUF.md`). **Maßgeblich für die weitere Arbeit des Strangs „AIUIheinz-Chat“ ist `docs/agent/AUFTRAG_Chat_Schnittstellen.md`** (dort Stand und nächste Schritte: Gerätetests, Anhänge und Medienspeicher, Funktionsplätze, mehrere eigene Engines). Die Aufgabenliste unten bleibt als Geschichte; Stilangaben wie „schwarz, Google-Farben“ gelten nicht mehr, verbindlich ist `docs/DESIGN.md`.

Dieser Strang baut das Dashboard von Heinz UI um. Das Konzept kommt aus dem Root-Strang „AIUIheinz“: `docs/KONZEPT.md`, vor allem Abschnitt 0 sowie die Abschnitte 4, 5, 7 und 10 im Archiv (`docs/archiv/KONZEPT_v1_entwurf.md`). Der Strang startet mit der Projektanweisung (`docs/agent/PROJEKTANWEISUNG.md`), anschließend diesen Auftrag einfügen oder auf diese Datei verweisen.

## Voraussetzung
Das **Grundgerüst** (Hub, Tool-Struktur mit `tool.json`, `lib/` mit Kern, installierbare Seite, Dashboard als Platzhalter) legt der Root-Strang „AIUIheinz“ an. Dieser Strang startet erst, wenn in `docs/agent/STAND.md` unter „Stränge“ beim Grundgerüst „fertig“ steht, und baut dann darauf auf. Die Dashboard beginnt mit dem Stand, den der Entwickler auf dem Handy benutzt (siehe `docs/agent/ENTWICKLUNGSVERLAUF.md`).

## Ausgangslage (09.11.2026, auf dem Pixel 9 Pro geprüft)
- Sicherung des alten Dashboards: `Toolsbyclaude/HeinzUI-Chat-Backup-2026-11-09/` (Commit `7caa1d4`, `git show 7caa1d4:dashboard.html`). Nicht verändern.
- Tests im Repo: `bash tests/run_all.sh` (15 Tests, alle grün, Ollama simuliert). Müssen grün bleiben, neue Funktionen bekommen Tests.
- **LiteRT-LM läuft in Termux** (Version 0.19.1, Modell `gemma4-e2b` importiert). Server: `litert-lm serve --cors-origin http://localhost:3000` (Standardhost 127.0.0.1, Port 9379). Geprüft per curl: `/v1/models`, `/v1/chat/completions` (auch `stream:true` mit `data:`-Zeilen und `data: [DONE]`), CORS-Freigabe für `http://localhost:3000`.
- Backend je Anfrage: Feld `model` = `gemma4-e2b` (CPU) oder `gemma4-e2b,gpu` oder `gemma4-e2b,gpu,32768` (laut Google-Doku, auf dem Pixel noch nicht getestet).
- Messwerte Gemma 4 E2B (Termux, 256/256 Token): CPU 255 Einlesen / 16,4 Erzeugen Token/s, GPU 874 / 17,7. Ollama gemma2:2b: 2,82 Token/s im Vordergrund, 0,5 im Hintergrund (Chrome vorne).
- Termux-Fallstricke: `litert-lm import` braucht eine Umgehung für `os.link` (siehe `docs/agent/UEBERGABE.md`); Entwickleroption „Beschränkungen für Unterprozesse deaktivieren“ ist eingeschaltet.
- **Nicht geprüft:** ob `litert-lm serve` die Systemnachricht, `temperature`, `top_p`, `top_k`, Kontextgröße und Stoppsequenzen aus der Anfrage umsetzt. Das zuerst per curl prüfen (zum Beispiel Systemprompt „Antworte nur mit dem Wort Banane“) und dem Entwickler berichten, bevor die Regler daran gekoppelt werden.

## Aufgaben in dieser Reihenfolge
1. **Anbieterschicht.** `lib/providers.js` mit einer gemeinsamen Funktion für Ollama (`/api/chat`, NDJSON) und OpenAI-kompatible Server (`/v1/chat/completions`, SSE). Nur `dashboard.html` wird umgestellt; Hub, Lab, Sheet und Vitals bleiben unverändert (Entscheidung des Entwicklers). Einstellungen: Engine (Ollama / LiteRT-LM) und bei LiteRT-LM CPU/GPU; Modellliste dynamisch aus `/api/tags` bzw. `/v1/models`. Default bleibt Ollama, Online-Anbieter kommen später (Haken „Online erlauben“, Standard aus, ohne Haken kein Netzaufruf nach außen; der Offline-Test in `tests/test_pages.py` prüft das).
2. **Bedienung des Dashboards** nach KONZEPT Abschnitt 4 (Archiv): schmale Kopfzeile, Modusleiste oben (kein Wischen), Eingabezeile unten, Kopieren-Symbol je Blase (Nutzer und Antwort), Badges P-Tok/A-Tok/Speed bleiben, **keine** Token-Zeile unter Antworten, Regler und Unterhaltungen in den Einstellungen, „Ganze Unterhaltung kopieren“ mit sprachabhängigen Beschriftungen (heute fest „Du:/Heinz:“).
3. **Modi als Daten** (Beschluss 1 und 2 in KONZEPT.md): Wilson, Heinz, Audit, Code, Creative; ein Modus bringt Ton, Regler, Regeln, Modell und Systemprompt EN/DE mit. Später aus `data/` ladbar.

Sprachlogik (ein EN/DE-Schalter steuert Oberfläche, Systemprompt, Antwortsprache, Spracheingabe, Vorlesen) bleibt unverändert. Neue Texte immer EN und DE. Stil: minimalistisch, schwarz, Google-Farben, Viewport 426 × 803.

## Parallele Stränge (Vorschlag, der Entwickler entscheidet)
Standard ist nacheinander (ein Strang baut, dokumentiert, pusht, dann der nächste). Das Fundament legt der Root-Strang. Danach dürfen Modul-Stränge (Filter, Modelle, Sheet) parallel arbeiten, wenn sie in `docs/agent/STAND.md` unter „Aktive Arbeit“ je eine Zeile mit anderen Dateien eintragen und nichts am Fundament ändern. Änderungen an `lib/` (außer `lib/providers.js`, das gehört diesem Strang), Hub, gemeinsamen Schlüsseln oder `server.py` meldest du dem Entwickler und stimmst sie ab.

## Abschluss
Wie in `docs/agent/UEBERGABE.md` (Routine): Tests, `docs/agent/ENTWICKLUNGSVERLAUF.md`, `docs/agent/STAND.md`, Push. Dem Entwickler sagen, was er auf dem Handy prüfen soll (`git pull`, `bash start.sh`, `litert-lm serve …`), und nie behaupten, etwas sei auf dem Gerät getestet, was nur simuliert lief.

## Nachtrag 09.11.2026 (Root-Strang): Modus Heinz spricht das falsche Modell an
- In `dashboard.html` (Zeile ~403–408) kennt die Seite nur `gemma2:2b`, `qwen2.5:3b`, `gemma:2b`. Modus Heinz nutzt `qwen2.5:3b` (normales Qwen), nicht `heinz-fakt` (abliteriertes Qwen mit eigenem Modelfile-Systemprompt). Persona und Seite sind damit entkoppelt: Die Antworten im Dashboard beginnen nicht mit „Dude,“/„Digger,“.
- Aufgabe: Modellkennung je Modus als Daten (auch `heinz-fakt`, `heinz-wilson`, später LiteRT-Modelle); klären, ob der Systemprompt der Seite den des Modelfiles ersetzen oder ergänzen soll (Ollama: Systemnachricht in der Anfrage überschreibt `SYSTEM` im Modelfile).
- Stichprobe auf dem Handy (`ollama run heinz-fakt`): Persona hält (Startwort „Dude,“/„Digger,“), weicht der Salzsäure-Frage aber in beiden Sprachen aus und warnt, obwohl der Prompt Warnungen und Gesetze verbietet. Abliteriert heißt nicht ablehnungsfrei; Vergleichstest mit Zählung durch Code ist offen.

## Nachtrag 09.11.2026 (Root-Strang): num_thread einstellbar machen
- Messung auf dem Pixel: Ollama-Standard (8 Threads) ist die langsamste Einstellung, im Hintergrund um das Zehnfache. 3–4 Threads waren sichtbar etwa doppelt so schnell (10,3–10,9 statt 5,7 Token/s). Daten: `docs/OLLAMA_UND_MODELLE.md`, Abschnitt Threads.
- Aufgabe: `options.num_thread` als manuell regelbarer Parameter in der Anfrage (Regler oder Feld, Startwert 3 oder 4), je Modell speicherbar. Test im Seitentest: Anfrage enthält `options.num_thread`.

## Nachtrag 09.11.2026 (Root-Strang): weitere Wünsche
- **Kopieren auf zwei Ebenen:** je Blase (vorhanden) und die ganze Unterhaltung über eine Schaltfläche am Kopf der Unterhaltung (alle Blasen mit Rollen). Beschriftungen EN/DE.
- **Wischen zum Aktualisieren abschalten:** `overscroll-behavior-y: none` (sonst Datenverlust in der Unterhaltung).
- **Regeln für neue Seiten:** relative Pfade, Server nur über `/api/...`, siehe `docs/agent/UEBERGABE.md` und `docs/KONZEPT.md` Abschnitt 14 (alle Messungen und Beschlüsse vom Handytest).
- **Später (nicht jetzt):** Update-Hinweis mit Knopf und gehostete Fassung (GitHub Pages), Server-Host der Engine einstellbar (zweites Handy, PC).
