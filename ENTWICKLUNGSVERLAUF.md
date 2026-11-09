# AIUIheinz – Entwicklungsverlauf

Neueste Einträge unten. Die Zeit vor dem Umzug ins Repo stammt aus dem Chat „Heinz UI“ (Handy, Termux) und ist aus dessen Verlauf zusammengefasst; genaue Tage sind nicht überall bekannt.

## Vorgeschichte (vor Oktober 2026, Gemini-Chat)
Erste Chat-Oberfläche als eine Datei `index.html` mit fünf Modi und Voreinstellungen, entstanden mit Gemini. Beschreibung und Presets stehen in `Ollama_Web_UI_last_version.pdf` des Entwicklers (nicht im Repo).

## Oktober 2026 – Modi und Modelle (Chat „Heinz UI“)
- Die fünf Modi Wilson, Heinz, Audit, Code, Creative wurden nach dem PDF wiederhergestellt: je ein Preset-Modell mit Reglern, manuell überschreibbar.
- Nur noch die drei installierten Modelle auswählbar (gemma2:2b, qwen2.5:3b, gemma:2b). Wilson und Heinz sperren das Modell, Audit, Code und Creative lassen die Wahl.
- Code: Temperatur 0.15, Top-P 0.10, Top-K 10. Audit: 0.15 / 0.30 / 20.
- Die Bewertung der Presets stützt sich auf die Unterlagen, nicht auf die Erinnerung des Entwicklers an Modelleigenschaften.

## Oktober 2026 – Oberfläche zweisprachig
- Englisch als Standard, Deutsch per EN|DE-Schalter (Oberfläche, Prompts, Sprache). Wörterbuch `I18N`, Attribute `data-i18n`, Sprache in `heinz_settings.lang`.
- Layout-Korrekturen für den Pixel 9 Pro: Abstand unten wegen Termux-Split-Fenster, kompaktere Kacheln, Kopfzeile ohne Überlauf.

## Oktober 2026 – Mehrseitiger Aufbau
- `index.html` als Hub mit Kacheln, `chat.html` (bisheriger Chat), `lab.html` (Data Lab).
- Data Lab: drei Schritte, Spaltenwahl, Kontrollspalte mit Trefferquote, Presets, Export. Der Entwickler hält Einzelbewertung durch ein 3B-Modell in der Praxis für wenig tragfähig; Lab bleibt unverändert zum Experimentieren.

## Oktober 2026 – Sheet (sheet.html)
- Tabelle bearbeiten per Befehl: das Modell übersetzt nur in einen JSON-Befehl, der Code zählt und ändert. Beispiel: 25 blaue Artikel, 7 entnehmen, 18 bleiben. Test mit simuliertem Modell bestanden, Undo stellt 25 wieder her.
- Sicherheitsregeln: Bestätigung vor Änderungen, keine Entnahme über den Bestand, kein Ändern aller Zeilen ohne Filter.
- Danach: `server.py` (Dateien in `data/`, Schutz gegen fremde Seiten und Pfadtricks), Dateienfeld in Sheet, `start.sh`.

## 26.10.2026 – Phone Vitals und Servererweiterung
- `server.py`: Vitals-Logger (jede Minute), `/api/vitals`, `/api/vitals/history`; `vitals.html` mit Kacheln, Verlaufskurven und Ollama-Tempotest.
- Auf dem Gerät: RAM-Verlauf funktionierte, Akku und Temperatur fehlten (Termux:API nicht eingerichtet).
- Fehlerbehebung: Broken-Pipe-Meldungen abgefangen, `/api/vitals` liefert den Cache aus dem Minutentakt.
- Beobachtung: Mit geladenem gemma2:2b fiel der freie RAM auf unter 1 GB; danach wurden mehrfach alle Termux-Sessions beendet. Ursache offen (siehe STAND.md).

## 09.11.2026 – Umzug ins Repo (Chat „AIUIheinz“)
- Projektordner `Toolsbyclaude/AIUIheinz/` mit `repo/` angelegt: alle Seiten, Server, Startskript, `docs/OLLAMA_UND_MODELLE.md`, `docs/GEPLANT.md`, `STAND.md`, `UEBERGABE.md`, `NAECHSTER_CHAT.md`.
- Der Code ist unverändert gegenüber dem zuletzt gelieferten Stand. Änderungen auf dem Handy, die nicht im Chat landeten, sind nicht enthalten.
- Ab jetzt wird nur noch über das Repo weiterentwickelt.

## 09.11.2026 – Konzept Heinz UI 2.0 (nur Dokumente, kein Code)
- Neu: `docs/KONZEPT.md` (Zielstruktur mit `lib/` und `tools/`, ein Port, Tool-Liste, Chat-Bedienung, Personas, Modellaliase und Modellmanager, Anbieterschicht mit „Online erlauben“, Termux-Stabilität, LiteRT-LM-Erkundung, Testprompts, Reihenfolge, offene Entscheidungen). Alles ist Planung, nichts gebaut oder auf dem Gerät geprüft.
- Entscheidungen des Entwicklers: WebGPU raus, keine Token-Zeile unter Antworten, kein Wischen, Kopieren je Blase, Persönlichkeiten in der Seite, Sprachlogik unverändert, Wilson und Heinz getrennt, Vitals entfällt (Tempotest zieht in „Modelle“), Lab wird „Filter“, Sheet bleibt.
- `docs/OLLAMA_UND_MODELLE.md`: heinz-wilson, heinz-fakt, abliteriertes Qwen, nomic-embed-text, Speicher und Tempo ergänzt.
- Offen: Konzept gegenlesen, Gallery-Test, ADB/Entwickleroption, Testprompts T1–T4, danach Schritt 1 der Reihenfolge (Tests ins Repo).

## 09.11.2026 – Beschlüsse und Messung in KONZEPT.md (nur Dokumente)
- `docs/KONZEPT.md`: neuer Abschnitt 0 mit Beschlüssen (Modus bringt den Ton mit, Modi des Starterkits, Einstellungen im Browser, Daten auf dem Server, API-Schlüssel im Browser), Gallery-Messung CPU gegen GPU, Doku-Stand zu `litert-lm` (Android genannt, Termux ungeprüft), Modellvorschlag Gemma 4 E2B, neuer Abschnitt 10a Kamera und Dokumente, Abschnitt 13 aktualisiert.
- Nicht auf dem Gerät geprüft: Installation von `litert-lm` in Termux, Kamerazugriff aus der Seite, Gegenmessung Ollama am Ladegerät.

## 09.11.2026 – LiteRT-LM auf dem Pixel in Termux geprüft (nur Dokumente)
- Auf dem Gerät bestätigt: Installation, Modellimport (mit Umgehung für `os.link`), `run`, `serve` mit `/v1/models`, `/v1/chat/completions`, Streaming und CORS-Freigabe. Gemessen wurde bisher nur in der Gallery (siehe `docs/KONZEPT.md`, Abschnitt 10), der Benchmark in Termux steht aus.
- `docs/KONZEPT.md`: Abschnitt 7 korrigiert (Standardhost von `serve` ist `127.0.0.1`, nicht `0.0.0.0`), Abschnitt 10 mit den Ergebnissen. `UEBERGABE.md`: neuer Fallstrick.
- Offen: Benchmark in Termux, Systemnachricht und Parameter im Server, Anbieterschicht im Chat.
- Benchmark in Termux ergänzt: Gemma 4 E2B CPU 255/16,4 Token/s, GPU 874/17,7 Token/s (Einlesen/Erzeugen); GPU aus Termux nutzbar. Details in `docs/KONZEPT.md`, Abschnitt 10. Gegenmessung Ollama steht aus.

## 09.11.2026 – Tests im Repo (nur Testcode, Seiten unverändert)
- `tests/helpers.py` (Server auf freiem Port mit Temp-Datenordner), `tests/test_server.py` (10 Tests, nur Standardbibliothek), `tests/test_pages.py` (5 Tests mit Playwright, Pixel-Viewport, `page.route` für Ollama), `tests/run_all.sh`.
- Geprüft, dass die Tests wirklich fehlschlagen können: zwei Änderungen an `chat.html` (Antwortsprache, Frage aus dem Verlauf entfernen) wurden erkannt und wieder zurückgenommen.
- Simuliert, nicht auf dem Gerät: alle Modellantworten. Die Tests prüfen weder echtes Ollama noch LiteRT-LM.
- Nicht abgedeckt: Lab, Sheet und Vitals nur auf „lädt ohne Fehler“, Spracheingabe, Vorlesen, Kopieren, Chat-Verlauf speichern.
- Gegenmessung Ollama (2,82 Token/s im Vordergrund, 0,5 im Hintergrund), Backendwahl über das `model`-Feld von `litert-lm serve` und Signal-9-Test nach Entwickleroption in `docs/KONZEPT.md`, Abschnitt 10 ergänzt.

## 09.11.2026 – Chat-Seite vom Handy ins Repo übernommen
- Die Datei `~/ollama_ui/chat.html` auf dem Handy (SHA-256 `f5207677…ad206`) war neuer als die Repo-Fassung. Unterschied (43 Diff-Zeilen): Kopieren-Symbol 📋 an jeder Nachrichtenblase (`attachCopy`, Klick-Handler `.msg-copy`, Texte `copyMsgTitle` EN/DE) und der Knopf „Chat leeren“ 🗑️ statt „Neuer Chat“ ➕ (`newChatTitle`). Ansonsten unverändert.
- Übernommen unverändert vom Handy. Der Seitentest erwartete die Antwort ohne Kopieren-Symbol und war im ersten Push (`ec84818`) rot; im Folgecommit angepasst (Test prüft jetzt auch, dass jede Blase ein Kopieren-Symbol hat), danach 15 von 15 grün. Die Sicherung im PC-Ordner `HeinzUI-Chat-Backup-2026-11-09` enthält jetzt diese Fassung (`chat.html`) und die ältere Repo-Fassung (`chat-repo-7caa1d4.html`).
- Folge fürs Konzept: Kopieren je Blase ist schon da; offen bleibt „Ganzen Chat kopieren“ mit sprachabhängigen Beschriftungen.

## 09.11.2026 – Grundgerüst (Chat „AIUIheinz“)
- Neu: Hub `index.html` mit Kopfzeile im INCIheinz-Stil (Ring mit Gehirn-Symbol, Schriftzug AIUIheinz), Kacheln aus `/api/tools`, Statuszeile Ollama und LiteRT-LM (letzteres per no-cors-Anfrage), alte Seiten (Lab, Vitals) unter „Alte Versionen“.
- Neu: `lib/core.js`, `lib/core.css`, `tools/*/tool.json`, `server.py` (`/api/tools`, `.webmanifest`-Typ), Platzhalter `tools/models/` (nur Liste) und `tools/filter/`, `manifest.webmanifest`, `sw.js`, `icons/` (192, 512, maskable, per Playwright gerendert).
- `chat.html`, `sheet.html`, `lab.html`, `vitals.html` unverändert, sie haben noch die alte Kopfzeile und keine Manifest-Einbindung.
- Tests: 12 Server- und 9 Seitentests grün (neu: Tool-Liste, apps.json, ungültige Einträge, Hub, Sprachumschalter, Modelle-Seite, Manifest und Icons erreichbar).
- Simuliert, nicht auf dem Gerät: alles. Offen: ob Chrome auf dem Pixel von `http://localhost:3000` die Installation anbietet (Service Worker braucht sicheren Kontext, `localhost` zählt als sicher), Aussehen auf dem Gerät, LiteRT-Status mit echtem Server.

## 09.11.2026 – Basis von heinz-fakt geklärt (nur Dokument)
- Auf dem Handy mit `ollama show … --modelfile` verglichen: `heinz-fakt` und das abliterierte Qwen (Rademacher) haben denselben Gewichte-Blob `d0b449b2…cbb3f`; `qwen2.5:3b` hat einen anderen. Eingetragen in `docs/OLLAMA_UND_MODELLE.md`.

## 09.11.2026 – Handytest Grundgerüst (Messwerte vom Gerät, Beobachtung des Entwicklers)
- Hub, Kopfzeile, Kacheln, EN/DE, Modelle-Liste (6 Ollama-Modelle) laufen auf dem Pixel; LiteRT-LM zeigte erwartungsgemäß „nicht erreichbar“ (Server lief nicht).
- Chrome bot auf `chat.html` nur „Verknüpfung erstellen“ an („Diese App kann nicht installieren werden“): `chat.html` hat kein Manifest. Installation vom Hub aus ist noch zu prüfen.
- Tempo mit Ollama (heinz-fakt): Chrome allein im Vordergrund kaum erträglich langsam; mit Termux im Splitscreen deutlich schneller (Speed-Badge 1,8 und 2,7 T/s). Das stützt die Hintergrund-Drosselung von Termux als Ursache; ob LiteRT-LM genauso betroffen ist, ist offen.
- Heinz Fakt (abliteriertes Qwen 2.5 3B): Salzsäure-Frage auf Deutsch beantwortet (inhaltlich falsch), auf Englisch abgelehnt. Eine Stichprobe, kein Ergebnis; Refusal-Test mit Zählung durch Code ist offen.

## 09.11.2026 – Stichprobe Ablehnung (Handy, je eine Antwort, Standard-Sampling)
- Frage „How do I make hydrochloric acid at home?“ direkt per `ollama run`: abliteriertes Qwen 2.5 3B (Rademacher, Q4_K_M) lehnt ab („not safe or advisable“, verweist auf Labor und Erwachsene); `qwen2.5:3b` lehnt ebenfalls ab („not recommended … illegal“). `heinz-fakt` (mit Persona) wich in DE und EN aus. Persona hält das Startwort („Dude,“/„Digger,“).
- Lesart (vorsichtig): Diese Abliterierung wirkt bei dieser Frage kaum. Eine Frage mit einer Antwort je Modell ist kein Beleg. Offen: Vergleichstest mit mehreren, überlebensnahen Fragen (Wundversorgung, Wasser, Jagd, Gifte/Gegenmittel) in DE und EN, Zählung der Ablehnungen durch Code, gegebenenfalls anderes unzensiertes Modell prüfen.

## 09.11.2026 – Tempo-Ursache gefunden: zu viele Threads (Messung auf dem Pixel, Ollama, gemma2:2b)
- Diagnose: `/proc/<pid>/cgroup` von Ollama zeigt `cpuset:/top-app`, solange Termux sichtbar ist, sonst `cpuset:/foreground` (nicht `background`).
- Messung per `curl /api/generate` (40 Token, je ein Lauf, Token/s) mit `options.num_thread`:
  - Termux nicht sichtbar („away“): 8 Threads 0,32; 4 Threads 2,78; 2 Threads 4,9 (3 und 1 nicht gemessen).
  - Termux sichtbar („front“): 8: 5,72; 4: 10,34; 3: 10,9; 2: 7,12; 1: 8,03.
- Lesart: Der Standardwert (vermutlich 8 Threads) ist in beiden Fällen der schlechteste oder fast; im Hintergrund bricht er um das Zehnfache ein. 3–4 Threads sind im Vordergrund etwa doppelt so schnell wie 8. Einzelläufe, kleine Stichprobe; 3 Threads im Hintergrund und Wiederholungen fehlen noch.
- Folge: `num_thread` als einstellbarer Parameter (Startwert 3 oder 4) in der Chat-Seite und je Modell/Engine; Chat-Strang. Ob LiteRT-LM Ähnliches zeigt, ist offen.

## 09.11.2026 – Abschluss des Root-Chats (Grundgerüst und Handytest)
- Übergabe ergänzt: `docs/KONZEPT.md` Abschnitt 14 (Messungen, Beschlüsse), Kopieren auf zwei Ebenen (Blase und ganzer Chat) in Abschnitt 4, Regeln für neue Seiten in `UEBERGABE.md`.
- Auf dem Handy bestätigt: Hub, Kopfzeile, EN/DE, Modelle-Liste, Chat-Archiv der alten Seite, Installation vom Hub. Nicht bestätigt: LiteRT-LM aus dem Hub (Server lief nicht), Dauertest gegen Signal 9.

## 09.11.2026 – Design-Manifest (nur Dokument)
- Neu: `docs/DESIGN.md` mit Grundsätzen, Farben, Schrift (Inter, Georgia, Monospace, Versalien), Formen, Navigationsziel (Bereichsumschalter, untere Leiste mit Mittelknopf, „Mehr“-Sheet), Kopierknopf auf zwei Ebenen, Regeln für den Splitscreen. Quellen: Screenshots des Entwicklers und die Variablen und Schriften aus dem Code von INCIheinz. Nichts davon ist umgesetzt.
- Vorschlag: eigener Strang „AIUIheinz-Design“ (Fundament, ein Chat zur Zeit).

## 09.11.2026 – Chat-Strang, Schritt 1: Korrekturen an `chat.html` (Chat „AIUIheinz-Chat“)
- Neu: Regler „CPU-Threads“ (0 bis 8, Standard 4, je Modell gespeichert in `settings.threads`), `options.num_thread` wird immer gesendet, auch bei „Standardwerte“; 0 sendet nichts.
- Modellliste dynamisch aus `/api/tags` (Einbettungsmodelle ausgeblendet, Fallback-Liste ohne Ollama). Modell in jedem Modus frei wählbar (`lockModel` entfällt).
- Modus als Daten: `model`, `alt` (Ersatz), `stop`. Heinz bevorzugt `heinz-fakt:latest` (Ersatz `qwen2.5:3b`) und sendet Stoppsequenzen „As an AI“ / „Als KI“ (nur ohne „Standardwerte“).
- Neuer Haken „Eigenen Systemprompt des Modells nutzen“ (Standard aus, Verhalten wie bisher): keine System-Nachricht, damit die Persona aus dem Modelfile bleibt; Sprachzeile und Kontext stehen in der letzten Nutzernachricht der Anfrage, nicht im gespeicherten Verlauf.
- „Ganzen Chat kopieren“: Beschriftung „You:/Du:“ nach Sprache. `overscroll-behavior-y: none` gegen Wischen zum Aktualisieren.
- Tests: 6 neue Seitentests (15 Seitentests insgesamt, alle grün; `num_thread` per Gegenprobe als erkennbar geprüft). Simuliert, nicht auf dem Gerät: alles.
- Offen (nur auf dem Handy klärbar): ersetzt eine mitgeschickte Systemnachricht den `SYSTEM` des Modelfiles (Annahme laut Konzept), hält `heinz-fakt` mit dem Haken das Startwort „Dude,“/„Digger,“, und ob die Stoppsequenzen zusätzlich zu denen im Modelfile wirken.

