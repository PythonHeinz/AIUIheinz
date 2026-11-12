# Prüfstand schlank: Inventur und Vorschlag (Phase 1)

Strang AIUIheinz-Pruefstand, 12.11.2026. Nur gelesen, kein Code geändert. Grundlage: `chat.html` im Stand `da2865d` (3141 Zeilen), `tests/test_pages.py`, `lib/*`, `sw.js`. Auftrag: `docs/agent/AUFTRAG_Pruefstand_Schlank.md`. **Wartet auf Freigabe des Entwicklers.**

## 1 Aufbau der Datei

| Bereich | Zeilen | Umfang |
|---|---|---|
| Kopf, Einbindung von `core.js`/`pixel.js` | 1–10 | 10 |
| Stile (`<style>`) | 11–299 | 289 |
| Markup (`<body>`) | 301–578 | 278 |
| Bibliotheken (`providers`, `personas`, `testreihe`) | 579–581 | 3 |
| Skript (ein klassischer Block, alles global) | 582–3139 | 2558 |

Im Skript: 281 Namen auf oberster Ebene (Funktionen, `const`, `let`), 86 Inline-Handler im Markup (`onclick`, `oninput`, …), 6 direkte `fetch`-Aufrufe (Tempo-Test, Testreihe, Vorladen, Update, `/api/tags`; bewusste Ausnahme in `tests/test_rules.py`). Gespeichert wird in `localStorage`: `heinz_settings`, `heinz_current`, `heinz_chats`, `heinz_speedtest`, `heinz_series` (und `heinz_keys` nur gelesen).

## 2 Blöcke im Skript

Ziel: **D** = Datendatei, **M** = ES-Modul, **S** = Speicherschicht, **B** = bleibt in der Seite (Verdrahtung).

| # | Block | Zeilen | Zeilen (Anz.) | Hängt ab von | Ziel |
|---|---|---|---|---|---|
| 1 | Markdown und Syntaxfärbung (`esc`, `highlightCode`, `parseOfflineMarkdown`) | 583–746 | 164 | nichts (reine Funktionen) | M `lib/markdown.js` |
| 2 | Konfiguration: `PROMPTS` (Audit, Code, Creative, EN/DE), `MODE_PRESETS`, `FALLBACK_MODELS`, `resolveModel`, Modellliste laden | 748–851 | 104 | `HeinzPersonas`, Provider | Texte und Presets → D `lib/modes.json`; Laden bleibt Code (M) |
| 3 | Engine-Menü (`renderEngineUI`, `switchProvider`, eigene Engines, Online-Haken) | 852–927 | 76 | Provider, `settings` | M `lib/bench/engine.js` |
| 4 | UI-Texte EN/DE (`I18N`, `t`, `applyI18n`) | 929–1047 | 119 | nichts | D `lib/i18n/pruefstand.en.json` und `.de.json`; `t()` bleibt Code |
| 5 | Zustand und Speicher (`settings`, `lsGet/lsSet`, `persistCurrent`) | 1048–1079 | 32 | – | S `lib/store.js` |
| 6 | Einstellungsfelder: Regler, Threads, Systemprompt, „In den Chat übernehmen“, Vorladen-Haken | 1080–1200 | 121 | 5, 2 | M `lib/bench/settings.js` |
| 7 | Modell vorladen | 1201–1265 | 65 | Provider | M `lib/bench/preload.js` |
| 8 | Modusleiste und Modus-Stil, Sprachknopf | 1266–1362 | 97 | 2, 4 | M `lib/bench/modes.js` |
| 9 | Serverstatus, Ring | 1363–1387 | 25 | Provider | M `lib/bench/status.js` |
| 10 | Vorlesen und Diktat | 1388–1452 | 65 | Browser-API | M `lib/bench/speech.js` |
| 11 | Nachrichten anzeigen, kopieren, Scrollen | 1453–1662 | 210 | 1 | M `lib/bench/messages.js` |
| 12 | Unterhaltungen: umbenennen, anpinnen, exportieren, speichern, laden, Liste | 1663–1883 | 221 | 5 | Zugriff → S; Anzeige M `lib/bench/chatlist.js` |
| 13 | Senden und Abbrechen (`buildMessages`, `buildOptions`, `askGemma`) | 1884–2067 | 184 | Provider, 2, 6 | M `lib/bench/send.js` |
| 14 | Update (git pull über den Server) | 2068–2131 | 64 | Server | M `lib/bench/update.js` |
| 15 | Tempo-Test | 2132–2297 | 166 | Provider | M `lib/bench/speedtest.js`; Prüfsätze `ST_SHORT/ST_LONG` → D |
| 16 | Testreihe (Läufer; Logik liegt schon in `lib/testreihe.js`) | 2298–2519 | 222 | `HeinzSeries`, Provider | M `lib/bench/series.js`; Achsen und Standardprompts → D `lib/series/*.json` |
| 17 | Menü, Drawer, Sheets, Sicherung, Pixeldisplays (Chip, Equalizer), Layout | 2520–2693 | 174 | viele | Menü bleibt (Beschluss); Pixeldisplays M `lib/bench/pixelbar.js`; Sicherung → S |
| 18 | Schnellbereich im Parameterfenster | 2694–2825 | 132 | 5, 6 | M `lib/bench/quick.js` |
| 19 | Schnittstellenwissen, Denken (`HeinzCaps`), Modellsheet, Vollbild-Editor | 2826–3068 | 243 | `HeinzCaps` | M `lib/bench/caps.js` |
| 20 | Start (`init`) | 3069–3139 | 71 | alles | B (bleibt, wird zum Einstieg) |

Stile (289 Zeilen): was seitenübergreifend ist, liegt bereits in `lib/core.css`; der Rest ist der Prüfstand und kann in `lib/bench/pruefstand.css` (Verhalten gleich, nur anderer Ort). Markup (278 Zeilen) bleibt in `chat.html`.

## 3 Was heute schon Daten ist, was noch nicht

- Schon extern: Personas (`lib/personas.js`), Fähigkeiten der Engines (`lib/capabilities.json`), Matrix und Prüfregeln als Funktionen (`lib/testreihe.js`, ohne DOM).
- Noch im Skript und nach dem Dogma Daten: die Texte von Audit, Code, Creative (`PROMPTS`), die Modus-Presets, Texte der Oberfläche (rund 100 Zeilen), die Achsen der Testreihe (`SR_AXES`), die Prüfsätze des Tempo-Tests. Die Sonden S1 bis S8 stehen noch nicht im Code (nur im Konzept 21), sie kommen später als Datei.
- Ergebnisse (`heinz_speedtest`, `heinz_series`, Unterhaltungen) liegen in `localStorage` und werden vom Skript direkt gelesen und geschrieben. Das ist die Naht für den Strang Speicher (Abschnitt 5).

## 4 Befunde, die den Umbau bestimmen

1. **Tests greifen auf Seitennamen zu.** In `tests/test_pages.py` kommen 57 Namen aus dem Skript vor (zum Beispiel `settings` 36×, `t` 36×, `MODELS`, `onSlider`, `renderRing`, `setParamSrc`, `srStart`, `buildOptions`, `closeAll`, `newChat`, `chatHistory`). Das geht heute, weil klassische Skripte ihre Funktionen und auch `const`/`let` global sichtbar lassen. **Module legen keine globalen Namen an**; ohne Gegenmaßnahme würden die Tests rot.
2. **86 Inline-Handler** (`onclick="srPlan()"` usw.; häufigste: `srPlan` 10×, `showPage` 6×, `onSlider` 4×) finden Funktionen in Modulen nicht.
3. **Startreihenfolge:** Module laufen verzögert. Sprache, Thema und Einstellungen müssen vor dem ersten Zeichnen stehen; Daten per `fetch` (JSON) sind asynchron, `t()` ist aber synchron und wird überall aufgerufen.
4. **Offline:** `sw.js` ist „Netzwerk zuerst, sonst Zwischenspeicher“ und füllt den Zwischenspeicher **beim ersten Abruf selbst**; eine feste Dateiliste gibt es nicht. Neue Moduldateien und JSON werden also mitgenommen, sofern sie einmal online geladen wurden (der Hinweis im Auftrag auf eine Liste in `sw.js` trifft heute nicht zu).
5. **Regelprüfung:** `tests/test_rules.py` führt `chat.html` als Ausnahme für direkte `fetch`-Aufrufe. Nach dem Umzug müssen die neuen Dateien unter `lib/bench/` dort stehen (Tempo-Test, Testreihe, Vorladen), sonst schlägt die Regel an.
6. **`file://` und Server:** Module und `fetch` für JSON laufen nur über den Server (`localhost:3000`), das ist heute schon die Voraussetzung.

## 5 Vorschlag: Reihenfolge der Umzüge

Verhalten und Aussehen bleiben gleich, nach **jedem** Schritt `bash tests/run_all.sh` grün, je ein Commit. Zwei Entscheidungen vorab, siehe Abschnitt 6.

0. **Sicherheitsnetz.** Eine kleine, dokumentierte Fassade `window.HeinzBench` (nur die von Tests und Inline-Handlern genutzten Namen, im Seitenskript gesetzt). Die Tests greifen über sie zu statt über freie Globalnamen. Noch klassisches Skript, keine Verhaltensänderung. Danach können Module umziehen, ohne dass 90 Teststellen einzeln brechen.
1. **Reine Funktionen und Daten zuerst** (kein Zustand, kein Risiko): Markdown-Parser (Block 1) als `lib/markdown.js`; `PROMPTS` und `MODE_PRESETS` als `lib/modes.json`; Prüfsätze des Tempo-Tests und `SR_AXES`/Standardprompts als `lib/series/*.json`. Die Seite lädt die Daten vor dem Start (eine `await`-Zeile im Einstieg).
2. **Oberflächentexte** (Block 4): `I18N` als zwei JSON-Dateien; `t()` bleibt synchron, die Daten sind vor dem ersten Zeichnen geladen.
3. **Speicherschicht** `lib/store.js` mit **asynchroner Schnittstelle** (`get/set/remove`, Unterhaltungen, Ergebnisse), zunächst weiter auf `localStorage`. Alle Zugriffe auf `heinz_chats`, `heinz_current`, `heinz_speedtest`, `heinz_series` gehen von hier aus. Das ist die Naht für den Strang Speicher (er tauscht nur die Schicht).
4. **Blöcke ohne Rückwirkung auf die übrigen:** Tempo-Test (15), Update (14), Vorlesen/Diktat (10), Pixelanzeige (17), Testreihe (16). Jeweils ein Modul mit `init(ctx)`, Handler per `addEventListener` statt Inline.
5. **Blöcke mit viel gemeinsamem Zustand:** Nachrichten (11), Unterhaltungen (12), Senden (13), Einstellungen (6), Modi (8), Parameter-Schnellbereich und Schnittstellenwissen (18, 19), Engine (3), Vorladen (7), Status (9). Gemeinsamer Zustand liegt in `lib/bench/state.js` (ein Objekt, das alle Module importieren), nicht mehr in freien Globalnamen.
6. **Inline-Handler** schrittweise durch `data-action` plus eine Zuordnungstabelle ersetzen, Modul für Modul, nicht alles auf einmal (Fallstrick aus dem Auftrag).
7. **Aufräumen:** `chat.html` enthält nur Markup und den Einstieg `<script type="module">`; `test_rules.py`, `TECHNIK.md` (neue Regel: Prüfverfahren, Prompts, Regeln gehören in Datendateien), `STAND.md` und Verlauf nachführen; Test aus frischem Klon; Handytest-Liste in `docs/HANDYTEST.md` (Unterhaltung, Tempo-Test, Testreihe, Modellwechsel, Sprache, Update).

Erwartete Größe danach: `chat.html` rund 600 Zeilen (Markup, Einstieg, Handlerliste); der Rest in Modulen zwischen 60 und 250 Zeilen, die Texte in JSON.

## 6 Entscheidungen, die ich vom Entwickler brauche

1. **Stufenweise Module (Vorschlag):** zuerst Daten und reine Funktionen, dann Blöcke, zuletzt die zustandsreichen. Alternative: erst nur in mehrere **klassische** Skriptdateien teilen (gleicher globaler Namensraum, kein Risiko für Tests und Handler) und später auf Module umstellen. Das ist ein Zwischenschritt mit weniger Risiko, aber mehr Arbeit insgesamt; ich empfehle Schritt 0 (Fassade) plus Module.
2. **Fassade `HeinzBench` und Anpassung der Tests:** Die Tests ändern sich an rund 90 Stellen (nur der Zugriffsweg). Einverstanden?
3. **Berührt das Fundament?** Neue Dateien unter `lib/` (`markdown.js`, `store.js`, `lib/bench/`) liegen im Fundamentordner. `lib/core.*` und `lib/providers.js` bleiben unberührt; ich lege nur Neues an. Bitte bestätigen, dass das ohne weitere Abstimmung geht (laut Anweisung frage ich vor jedem Eingriff ins Fundament).
4. **Menü:** bleibt, wie es ist (Beschluss 12.11.). Es zieht in Schritt 5 nur mit um (Block 17), ohne Änderung; spätere Menüänderungen laufen dann auf den neuen Strukturen.
5. **Sonden S1 bis S8:** sollen sie in diesem Strang als Datendatei angelegt werden oder später im Strang Chat? Im Code gibt es sie noch nicht.

## 7 Nicht auf dem Gerät geprüft

Diese Inventur ist gelesen, nicht gelaufen. Nach dem Umbau gilt weiter: simuliert getestet ist nicht am Handy bestätigt.
