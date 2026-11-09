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
- Übernommen unverändert vom Handy; alle 15 Tests bleiben grün. Die Sicherung im PC-Ordner `HeinzUI-Chat-Backup-2026-11-09` enthält jetzt diese Fassung (`chat.html`) und die ältere Repo-Fassung (`chat-repo-7caa1d4.html`).
- Folge fürs Konzept: Kopieren je Blase ist schon da; offen bleibt „Ganzen Chat kopieren“ mit sprachabhängigen Beschriftungen.
