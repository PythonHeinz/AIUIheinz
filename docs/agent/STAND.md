# AIUIheinz – Stand

Projekt „Heinz UI“: Weboberfläche für lokale Modelle (Ollama in Termux, Pixel 9 Pro). Maßgeblich ist dieses Repo (GitHub PythonHeinz/AIUIheinz, Branch `main`); es gibt keine zweite Ablage am PC. Begriffe: `BEGRIFFE.md`. Routine: `UEBERGABE.md`. Fallstricke und Tests: `TECHNIK.md`. Die lange Fassung dieser Datei bis 12.11.2026 steht unverändert in `../archiv/STAND_bis_2026-11-12.md`.

## Aktive Arbeit
Jeder Strang trägt vor der ersten Änderung eine Zeile ein (Datum, Strangname, Vorhaben, berührte Dateien), pusht sofort und löscht die Zeile nach dem Push. Zeilen älter als 24 Stunden gelten als verwaist; vor dem Entfernen den Entwickler fragen.
Aktuell:
- keine

Stand: 12.11.2026, Commit siehe `git log -1`. Version 1.0 (`VERSION.txt`). Alles Folgende lief nur in simulierten Tests (Playwright, simuliertes Ollama), wenn nicht ausdrücklich „am Handy bestätigt“ steht.

## Reihenfolge (Beschluss `docs/KONZEPT.md` 22, nacheinander)
1. ~~AIUIheinz-Aufraeumen~~ (fertig 12.11.2026; neue Projektanweisung liegt in `PROJEKTANWEISUNG.md`, der Entwickler setzt sie ein).
2. **AIUIheinz-Menu:** Phase 0 Bausteinkatalog ✔ (12.11.2026). Der Umbau des Menüs ist **nicht beauftragt** (Entwickler 12.11.: Menü des Dashboards bleibt vorerst).
3. **AIUIheinz-Dashboard:** `dashboard.html` in ES-Module, Prüfprozeduren als Daten. **Beauftragt 12.11.2026 (Entwickler):** Umstellung nach `AUFTRAG_Dashboard_Schlank.md` und `DASHBOARD_INVENTUR.md` Schritt 6 (Inline-Handler schrittweise durch `data-action`), Dashboard arbeitet allein am Fundament; dabei Testläufe beschleunigen (Punkt 9). **Stand 12.11.2026 abends:** Schritt 6 erledigt (Inline-Handler durch `data-click`/`data-input`/`data-change` plus `ACTIONS` in `lib/dashboard/actions.js`); offen: Umstellung der Dateien auf ES-Module mit ausdrücklichem Zustand (Fassade `HeinzDashboard` bleibt für die Tests).
3a. **AIUIheinz-Fundament (neu 12.11.2026, Beschluss des Entwicklers):** Umstellung der ganzen Web-App auf ES-Module ohne Build (Dashboard, Heinz Chat, Hub, Tools, Bibliotheken), nach `AUFTRAG_Fundament.md`. Schritt 6 des Dashboards (Inline-Handler, schnellere Tests) war nur die Vorbereitung; Module gibt es noch keine (Stand `4c47d71`). Der Strang baut allein am Fundament; Dashboard, Chat, Design und Modelle ändern in dieser Zeit nichts an `dashboard.html`, `chat.html`, `lib/*`, `tools/*`, `index.html`, `sw.js`. Der Strang Dashboard hat seinen Teil der Umstellung damit an Fundament abgegeben.
4. ~~AIUIheinz-Speicher~~ (fertig 12.11.2026, am Handy bestätigt, auch im normalen Browsertab): IndexedDB für Unterhaltungen und Testreihen mit Migration und Rückfall.
Modelle und Tertius dürfen nach Schritt 1 daneben laufen, wenn sie `dashboard.html` und `lib/core.*` nicht berühren. Modi, Design und Assistent warten bis nach Schritt 3 (sie berühren `dashboard.html`); der Strang Chat (Heinz Chat) wartet nicht. Strang Modi: nicht starten ohne Rücksprache.

## Stränge
Strangname gilt, nicht der Titel in der Chat-Liste der Claude-App. Neue Stränge hier eintragen.

| Strang | Inhalt, Auftrag | Stand |
|---|---|---|
| AIUIheinz (Root) | Konzept (`docs/KONZEPT.md`), Querprüfung, neue Aufträge | Konzept nachgeführt bis Abschnitt 22 (Beschlüsse zur Struktur, 12.11.) |
| AIUIheinz-Aufraeumen | Doppelablage beenden, Dokumente entschlacken, Anweisungen; `AUFTRAG_Aufraeumen.md` | fertig (12.11.2026): Doppelablage beendet, Dokumente neu geordnet, Anweisungen geschrieben; Abweichungen in `AUFTRAG_Aufraeumen.md` |
| AIUIheinz-Menu | Bausteinkatalog (Phase 0), Menü des Dashboards (DR2 Phase B); `AUFTRAG_Menu.md` | Phase 0 fertig (12.11.2026): Design-Katalog, Bausteine nach `lib/core.css`, Helfer in `lib/core.js`; Menü-Umbau nicht beauftragt, Menü bleibt |
| AIUIheinz-Dashboard | **Heinz Dashboard** (`dashboard.html`): Menü, Chatfenster, Modi, Regler, Tempo-Test, Testreihen, Sonden S1 bis S8, Engine- und Modellprüfung (übernimmt seit 12.11.2026 die frühere Dashboard-Arbeit des Strangs Chat); schlankes Web-UI nach `AUFTRAG_Dashboard_Schlank.md`, Vorschlag `docs/DASHBOARD_INVENTUR.md`; weitere Aufträge `AUFTRAG_CHAT-SEITE.md`, `AUFTRAG_Chat_Schnittstellen.md` | läuft (seit 12.11.): Fassade, Daten als JSON, Speicherschicht, Blöcke nach `lib/dashboard/` gepusht; offen: Umstellung auf ES-Module und Inline-Handler, Testreihen Schritt 4 und 5, LiteRT-LM und Online-Anbieter am Handy, Modellverwaltung, Sonden |
| AIUIheinz-Fundament | Konstruktion der Modulstruktur: alle Seiten und `lib/` auf ES-Module ohne Build, `docs/MODULE.md`; `AUFTRAG_Fundament.md` | **angelegt 12.11.2026, noch nicht gestartet.** Reihenfolge im Auftrag: Dashboard-Dateien, Heinz Chat, Hub und Tools, danach die Bibliotheken (von oben nach unten, weil Module klassische Skripte sehen, nicht umgekehrt) |
| AIUIheinz-Speicher | IndexedDB; `AUFTRAG_Speicher.md` | gebaut und gepusht (12.11.2026), **am Handy bestätigt (Entwickler, 12.11.2026): alle Unterhaltungen nach dem Update erhalten, App mehrfach beendet und neu gestartet, Info zeigt IndexedDB, permanent ja, 1,1 MB von 10,7 GB** (installierte App); danach alles am Handy getestet, auch im normalen Browsertab (Entwickler, 12.11.2026; Messwerte dort nicht notiert); Tests simuliert: `lib/store.js` mit IndexedDB und Rückfall, Migration mit Prüfung, Hinweisband, Info-Zeile, Heinz Chat umgestellt; Handytest abgeschlossen; offen: Medienspeicher (nur Objektspeicher vorbereitet), spätere Freigabe zum Löschen der alten `localStorage`-Einträge |
| AIUIheinz-Chat | **Heinz Chat** (`chat.html`, ruhige Leseseite, Schnellblatt für Modell und Unterhaltungen); Weiterentwicklung der eigenen Seite. Zuschnitt neu seit 12.11.2026 (Beschluss des Entwicklers); Auftrag noch nicht geschrieben (Root-Strang) | Seite läuft (Systemprompt je Modell, Laufzeit mit dem Dashboard geteilt, am Handy bestätigt 11.11.); offen: Cursorfarbe, Handytest Systemprompt je Modell. Berührt `dashboard.html` nicht und muss nicht auf den Strang Dashboard warten; Schnittstelle zum Dashboard: `HeinzProviders` (`runtime`, `activeModel`, `chatSystemFor`, `chatSamplingFor`), Schlüssel `heinz_active`, `heinz_chat_system`, `heinz_chat_options` |
| AIUIheinz-Design | Manifest, Themes, Bausteine, Hub; `AUFTRAG_DESIGN.md` | Design-Review 1 bestanden (10.11.), Heinz Chat, Hub und Setup freigegeben (11.11.); offen: Cursorfarbe, Handytest; DR2 siehe `docs/DESIGN_DR2.md`; wartet bis nach Dashboard |
| AIUIheinz-Modelle | Modellmanager, Schnittstellenwissen, `lib/capabilities.json`; `AUFTRAG_Modelle.md` | Phase 1 Doku und Daten gepusht (Version 2, `docs/SCHNITTSTELLEN.md` bis Abschnitt 18); weiter: Messungen auswerten, Läufer-Ausbau (wartet auf Freigabe), Wissensbereich; Phase 2 berührt `lib/providers.js` (Fundament, Abstimmung nötig) |
| AIUIheinz-Modi | Modi als Prüfwerkzeuge, Schnell/Tief-Pille, Reasoning bei Cloud-Modellen; `AUFTRAG_Modi.md` | nicht starten ohne Rücksprache (Reasoning und Schnell/Tief hat der Strang Chat gebaut) |
| AIUIheinz-Tertius | Unbeteiligter Dritter, nur lesen; `AUFTRAG_Tertius.md`, Ergebnis `docs/TERTIUS.md` | Durchgang 1 und 2 gepusht (11.11.); ab Durchgang 3 privat in `TERTIUS_privat/` am PC |
| AIUIheinz-Assistent | Einrichtungsassistent vom frischen Handy (Konzept 18.3) | noch kein Strang; erste Aufgabe Dimensionierung, nach Modellmanager Phase 1 |
| AIUIheinz-Fix-Threads | Korrektur: Heinz Chat sendet `num_thread`; `AUFTRAG_Fix_Threads.md` | fertig (11.11., Commit 20e9333); Handymessung offen |
| Filter (ex Lab), Sheet | Prüfen mit Edge-Modellen | nach dem Fundament |

## Module
| Modul | Datei | Stand | Nächster Schritt |
|---|---|---|---|
| Hub | `index.html` | seit 11.11.2026 der neue Hub (Reiter Chat, Werkzeuge, Einrichten) mit Versionszeile; am Handy bestätigt: alle Einträge da | neue Module über `tool.json`/`AREAS` einhängen |
| Heinz Chat | `chat.html` | ruhige Leseseite, Modell und Unterhaltungen im Schnellblatt (⋯ je Unterhaltung mit 5 Pillen seit 12.11.), Systemprompt je Modell, sendet `num_thread`; Modell und Laufzeit mit Dashboard geteilt (am Handy bestätigt 11.11.) | Handytest Systemprompt je Modell, Cursorfarbe |
| Heinz Dashboard | `dashboard.html` (Markup und Start) plus `lib/dashboard/*.js` (Skript, seit 12.11.2026 aufgeteilt) | neues Design seit 10.11.; 5 Modi, Regler nach Zustand, Engine-Wahl (Ollama, LiteRT-LM, Google nativ, Online mit Haken), Tempo-Test, Testreihen Schritt 1 bis 3, Knopf „In den Chat übernehmen“ (am Handy vorhanden, zeigt „Applied for gemma2:2b …“, 12.11.) | Handytest LiteRT-LM, Testreihen; Umbau im Strang Dashboard |
| Design-Katalog | `tools/design/index.html` | seit 12.11.2026 datengetrieben: alle Bausteine mit Klassen, Verwendung, Beispiel (Theme, EN/DE), Markup zum Kopieren, Funktionen, Lücken; nicht im Hub (nur per Adresse) | bei neuen Bausteinen nachtragen (Regel `docs/DESIGN.md` 7) |
| Setup | `tools/setup/index.html` | Einrichtungsassistent, läuft | – |
| Data Lab (Filter) | `lab.html` | fertig, bewusst unverändert, ruft Ollama noch direkt auf | nur auf Wunsch des Entwicklers ändern |
| Sheet | `sheet.html` | Logik fertig, mit simuliertem Modell getestet, ruft Ollama noch direkt auf | echtes 3B-Modell auf Rohstoffliste erproben |
| Vitals | `vitals.html` | läuft; Akku und Temperatur nur mit Termux:API | auf Gerät prüfen, welche Kacheln erscheinen |
| Server | `server.py` | läuft auf dem Handy; `POST /api/update` (nur simuliert) | Messdienst schonender (siehe Offen) |
| Start | `start.sh` | läuft | – |

## Nächste Aufgaben (Reihenfolge nach Wunsch des Entwicklers)
1. **AIUIheinz-Fundament starten** (Umstellung auf ES-Module, `AUFTRAG_Fundament.md`); erster Satz im neuen Chat: „AIUIheinz-Fundament: Umstellung auf ES-Module nach `docs/agent/AUFTRAG_Fundament.md`.“ Danach Reihenfolge der Stränge siehe oben.
2. **Handytests gebündelt** (`docs/HANDYTEST.md`, wird nach Go des Entwicklers angelegt): offen sind Testreihen, `ollama rm heinz-wilson:latest heinz-fakt:latest`; Speicher ist am Handy vollständig bestätigt (12.11.2026, installierte App und normaler Browsertab).
2b. **Befund 12.11.2026 (Browsertab):** Im normalen Browsertab lädt das Modell mit 8 Threads, obwohl in der installierten App 2 eingestellt sind. Vermutung: Tab und installierte App haben getrennten Speicher (eigene `localStorage`/IndexedDB), im Tab gelten die Standardwerte. Zu klären (Strang Dashboard, mit 2a c): Standardwert für `num_thread` (8 ist am langsamsten) und Weg, Einstellungen zwischen App und Tab zu übertragen (Konfiguration exportieren/importieren).
2a. **Strang Dashboard, vorgemerkt am 12.11.2026 (Wunsch des Entwicklers, erst umsetzen, wenn er es freigibt):**
   - (a) Nach dem Update startet die installierte App im Heinz Chat statt im Dashboard: Verlinkung prüfen (`manifest.json` `start_url`, Service Worker, alle Verweise auf `/chat.html`).
   - (b) Reste des Wortes „Prüfstand“ in der Oberfläche durch „Dashboard“ ersetzen, EN und DE (zum Beispiel „Prüfstand-Werte entfernen“ im Modellblatt des Heinz Chat).
   - (c) **Konfiguration** als benanntes, exportierbares Format. Ziel: Modell laden und einstellen (Modus oder Regler), im Heinz Chat in einem echten Chat ausprobieren, dann als Konfiguration speichern und in anderen Tools oder Projekten verwenden. „In den Chat übernehmen“ (`applyToChat()`) bleibt der Weg ins Heinz Chat und ist heute ein Schnappschuss pro Modell. Entwurf: eigenes JSON mit den Feldnamen von Ollama (`system`, `temperature`, `top_p`, `top_k`, `stop`, `num_ctx`, `repeat_penalty`, `seed`) plus Name, Modell, Modus und eigenen Parametern; Versionsfeld `format`; kurze Spezifikation im Repo (Felder, Pflicht oder optional, Beispiele); Export als Ollama-Modelfile (`FROM`, `SYSTEM`, `PARAMETER`) und als LM-Studio-Preset (JSON, Systemprompt unter `llm.prediction.systemPrompt`; Aufbau vorher an einer echten Datei prüfen); benannte Konfigurationen speichern, im Heinz Chat wählen, im Dashboard laden. Berührt Fundament (`lib/store.js`, gemeinsamer Schlüssel, Heinz Chat): mit dem Strang Speicher abstimmen und den Entwickler vorher fragen.
3. Strang Dashboard danach: Sonden-Reihen S1 bis S8 und Testreihe Google Teil 2 wiederholen, Testreihen Schritt 4 und 5 (`docs/KONZEPT.md` 21.5a), danach Bild-Ein/Ausgabe.
4. Strang Modelle: Denkregeln und CORS der neuen Anbieter prüfen.
5. Strang Design: Cursorfarbe klären; Label „Model name“ im Modellblatt des Dashboards.
6. Sheet mit echtem Qwen 2.5 3B auf der Rohstoffliste erproben, Prompt und Schema nachschärfen.
7. Alte Seiten `sheet.html`, `lab.html`, `vitals.html` rufen Ollama noch direkt auf (Test `test_rules.py` führt sie als Ausnahme) und sollen auf `HeinzProviders` umgestellt werden.
8. Ideen aus `docs/GEPLANT.md`; Konzept `docs/KONZEPT.md` Abschnitt 15.6 (Offen) und 20 (Medien, Funktionsplätze).
9. **Testläufe beschleunigen** (beauftragt und freigegeben 12.11.2026 für den Strang Dashboard, im Zuge der ES-Modul-Umstellung; Freigabe des Entwicklers für `tests/` und `run_all.sh`): `docs/GEPLANT.md`, Abschnitt „Testläufe beschleunigen“. Reihenfolge: zuerst den unregelmäßigen Test `test_update_button_reports_states_and_reloads_after_update` klären (Punkt 4), dann nur betroffene Tests beim Arbeiten (Regel in `UEBERGABE.md`), Schnellauswahl in `run_all.sh`, parallele Testdateien (vorher gemeinsamen Zustand prüfen). Der volle Lauf bleibt vor jedem Push Pflicht. **Erledigt 12.11.2026:** Ursache des unregelmäßigen Tests war ein Testfehler (Prüfung vor Ende des Seitenaufbaus), behoben; `bash tests/run_all.sh <Wort>` (Schnellauswahl) und parallele Teile (`HEINZ_SHARDS`), voller Lauf etwa 2 Minuten statt 3 bis 4; Regel in `UEBERGABE.md`.
Regel für alle: Neue Seiten und Tools müssen im Hub erreichbar sein (`TECHNIK.md`, „Grundgerüst“).

## Berührt Fundament (Chronik der Eingriffe)
- 09.11.2026, AIUIheinz-Chat (Freigabe des Entwicklers): `server.py` neuer Endpunkt `POST /api/update` (git pull, Selbstneustart), Version (Commit, Datum) in `/api/ping`; Tests in `tests/helpers.py`, `tests/test_server.py`.
- 10.11.2026, AIUIheinz-Chat und -Design: Anbieterschicht `lib/providers.js`, Design-Fundament `lib/core.css`, `lib/core.js`, `lib/icons.svg`.
- 11.11.2026, AIUIheinz-Chat: gemeinsame Laufzeit und Modellwahl in `lib/providers.js`, Personas in `lib/personas.js`, `lib/testreihe.js`.
- 12.11.2026, AIUIheinz-Aufraeumen: nur Dokumente und Pfad in `tests/test_rules.py`.
- 12.11.2026, AIUIheinz-Menu (Freigabe des Entwicklers): `lib/core.css` (Bausteine aus `dashboard.html` und `tools/setup` hierher gezogen, `.chk` → `.chkrow`), `lib/core.js` (`Heinz.setting/setSetting/bindSwitch/bindSlider`), `tools/design/index.html`; `dashboard.html` und `chat.html` nur Regeln entfernt bzw. Klasse umbenannt, Verhalten gleich (Heinz Chat: Felder jetzt wie im Dashboard, 46 statt 44 px).
- 12.11.2026, AIUIheinz-Dashboard (Freigabe des Entwicklers): neue Dateien `lib/markdown.js`, `lib/dashboarddata.js`, `lib/store.js`, `lib/data/*.json`, `lib/dashboard/*.js`; `lib/core.*` und `lib/providers.js` unberührt.
- 12.11.2026, AIUIheinz-Speicher (Freigabe des Entwicklers): `lib/store.js` (IndexedDB-Backend, Migration, Rückfall, `info/status/onProblem`); `chat.html` (Heinz Chat startet nach `HeinzStore.open()`, Unterhaltungen über `HeinzStore`); `dashboard.html`, `lib/dashboard/state.js`, `menu.js`, `i18n.js` und `lib/data/dashboard.i18n.json` nur Hinweisband, Info-Zeile, Fehlerfang; `lib/core.js` und `lib/providers.js` unberührt; neu `tests/test_store.py`.
Als Fundament gelten: gemeinsame localStorage-Schlüssel (`heinz_settings`), das EN/DE-Verfahren, die Kopfzeile mit Hub-Link, die Schnittstelle des Servers und die Ollama-Aufrufe.

## Offen
- Termux-Sessions werden mit Signal 9 beendet (beobachtet 26.10.2026 mehrfach, auch nach Tempotest bei unter 1 GB freiem RAM). Ursache nicht gesichert: Speicherdruck oder Prozess-Limit von Android, möglicher Beitrag des Messdienstes (startet jede Minute `termux-battery-status` und `termux-sensor`). Test ohne Messdienst (`bash start.sh --vitals-interval 0`) steht aus; Entwickleroption für untergeordnete Prozesse und Akku-Optimierung für Termux prüfen.
- Akku und Akkutemperatur fehlten beim ersten Start, weil Termux:API nicht antwortete; Stand nach Einrichtung nicht bestätigt. CPU-Temperatur und Luftdruck hängen davon ab, was Android freigibt.
- Notiz 10.11.2026: Im Engine-Menü zeigt das Auswahlfeld unter „Verbindungsdaten“ beim Antippen dieselbe Engine-Liste wie die Liste darüber; beim Menü-Umbau klären, ob das Feld bleibt.
- `heinz-fakt:latest` ist installiert (Basis: abliteriertes Qwen 2.5 3B), steht aber nicht in den Auswahllisten; Refusal-Vergleichstest offen. Personas liegen extern in `lib/personas.js`.
- Tempo hängt an `num_thread` (Standard 8 am langsamsten, 3 bis 4 etwa doppelt so schnell); der Heinz Chat sendet es seit 11.11., Messung am Handy offen.
- LiteRT-LM: Systemnachricht, Parameter und GPU über das `model`-Feld in `litert-lm serve` prüfen, dann Testprompts T1 bis T4 (`docs/KONZEPT.md` 10 und 14, jetzt im Archiv).
- IndexedDB am Pixel: in der installierten App gewährt Chrome `persist()` (am Handy bestätigt 12.11.2026, Quote 10,7 GB); im normalen Browsertab vom Entwickler getestet (12.11.2026), Messwerte nicht notiert. Räumt der Browser bei Platzmangel, geschieht es stumm, daher gelegentlich Sicherung exportieren.
- Rohstofflisten des Entwicklers (`Lager_JW.pdf`) gehören nicht ins Repo.

## Pflichtregel lokale Modelle (11.11.2026)
Alle Seiten, die ein lokales Modell ansprechen, folgen `docs/LOKALE_MODELLE.md` (nur `HeinzProviders`, gemeinsame Laufzeit, Modellwahl, Vorladen nur wenn nötig, Abbruch beim Verlassen der Seite). Am Handy bestätigt (11.11.2026, 15:15): Modelle bleiben beim Seitenwechsel im Speicher, erste Antwort 4 bis 6 s auf beiden Seiten. Am Handy bestätigt (Entwickler, 12.11.2026): Abbruch der laufenden Antwort beim Verlassen der Seite; Wechsel zwischen Heinz Chat und Dashboard ohne die früher dokumentierten Probleme; im Dashboard parametrisiertes Modell bleibt im Heinz Chat geladen, Tempo überzeugt (2 Threads).
