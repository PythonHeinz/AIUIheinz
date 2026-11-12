# AIUIheinz – Stand

Projekt „Heinz UI“: Weboberfläche für lokale Modelle (Ollama in Termux, Pixel 9 Pro). Maßgeblich ist dieses Repo (GitHub PythonHeinz/AIUIheinz, Branch `main`); es gibt keine zweite Ablage am PC. Begriffe: `BEGRIFFE.md`. Routine: `UEBERGABE.md`. Fallstricke und Tests: `TECHNIK.md`. Die lange Fassung dieser Datei bis 12.11.2026 steht unverändert in `../archiv/STAND_bis_2026-11-12.md`.

## Aktive Arbeit
Jeder Strang trägt vor der ersten Änderung eine Zeile ein (Datum, Strangname, Vorhaben, berührte Dateien), pusht sofort und löscht die Zeile nach dem Push. Zeilen älter als 24 Stunden gelten als verwaist; vor dem Entfernen den Entwickler fragen.
Aktuell:
- 12.11.2026, AIUIheinz-Pruefstand: Phase 2 läuft (gepusht: Fassade `HeinzBench`, Daten in `lib/data`, `lib/store.js`, Blöcke nach `lib/bench/`); berührt `chat.html`, `tests/`, neue Dateien in `lib/` und `lib/bench/`. Zeile bleibt, bis die Umstellung auf Module abgeschlossen ist.

Stand: 12.11.2026, Commit siehe `git log -1`. Version 1.0 (`VERSION.txt`). Alles Folgende lief nur in simulierten Tests (Playwright, simuliertes Ollama), wenn nicht ausdrücklich „am Handy bestätigt“ steht.

## Reihenfolge (Beschluss `docs/KONZEPT.md` 22, nacheinander)
1. ~~AIUIheinz-Aufraeumen~~ (fertig 12.11.2026; neue Projektanweisung liegt in `PROJEKTANWEISUNG.md`, der Entwickler setzt sie ein).
2. **AIUIheinz-Menu:** Phase 0 Bausteinkatalog ✔ (12.11.2026). Der Umbau des Menüs ist **nicht beauftragt** (Entwickler 12.11.: Menü des Prüfstands bleibt vorerst).
3. **AIUIheinz-Pruefstand:** `chat.html` in ES-Module, Prüfprozeduren als Daten.
4. **AIUIheinz-Speicher:** IndexedDB für Unterhaltungen und Testreihen mit Migration.
Modelle und Tertius dürfen nach Schritt 1 daneben laufen, wenn sie `chat.html` und `lib/core.*` nicht berühren. Modi, Design und Assistent warten bis nach Schritt 3 (sie berühren `chat.html`); der Strang Chat (Heinz Chat) wartet nicht. Strang Modi: nicht starten ohne Rücksprache.

## Stränge
Strangname gilt, nicht der Titel in der Chat-Liste der Claude-App. Neue Stränge hier eintragen.

| Strang | Inhalt, Auftrag | Stand |
|---|---|---|
| AIUIheinz (Root) | Konzept (`docs/KONZEPT.md`), Querprüfung, neue Aufträge | Konzept nachgeführt bis Abschnitt 22 (Beschlüsse zur Struktur, 12.11.) |
| AIUIheinz-Aufraeumen | Doppelablage beenden, Dokumente entschlacken, Anweisungen; `AUFTRAG_Aufraeumen.md` | fertig (12.11.2026): Doppelablage beendet, Dokumente neu geordnet, Anweisungen geschrieben; Abweichungen in `AUFTRAG_Aufraeumen.md` |
| AIUIheinz-Menu | Bausteinkatalog (Phase 0), Menü des Prüfstands (DR2 Phase B); `AUFTRAG_Menu.md` | Phase 0 fertig (12.11.2026): Design-Katalog, Bausteine nach `lib/core.css`, Helfer in `lib/core.js`; Menü-Umbau nicht beauftragt, Menü bleibt |
| AIUIheinz-Pruefstand | **Heinz Prüfstand** (`chat.html`): Menü, Chatfenster, Modi, Regler, Tempo-Test, Testreihen, Sonden S1 bis S8, Engine- und Modellprüfung (übernimmt seit 12.11.2026 die frühere Prüfstand-Arbeit des Strangs Chat); schlankes Web-UI nach `AUFTRAG_Pruefstand_Schlank.md`, Vorschlag `docs/PRUEFSTAND_INVENTUR.md`; weitere Aufträge `AUFTRAG_CHAT-SEITE.md`, `AUFTRAG_Chat_Schnittstellen.md` | läuft (seit 12.11.): Fassade, Daten als JSON, Speicherschicht, Blöcke nach `lib/bench/` gepusht; offen: Umstellung auf ES-Module und Inline-Handler, Testreihen Schritt 4 und 5, LiteRT-LM und Online-Anbieter am Handy, Modellverwaltung, Sonden |
| AIUIheinz-Speicher | IndexedDB; `AUFTRAG_Speicher.md` | startet nach Pruefstand |
| AIUIheinz-Chat | **Heinz Chat** (`tools/heinz/index.html`, ruhige Leseseite, Schnellblatt für Modell und Unterhaltungen); Weiterentwicklung der eigenen Seite. Zuschnitt neu seit 12.11.2026 (Beschluss des Entwicklers); Auftrag noch nicht geschrieben (Root-Strang) | Seite läuft (Systemprompt je Modell, Laufzeit mit dem Prüfstand geteilt, am Handy bestätigt 11.11.); offen: Cursorfarbe, Handytest Systemprompt je Modell. Berührt `chat.html` nicht und muss nicht auf den Strang Pruefstand warten; Schnittstelle zum Prüfstand: `HeinzProviders` (`runtime`, `activeModel`, `chatSystemFor`, `chatSamplingFor`), Schlüssel `heinz_active`, `heinz_chat_system`, `heinz_chat_options` |
| AIUIheinz-Design | Manifest, Themes, Bausteine, Hub; `AUFTRAG_DESIGN.md` | Design-Review 1 bestanden (10.11.), Heinz Chat, Hub und Setup freigegeben (11.11.); offen: Cursorfarbe, Handytest; DR2 siehe `docs/DESIGN_DR2.md`; wartet bis nach Pruefstand |
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
| Heinz Chat | `tools/heinz/index.html` | ruhige Leseseite, Modell und Unterhaltungen im Schnellblatt, Systemprompt je Modell, sendet `num_thread`; Modell und Laufzeit mit Prüfstand geteilt (am Handy bestätigt 11.11.) | Handytest Systemprompt je Modell, Cursorfarbe |
| Heinz Prüfstand | `chat.html` (Markup und Start) plus `lib/bench/*.js` (Skript, seit 12.11.2026 aufgeteilt) | neues Design seit 10.11.; 5 Modi, Regler nach Zustand, Engine-Wahl (Ollama, LiteRT-LM, Google nativ, Online mit Haken), Tempo-Test, Testreihen Schritt 1 bis 3, Knopf „In den Chat übernehmen“ (am Handy vorhanden, zeigt „Applied for gemma2:2b …“, 12.11.) | Handytest LiteRT-LM, Testreihen; Umbau im Strang Pruefstand |
| Design-Katalog | `tools/design/index.html` | seit 12.11.2026 datengetrieben: alle Bausteine mit Klassen, Verwendung, Beispiel (Theme, EN/DE), Markup zum Kopieren, Funktionen, Lücken; nicht im Hub (nur per Adresse) | bei neuen Bausteinen nachtragen (Regel `docs/DESIGN.md` 7) |
| Setup | `tools/setup/index.html` | Einrichtungsassistent, läuft | – |
| Data Lab (Filter) | `lab.html` | fertig, bewusst unverändert, ruft Ollama noch direkt auf | nur auf Wunsch des Entwicklers ändern |
| Sheet | `sheet.html` | Logik fertig, mit simuliertem Modell getestet, ruft Ollama noch direkt auf | echtes 3B-Modell auf Rohstoffliste erproben |
| Vitals | `vitals.html` | läuft; Akku und Temperatur nur mit Termux:API | auf Gerät prüfen, welche Kacheln erscheinen |
| Server | `server.py` | läuft auf dem Handy; `POST /api/update` (nur simuliert) | Messdienst schonender (siehe Offen) |
| Start | `start.sh` | läuft | – |

## Nächste Aufgaben (Reihenfolge nach Wunsch des Entwicklers)
1. Reihenfolge der Stränge siehe oben (Menu, Pruefstand, Speicher).
2. **Handytests gebündelt** (`docs/HANDYTEST.md`, wird nach Go des Entwicklers angelegt): offen sind Testreihen, `ollama rm heinz-wilson:latest heinz-fakt:latest`.
3. Strang Pruefstand danach: Sonden-Reihen S1 bis S8 und Testreihe Google Teil 2 wiederholen, Testreihen Schritt 4 und 5 (`docs/KONZEPT.md` 21.5a), danach Bild-Ein/Ausgabe.
4. Strang Modelle: Denkregeln und CORS der neuen Anbieter prüfen.
5. Strang Design: Cursorfarbe klären; Label „Model name“ im Modellblatt des Prüfstands.
6. Sheet mit echtem Qwen 2.5 3B auf der Rohstoffliste erproben, Prompt und Schema nachschärfen.
7. Alte Seiten `sheet.html`, `lab.html`, `vitals.html` rufen Ollama noch direkt auf (Test `test_rules.py` führt sie als Ausnahme) und sollen auf `HeinzProviders` umgestellt werden.
8. Ideen aus `docs/GEPLANT.md`; Konzept `docs/KONZEPT.md` Abschnitt 15.6 (Offen) und 20 (Medien, Funktionsplätze).
Regel für alle: Neue Seiten und Tools müssen im Hub erreichbar sein (`TECHNIK.md`, „Grundgerüst“).

## Berührt Fundament (Chronik der Eingriffe)
- 09.11.2026, AIUIheinz-Chat (Freigabe des Entwicklers): `server.py` neuer Endpunkt `POST /api/update` (git pull, Selbstneustart), Version (Commit, Datum) in `/api/ping`; Tests in `tests/helpers.py`, `tests/test_server.py`.
- 10.11.2026, AIUIheinz-Chat und -Design: Anbieterschicht `lib/providers.js`, Design-Fundament `lib/core.css`, `lib/core.js`, `lib/icons.svg`.
- 11.11.2026, AIUIheinz-Chat: gemeinsame Laufzeit und Modellwahl in `lib/providers.js`, Personas in `lib/personas.js`, `lib/testreihe.js`.
- 12.11.2026, AIUIheinz-Aufraeumen: nur Dokumente und Pfad in `tests/test_rules.py`.
- 12.11.2026, AIUIheinz-Menu (Freigabe des Entwicklers): `lib/core.css` (Bausteine aus `chat.html` und `tools/setup` hierher gezogen, `.chk` → `.chkrow`), `lib/core.js` (`Heinz.setting/setSetting/bindSwitch/bindSlider`), `tools/design/index.html`; `chat.html` und `tools/heinz/index.html` nur Regeln entfernt bzw. Klasse umbenannt, Verhalten gleich (Heinz Chat: Felder jetzt wie im Prüfstand, 46 statt 44 px).
- 12.11.2026, AIUIheinz-Pruefstand (Freigabe des Entwicklers): neue Dateien `lib/markdown.js`, `lib/benchdata.js`, `lib/store.js`, `lib/data/*.json`, `lib/bench/*.js`; `lib/core.*` und `lib/providers.js` unberührt.
Als Fundament gelten: gemeinsame localStorage-Schlüssel (`heinz_settings`), das EN/DE-Verfahren, die Kopfzeile mit Hub-Link, die Schnittstelle des Servers und die Ollama-Aufrufe.

## Offen
- Termux-Sessions werden mit Signal 9 beendet (beobachtet 26.10.2026 mehrfach, auch nach Tempotest bei unter 1 GB freiem RAM). Ursache nicht gesichert: Speicherdruck oder Prozess-Limit von Android, möglicher Beitrag des Messdienstes (startet jede Minute `termux-battery-status` und `termux-sensor`). Test ohne Messdienst (`bash start.sh --vitals-interval 0`) steht aus; Entwickleroption für untergeordnete Prozesse und Akku-Optimierung für Termux prüfen.
- Akku und Akkutemperatur fehlten beim ersten Start, weil Termux:API nicht antwortete; Stand nach Einrichtung nicht bestätigt. CPU-Temperatur und Luftdruck hängen davon ab, was Android freigibt.
- Notiz 10.11.2026: Im Engine-Menü zeigt das Auswahlfeld unter „Verbindungsdaten“ beim Antippen dieselbe Engine-Liste wie die Liste darüber; beim Menü-Umbau klären, ob das Feld bleibt.
- `heinz-fakt:latest` ist installiert (Basis: abliteriertes Qwen 2.5 3B), steht aber nicht in den Auswahllisten; Refusal-Vergleichstest offen. Personas liegen extern in `lib/personas.js`.
- Tempo hängt an `num_thread` (Standard 8 am langsamsten, 3 bis 4 etwa doppelt so schnell); der Heinz Chat sendet es seit 11.11., Messung am Handy offen.
- LiteRT-LM: Systemnachricht, Parameter und GPU über das `model`-Feld in `litert-lm serve` prüfen, dann Testprompts T1 bis T4 (`docs/KONZEPT.md` 10 und 14, jetzt im Archiv).
- Rohstofflisten des Entwicklers (`Lager_JW.pdf`) gehören nicht ins Repo.

## Pflichtregel lokale Modelle (11.11.2026)
Alle Seiten, die ein lokales Modell ansprechen, folgen `docs/LOKALE_MODELLE.md` (nur `HeinzProviders`, gemeinsame Laufzeit, Modellwahl, Vorladen nur wenn nötig, Abbruch beim Verlassen der Seite). Am Handy bestätigt (11.11.2026, 15:15): Modelle bleiben beim Seitenwechsel im Speicher, erste Antwort 4 bis 6 s auf beiden Seiten. Am Handy bestätigt (Entwickler, 12.11.2026): Abbruch der laufenden Antwort beim Verlassen der Seite; Wechsel zwischen Heinz Chat und Prüfstand ohne die früher dokumentierten Probleme; im Prüfstand parametrisiertes Modell bleibt im Heinz Chat geladen, Tempo überzeugt (2 Threads).
