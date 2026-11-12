# AIUIheinz – Module (ES-Module ohne Build)

Angelegt am 12.11.2026 im Strang AIUIheinz-Fundament (`docs/agent/AUFTRAG_Fundament.md`). Beschreibt, wie der Code der Web-App in Dateien gegliedert ist, welche Regeln für Module gelten und wer wen importiert. Fachliches steht in `docs/agent/TECHNIK.md` (Abschnitt „ES-Module“), das Verfahren in `docs/agent/UEBERGABE.md`.

**Stand 12.11.2026:** Umgestellt sind das Dashboard (`dashboard.html` plus `lib/dashboard/*.js`) und Heinz Chat (`chat.html` plus `lib/chat/*.js`). Die Bibliotheken unter `lib/` sind noch klassische Skripte und werden vom Modul `lib/dashboard/base.js` aus `window.*` gelesen. Hub und Tool-Seiten folgen in den weiteren Schritten des Auftrags; dieser Abschnitt wird mit jedem Schritt ergänzt.

## Regeln

1. **Ein Einstiegsmodul je Seite.** Die Seite lädt genau ein Modul (`<script type="module" src="lib/dashboard/main.js">`). Verdrahtung und Start stehen nur dort. Kein Inline-Skript in der Seite.
2. **Importpfade** relativ zur importierenden Datei, mit Endung `.js` (`import { t } from './i18n.js'`). Keine Ordner-Importe, keine Importmap, kein Build.
3. **Zustand in einem Objekt.** Veränderliche Werte, die mehrere Dateien lesen oder setzen, stehen im Objekt `state` (`lib/dashboard/state.js`) und werden als `state.feld = wert` gesetzt, nie als einzelne `export let` (Importe sind schreibgeschützt, eine Zuweisung in einer anderen Datei ändert nur eine lokale Kopie oder wirft einen Fehler). Objekte, die nie ersetzt, nur geändert werden (`settings`, Tabellen), dürfen `export const` sein. Werte, die nur eine Datei braucht, bleiben dort lokal (`let` in der Datei, nicht exportiert).
4. **Kreise sind im Dashboard Stand des Codes und erlaubt, wenn beim Laden nichts Importiertes benutzt wird.** Die 19 Dateien `config` bis `update` plus `init` bilden eine zusammenhängende Gruppe, weil sie früher einen gemeinsamen globalen Namensraum hatten (Graph unten). Das ist nur sicher, solange auf oberster Ebene einer Datei (außerhalb von Funktionen) keine importierte Bindung benutzt wird; sie wird erst beim Aufruf einer Funktion gebraucht. Ausnahmen: Bindungen aus `base.js` (Blatt ohne Importe, wird immer zuerst ausgewertet) und das Einstiegsmodul `main.js`. Ein Test (`test_every_module_file_loads_as_the_first_module_of_a_page`) importiert jede Datei einzeln als erstes Modul einer frischen Seite; wer beim Laden eine Bindung benutzt, bricht dort ab. **Neue Dateien bilden keine neuen Kreise:** eine neue Datei darf Dateien der Gruppe importieren, aber keine Datei der Gruppe darf sie importieren (sie liegt darüber, zum Beispiel wie `init.js`), oder sie importiert nur Blätter (`base.js`, `state.js`). Gemeinsames kommt in eine tiefere Datei. Der Abbau der bestehenden Gruppe ist eine eigene Aufgabe (nicht Teil des Umbaus).
5. **Klassische Bibliotheken nur über `base.js`.** `lib/dashboard/base.js` liest `window.HeinzProviders`, `window.HeinzStore` usw. und reicht sie als benannte Exporte weiter (`PV`, `HeinzStore`, `Heinz`, `HeinzCaps`, `HeinzSeries`, `HeinzPersonas`, `HeinzDashboardData`, `esc`, `parseOfflineMarkdown`), dazu den Kurzzugriff `$`. Keine andere Datei liest `window.Heinz*` (Test; gilt für `lib/dashboard/` und `lib/chat/`, jeweils mit eigener `base.js`). Wird eine Bibliothek zum Modul (Schritt 4), ändern sich nur die Zeilen in `base.js`.
6. **Kopf-Block und Sicherheitsnetz bleiben klassisch.** Thema und Sprache im `<head>` (`lib/core.js`, gegen Aufblitzen) und `lib/dashboard/failsafe.js` (zeigt das rote Band mit Update/Neu laden, wenn ein Modul nicht lädt oder der Start nach 6 s nicht fertig ist) sind klassische Skripte ohne Importe, damit sie auch dann laufen, wenn der Modulgraph versagt.
7. **Module sind strikt** (`"use strict"` gilt automatisch): Zuweisung an nicht deklarierte Namen, `with`, Oktalzahlen und doppelte Parameternamen werfen Fehler. Funktionen auf oberster Ebene sind **keine** `window`-Eigenschaften mehr; was Tests oder die Konsole brauchen, steht in der Fassade `window.HeinzDashboard` (`main.js`). Tests ersetzen keine Funktionen der Seite (`window.copyText = …` geht nicht mehr); sie ersetzen Browser-Schnittstellen (`navigator.clipboard`, `window.confirm`).
8. **Seiteneffekte beim Laden** (Ereignis-Listener, Aufbau von Bedienelementen) stehen in der Datei, zu der sie gehören, und laufen, wenn die Datei ausgewertet wird. Die Tabelle `ACTIONS` (`actions.js`) wird als reiner Seiteneffekt-Import in `main.js` eingebunden (`import './actions.js'`).

## Ordnerplan

| Ort | Inhalt | Art |
|---|---|---|
| `lib/*.js` | Bibliotheken (`core`, `providers`, `store`, `markdown`, `pixel`, `dashboarddata`, `testreihe`, `personas`) | noch klassisch, Schritt 4 macht Module daraus |
| `lib/dashboard/*.js` | Dashboard (`dashboard.html`) | Module; `main.js` ist der Einstieg, `failsafe.js` klassisch |
| `lib/chat/*.js` | Heinz Chat (`chat.html`) | Module; `main.js` ist der Einstieg |
| `lib/data/*.json` | Daten (Texte, Modi, Prüfsätze, Fähigkeiten) | Daten, keine Module |
| `tools/<id>/` | Tool-Seiten | Schritt 3 |

## Dateien des Dashboards und was sie importieren

Blätter (importieren nichts): `base.js` (Brücke zu den klassischen Bibliotheken und `$`), `state.js` (`settings`, `state`, `FALLBACK_MODELS`). Einstieg: `main.js` (Fassade `HeinzDashboard`, `initDashboard()`); Seiteneffekt-Datei: `actions.js` (Tabelle `ACTIONS` und die drei Listener für `data-click`/`data-input`/`data-change`).

| Datei | Inhalt | importiert |
|---|---|---|
| `base.js` | Brücke, `$` | – |
| `state.js` | Zustand | – |
| `persist.js` | Hinweisband bei Speicherproblemen, Info-Zeile, Einstellungen und aktuelle Unterhaltung sichern | base, caps, i18n, state |
| `i18n.js` | Texte `t()`, `applyI18n()` | caps, conversations, engine, menu, messages, persist, preload, state |
| `config.js` | Modellliste, Modell laden | base, caps, i18n, persist, preload, quick, settings, state, status |
| `engine.js` | Engine-Wahl, Online, Verbindungsdaten | base, caps, config, i18n, menu, persist, preload, quick, settings, state, status |
| `settings.js` | Regler, Threads, Systemprompt, „In den Chat übernehmen“ | base, caps, i18n, messages, persist, preload, quick, send, state |
| `preload.js` | Vorladen, Modusleiste, Sprachknopf | base, caps, config, conversations, engine, i18n, menu, persist, quick, send, settings, speech, state, status |
| `status.js` | Statusring | base, caps, i18n, pixelbar, state |
| `speech.js` | Vorlesen | caps, engine, i18n, state |
| `messages.js` | Nachrichten zeichnen, Kennzahlen, Kopieren | base, caps, i18n, menu, pixelbar, speech, state |
| `conversations.js` | Unterhaltungen, Liste, Auswahl | base, caps, config, i18n, init, menu, messages, persist, state |
| `send.js` | Senden, Abbruch, Anfrage bauen | base, caps, i18n, messages, persist, pixelbar, preload, quick, settings, state, status |
| `update.js` | Update, Version | base, i18n, state |
| `speedtest.js` | Tempo-Test | base, config, i18n, messages, persist, settings, state |
| `series.js` | Testreihen | base, caps, i18n, messages, preload, quick, send, state |
| `menu.js` | Menü, Seiten, Sicherung, Export | base, caps, conversations, i18n, persist, series, state, update |
| `pixelbar.js` | Pixelanzeigen, Equalizer, Modellchip | base, i18n, state |
| `quick.js` | Schnellblatt, Parameter, Engine-Karten | base, caps, engine, i18n, menu, messages, persist, preload, settings, state |
| `caps.js` | Fähigkeitszellen, Regler-Zustände, Modellblatt | base, conversations, i18n, menu, persist, pixelbar, preload, quick, send, series, settings, state |
| `init.js` | Start: Daten laden, Einstellungen einsetzen, Oberfläche aufbauen | base, caps, config, conversations, engine, i18n, messages, persist, preload, quick, series, settings, speedtest, state, status, update |
| `actions.js` | Aktionstabelle `ACTIONS`, Listener | base, caps, config, conversations, engine, menu, messages, persist, preload, quick, send, series, settings, speech, speedtest, state, update |
| `main.js` | Einstieg, Fassade `HeinzDashboard`, Start | fast alle (siehe Datei) |
| `failsafe.js` | Sicherheitsnetz (klassisch) | – |

Die Gruppe `caps`, `config`, `conversations`, `engine`, `i18n`, `init`, `menu`, `messages`, `persist`, `pixelbar`, `preload`, `quick`, `send`, `series`, `settings`, `speech`, `speedtest`, `status`, `update` ist gegenseitig verbunden (Regel 4). `base`, `state`, `actions` und `main` liegen außerhalb der Gruppe.

## Zustandsfelder (`state`)

`PROMPTS`, `MODELS`, `modelsFor`, `MODE_PRESETS`, `I18N` (Daten, die `init.js` nach dem Laden setzt), `chatHistory`, `currentAbortController`, `generating`, `currentSavedId`, `currentName`, `activeAdopted`, `preloadAbort`, `preloadKey`, `preloadReady`, `loadedNames`, `speaking`, `lastStats`, `selMode`, `updState`, `speedTesting`, `stRows`, `stMeta`, `ST_SHORT`, `ST_LONG`, `seriesRunning`, `srRuns`, `srMeta`, `SR_AXES`, `chipPx`, `eqPx`, `gotToken`, `qStatus`, `qLockEng`, `modelFromPanel`. Ein neues Feld kommt nur dazu, wenn mindestens zwei Dateien es brauchen und es neu zugewiesen wird; sonst bleibt der Wert lokal.

## Neues Modul anlegen und testen

1. Datei unter `lib/<bereich>/name.js`, Kopfkommentar mit Zweck und Hinweis auf dieses Dokument; `import` was gebraucht wird (Pfad mit `./` und `.js`), `export` nur, was andere Dateien nutzen.
2. Zustand, den auch andere Dateien brauchen, als Feld in `state.js` anlegen (Anfangswert dort, nur Literale; kein Import in `state.js`).
3. Nichts Importiertes auf oberster Ebene benutzen (Regel 4). Browser-Zugriffe wie `document.getElementById` auf oberster Ebene sind erlaubt: Module laufen nach dem Seitenaufbau.
4. Bedienelemente über `data-click`/`data-input`/`data-change` und einen Eintrag in `ACTIONS` (`actions.js`) anbinden (Regel in `TECHNIK.md`).
5. Tests: `bash tests/run_all.sh rules` (statische Regeln) und `bash tests/run_all.sh first_module` (jede Datei einzeln als erstes Modul laden); Verhalten über die Fassade `HeinzDashboard`.

## Dateien von Heinz Chat

Der Graph ist azyklisch. Blätter: `base.js` (Brücke zu `core.js`, `providers.js`, `store.js`, `$`), `state.js` (Objekt `state`: `S`, `chats`, `cur`, `msgs`, `gen`, `abort`, `modelsList`, `modelsFor`, `stLast`, `gotTok`, `preAbort`, `preKey`). Darüber: `i18n`, `markdown`, `status`, `view`, `conversations`, `model`, `send`. `actions.js` enthält die Tabelle `ACTIONS` (bisher: `sheetClose`) und einen Listener für `data-click`. Einstieg `main.js`: `initState()` füllt `state` nach `HeinzStore.open()`, `heinzChatMain()` verdrahtet die Seite wie vorher.

## Gemeinsames von Heinz Chat und Dashboard (nur festgehalten)

Doppelt vorhanden und bewusst nicht zusammengeführt (Verhalten und Aussehen bleiben): die Markdown-Darstellung der Antworten, das Zeichnen der Nachrichten, die Liste der Unterhaltungen und das Modellblatt. Eine gemeinsame Datei unter `lib/` wäre eine eigene Aufgabe mit Test auf beiden Seiten.
