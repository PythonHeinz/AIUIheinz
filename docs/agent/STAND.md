# AIUIheinz – Stand

Projekt „Heinz UI“: Weboberfläche für lokale Modelle (Ollama in Termux, Pixel 9 Pro). Maßgeblich ist dieses Repo (GitHub PythonHeinz/AIUIheinz, Branch `main`); es gibt keine zweite Ablage am PC. Begriffe: `BEGRIFFE.md`. Routine: `UEBERGABE.md`. Fallstricke und Tests: `TECHNIK.md`. Die lange Fassung dieser Datei bis 12.11.2026 steht unverändert in `../archiv/STAND_bis_2026-11-12.md`.

## Aktive Arbeit
Jeder Strang trägt vor der ersten Änderung eine Zeile ein (Datum, Strangname, Vorhaben, berührte Dateien), pusht sofort und löscht die Zeile nach dem Push. Zeilen älter als 24 Stunden gelten als verwaist; vor dem Entfernen den Entwickler fragen.
Aktuell: keine.

Stand: 12.11.2026, Commit siehe `git log -1`. Version 1.0 (`VERSION.txt`). Alles Folgende lief nur in simulierten Tests (Playwright, simuliertes Ollama), wenn nicht ausdrücklich „am Handy bestätigt“ steht.

## Reihenfolge (Beschluss `docs/KONZEPT.md` 22, nacheinander)
1. ~~AIUIheinz-Aufraeumen~~ (fertig 12.11.2026; neue Projektanweisung liegt in `PROJEKTANWEISUNG.md`, der Entwickler setzt sie ein).
2. **AIUIheinz-Menu:** Phase 0 Bausteinkatalog, dann Menü des Prüfstands (Fundament).
3. **AIUIheinz-Pruefstand:** `chat.html` in ES-Module, Prüfprozeduren als Daten.
4. **AIUIheinz-Speicher:** IndexedDB für Unterhaltungen und Testreihen mit Migration.
Modelle und Tertius dürfen nach Schritt 1 daneben laufen, wenn sie `chat.html` und `lib/core.*` nicht berühren. Chat, Modi, Design und Assistent warten bis nach Schritt 3. Strang Modi: nicht starten ohne Rücksprache.

## Stränge
Strangname gilt, nicht der Titel in der Chat-Liste der Claude-App. Neue Stränge hier eintragen.

| Strang | Inhalt, Auftrag | Stand |
|---|---|---|
| AIUIheinz (Root) | Konzept (`docs/KONZEPT.md`), Querprüfung, neue Aufträge | Konzept nachgeführt bis Abschnitt 22 (Beschlüsse zur Struktur, 12.11.) |
| AIUIheinz-Aufraeumen | Doppelablage beenden, Dokumente entschlacken, Anweisungen; `AUFTRAG_Aufraeumen.md` | fertig (12.11.2026): Doppelablage beendet, Dokumente neu geordnet, Anweisungen geschrieben; Abweichungen in `AUFTRAG_Aufraeumen.md` |
| AIUIheinz-Menu | Bausteinkatalog, Menü des Prüfstands (DR2 Phase B); `AUFTRAG_Menu.md` | Auftrag bereit, Fundament nur nach Rückfrage |
| AIUIheinz-Pruefstand | Schlankes Web-UI: `chat.html` zerlegen, Prüfprozeduren als Daten; `AUFTRAG_Pruefstand_Schlank.md` | startet nach Menu |
| AIUIheinz-Speicher | IndexedDB; `AUFTRAG_Speicher.md` | startet nach Pruefstand |
| AIUIheinz-Chat | Anbieterschicht, Prüfstand-Bedienung, Modi als Daten, Testreihen; `AUFTRAG_CHAT-SEITE.md`, `AUFTRAG_Chat_Schnittstellen.md` | gepusht bis Testreihen Schritt 3 (11.11.); offen: Testreihen Schritt 4 und 5, LiteRT-LM und Online-Anbieter am Handy, Modellverwaltung; wartet bis nach Pruefstand |
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
| Heinz Prüfstand | `chat.html` | neues Design seit 10.11.; 5 Modi, Regler nach Zustand, Engine-Wahl (Ollama, LiteRT-LM, Google nativ, Online mit Haken), Tempo-Test, Testreihen Schritt 1 bis 3, Knopf „In den Chat übernehmen“ (nur simuliert) | Handytest LiteRT-LM, Testreihen, Übernehmen-Knopf; Umbau im Strang Pruefstand |
| Setup | `tools/setup/index.html` | Einrichtungsassistent, läuft | – |
| Data Lab (Filter) | `lab.html` | fertig, bewusst unverändert, ruft Ollama noch direkt auf | nur auf Wunsch des Entwicklers ändern |
| Sheet | `sheet.html` | Logik fertig, mit simuliertem Modell getestet, ruft Ollama noch direkt auf | echtes 3B-Modell auf Rohstoffliste erproben |
| Vitals | `vitals.html` | läuft; Akku und Temperatur nur mit Termux:API | auf Gerät prüfen, welche Kacheln erscheinen |
| Server | `server.py` | läuft auf dem Handy; `POST /api/update` (nur simuliert) | Messdienst schonender (siehe Offen) |
| Start | `start.sh` | läuft | – |

## Nächste Aufgaben (Reihenfolge nach Wunsch des Entwicklers)
1. Reihenfolge der Stränge siehe oben (Menu, Pruefstand, Speicher).
2. **Handytests gebündelt** (`docs/HANDYTEST.md`, wird nach Go des Entwicklers angelegt): offen sind Testreihen, Knopf „In den Chat übernehmen“, Abbruch der Antwort beim Verlassen der Seite, `ollama rm heinz-wilson:latest heinz-fakt:latest`.
3. Strang Chat danach: Sonden-Reihen S1 bis S8 und Testreihe Google Teil 2 wiederholen, Testreihen Schritt 4 und 5 (`docs/KONZEPT.md` 21.5a), danach Bild-Ein/Ausgabe.
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
Alle Seiten, die ein lokales Modell ansprechen, folgen `docs/LOKALE_MODELLE.md` (nur `HeinzProviders`, gemeinsame Laufzeit, Modellwahl, Vorladen nur wenn nötig, Abbruch beim Verlassen der Seite). Am Handy bestätigt (11.11.2026, 15:15): Modelle bleiben beim Seitenwechsel im Speicher, erste Antwort 4 bis 6 s auf beiden Seiten. Offen am Handy: Abbruch der laufenden Antwort beim Verlassen der Seite.
