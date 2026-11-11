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


## 09.11.2026 – Modellquellen-Recherche (Chat „AIUIheinz-Modelle“)
- Nur Dokumente, kein Code: neu `docs/MODELLQUELLEN.md` (Quellen für Modelle nach Kategorien: lokal, Cloud gratis ohne/mit Key, Startguthaben, günstig/EU, Community, nicht mehr verfügbar), Vorschlag für eine Anbieterschicht als Daten (`providers.json`, Stufen der Offenheit, Datenschutzfeld) und Vorschlag „Funktionsplätze“ mit Nutzungsideen für externe Cloud-KI (Abschnitt I). Hinweiszeile in `docs/OLLAMA_UND_MODELLE.md`.
- Zahlen stammen aus Drittquellen (Aug–Okt 2026), nicht aus Anbieterdokus; CORS je Anbieter ungeprüft. Nichts davon ist auf dem Gerät getestet.
- Funktionsplätze und `providers.json` berühren das Fundament (Anbieterschicht, KONZEPT Abschnitt 7): erst Beschluss des Entwicklers, dann bauen.

## 09.11.2026 – Handytest Chat-Schritt 1 (Beobachtung des Entwicklers, Chat „AIUIheinz-Chat“)
- Auf dem Pixel mit `git pull` und `bash start.sh` getestet: 4 CPU-Threads schnell (4,8 Token/s bei 12 Antwort-Token), 8 Threads sehr langsam, zurück auf 4 wieder schnell; Gesprächsverlauf wird berücksichtigt. Einzelbeobachtung, Sichtbarkeit von Termux nicht festgehalten (siehe `docs/OLLAMA_UND_MODELLE.md`, Abschnitt Threads).
- Gemeldet: „Ganzen Chat kopieren“ funktioniere noch nicht (Art des Fehlers offen, im nächsten Schritt klären).
- Noch nicht geprüft: Modellliste aus Ollama, Modus Heinz mit `heinz-fakt`, Haken „Eigenen Systemprompt nutzen“.
- Idee: Geräteprofile (Threads je Prozessor) in `docs/GEPLANT.md`.

## 09.11.2026 – Chat: Parameter-Leiste und Neu laden (Chat „AIUIheinz-Chat“)
- Handytest bestätigt: Mit gesetztem Haken „Eigenen Systemprompt des Modells nutzen“ antwortet `heinz-fakt` im Modus Heinz mit „Digger, …“. Ursache des fehlenden Tons vorher: Der Heinz-Prompt der Seite ersetzt den Modelfile-Prompt (per `curl` mit „Banane“ gezeigt). Details in `docs/OLLAMA_UND_MODELLE.md`.
- Neu: Ein Tipp außerhalb der Parameter-Leiste (zum Beispiel in den Chat oder das Eingabefeld) schließt sie; die Werte gelten schon beim Verstellen. Neuer Knopf ↻ „Seite neu laden“ in der Leiste (Chat und Einstellungen bleiben erhalten). Neuer Seitentest; 16 Seitentests grün, nur simuliert.
- Beobachtung des Entwicklers: Nach einem Modellwechsel dauert die erste Antwort lange, danach geht es schnell. Vermutung (zu prüfen im Tempo-Test): Ollama lädt das Modell neu, wenn sich Optionen wie `num_thread` oder `num_ctx` ändern; das würde auch die lange Wartezeit nach dem Umstellen auf 8 Threads teilweise erklären. Im Tempo-Test `load_duration`, `prompt_eval_duration` und `eval_duration` getrennt ausweisen.

## 09.11.2026 – Chat Schritt 1b: Tempo-Test, Symbole, Startzeit (Chat „AIUIheinz-Chat“)
- Neu in `chat.html` (☰ → „Tempo-Test“): Test mit festem Prompt (kurz ~20 oder lang ~300 Token), Temperatur 0, Seed 1, 32 Token, `stream:false`, Modell und Kontext wie in der Seite. Wählbare Threads (1, 2, 3, 4, 6, 8), je Wert zwei Läufe (Lauf 1 nach Entladen des Modells über `keep_alive:0`, Lauf 2 warm). Tabelle mit Laden (`load_duration`), evaluierten Prompt-Token, Prompt-Token/s, Erzeugen-Token/s und Gesamtzeit; „Termux im Hintergrund/sichtbar“ wird im Kopf des Ergebnisses vermerkt; „Ergebnis kopieren“ liefert einen Text; das letzte Ergebnis bleibt in `heinz_speedtest`. Eine Zufallsmarke am Promptanfang verhindert, dass Ollama den Prompt aus dem Zwischenspeicher nimmt. Während des Tests sendet der Chat nicht.
- Neu: Badge „Start“ (Laden + Prompt-Verarbeitung der letzten Antwort), Wartezeit in Sekunden in der Warteblase.
- Bedienung: „Neuer Chat“ als Linien-Symbol (Stift im Quadrat, wie moderne Chat-Apps) statt Papierkorb; der Knopf „Ganzen Chat kopieren“ sitzt jetzt oben links im Chatfenster. Das Kontext-Feld bleibt beim neuen Chat bewusst stehen (Mini-RAG-Idee des Entwicklers: Kontext = Anhang für den ganzen Chat).
- Tests: 19 Seitentests grün (neu: Symbol und Position der Knöpfe, Tempo-Test mit simuliertem Ollama, Abbruch ohne Threads, Start-Badge). Nur simuliert; die Zahlen kommen erst vom Handy.
- Offen: Vorladen des Modells beim Moduswechsel; Update-Weg ohne Eingabe in Termux (Vorschläge an den Entwickler: automatisches `git pull` in `start.sh`, Update-Knopf im Hub; beides berührt das Fundament und braucht seine Freigabe).

## 09.11.2026 – Update-Knopf (Chat „AIUIheinz-Chat“, Freigabe des Entwicklers; berührt Fundament)
- Anlass: Neue Versionen kamen nur per `git pull` in Termux aufs Handy. Gewählt von drei Wegen: Update-Knopf in der Seite (statt nur automatisches `git pull` in `start.sh` oder gehostete Fassung auf GitHub Pages; beide bleiben Optionen für später).
- `server.py`: neuer Endpunkt `POST /api/update` (`update_from_git`): `git pull --ff-only` im Projektordner, Schutz wie bei Schreibzugriffen (Header `X-Heinz`, gleiche Herkunft), nur mit `.git`, ein Lauf zugleich (Sperre), Zeitlimit 90 s. Antwort `{ok, changed, files, restarting, output}`. Hat sich `server.py` geändert, startet der Server 0,7 s nach der Antwort mit denselben Optionen neu (`os.execv`).
- `chat.html`: Knopf „Nach Updates suchen“ oben in ☰ (Meldungen EN/DE: aktuell, aktualisiert, Fehler mit Git-Ausgabe), wartet nach Serverneustart auf `/api/ping`, lädt dann neu; Chat und Einstellungen bleiben erhalten. Sperrt sich während Antwort oder Tempo-Test.
- Tests: 6 neue Servertests mit lokalem „GitHub“ (bare Repo), Entwickler- und Handy-Klon (Schutz, aktuell, Seitenänderung ohne Neustart, `server.py`-Änderung mit Neustart und neuer Version, Klon mit eigenen Commits scheitert sauber, kein Git-Ordner), 1 neuer Seitentest; Gegenprobe (Schutz entfernt) schlägt fehl. 18 Server- und 20 Seitentests grün. Nur simuliert.
- Einmalig von Hand nötig: `git pull` und `bash start.sh`, weil der laufende Server den Endpunkt noch nicht kennt. Danach nicht mehr.
- Offen: derselbe Knopf im Hub; `start.sh` mit automatischem Pull wäre nur nötig, wenn man ganz ohne Seite aktualisieren will.

## 09.11.2026 – Versions-Pille am Update-Knopf (Chat „AIUIheinz-Chat“; berührt Fundament, Wunsch des Entwicklers nach dem Vorbild von INCIheinz)
- `server.py`: `app_version()` liefert kurzen Commit und Commit-Datum (aus Git, zwischengespeichert, nach jedem Update neu gelesen). `GET /api/ping` enthält jetzt `app: {commit, date}` (ohne Git `null`), `POST /api/update` liefert zusätzlich `from`, `to`, `date`.
- `chat.html`: Der Knopf oben in ☰ ist eine Pille mit dem Stand („⬇ 611e62d · 2026-11-09“); Tippen sucht nach Updates. Meldungen nennen den Stand („Schon auf dem neuesten Stand (611e62d)“, „Aktualisiert 47b3269 → 611e62d“). Ohne Server steht nur „⬇ Update“.
- Tests: 19 Server- und 20 Seitentests grün (neu: Version in Ping und Update, ohne Git `null`, Pille und Meldungen). Nur simuliert.
- Hinweis: Als „Version“ dient der Git-Commit samt Datum, keine eigene Versionsnummer. Eine Nummer (zum Beispiel `VERSION` in der Seite) wäre eine Ergänzung, falls gewünscht.

## 09.11.2026 – Version 1.0 (Chat „AIUIheinz-Chat“; berührt Fundament: `server.py`)
- Wunsch des Entwicklers: Der Stand mit Chat-Korrekturen, Tempo-Test und Update-Knopf heißt **Version 1.0**, weil er damit erstmals ohne PC am Handy arbeiten kann (Updates laufen über die Pille).
- Neu: `VERSION.txt` (`1.0`). `server.py` `app_version()` liest sie und gibt `version`, `commit`, `date` in `/api/ping` und (`version`, `from`, `to`, `date`) in `/api/update` zurück. Pille: „⬇ v1.0 · <Commit> · <Datum>“.
- Tests: 20 Server- und 20 Seitentests grün (neu: Versionsnummer in Ping, neu gelesen nach Update). Nur simuliert.


## 09.11.2026 – Tempo-Test: Prompt-Zeit, beste Threads übernehmen (Chat „AIUIheinz-Chat“)
- Anlass: Erste Messung des Entwicklers (`heinz-fakt:latest`, 2 und 3 Threads). Die Prompt-Token/s im Lauf 2 waren irreführend: Ollama nimmt den gleichen Präfix (Modelfile-Systemprompt, rund 340 Token) aus dem Zwischenspeicher; `prompt_eval_count` meldet trotzdem den ganzen Prompt.
- `chat.html`: Neue Spalte „P s“ (`prompt_eval_duration`); „P t/s“ nur noch im Lauf 1, im Lauf 2 steht „–“. Zeile „Beste: N Threads (X Token/s)“ (je Threadwert Lauf 2, sonst Lauf 1, höchste Erzeugungsrate) und Knopf „N Threads für dieses Modell übernehmen“ (schreibt `settings.threads[Modell]`). Kopiertext mit gleichen Spalten, Hinweis zum Zwischenspeicher und „Best“-Zeile.
- Messwerte (Handy, Einzelläufe, Rauschen möglich): 2 Threads 5,3–6,8 Token/s Erzeugen, 3 Threads 1,7–3,0; Lauf 1 Laden 5,7–11,1 s; Prompt 363 Token. Ein Lauf über 8 Threads steht aus. Lange Kaltstarts (17–21 s) stammen vom Modelfile-Prompt.
- Tests: 20 Server- und 20 Seitentests grün (Beste Threads, Übernehmen). Breite der Tabelle in der Seitenleiste (250 px) geprüft. Nur simuliert.
- Offen: Läuft ein Threadwechsel ohne „Modell vorher entladen“ ohne neues Laden? Modell nach Moduswechsel vorladen; kürzerer Modelfile-Prompt.

## 10.11.2026 – Tempo-Maßnahmen im Chat (Chat „AIUIheinz-Chat“, nur `chat.html`)
- Grundlage: Messreihen des Entwicklers vom 09.11. (gemma2:2b und heinz-fakt, je Threadzahl; 2 Threads am stabilsten, 8 Threads mit Termux im Hintergrund 0,2–0,3 Token/s, erster Aufruf 25–30 s, davon 12–20 s Prompt-Verarbeitung durch den Modelfile-Prompt von heinz-fakt und 4–14 s Laden). Prompts der Seite sind klein (Wilson und Heinz je rund 50 Token); der Parser ist nicht der Engpass.
- **Systemprompt konstant:** Kontext steht jetzt vorn in der letzten Nutzernachricht statt im Systemprompt (`buildMessages`). Der Systemprompt (Modus, Sprache, Schnellmodus) bleibt gleich und damit im Ollama-Zwischenspeicher. Verhaltensänderung: Im Audit-Modus liegt der Kontext nicht mehr in der Systemnachricht, auf dem Handy prüfen, ob die Antwortqualität gleich bleibt.
- **Modell vorladen:** nach Seitenstart und bei Wechsel von Modus, Modell, Threads, Kontextgröße, Sprache, Schnellmodus, Eigenem Systemprompt (1,2 s Verzögerung, nicht doppelt bei gleichen Einstellungen, bricht beim Senden ab). Statuszeile „Modell wird vorbereitet / bereit“. Ein-/Ausschalter in ☰ (Standard an).
- **keep_alive 30 m** in jeder Anfrage (Standard von Ollama 5 min).
- **Schnellmodus** (☰): Bitte um knappe Antwort ohne Markdown im Systemprompt, `num_predict` (Standard 150, einstellbar 16–1024), Anzeige als Rohtext ohne Parser.
- Refaktor: `buildOptions` und `buildMessages` für echte Anfrage und Vorladen gemeinsam.
- Tests: 24 Seitentests grün (neu: Vorladen mit gleichen Optionen, nicht doppelt, folgt Modus und Threads, abschaltbar; Kontext verändert den Systemprompt nicht; Schnellmodus). Gegenprobe (Kontext im Systemprompt) schlägt fehl. Nur simuliert; Wirkung auf dem Handy offen: Zeit bis zur ersten Antwort nach Moduswechsel mit und ohne Vorladen (Start-Badge), Schnellmodus gegen normal (Gesamtzeit).
- Offen: Termux im Vordergrund (Termux:Float, Akku „Nicht eingeschränkt“, Wakelock) als Tempo-Test-Reihe; GPU/CPU-Schalter erst mit LiteRT-LM (Schritt 3); kürzerer Modelfile-Prompt von heinz-fakt nur nach Vergleichstest.

## 10.11.2026 – Modusleiste (Chat „AIUIheinz-Chat“, Schritt 2 als Grundfunktion, nur `chat.html`)
- Anstelle des Dropdowns steht oben eine Leiste mit Pillen je Modus (Emoji und Kurzname, aktiver Modus in der Modusfarbe, Höhe 40 px, alle fünf passen auf 426 px, auch auf Deutsch). Sie wird in `renderModeBar()` aus `MODE_PRESETS` gebaut, neue Modi erscheinen von selbst. Das Dropdown `#mode-select` bleibt unsichtbar als Zustandsträger.
- Verhalten unverändert: Moduswechsel = neuer Chat, der alte wird gespeichert, Modus und Preset-Modell wechseln; während einer laufenden Antwort oder des Tempo-Tests ignoriert die Leiste Tipps.
- Bewusst nicht gebaut (Grundfunktion, Feinschliff beim Design-Strang): eigener Verlauf je Modus, Gestaltung nach dem Manifest, Ausblenden von Modi je nach Online-/Offline-Betrieb. Dafür wäre ein Merkmal je Modus nötig (zum Beispiel `online: true/false`), das erst mit der Anbieterschicht (Schritt 3) und der Abgrenzung durch den Entwickler festgelegt wird.
- Tests: 26 Seitentests grün (neu: Leiste, Wechsel, Sprache, Neuladen, Sperre während der Antwort). Nur simuliert, Screenshot bei 426 × 803 px geprüft.

## 10.11.2026 – Korrektur nach Handytest: Absturz beim Moduswechsel, Audit-Kontext (Chat „AIUIheinz-Chat“, nur `chat.html`)
- Beobachtung des Entwicklers: Nach Wilson (gemma2:2b), Heinz (heinz-fakt) und Audit (qwen2.5:3b) in wenigen Minuten sprang der Statuspunkt auf Rot, alle Termux-Sitzungen waren weg (Android hat Termux beendet), die Audit-Anfrage endete mit „Failed to fetch“.
- Wahrscheinliche Ursache (nicht gemessen): Das Vorladen mit `keep_alive` 30 m ließ jedes besuchte Modell im Arbeitsspeicher; drei Modelle mit Kontext 11264 gleichzeitig reichen auf dem Handy offenbar für den Speicherdruck. Von mir mit dem Vorladen eingeführt.
- Fix: Vor Vorladen und vor jeder Anfrage entlädt die Seite alle anderen geladenen Modelle (`/api/ps`, `/api/generate` mit `keep_alive:0`, `unloadOthers`). Zusätzlich für Ollama selbst: `OLLAMA_MAX_LOADED_MODELS=1` vor dem Start setzen (nicht in `start.sh` eingebaut, Fundament).
- Audit: Die erste Anfrage mit Kontext im Nutzertext (Änderung „Kontext ans Nachrichtenende“) beantwortete qwen2.5:3b zweimal mit „Information not in context.“, obwohl 230 Zeichen Kontext da waren. Modi mit Pflicht-Kontext (`ctxInSystem`, bisher nur Audit) legen den Kontext deshalb wieder in die Systemnachricht; die übrigen Modi behalten ihn in der Nutzernachricht. Ursache nicht abschließend belegt (ein Fall).
- Tests: 27 Seitentests grün (neu: nur das gewählte Modell bleibt geladen; Audit-Kontext im System). Nur simuliert.

## 10.11.2026 – Chats je Modus (Chat „AIUIheinz-Chat“, nur `chat.html`)
- Fehler gefunden (Beobachtung des Entwicklers: gespeicherte Chats landen im „falschen“ Modus): Beim Moduswechsel wurde der alte Chat erst gespeichert, nachdem `settings.mode` und `settings.model` schon auf den neuen Modus gestellt waren, und trug dadurch Modus und Modell des neuen. Jetzt wird zuerst gespeichert, dann umgestellt (`updateModeUI`). Bereits vorhandene Einträge in `heinz_chats` bleiben mit dem damals falschen Modus gespeichert.
- Neu: Die Liste „Chats“ zeigt standardmäßig nur die Chats des aktiven Modus; ein Knopf darunter schaltet auf alle Modi. Aus der vollen Liste geladen, springt die Seite in Modus und Modell des Chats (wie bisher).
- Tests: 28 Seitentests grün (neu: Liste je Modus, Sprung beim Laden; der Test schlug vor der Korrektur fehl). Nur simuliert.
- Offen (Idee des Entwicklers): einen Chat eines Modus bewusst in einem anderen Modus weiterführen; bisher geht das über Kopieren in das Kontextfeld.

## 10.11.2026 – Ampel folgt dem Zustand, Planung „Zwei Bereiche“ (Chat „AIUIheinz-Chat“, `chat.html`, `docs/GEPLANT.md`)
- Ampel neben „Heinz UI“: Rot = Ollama nicht erreichbar, Orange = Ollama läuft, das gewählte Modell ist nicht geladen, Grün = gewähltes Modell ist im Arbeitsspeicher (`/api/ps`). Fehler: Der Zustand wurde nur beim Start und bei Modus- oder Modellwechsel geprüft, deshalb blieb sie nach dem Laden Orange. Jetzt Prüfung auch nach dem Vorladen, nach jeder Antwort und alle 10 s.
- Tests: 29 Seitentests grün (neu: Grün, Orange, Rot). Nur simuliert.
- `docs/GEPLANT.md`: neuer Abschnitt „Zwei Bereiche“ (Bereich A Ausprobieren und Modelle, Bereich B schlanker Chat, offene Abgrenzung online/offline, Folgen für die nächsten Schritte). Zur Weitergabe an den Konzept-Chat; im Konzept selbst noch nicht eingearbeitet.

## 10.11.2026 – Anbieterschicht und Engine-Wahl (Chat „AIUIheinz-Chat“; berührt Fundament `lib/`, Freigabe des Entwicklers)
- Neu `lib/providers.js` (`HeinzProviders`): Anbieter als Daten (Ollama, LiteRT-LM, OpenRouter, Groq, Mistral, Custom), `models`, `chat` (Ollama NDJSON, OpenAI-Schnittstelle mit SSE), `ping`, `loaded`/`unload`, Schalter „Online erlauben“ (`heinz_online`, Standard aus), Schlüssel im Browser (`heinz_keys`), einheitliche Statistik. Sperre: Adresse außer localhost wird ohne den Haken vor dem Senden abgelehnt.
- `chat.html`: Menü „Engine“ (Auswahl, Backend CPU/GPU für LiteRT-LM, Adresse für Custom, Schlüssel, Modellname und „Modellliste laden“, Haken „Online erlauben“ mit Hinweis). Online-Engines erscheinen erst mit dem Haken; wird er ausgeschaltet, springt die Seite auf Ollama. Senden, Vorladen, Entladen, Ampel und Modellliste laufen über die Schicht. Ampel: Blau für Online-Engines (nie von selbst angefragt), Grün erreichbar für LiteRT-LM. Chats speichern die Engine; ein Online-Chat öffnet sich ohne „Online erlauben“ lokal. Threads, Eigener Systemprompt, Vorladen und Tempo-Test gelten nur bei Ollama (ausgegraut, Hinweis).
- Tests: 36 Seitentests grün (neu: Online aus, Sperre, LiteRT-LM mit Modellliste, GPU-Feld, Statistik und Ampel, Online-Engine mit Schlüssel und „nur der aktuelle Chat“, Fehlertexte 401, Custom lokal/remote, Tempo-Test nur Ollama, Stream ohne Nutzungsangabe als ungefähr markiert). Gegenprobe: ohne Sperre schlagen die Sperr-Tests fehl. **Nur simuliert**: weder LiteRT-LM auf dem Handy noch ein echter Online-Anbieter wurden angesprochen; CORS der Anbieter ist offen.
- Offen: LiteRT-LM auf dem Handy testen (`litert-lm serve --cors-origin http://localhost:3000`, `/v1/models`, Antwort, CPU/GPU über `model`, `system`-Nachricht und Parameter wirksam?); Tempo-Test für LiteRT-LM; Modellverwaltung (Bereich A); Online-Anbieter mit echtem Schlüssel; Limit-Anzeige; Proxy in `server.py` falls CORS blockiert.

## 10.11.2026 – Konzept auf den Stand nach Version 1.0 gebracht (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md`: Kopfzeile verweist auf den neuen Abschnitt 15; Abschnitt 12 mit Stand je Schritt (✔ ◐ ○); Abschnitt 13 nachgeführt; neuer Abschnitt 15 (was gebaut ist, Abweichungen vom Entwurf, Zwei Bereiche A/B, Befunde seit Abschnitt 14, Strangstand, offene Punkte). Abschnitt 4 gilt als überholt und wird mit dem Design-Konzept neu gefasst.
- `docs/GEPLANT.md`: Hinweis „im Konzept noch nicht eingearbeitet“ ersetzt.
- Grundlage: `ENTWICKLUNGSVERLAUF.md`, `STAND.md`, `docs/GEPLANT.md`, Code bei Commit `1c265ce`; Tests 20 Server und 36 Seiten grün (selbst gelaufen, simuliert).

## 10.11.2026 – Design-Fundament und Umbau der Chat-Seite (Chat „AIUIheinz-Design“; Fundament `lib/`, `chat.html`, `docs/DESIGN.md`, Tests)
- Anlass: Kritik des Entwicklers an der Chat-Seite nach Screenshots (Kontextfeld mit Prompt verwechselt, umbrechende Zähler, Senden zu dominant, Kopfzeile und Burger-Menü überladen, Modellauswahl mit Gehirn-Emoji). Entwurf als klickbares Mockup besprochen, danach ausdrücklicher Auftrag zum Umbau.
- Neu `lib/icons.svg`: eigener Symbolsatz (47 Linien-Symbole, 24 × 24, Strich 1,8, `currentColor`), inklusive der fünf Modi und des Heinz-Zeichens.
- `lib/core.css` neu: Variablen für Dunkel, Hell und Auto (`data-theme`), Rand über `--ol`, Statusfarben, Schriftvariablen; Bausteine `.i .caps .pill .round .ibtn .ring-btn .lang-btn .sw .row .tile .sheet .scrim .slidercard`. Hub und Platzhalterseiten nutzen nun Variablen statt fester Grautöne und laufen in beiden Themes (noch altes Layout).
- `lib/core.js`: `Heinz.theme/setTheme/applyTheme` (Schlüssel `heinz_settings.theme`, wirkt beim Laden), `Heinz.icon()`.
- `chat.html` neu aufgebaut, Logik (Parser, Modi, Anbieterschicht, Vorladen, Tempo-Test, Update, Chats) unverändert übernommen: Kopfzeile mit Statusring (rot/orange/blau/grün), zweizeiligem Modellchip, EN/DE und Burger; Modusleiste mit Symbolen und Modusfarbe als einziger Akzent; Chatleiste (Chatliste mit Zähler, Titel, Kopieren, Neu); Antworten in Georgia ohne Kasten; Metrik-Chips in einer Zeile; wachsendes Prompt-Feld (bis 40 %, Vollbild-Editor) mit Mikrofon und Pfeil; Vorlesen/Stopp getrennt (Vorlesen wird „Vorlesen stoppen“); Kontextkarte unter dem Prompt, nur in Modi mit Kontext; Menü als Bottom-Sheet mit Schnellschaltern, Gruppen und Unterseiten (Engine, Parameter, Tempo-Test, Darstellung, Update und Info); Modellwahl als Sheet ohne Emoji; Chatliste als Drawer von links mit Suche, „Dieser Modus | Alle“ und Löschen im ⋯-Menü; Hell/Dunkel/Auto; bei wenig Platz und Fokus im Prompt Platz für den Chat (`body.kbd`). Alle neuen Texte EN und DE, Emojis aus der Oberfläche entfernt.
- Tests: 49 Seitentests und 20 Servertests grün (selbst gelaufen, simuliert). Bestehende Tests an das neue Layout angepasst (Hilfen `menu()`, `set_model()`, `set_free_model()`); neu: Kopfzeile in einer Zeile, Modellwahl, Metrik-Chips eine Zeile und wachsendes Prompt, Kontextkarte unter dem Prompt, Modusfarbe als Akzent, Themes (auch Auto hell), Menüseiten und Sprache, EN/DE bleibt im Chat, Chat-Drawer, Vorlesen-Schalter, alle Symbole vorhanden und kein Emoji, kurzer Viewport mit Tastatur. Screenshots bei 426 × 803 und 426 × 400 geprüft. Nicht auf dem Handy getestet.
- Entscheidungen des Entwicklers (in `docs/DESIGN.md`): drei Bereiche mit teils eigenen Menüs plus gemeinsame Rubrik „Einstellungen“; EN/DE bleibt in der Chat-Kopfzeile; Hell mit denselben dünnen Linien, im Dunkel teils Umrisse, möglichst wenige Linien; Systemschriften, besondere Schriften nur lokal im Repo; Online ändert Menü und Design.
- Geändert: `chat.html`, `lib/core.css`, `lib/core.js`, `lib/icons.svg` (neu), `docs/DESIGN.md`, `tests/test_pages.py`, `UEBERGABE.md`.
- Offen: Handytest (Eingabe mit Tastatur, Mikrofon, Vorlesen, Wischen im Drawer, Splitscreen); Beispielseite `tools/design/index.html`; Hub im neuen Stil; Zuschnitt und Namen der drei Bereiche; Lesemodus in warmer Serife; Werkzeuge mit Online-Sperre; Sprache der Oberfläche im Menü „Einstellungen“; Auswahl eines Modells für ein Nicht-Ollama-Engine ohne Liste nur im Menü Engine (Eingabefeld dort).

## 10.11.2026 – Design-Beispielseite (Strang AIUIheinz-Design)
- Neu `tools/design/index.html`: Katalog der Bausteine (Farben, Schrift, Knöpfe, Statusring, Zeilen/Schalter, Regler-Karte, alle Symbole, Bottom-Sheet) mit Umschalter Auto/Hell/Dunkel und EN/DE. Nur `lib/core.css`, `lib/core.js`, `lib/icons.svg`; kein `tool.json`, deshalb nicht im Hub.
- Test `test_design_page_blocks_symbols_theme_and_language`, Seite in `PAGES` (kein Fehler, keine externe Anfrage). 50 Seitentests grün (simuliert, nicht auf dem Handy).
- Konzept 15.3 (zwei Bereiche) und DESIGN.md (drei Bereiche) widersprechen sich; Abgleich mit dem Entwickler offen.

## 10.11.2026 – Hub im neuen Muster (Strang AIUIheinz-Design)
- `index.html` neu: Kopfzeile mit Statusring (rot/blau/grün nach Ollama), Titel, Theme-Knopf (Auto→Dunkel→Hell), EN/DE; zwei Bereichspillen **Chat & Modelle** und **Tools**; Werkzeuge als Zeilen mit Symbol statt Emoji-Kacheln; „Alte Versionen“ im Bereich Chat; Engine-Status unten. Auswahl in `heinz_hub.area`.
- `tool.json` bekommt `area` und `symbol`; `server.py` reicht beide Schlüssel in `/api/tools` durch (TOOL_KEYS). Alle sechs `tool.json` ergänzt.
- Tests: `test_hub_areas_switch_and_persist`, `test_hub_theme_button_cycles`; 51 Seiten- und 20 Servertests grün (simuliert, nicht auf dem Handy).

## 10.11.2026 – Pixeldisplay und Hub als Visitenkarte (Strang AIUIheinz-Design)
- Neu `lib/pixel.js`: LED-Matrix-Display (5×7-Schrift, Laufschrift, Lampen, Balken, Linie), Katalog in `tools/design/index.html`.
- Hub: Pixeldisplay mit Ollama/LiteRT-LM direkt unter der Kopfzeile (ersetzt die Statuszeilen; unsichtbarer Text für Screenreader und Tests), Bereiche als Reiter „Chats & Modelle“ / „Tools“, Tools als App-Drawer (Kacheln, `appicon` möglich), Chat-Eintrag heißt „Heinz UI“ (Arbeitsname), Slogan in Georgia kursiv, Fußzeile „Offline first“. `server.py` reicht `appicon` durch.
- Tests angepasst (51 Seiten-, 20 Servertests grün, simuliert; nicht auf dem Handy).


## 10.11.2026 – Konzept auf drei Bereiche und den Stand nach dem Design-Strang gebracht (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md`: Abschnitt 15 neu gefasst. 15.1 (was es gibt: Design-Fundament, neuer Hub mit Reitern und Pixeldisplay, neuer Chat, Anbieterschicht, Server), 15.2 (Abweichungen: Themes statt Einheitsschwarz, Symbolsatz, keine untere Leiste), 15.3 (drei Bereiche A, B, C; im Hub zwei Reiter), 15.5 (Strangstand), 15.6 (offene Punkte, neu: Handytest der Design-Umbauten, Tools im Hub). Abschnitt 12 mit aktuellem Stand je Schritt.
- Zuschnitt der drei Bereiche ist meine Ableitung aus `docs/DESIGN.md` und `docs/GEPLANT.md`; Namen und Zuordnung sind laut Design-Strang offen und gehören dem Entwickler.
- Grundlage: Commit `a86ff2e`; selbst gelaufen: 20 Server- und 51 Seitentests grün (simuliert).

## 10.11.2026 – Konzept: Begründung A/B, Hub-Chat, KI-Werkzeuge (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` 15.3: A und B sind in `chat.html` mit Absicht in einer Seite (Parameter und Modell beim Chatten ändern); Trennung keine Pflicht. Ob ein schlanker Chat im Hub zusätzlich nötig ist, ist ein Designthema und entfällt, wenn der vorhandene Chat aufgeräumt genug wird. Zweck des Testfelds (Modelle und Schnittstellen kennenlernen) ergänzt.
- Neuer Abschnitt 16: Leitbild „Werkzeuge, bei denen KI die Bedienung leichter macht“ mit dem INCIheinz-Beispiel (Notizzettel einlesen, Rezept mit Phasen, Ausgabe in Formaten), Merkmalen eines guten Kandidaten und der Liste der bisher genannten Kandidaten. Keine Änderung an der Umsetzungsreihenfolge.

## 10.11.2026 – Pixeldisplays im Chat, Hub-Lauftext mit Ampelmännchen (Strang AIUIheinz-Design)
- `lib/pixel.js`: Endlos-Lauftext (`loop`), Segmente mit Farben, `sprite`, `bar`, `run(draw,{live})` mit `wake()` (Schleife läuft nur bei Bewegung, pausiert bei verstecktem Tab), Sprites `SPRITES.stop/walk`.
- Hub: Anzeige vor der Rubrik mit Ampelmännchen + Lauftext je Bereich (ersetzt die zwei Zeilen unter der Kopfzeile).
- Chat: Modellchip als Pixeldisplay (Modus · Engine, Modell) mit Token-Puls (`pulse.e` wird in `onDelta` angehoben), Tempo-Test mit Balken je Lauf und Fortschritt, Update-Seite mit Lichtlauf/Balken. Fallstrick: die Klasse `.sr` ist in `chat.html` schon der Modus-Punkt der Chatliste, der unsichtbare Chip-Text heißt deshalb `.chip .hid`.
- Tests: 52 Seiten-, 20 Servertests grün (simuliert; Aussehen und Laufschrift auf dem Handy offen).

## 10.11.2026 – Rückbau von Pixeldisplays, Menüanalyse (Strang AIUIheinz-Design)
- Nach dem Handytest entfernt: Pixeldisplay im Hub (Lauftext, Ampelmännchen), im Tempo-Test und auf der Update-Seite. Der Modellchip im Chat mit Token-Puls bleibt. `lib/pixel.js` und der Katalog bleiben.
- Neu `docs/ANALYSE_MENUE.md`: Menüstruktur aus Sicht des Anwenders (Engine vor Modell, Online-Schalter, Parameter-Schnellzugriff, Farblogik, Chat-Titelzeile). Nur Analyse, nichts umgebaut.
- Tests: 52 Seiten-, 20 Servertests grün (simuliert).


## 10.11.2026 – Korrektur: Cloud-Antworten brachen ab, Modellliste uneinheitlich (Chat „AIUIheinz-Fix-Cloud“)
- Handytest (Google AI Studio über eigenen Endpunkt): Antworten wurden von Frage zu Frage kürzer und endeten mitten im Wort; die Modellliste war mal 5, mal 15 Einträge lang.
- Ursache Abbruch: nicht auf dem Gerät belegt. Wahrscheinlichster Grund laut Googles Dokumentation und Forum: Gemini-Modelle denken, und die Denk-Token zählen zur Token-Grenze (`max_tokens`). Die Seite sendet die Grenze nur im Schnellmodus (Standard 150), dort frisst das Denken die Antwort auf. Zweiter Verdächtiger: Gemini 3 empfiehlt Temperatur 1.0; die Modi senden 0.15 und top_p 0.30 (Google warnt vor Schleifen und schwächeren Antworten).
- Geändert (`lib/providers.js`): `chatOpenAI` liefert `stats.finishReason` (`stop`/`length`) und `stats.reasoningTokens`. (`chat.html`): bei `length` steht unter der Antwort ein Hinweis (EN/DE), nicht im Verlauf gespeichert; bei leerer Antwort und `length` statt „Keine Antwort“.
- Ursache Modellliste: mehrere Abrufe liefen gleichzeitig (Engine-Wechsel, Schlüssel-Feld, Knopf), der langsamere, ältere überschrieb den neueren. `loadModels` zählt jetzt Abrufe, bricht den alten ab, nur der jüngste gilt; Status „Modellliste wird geladen…“ und „geladen: n Einträge“.
- Tests: 2 neue (Abbruchhinweis, jüngster Abruf gewinnt), beide ohne Korrektur rot (Mutationsprüfung). 54 Seiten-, 20 Servertests grün (simuliert, nicht auf dem Handy; echtes Gemini nicht erreichbar).


## 2026-11-10 · AIUIheinz-Design · Einstellungen als Panel (Stufe 2)
- `chat.html`: Einstellungen als Panel von rechts (ca. 2/3 Breite, Tippen links schließt). Oben Schnellbereich "Jetzt": Reload-Kreis (aus dem Update-Menü hierher verschoben), Engine (gesperrte Online-Engines mit Schloss, Tippen → "Online erlauben?"), Modell, Parameter inkl. Threads mit "geändert"-Punkt, Zurück / Als Modell-Standard speichern / Werte kopieren (`settings.modelParams[provider|model]`).
- Rubriken: Gespräche, Antwort, Leistung, Verbindung, Datenschutz, App, je mit Geltungsbereich. Seite "Parameter" entfällt.
- Update-Seite: kleine LED-Zeile (Raster 2 px, 3x5-Schrift, dünner Balken) mit Zuständen prüfen/neu starten/fertig/aktuell/Fehler.
- Tests angepasst (54 + 20 grün, simuliert; nicht auf dem Handy geprüft).

## 2026-11-10 · AIUIheinz-Design · Ampel, Chat-Name, Equalizer (nach Handytest)
- Ring bei Cloud-Engines: rot (Online aus oder Schlüssel fehlt), grün (bereit, nichts wird vor dem Senden übertragen); beim Warten auf das erste Token orange, beim Antworten grün.
- Chat-Name in der Infozeile: Label "CHAT" in Modusfarbe, Titel fett, Haarlinien links/rechts als Abgrenzung.
- Equalizer (6 Balken) sitzt links unter dem Heinz-UI-Ring, der Statustext läuft rechtsbündig bis zum Rand.
- Tests angepasst (54 + 20 grün, simuliert).

## 2026-11-10 · AIUIheinz-Design · Statuszeile und Panel-Reihenfolge (nach Handytest)
- Statustext linksbündig unter dem Ring (gehört zum Ring), Equalizer rechts als kleines Rechteck (5 Balken, Rahmen, etwa Breite der Menü-Taste).
- Einstellungs-Panel: keine Symbole vor den Einträgen, Beschreibungen der Schalter ausgeblendet (kompakter). Reihenfolge: Engine, Modell, Parameter, Standardwerte, eigener Systemprompt, Schnellmodus, "Max. Antwort-Token" (ausklappbar), darunter Gespräche, Leistung, Verbindung, Datenschutz, App.
- Tests grün (54 + 20, simuliert).

## 2026-11-10 · AIUIheinz-Design · Einstellungen nach Skizze
- Kopf: Reload-Kreis links, Titel mittig, X rechts; auf der Update-Seite sitzt dort eine kleine Pille "UPDATE" (kein Symbol), die LED-Zeile zeigt die Version zentriert.
- Hauptseite: große Buttons "Engine" und "Modell" mit kleiner Info darunter. Engine öffnet eine eigene Seite mit Engine-Liste (Hinweise bleiben, Schloss = nicht verfügbar) und Verbindungsdetails darunter. Modell öffnet die Modellliste.
- Parameter-Fenster (abgesetzt): Standardwerte, kompakte Ein-Zeilen-Regler (Temp, Top-P, Top-K, Kontext, Threads), Reset/Speichern/Werte kopieren. Danach Gruppe Eigener Systemprompt, Schnellmodus, Max. Antwort-Token (ausklappbar). Danach Leistung, Datenschutz, App.
- Rubrik "Chats" aus den Einstellungen entfernt (Verwaltung über die Chat-Liste links).
- Equalizer: Pillenform (4 Balken) etwa unter der Menü-Taste; feste Farben: grün = Antwort (Pegel), orange = Denken (Welle) / Laden (Lichtlauf), rot = offline.
- App-Höhe: `height:100%` mit `max-height:100dvh` statt `100dvh` (Eingabezeile war auf dem Handy nach unten verrutscht, vermutlich dvh-Abweichung; nicht auf dem Gerät bestätigt).

## 2026-11-10 · AIUIheinz-Design · Feinschliff nach Handytest (14:10)
- Laufdisplay: Engine blau (#8ab4f8), Modell gelb (#fdd663), unabhängig vom Modus; die Buttons Engine/Modell im Einstellungs-Panel tragen dieselben Farben (zweizeilig: Label + aktueller Wert, 78 % Breite, zentriert).
- Kopfzeile: Laufdisplay, Sprachschalter (fast runde Segmente) und Menü-Taste 44 px hoch; Equalizer-Pille so breit wie Sprachschalter + Menü-Taste (Balkenzahl nach Breite), Statustext mit Abstand davor.
- Lesen/Stopp: beide Buttons immer sichtbar unter der Eingabe, je nach Zustand deaktiviert (Stopp nur beim Antworten, Vorlesen nur mit Ausgabe).
- Prompt mehrzeilig: Text läuft volle Breite, Mikro/Senden klein darunter rechts, Vollbild-Symbol oben rechts (Klasse `.multi`).
- Scrollen: der Chat folgt der Live-Ausgabe nur, solange nicht nach oben gescrollt wurde; Pfeil-Button (`#jump-bottom`) springt ans Ende.
- Antwort-Aktionen (Kopieren, Teilen wenn vom Browser unterstützt, Markdown herunterladen) unter jeder Modellantwort; Kopierbutton der eigenen Eingabe bleibt rechts am Modul.
- Update-Seite: Pille UPDATE und LED-Zeile mittig, 78 % Breite; LED-Text links, vertikal mittig.
- API-Schlüssel-Feld: `type=text` mit `-webkit-text-security` und Autofill-Sperrattributen, damit Android den Passwort-Manager nicht anbietet (nicht auf dem Gerät bestätigt).
- Neuer Test für Scrollverhalten und Aktionsleiste; Tests 55 + 20 grün (simuliert).

## 2026-11-10 · AIUIheinz-Design · Chat umbenennen, Pins, Equalizer-Modi, Typografie
- Chat-Titelzeile: Bearbeiten-Symbol, Umbenennen direkt in der Zeile (`currentName`, im gespeicherten Chat als `name`/`title`). Zeile jetzt fast schwarz mit dezent leuchtender Outline (Modusfarbe); die Linie unter der Modusleiste entfällt.
- Chat-Liste, Drei-Punkte-Menü: Umbenennen (inline), Anpinnen/Lösen (max. 5, Pins stehen oben, Pin-Symbol), Exportieren (.md), Löschen.
- Equalizer-Modi: Antwort/Vorlesen = Pegel (grün); Warten auf erstes Token = zuckender horizontaler Balken (orange); Laden/Verbindung = laufende Wählpunkte (orange); sonst Grundlinie in Statusfarbe.
- Engine-/Modell-Buttons als Pillen mit gleichen Abständen; Update-LED-Zeile mittig in Buttonbreite (`.led.updled`).
- Überschriften und Tabellen der Modellantwort in Serifen.
- Test für Umbenennen und Pin-Limit; Tests 56 + 20 (simuliert).

## 2026-11-10 · AIUIheinz-Design · Feinschliff 15:10
- Chat-Liste: Pin-Symbol vorangestellt, dünne Trennlinie unter dem Pin-Bereich; neue Option "Chat kopieren" im Drei-Punkte-Menü.
- Eingabe: Schrift 1.1 rem; Fenster expandiert, sobald die zweite Zeile umbricht (Zeilenhöhe aus Computed Style), bleibt dann expandiert.
- Equalizer: Laden/Verbindung = blaue Wählpunkte, Arbeiten = orangefarbener Balken, Antwort = grüner Pegel.
- Statuszeile: kleine LED in Statusfarbe vor dem Text (Variante A), Text mit Abstand zum Equalizer.
- Engine-/Modell-Pillen schlanker (50 px, 74 %) mit viel Schwarzraum und dezentem Glow; UPDATE-Pille gleicher Glow.
- Kopfzeile: Abstände um Sprachschalter angeglichen (Menü-Taste schmaler, rückt näher).

## 2026-11-10 – AIUIheinz-Design: Korrekturen Gruppe 1 (15:45-Meldung)
- LED-Punkte kleiner und schärfer (Raster, Zeichen- und Zellgröße unverändert): `Pixel` Punkt = 0,55 × Raster, Glow halbiert.
- Stopp: runder Knopf mit Quadrat ersetzt den Sendeknopf nur während der Ausgabe; Vorlesen als Symbol in der Aktionszeile unter der letzten Antwort. Die Zeile unter dem Eingabefeld entfällt.
- Farblogik: rot/orange = fehlende Verbindung/Information (Ollama ohne geladenes Modell: orange), blau = bereit und „denkt“ (Balken blau), grün nur beim Antworten. Cloud bereit = blau. Wählpunkte beim Vorbereiten orange. Keine Symbole mehr in den Statustexten.
- Ring-Button mit dunklem Rahmen wie die Equalizer-Pille; Update-LED über die volle Breite; Chatleiste enger, „Neuer Chat“ abgesetzt mit Hintergrund.
- Fehler behoben: Modellliste zeigte bei fremder Engine Ollama-Modelle (`modelsFor` merkt die Engine der Liste).
- Nicht auf dem Gerät getestet (nur Playwright, simulierter Server).
- Geplant (nicht gebaut): Modell-Standard vs. eigene Werte, App-Sicherung unter App → Info/Sicherung/Update, Prompt-Verwaltung (Prompt-Bibliothek: benannte Systemprompts, Auswahl je Modus/Chat, Schnellwahl, Export/Import) erst viel später.

## 2026-11-10 – AIUIheinz-Design: Kosmetik 16:15
- Sprachschalter oben grau (keine Modusfarbe). Chatmenü: fünf Symbol-Pillen in einer Zeile (Titel als Tooltip).
- Engine-/Modell-/Update-Pille identisch: 62 % Breite, kleinere Schrift, weicherer Glow. Ring-Fassung grauer (2 px #3c4043).
- Update-LED mit 5×7-Schrift (2 Pixel Rand oben/unten bei 11 Zeilen).
- Antwortsprache strikt: Systemprompt „strikt Englisch/Deutsch, auch bei fremdsprachiger Eingabe“. Sprachwechsel lädt das Modell neu (Preload, Prompt ändert sich) – bewusst.
- Nicht auf dem Gerät getestet.

## 10.11.2026 – Konzept: Release Candidate (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` Abschnitt 17: Stand des Release Candidate (Commit 036ff46) mit Aufbau, Farblogik, Handy-Messung des Tempo-Tests (qwen2.5:3b, 2 Threads am schnellsten) und offenen Punkten; Hub- und Chat-Beschreibung in 15.1 angepasst.
- `UEBERGABE.md`: Zeile „Designregeln“ verweist auf `docs/DESIGN.md` (Themes statt „schwarz und Google-Farben“), Designer-Fallstricke ergänzt. `docs/OLLAMA_UND_MODELLE.md`: Messung ergänzt.
## 2026-11-10 – AIUIheinz-Design: Korrekturen 16:50
- Eingabezeile: App-Höhe wird per JS aus `visualViewport` gesetzt (`--appH`, bei Laden, resize, pageshow und nach 0,15–2,5 s), unten 6 px Abstand. Ursache vermutet: falsche Viewport-Höhe direkt nach Laden/Update (nur simuliert geprüft, nicht auf dem Gerät).
- Heinz-UI-Logo im Ring als Pixelschrift (Canvas, 3×5-Schrift); Ring 52 px, Linie 2 px.
- Parameter-Fenster mit Reitern Parameter | Prompts (Platzhalter). Umschalter „Modell-Standard | Meine Werte“ ersetzt den Haken; bei Modell-Standard sind die Regler gesperrt; Speichern gilt je Modell und wird bei „Meine Werte“ automatisch geladen.
- Statustext: Tipp zeigt den vollen Text (8 s). „Modellliste geladen“ öffnet die Modellliste. Papierkorb-Pille invertiert. Erste Nachricht mehr Abstand, Modusnamen größer, Speedtest-Zeilen farbig.
- Antwortsprache wieder wie vorher („Respond in English.“), keine Verschärfung.

## 2026-11-10 – AIUIheinz-Design: Korrekturen 17:30
- Status gelb = Handshake offen (Cloud/eigene Engine, Modellliste noch nicht geladen), blau = bestätigt. Equalizer: blau = langsamer Ping, gelb = langsames Blinken. Vorladen gibt es weiter nur lokal.
- Heinz-UI-Logo als Strichschrift (SVG, 1,3 Einheiten dick), Ring-Fassung dünner. Segment Modell-Standard/Meine Werte schaltet sofort. Punkt vor dem aktiven Reiter; Reset heißt „Zurücksetzen“.
- „Modellliste laden“ nur, bis eine Liste da ist; danach ist die Statuszeile (unterstrichen) der Zugang. Statustext oben klappt per Tipp mehrzeilig auf, ohne den Equalizer zu verschieben.
- Tempo-Test: Termux-Haken statt Auswahl (Standard im Hintergrund), bei Cloud-Engines komplett ausgegraut; Zeilenfarbe je Thread-Zahl (beide Läufe gleich).
- Sprachschalter kleiner, Modus-Zeile 6 px tiefer. Nicht auf dem Gerät getestet.

## 2026-11-10 – AIUIheinz-Design: Korrekturen 18:00 + Sicherung
- Zoom-Fehler (Seite sprang nach Doppeltipp auf den Statustext stark vergrößert): `touch-action: manipulation`, `--appH` rechnet `visualViewport.scale` ein.
- Logo: Strichschrift mit abgeflachten Ecken (bevel/butt), „I“ nur ein Strich, mehr Abstand, per SVG exakt mittig. Ring-Fassung zweifarbig (dunkel außen, hell innen wie die LED-Pille), Abstand zum Leuchtring kleiner.
- Equalizer pulsiert nur bei sichtbarer App. Reiter-Punkt nur vor dem aktiven Reiter (orange Punkt entfernt), Knopf „Reset“. Engine-Liste: „Schlüssel vorhanden“. Sprachschalter 34 px hoch.
- Neu: App-Sicherung (Export/Import als JSON, Schlüssel nur auf Wunsch) unter Menü → Info, Sicherung, Update. Test: Rundlauf.
- Geplant: mehrere eigene OpenAI-kompatible Engines (Server + Schlüssel je Eintrag) – heute gibt es nur einen „custom“-Platz.
- Nicht auf dem Gerät getestet.

## 2026-11-10 – AIUIheinz-Design: Parameter in drei Ansichten (19:20)
- Parameter-Quellen getrennt: **Modell** (`/api/show` bzw. Ollama-Standard, gesperrt, es wird nichts gesendet), **Modus** (Vorgabe, gesperrt, wird gesendet), **Meine** (frei, Speichern/Reset nur hier). „Meine Werte“ gelten je Modell UND Modus (`modelParams["engine|modell|modus"]`, alte Schlüssel ohne Modus gelten als Rückfall); die Wahl der Ansicht merkt sich `paramSrcBy` je Schlüssel, vorhandene eigene Werte werden automatisch geladen.
- Fehler behoben: `modelParams` wurde beim Start nicht aus dem Speicher gelesen, gespeicherte Werte waren nach dem Neuladen weg.
- Reset/Speichern leuchten in der Auszeichnungsfarbe, wenn bedienbar. Hinweistext nennt Ziel (Modell · Modus).
- Aktionszeile unter der Antwort erst nach Ende der Ausgabe. Chatliste scrollt beim Öffnen der Symbolzeile; „Alle · N“ zeigt die Gesamtzahl. Logo als serifenlose Schrift. Equalizer antippbar: letzte drei Statusschritte.
- Nicht auf dem Gerät getestet.

## 2026-11-10 – AIUIheinz-Design: Prompts, Tiles, Korrekturen (19:50)
- Fehler: Die Klasse `full` des Statustexts kollidierte mit der Vollbild-Klasse `.full` (position: fixed, inset 0) – deshalb schwarze Seite beim Antippen. Umbenannt in `st-open`; Test sichert, dass Kopfzeile und Eingabe unverändert bleiben.
- Reiter „Prompts“: Quelle Modus | Modell | Meine (`settings.sysSrc`; „Modell“ = kein Systemprompt, wie das frühere „eigener Systemprompt des Modells“). Ein eigener Prompt (`ownPrompt`) wird wörtlich gesendet (im Schnellmodus plus Kurzantwort-Hinweis), ist kopierbar; „Kopie bearbeiten“ übernimmt den Modus-Prompt. Der Schalter „Eigener Systemprompt“ im Menü wählt „Meine“, öffnet bei leerem Prompt den Editor. Eingaben des Nutzers lassen sich weiter pro Nachricht kopieren.
- Tempo-Test: Thread-Auswahl als Kacheln mit Glow (violett = schneller Kern, blau = mittlere, grün = langsame), Kernkarte „Pixel 9 Pro: 1+3+4“. Gerätelisten später.
- Logo-Fassung dünner (1+1 px), Chatliste fährt Aktionen weiter ins Bild.
- Nicht auf dem Gerät getestet.

## 2026-11-10 – AIUIheinz-Design: Nur Modus-Vorgaben, Threads je Modell (20:30)
- Schalter „Eigener Systemprompt“ entfernt (der Reiter Prompts → Quelle „Modell“ deckt es ab). Neu: Schalter „Nur Modus-Vorgaben“ (`settings.modesOnly`): Prompt und Werte kommen allein aus dem Modus; eigene Werte, eigener Prompt und Modell-Einstellungen werden ignoriert, Auswahl-Knöpfe gesperrt. Threads bleiben Modell-Einstellung und gelten immer.
- Threads als eigener Block „Threads · Modell“ unter den Parametern (je Modell gespeichert, in jedem Modus, auch bei „Nur Modus-Vorgaben“).
- Tempo-Test-Kacheln im Knicklicht-Look (hellgrün, hellblau, hellviolett). Die Farben sind nur Hinweis auf die Kern-Cluster: der Test setzt nur die Thread-Zahl, der Android-Scheduler wählt die Kerne. Idee für später: Test auf bestimmte Kerne festnageln (z. B. `taskset` beim Start des Ollama-Servers durch `server.py`).
- Statuspunkt unter dem Ring zentriert, Logo-Text tiefer, Chatliste fährt Aktionen weiter ins Bild.
- Nicht auf dem Gerät getestet.

## 2026-11-10 (AIUIheinz-Design) – Chat-Liste, Schnellmodus-Kachel, Logo in lib/
- Chat-Liste: Ursache der abgeschnittenen Pillen war eine kaputte CSS-Regel (Scroll-Regel von `#saved-list` stand als ungueltiges `.saved-item { border-top flex:1 ...}`); Liste scrollt jetzt (flex, overflow, 150 px + Safe-Area Polster), Drawer-Hoehe folgt `--appH`, `revealRow` laeuft zweimal. Neuer Test.
- Einstellungen: "Nur Modus-Vorgaben" eigene Kachel; Schnellmodus + Max.-Antwort-Token (nur Schnellmodus, Standard 300) zusammen in einer Kachel.
- Speedtest-Kachel gruen: hellere, mildere Tuerkis-Mint-Toene (#b9f7d2).
- Logo/Metallring nach `lib/core.css` (`.ring-btn.metal`) und `lib/core.js` (`Heinz.ringLogo`), Werte in docs/DESIGN.md. Nur simuliert getestet (62+1 Seitentests, 20 Servertests), nicht auf dem Geraet.

## 2026-11-10 spaet (AIUIheinz-Design) – Design-Ueberarbeitung abgeschlossen
- Eigenes Auswahl-Popup statt Android-Liste (`Heinz.enhanceSelects`), Pillen der Chat-Liste 10 px tiefer.
- Tastatur: Kopfzeile gleitet weg; Kontextfeld einzeilig bis Fokus; Telemetrie In/Out mit Leistungsfarben (vorlaeufige Schwellen); eigene Modusfarben (Audit Sandgold, Creative Violett, getrennt vom Statusgelb).
- Tempo-Test: Balkenkarten, Tabelle klappbar, Uebernehmen-Button angeheftet.
- Neuer Auftrag fuer Folge-Chat: docs/AUFTRAG_Modi.md. Aufgeschobenes in docs/DESIGN.md. Nur simuliert getestet (67 Seitentests, 20 Servertests).
- Tempo-Test live: Balkenkarten stehen ab Start, laufender Balken bewegt sich mit Sekundenzaehler, Gesamtfortschritt oben; Pillen der Chat-Liste 20 px Abstand. DR1 abgeschlossen, DR2-Planung in docs/DESIGN.md.

## 10.11.2026 – Konzeptphase 2, Auftrag Modelle (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` Abschnitt 18: zwei Hub-Einträge (Heinz UI als Testumgebung, neuer schlanker Chat), Schnittstellenlücke bei Cloud-Anbietern, Grobplanung des Einrichtungsassistenten mit offenen Fragen; 15.3 verweist darauf.
- Neu `docs/AUFTRAG_Modelle.md` für den Strang „AIUIheinz-Modelle“ (Modellmanager). `docs/AUFTRAG_Modi.md` Punkt 3 mit Hinweis auf Abstimmung ergänzt.

## 10.11.2026 – Schnittstellen Google und LiteRT-LM (Chat „AIUIheinz-Modelle“, Phase 1, nur Dokumente)
- Neu `docs/SCHNITTSTELLEN.md`: Parameter-Matrix für Google AI Studio (kompatibel und nativ), Modellliste (`models.list` liefert `thinking`, `maxTemperature`, `topK`, Token-Grenzen), Denkstufen, LiteRT-LM serve (Endpunkte, Konfigurationsdatei, Einbettung), Gallery-Funktionen und ihre Erreichbarkeit, Sonden-Konzept. Jede Aussage mit Status belegt, Drittquelle, vermutet oder unbekannt.
- Wichtige Funde: Gemini 3.x: Temperatur bei 1,0 lassen, `frequency_`/`presencePenalty` ergeben laut Firebase-Referenz Fehler 400, Denken nicht abschaltbar, `thinking_level` und `thinking_budget` nicht zusammen. LiteRT-LM serve dokumentiert keinen einzigen Anfrageparameter; Sampling, Threads, Backend und Denken kommen aus `~/.litert-lm/config.json` je Modell-ID; `/v1/embeddings` existiert.
- `docs/MODELLQUELLEN.md`: Beschlüsse des Entwicklers (Datenschutzstufe als Hauptfilter, AI Horde zurückgestellt, Haltung) ergänzt.
- Nichts davon ist auf dem Gerät geprüft; die Sonde (Abschnitt 4) ist nur geplant. `lib/providers.js` blieb unberührt.
- (10.11.2026 abends, Strang Modelle) `docs/SCHNITTSTELLEN.md` Abschnitt 6: Beschlüsse des Entwicklers (Parameter je Schnittstelle ausgrauen, Modellvorgaben als Daten, Denken als ein Schalter, Token-Definition, NPU, Einbettung getrennt); `litert-lm serve --help` vom Handy (Host 127.0.0.1, `--config`, `--cors-origin`, Doku veraltet). Nur Dokumente.

## 10.11.2026 (nachts) – Fähigkeitendaten, Auftrag Chat, Konzept 19 (Chat „AIUIheinz-Modelle“)
- Neu `lib/capabilities.json` (nur Daten, Version 1): Zustände je Regler, Engine und Modell (`on`, `unknown`, `off`, `error`, `fixed`, `config`) mit Status der Quelle; Regeln für Gemini 3 (Temperatur 1,0 empfohlen, Penalties Fehler 400, Denken nicht abschaltbar) und Gemini 2.5; Denkstufen mit Schnell/Tief und `effortMap`; LiteRT-LM-Konfigurationsschlüssel; Token-Statistik-Definition. Neu `tests/test_capabilities.py` (6 Tests, mit Referenz-Auflöser), in `tests/run_all.sh` eingehängt.
- Neu `docs/AUFTRAG_Chat_Schnittstellen.md`: Auftrag für den Strang „AIUIheinz-Chat“ (Daten laden, Regler nach Zustand, Schnell/Tief über `reasoning_effort`, Token-Statistik, optional native Google-Modellliste, Export). Vorrang vor dem Denken-Teil von `AUFTRAG_Modi.md` (Entscheidung des Entwicklers).
- `docs/KONZEPT.md` Abschnitt 19 neu (Fähigkeiten als Daten, Denken, Token-Statistik, LiteRT-Konfiguration über `server.py`, Funktionsplätze, Wissensquellen mit Einbettung und Offline-Wikipedia, Reihenfolge, Offen); `docs/SCHNITTSTELLEN.md` Abschnitt 7.
- Kein Code der Seiten geändert; `lib/providers.js`, `chat.html` und `server.py` unberührt. Nichts auf dem Gerät geprüft.

## 10.11.2026 (abends) – Chat-Schnittstellen und Modellwahl je Engine (Chat „AIUIheinz-Chat“)
- Auftrag `docs/AUFTRAG_Chat_Schnittstellen.md` umgesetzt (Punkte 1 bis 4 und 6; Punkt 5, native Google-Modellliste, nicht gebaut). `lib/providers.js`: `HeinzCaps` (lädt `lib/capabilities.json` einmal, `cell`, `thinking`, gleiche Auflösung wie `tests/test_capabilities.py`; bei Ladefehler bleibt alles aktiv); `chatOpenAI` sendet `reasoning_effort`, Statistik jetzt mit `reasoningTokens`, `visibleTokens`, `totalTokens`, `tokensPerSecAll`, `source`.
- Chat: Regler nach Zustand. `unknown` normal mit Marke „unverified“ (Tippen zeigt den Hinweis), `off/error/fixed/config` ausgegraut, Tippen nennt den Grund, Wert wird nicht gesendet (Temperatur, top_p, top_k, num_ctx, stop, num_thread, Max.-Token). Empfehlung (Gemini 3: Temperatur 1,0) nur als Hinweis mit Knopf „Empfehlung übernehmen“, nie still gesetzt, Modusvorgaben unberührt.
- Denken: Schalter „Schnell | Tief“ im Chat nur bei Modellen mit `thinking`-Regel, Stufe je Engine und Modell gespeichert (`settings.thinkBy`), Standard = nichts senden; gesendet wird `reasoning_effort` (nie mit `thinking_level` oder `thinking_budget`).
- Kennzahlen: Denk-Token als eigener Chip, „~“ bei Schätzung, Tooltip mit beiden Geschwindigkeiten. `outputIncludesReasoning` ist unbekannt: nichts abgezogen, Export vermerkt „nicht vergleichbar“. Export (`paramsText`) um Zustand je Regler, Denkstufe und letzte Token-Werte ergänzt, nie Schlüssel.
- Modellwahl: „Einmal gewählt, bleibt gewählt“. `loadModels` ersetzt ein gewähltes Modell nie durch einen Listeneintrag; `switchProvider` speichert sofort (`persistCurrent`); `init` nimmt Engine und Modell als Paar. Ursache der abgeschnittenen Cloud-Antworten (Eintrag „Korrektur: Cloud-Antworten“ oben) vom Entwickler bestätigt: der Schnellmodus mit 150 Token.
- Tests: 7 neue Seitentests (gesperrte Regler grau und nicht im Body, `reasoning_effort` ohne `thinking_level`, kein Schalter ohne Regel, `unknown` aktiv mit Marke, Empfehlung, Denk-Token, Ladefehler, Online aus, Modell bleibt) mit gegengeprüften Gegenfällen; zwei Mutationen erkannt. Nur simuliert, nicht auf dem Gerät geprüft.

## 11.11.2026 – Handytest Schnittstellen, native Google-Modellliste (Chat „AIUIheinz-Chat“)
- Handytest (Entwickler, Gemini 3.8 flash): Regler-Zustände, Hinweise, Schnell/Tief-Schalter und Modellwahl je Engine arbeiten wie gedacht. Messwerte in `docs/SCHNITTSTELLEN.md` 8.1.
- Fehler gefunden: „Schnell“ sendete `minimal`, Google lehnt das bei `gemini-3.8-flash` mit 400 ab. Neue Regel `gemini-3.8-flash` in `lib/capabilities.json` mit `fast: low`.
- Native Google-Modellliste (`lib/providers.js`, `models()` und `modelMeta()`): nur Chat-Modelle (`generateContent`), Limits und Denk-Flag im Modellblatt und Export, Schlüssel nur im Header, bei Fehler Meldung und kompatible Liste.
- T/s bei Antworten unter 5 Token nicht mehr berechnet (zeigte 333 T/s bei 2 Token), Anzeige „–“.
- Offen: `top_k` wird auf der kompatiblen Route nicht gesendet; native Anfrage (`generateContent`) wäre ein größerer Umbau der Anbieterschicht. Nur simuliert getestet.
- (11.11.2026 nachts) Schnell = `low` für alle Gemini-3-Flash-Versionen (Regel `gemini-3-flash`, eigene 3.8-Regel entfällt). Export enthält jetzt „Last request“ (Body ohne Schlüssel, ohne Nachrichtentext) und „Last response“ (rohes `usage`, finish, Chunks, Zeiten): damit sind Temperatur und Denk-Token-Meldung prüfbar. Gewollt und per Test festgehalten: Online aus fällt auf Ollama, Online an bleibt lokal.
- (11.11.2026) Denk-Token werden aus `total_tokens` abgeleitet, wenn die Engine keine `reasoning_tokens` meldet (Chip „Think“ mit `~`, `stats.reasoningDerived`); Messung in `docs/SCHNITTSTELLEN.md` 8.4. Neu `docs/HINWEIS_Konzept_Chat.md` für den Konzept-Agenten (native Chat-Anfrage als Schwerpunkt, Bilder, Export-Entwurf).
- (11.11.2026) Testprotokoll je Antwort: Knopf (Symbol Terminal) in der Aktionszeile jeder Antwort der Sitzung, Momentaufnahme zum Sendezeitpunkt (`paramsText()` + `capsStates()` + `exchangeText()`), auch bei Fehlern. „Werte kopieren“ heißt jetzt „Parameter kopieren“ mit Hilfetext und enthält nur Parameter und Modelfile. Das Protokoll wird nicht gespeichert (nur im Speicher der Sitzung), damit der Browser-Speicher nicht wächst.
- (11.11.2026) Regler-Layout: die Hinweiszeile unter einem Regler (`.cap-row`) lag per Gitter-Reihenfolge zwischen Name und Regler und machte Temperatur und Top-K winzig; jetzt `order: 5`, alle Regler gleich breit, Name vorn. Temperatur-Regler heißt „T°“. Export-Notiz: bei abgeleiteten Denk-Token „outputTokens exclude the thinking tokens“; `capabilities.json` gemini-compat `outputIncludesReasoning: no` (gemessen). Test `test_sliders_use_full_width_with_short_label_even_when_hints_are_shown` (Mutation erkannt).

## 11.11.2026 – Native Google-Chat-Anfrage (Chat „AIUIheinz-Chat“)
- Neue Engine `google` („Google AI Studio (native)“) mit `chatGemini` in `lib/providers.js`: `streamGenerateContent`, `topK`, `thinkingConfig` (Level oder Budget nach Modellregel), echte Denk-Token aus `thoughtsTokenCount`, Schlüssel nur im Header, Modellliste nativ (nur Chat-Modelle). Die Custom-Engine mit OpenAI-kompatibler Google-Adresse bleibt unverändert.
- `lib/capabilities.json`: Engine `google`, `modelRulesFrom` (Modellregeln gemeinsam mit `gemini-compat`), Endpunktregel der kompatiblen Route auf `…/v1beta/openai` verengt; `tests/test_capabilities.py` und `HeinzCaps.modelRule` angepasst. Testprotokoll zeigt statt Nachrichtentext nur Anzahlen (`[1 contents]`, `[system]`).
- Tests: 4 neue Seitentests (FakeGemini), Mutation (Level statt Budget) erkannt. Nur simuliert, nicht am Gerät geprüft.

## 11.11.2026 – Konzept 20 generative KI, Nachtrag Auftrag Modelle (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` Abschnitt 20: Funktionsplätze nach dem SIM-Prinzip, Fähigkeit statt Modellname bei Abkündigungen, Orte in der App (Chat zuerst, Einlesen, Bildstudio, Sprache), Heimserver-Engine, Sprache auf zwei Wegen mit Browser-Rückfall, Medienspeicher (IndexedDB), Datenschutz, Kennzeichnung, Reihenfolge; Video ausgeschlossen (ferne Version).
- `docs/AUFTRAG_Modelle.md`: Nachtrag mit sieben Aufgaben (Fähigkeitendaten um Ein- und Ausgabearten, Modellwechsel-Auflösung, Bild und Sprache bei Google, Kennzeichnung, Browser-Sprache, Heimserver, Medienspeicher).

## 11.11.2026 – Konzept 20: Prüfung lokaler Sprache, Reihenfolge Einlesen vor Bildstudio (Chat „AIUIheinz“, nur Dokumente)
- Beschlüsse des Entwicklers eingetragen: Einlesen vor Bildstudio, IndexedDB-Medienspeicher, App prüft, ob Sprache lokal läuft, und weist sonst hin (Konzept 20.5); Auftrag Modelle Punkt 5 entsprechend ergänzt.

## 11.11.2026 – Handytest native Engine, Temperatur bis 2 (Chat „AIUIheinz-Chat“)
- Handytest (Entwickler, gemini-3.8-flash, nativ): HTTP 200 in Schnell und Tief; `thinkingLevel` in Kleinschreibung wird angenommen; Tief meldet `thoughtsTokenCount` 5679, Rechnung 76 + 153 + 5679 = 5908 geht auf, `candidatesTokenCount` enthält die Denk-Token also nicht (`outputIncludesReasoning: no` für `google`); bei Schnell fehlt `thoughtsTokenCount`. Erste Zeichen bei Tief nach 35,5 s, danach Burst (T/s bedeutungslos). `topK` 1 und 64 werden akzeptiert (200), Wirkung bei Gemini 3 noch offen (Prüfung mit Temperatur 2).
- Fehler: der Temperatur-Regler stand fest auf Maximum 1.0, der Entwickler konnte Temperatur 2 nicht einstellen. Neu `tempRange()` in `chat.html`: Obergrenze aus `maxTemperature` der Modellliste, sonst 2 bei Online-/Custom-Wegen, 1 bei lokalen Engines.
- Beschriftung: Hinweis unter dem Denken-Schalter und Testprotokoll nennen bei der nativen Engine `thinkingLevel`/`thinkingBudget` statt `reasoning_effort` (`thinkWire()`).
- Test `test_native_google_temperature_goes_up_to_two_while_local_engine_stays_at_one`. 90 Seitentests grün, nur simuliert.

## 11.11.2026 – Aufträge auf den Stand gebracht (Chat „AIUIheinz“, nur Dokumente)
- `docs/AUFTRAG_Modelle.md`, `docs/AUFTRAG_Chat_Schnittstellen.md`, `docs/AUFTRAG_Modi.md`, `docs/AUFTRAG_Tertius.md`: je ein Block „Stand 11.11.2026“ (erledigt, offen, Reihenfolge, Abstimmung). Modi: Reasoning und Schnell/Tief hat der Chat-Strang gebaut, Auftrag nicht ohne Rücksprache starten. Modelle: Medien-Nachtrag vorrangig. Chat: Aufgaben 1 bis 6 erledigt, nächste Schritte Anhänge und Medienspeicher.
- Im Projektordner (nur dort): `AUFTRAG_CHAT-SEITE.md` und `AUFTRAG_DESIGN.md` mit Stand-Block.
- (11.11.2026) top_k-Messung (Entwickler, gemini-3.8-flash, nativ, Temperatur 2, Top-P 1, „Schnell“, Frage „Nenne ein ungewöhnliches Tier“): mit topK 1 dreimal drei verschiedene Tiere (Blobfisch, Schnabeltier, Koboldmaki), mit topK 64 ebenfalls verschieden. topK wird zwar akzeptiert (HTTP 200), wirkt bei Gemini 3 aber nicht (bei topK 1 müssten die Antworten gleich sein). `lib/capabilities.json`: `top_k` bei `gemini-3-flash` auf `off` (belegt, gemessen, wird nicht gesendet); `gemini-3-pro` und `gemini-3-flash-lite` bleiben `unknown` mit Hinweis (nicht geprüft); Gemini 2.5 behält die Engine-Zelle (sendet topK). Tests angepasst, Gegenfall Gemini 2.5. 90 Seitentests und 7 Fähigkeitentests grün, nur simuliert.

## 11.11.2026 – Konzept 21 Testreihen (Chat „AIUIheinz“, nur Dokumente)
- `docs/KONZEPT.md` Abschnitt 21: automatisierte Parameterläufe in der Testumgebung. Beschluss des Entwicklers: erster Fall ein Modell mit vielen Parameterkombinationen, Auswertung zunächst nur durch Code, Hauptzweck ist der Export für den auswertenden Agenten. Bausteine, Betrieb (Bildschirm an, Termux sichtbar, Cloud-Obergrenze), Reihenfolge.
- `docs/AUFTRAG_Chat_Schnittstellen.md`: Schritt 1a (Testreihen) vor dem Anhang-Baustein.
