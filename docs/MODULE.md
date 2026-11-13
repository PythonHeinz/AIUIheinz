# AIUIheinz – Module (ES-Module ohne Build)

Angelegt am 12.11.2026 im Strang AIUIheinz-Fundament (`docs/agent/AUFTRAG_Fundament.md`). Beschreibt, wie der Code der Web-App in Dateien gegliedert ist, welche Regeln für Module gelten und wer wen importiert. Fachliches steht in `docs/agent/TECHNIK.md` (Abschnitt „ES-Module“), das Verfahren in `docs/agent/UEBERGABE.md`.

**Stand 12.11.2026:** Umgestellt sind das Dashboard (`dashboard.html` plus `lib/dashboard/*.js`) und Heinz Chat (`chat.html` plus `lib/chat/*.js`). Hub (`index.html`, `hub.html`) und Tool-Seiten (`tools/*/*.html`) haben ihr kleines Skript weiter inline, aber als `type="module"`; die Bibliotheken unter `lib/` sind Module (Schritt 4), nur `lib/core.js` bleibt als klassischer Kopf-Block.

## Regeln

1. **Ein Einstiegsmodul je Seite.** Die Seite lädt genau ein Modul (`<script type="module" src="lib/dashboard/main.js">`). Verdrahtung und Start stehen nur dort. Kein Inline-Skript in der Seite.
2. **Importpfade** relativ zur importierenden Datei, mit Endung `.js` (`import { t } from './i18n.js'`). Keine Ordner-Importe, keine Importmap, kein Build.
3. **Zustand in einem Objekt.** Veränderliche Werte, die mehrere Dateien lesen oder setzen, stehen im Objekt `state` (`lib/dashboard/state.js`) und werden als `state.feld = wert` gesetzt, nie als einzelne `export let` (Importe sind schreibgeschützt, eine Zuweisung in einer anderen Datei ändert nur eine lokale Kopie oder wirft einen Fehler). Objekte, die nie ersetzt, nur geändert werden (`settings`, Tabellen), dürfen `export const` sein. Werte, die nur eine Datei braucht, bleiben dort lokal (`let` in der Datei, nicht exportiert).
4. **Keine Kreise.** Die Dateien eines Ordners liegen in Ebenen; eine Datei importiert nur Dateien tiefer liegender Ebenen. Braucht eine untere Datei etwas von oben, gibt es der Reihe nach: (a) das Gemeinsame in eine tiefere Datei legen, (b) einen Rückruf über `hooks.js` („neu zeichnen“, „Zustand geändert“), (c) einen Wert in `state` ablegen. Keine dynamischen `import()` als Umgehung. Der Test `test_the_import_graph_of_the_module_folders_has_no_cycle` prüft `lib/dashboard/` und `lib/chat/`; `test_every_module_file_loads_as_the_first_module_of_a_page` lädt jede Datei einzeln als erstes Modul.
5. **Bibliotheken nur über `base.js`.** `lib/<bereich>/base.js` importiert die Bibliotheken (`import { HeinzStore } from '../store.js'`) und reicht sie weiter (Dashboard: `PV`, `HeinzStore`, `Heinz`, `HeinzCaps`, `HeinzSeries`, `HeinzPersonas`, `HeinzDashboardData`, `esc`, `parseOfflineMarkdown`, `$`). Nur `base.js` darf `../`-Importe haben und `window.Heinz` (die Kernbibliothek) lesen; kein anderes `window.Heinz*` (Test). Die Bibliotheken importieren nichts und setzen weiter `window.X` für Tests und Konsole.
6. **Kopf-Block und Sicherheitsnetz bleiben klassisch.** Thema und Sprache im `<head>` (`lib/core.js`, gegen Aufblitzen; als Modul liefe es erst nach dem ersten Zeichnen) und `lib/dashboard/failsafe.js` (zeigt das rote Band mit Update/Neu laden, wenn ein Modul nicht lädt oder der Start nach 6 s nicht fertig ist) sind klassische Skripte ohne Importe, damit sie auch dann laufen, wenn der Modulgraph versagt.
7. **Module sind strikt** (`"use strict"` gilt automatisch): Zuweisung an nicht deklarierte Namen, `with`, Oktalzahlen und doppelte Parameternamen werfen Fehler. Funktionen auf oberster Ebene sind **keine** `window`-Eigenschaften mehr; was Tests oder die Konsole brauchen, steht in der Fassade `window.HeinzDashboard` (`main.js`). Tests ersetzen keine Funktionen der Seite (`window.copyText = …` geht nicht mehr); sie ersetzen Browser-Schnittstellen (`navigator.clipboard`, `window.confirm`).
8. **Seiteneffekte beim Laden** (Ereignis-Listener, Aufbau von Bedienelementen) stehen in der Datei, zu der sie gehören, und laufen, wenn die Datei ausgewertet wird. Die Tabelle `ACTIONS` (`actions.js`) wird als reiner Seiteneffekt-Import in `main.js` eingebunden (`import './actions.js'`).

## Ordnerplan

| Ort | Inhalt | Art |
|---|---|---|
| `lib/*.js` | Bibliotheken (`providers` mit `HeinzCaps`, `store`, `markdown`, `pixel`, `dashboarddata`, `testreihe`, `personas`) | Module, Blätter (importieren nichts), exportieren ihr Objekt und setzen weiter `window.X` |
| `lib/core.js` | Thema, Sprache, Kopfzeile, Blätter, Hilfen | klassisches Skript im `<head>` (Kopf-Block), `window.Heinz` |
| `lib/dashboard/*.js` | Dashboard (`dashboard.html`) | Module; `main.js` ist der Einstieg, `failsafe.js` klassisch |
| `lib/chat/*.js` | Heinz Chat (`chat.html`) | Module; `main.js` ist der Einstieg |
| `lib/data/*.json` | Daten (Texte, Modi, Prüfsätze, Fähigkeiten) | Daten, keine Module |
| `tools/<id>/` | Tool-Seiten, `index.html`, `hub.html` | Inline-Modul (`<script type="module">`), kein Inline-Handler (Test) |

## Dateien des Dashboards und was sie importieren

Seit Phase 2 (13.11.2026) gibt es **keine Kreise** mehr: Die Dateien liegen in Ebenen, Importe gehen nur nach unten (Regel 4, Test `test_the_import_graph_of_the_module_folders_has_no_cycle`). Was eine untere Datei von einer oberen braucht („neu zeichnen“, „neu planen“), geht über die Rückrufe in `hooks.js` (Abschnitt „Hooks“). Den Graphen erzeugt `tests/modulegraph.py`; `test_the_module_graph_in_this_document_is_current` meldet, wenn er veraltet ist.

| Datei | Inhalt |
|---|---|
| `base.js` | Brücke zu den Bibliotheken unter `lib/` und `$` |
| `state.js` | Zustand (`settings`, `state`, `FALLBACK_MODELS`, `selIds`) |
| `hooks.js` | Rückrufe nach oben (Liste der Namen und Begründungen) |
| `clipboard.js` | `copyText` |
| `sliders.js` | Regler lesen und setzen |
| `persist.js` | Hinweisband bei Speicherproblemen, Info-Zeile, Einstellungen und aktuelle Unterhaltung sichern, `getSaved` |
| `i18n.js` | Texte `t()`, `applyI18n()` (danach Hook `repaintLang`) |
| `params.js` | Parameterquelle (Modell, Modus, eigene), gespeicherte Werte je Modell, `onSlider` |
| `build.js` | Anfrage bauen: Systemprompt, Nachrichten, Optionen, `sysSrc` |
| `protocol.js` | Texte für „Parameter kopieren“ und das Testprotokoll einer Antwort |
| `status.js` | Statusring |
| `update.js` | Update, Version |
| `pixelbar.js` | Pixelanzeigen, Equalizer, Modellchip |
| `menu.js` | Menü, Seiten, Sicherung, Export |
| `caps.js` | Fähigkeitszellen, Regler-Zustände, Modellblatt |
| `config.js` | Modellliste, Modell laden |
| `engine.js` | Engine-Wahl, Online, Verbindungsdaten |
| `settings.js` | Threads, Systemprompt, „In den Chat übernehmen“, Schnelleinstellungen |
| `speech.js` | Vorlesen |
| `quick.js` | Schnellblatt: Engine-Karten, Online freischalten, Modellblatt aus dem Panel |
| `messages.js` | Nachrichten zeichnen, Kennzahlen, Kopieren |
| `conversations.js` | Unterhaltungen, Liste, Auswahl |
| `preload.js` | Vorladen, Modusleiste, Sprachknopf |
| `send.js` | Senden, Abbruch |
| `series.js` | Testreihen |
| `speedtest.js` | Tempo-Test |
| `init.js` | Start; registriert die Hooks |
| `actions.js` | Aktionstabelle `ACTIONS`, Listener |
| `main.js` | Einstieg, Fassade `HeinzDashboard` |
| `failsafe.js` | Sicherheitsnetz (klassisch) |

<!-- graph:begin -->
Von einem Skript erzeugt (`python3 tests/modulegraph.py --write`), nicht von Hand ändern. Ebene 0 importiert keine Datei des Ordners; jede Datei liegt eine Ebene über ihrer höchsten Abhängigkeit, Importe gehen nur nach unten.

**Dashboard** (`lib/dashboard/`, 30 Dateien)

| Ebene | Datei | importiert |
|---|---|---|
| 0 | `base.js` | – |
| 0 | `clipboard.js` | – |
| 0 | `failsafe.js` | – |
| 0 | `hooks.js` | – |
| 0 | `state.js` | – |
| 1 | `i18n.js` | `hooks`, `state` |
| 1 | `sliders.js` | `base` |
| 2 | `persist.js` | `base`, `hooks`, `i18n`, `state` |
| 2 | `pixelbar.js` | `base`, `i18n`, `state` |
| 2 | `update.js` | `base`, `i18n`, `state` |
| 3 | `menu.js` | `base`, `hooks`, `i18n`, `persist`, `state`, `update` |
| 3 | `params.js` | `base`, `hooks`, `i18n`, `persist`, `sliders`, `state` |
| 4 | `caps.js` | `base`, `hooks`, `i18n`, `menu`, `params`, `persist`, `pixelbar`, `state` |
| 5 | `build.js` | `base`, `caps`, `state` |
| 5 | `protocol.js` | `base`, `caps`, `clipboard`, `sliders`, `state` |
| 5 | `status.js` | `base`, `caps`, `i18n`, `pixelbar`, `state` |
| 6 | `settings.js` | `base`, `build`, `clipboard`, `hooks`, `i18n`, `params`, `persist`, `state` |
| 7 | `config.js` | `base`, `caps`, `hooks`, `i18n`, `params`, `persist`, `settings`, `state`, `status` |
| 8 | `engine.js` | `base`, `caps`, `config`, `hooks`, `i18n`, `menu`, `params`, `persist`, `settings`, `state`, `status` |
| 8 | `speedtest.js` | `base`, `clipboard`, `config`, `i18n`, `persist`, `settings`, `state` |
| 9 | `quick.js` | `base`, `caps`, `engine`, `menu`, `state` |
| 9 | `speech.js` | `caps`, `engine`, `i18n`, `state` |
| 10 | `messages.js` | `base`, `caps`, `clipboard`, `i18n`, `menu`, `pixelbar`, `speech`, `state` |
| 11 | `conversations.js` | `base`, `caps`, `clipboard`, `config`, `hooks`, `i18n`, `menu`, `messages`, `persist`, `state` |
| 12 | `preload.js` | `base`, `build`, `caps`, `config`, `conversations`, `engine`, `i18n`, `menu`, `params`, `persist`, `settings`, `speech`, `state`, `status` |
| 13 | `send.js` | `base`, `build`, `caps`, `i18n`, `messages`, `persist`, `pixelbar`, `preload`, `protocol`, `state`, `status` |
| 14 | `series.js` | `base`, `caps`, `clipboard`, `i18n`, `preload`, `protocol`, `send`, `state` |
| 15 | `actions.js` | `base`, `caps`, `config`, `conversations`, `engine`, `menu`, `messages`, `params`, `persist`, `preload`, `protocol`, `quick`, `send`, `series`, `settings`, `speech`, `speedtest`, `state`, `update` |
| 15 | `init.js` | `base`, `caps`, `config`, `conversations`, `engine`, `hooks`, `i18n`, `menu`, `messages`, `params`, `persist`, `preload`, `quick`, `send`, `series`, `settings`, `sliders`, `speedtest`, `state`, `status`, `update` |
| 16 | `main.js` | `actions`, `base`, `build`, `caps`, `config`, `conversations`, `engine`, `i18n`, `init`, `menu`, `messages`, `params`, `persist`, `pixelbar`, `preload`, `protocol`, `quick`, `send`, `series`, `settings`, `speech`, `state`, `status` |

**Heinz Chat** (`lib/chat/`, 11 Dateien)

| Ebene | Datei | importiert |
|---|---|---|
| 0 | `base.js` | – |
| 0 | `state.js` | – |
| 1 | `actions.js` | `base` |
| 1 | `i18n.js` | `base` |
| 1 | `markdown.js` | `base` |
| 2 | `status.js` | `base`, `i18n`, `state` |
| 3 | `view.js` | `base`, `i18n`, `markdown`, `state`, `status` |
| 4 | `conversations.js` | `base`, `i18n`, `state`, `view` |
| 5 | `model.js` | `base`, `conversations`, `i18n`, `state`, `view` |
| 6 | `send.js` | `base`, `conversations`, `i18n`, `model`, `state`, `status`, `view` |
| 7 | `main.js` | `actions`, `base`, `conversations`, `i18n`, `model`, `send`, `state`, `status`, `view` |

<!-- graph:end -->

## Hooks (`lib/dashboard/hooks.js`)

Ein Hook ist ein benannter Rückruf: `hooks.call('renderQuick')` in einer unteren Datei, `hooks.on('renderQuick', renderQuick)` in `init.js`. Es gibt genau eine Umsetzung je Name, der Rückgabewert wird durchgereicht. Hooks sind **versteckte Abhängigkeiten**; deshalb nur für „neu zeichnen“ und „Zustand hat sich geändert“, nie für Fachlogik, und jeder Name steht mit Begründung in `HOOKS` (Test: genannt, in `init.js` registriert, aufgerufen). Vor einem neuen Hook prüfen: lässt sich das Gemeinsame in eine tiefere Datei legen (so geschehen mit `clipboard`, `sliders`, `params`, `build`, `getSaved`, `selIds`)? Die Hooks werden in `init.js` beim Laden der Datei registriert, vor jedem Aufruf (Aufrufe geschehen erst nach dem Start).

## Zustandsfelder (`state`)

`PROMPTS`, `MODELS`, `modelsFor`, `MODE_PRESETS`, `I18N` (Daten, die `init.js` nach dem Laden setzt), `chatHistory`, `currentAbortController`, `generating`, `currentSavedId`, `currentName`, `activeAdopted`, `preloadAbort`, `preloadKey`, `preloadReady`, `loadedNames`, `speaking`, `lastStats`, `selMode`, `updState`, `speedTesting`, `stRows`, `stMeta`, `ST_SHORT`, `ST_LONG`, `seriesRunning`, `srRuns`, `srMeta`, `SR_AXES`, `chipPx`, `eqPx`, `gotToken`, `qStatus`, `qLockEng`, `modelFromPanel`. Ein neues Feld kommt nur dazu, wenn mindestens zwei Dateien es brauchen und es neu zugewiesen wird; sonst bleibt der Wert lokal.

## Neues Modul anlegen und testen

1. Datei unter `lib/<bereich>/name.js`, Kopfkommentar mit Zweck und Hinweis auf dieses Dokument; `import` was gebraucht wird (Pfad mit `./` und `.js`), `export` nur, was andere Dateien nutzen.
2. Zustand, den auch andere Dateien brauchen, als Feld in `state.js` anlegen (Anfangswert dort, nur Literale; kein Import in `state.js`).
3. Nichts Importiertes auf oberster Ebene benutzen (Ausnahme: `init.js` und `main.js` als oberste Dateien). Browser-Zugriffe wie `document.getElementById` auf oberster Ebene sind erlaubt: Module laufen nach dem Seitenaufbau.
4. Bedienelemente über `data-click`/`data-input`/`data-change` und einen Eintrag in `ACTIONS` (`actions.js`) anbinden (Regel in `TECHNIK.md`).
5. Tests: `bash tests/run_all.sh rules` (statische Regeln) und `bash tests/run_all.sh first_module` (jede Datei einzeln als erstes Modul laden); Verhalten über die Fassade `HeinzDashboard`.

## Dateien von Heinz Chat

Der Graph ist azyklisch. Blätter: `base.js` (Brücke zu `core.js`, `providers.js`, `store.js`, `$`), `state.js` (Objekt `state`: `S`, `chats`, `cur`, `msgs`, `gen`, `abort`, `modelsList`, `modelsFor`, `stLast`, `gotTok`, `preAbort`, `preKey`). Darüber: `i18n`, `markdown`, `status`, `view`, `conversations`, `model`, `send`. `actions.js` enthält die Tabelle `ACTIONS` (bisher: `sheetClose`) und einen Listener für `data-click`. Einstieg `main.js`: `initState()` füllt `state` nach `HeinzStore.open()`, `heinzChatMain()` verdrahtet die Seite wie vorher.

## Gemeinsames von Heinz Chat und Dashboard (nur festgehalten)

Doppelt vorhanden und bewusst nicht zusammengeführt (Verhalten und Aussehen bleiben): die Markdown-Darstellung der Antworten, das Zeichnen der Nachrichten, die Liste der Unterhaltungen und das Modellblatt. Eine gemeinsame Datei unter `lib/` wäre eine eigene Aufgabe mit Test auf beiden Seiten.

## Hub und Tool-Seiten

Inline-Module sind erlaubt, weil die Seiten klein sind und keine Funktionen an `window` erwarten. Folgen der Strenge: Funktionen und `var` auf oberster Ebene sind keine `window`-Eigenschaften. Der Design-Katalog (`tools/design/index.html`) setzt deshalb `window.CATALOG` und `window.FUNCS` ausdrücklich, weil Tests sie lesen. Der Beispielknopf des Schnellblatts im Katalog hat keinen Inline-Handler mehr (`id="open-bsheet"` plus Listener, wie beim Blatt); das kopierbare Markup zeigt dadurch nur den Knopf.
