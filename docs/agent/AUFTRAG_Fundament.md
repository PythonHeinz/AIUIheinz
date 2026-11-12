# AUFTRAG Fundament (Strang AIUIheinz-Fundament)

Neuer Strang, angelegt 12.11.2026 im Root-Strang (Beschluss des Entwicklers: Der Umbau betrifft die Basis aller Seiten und gehört keinem Modul-Strang). Strangname: **AIUIheinz-Fundament**. Der Strang ist Konstrukteur; Konzept und Querprüfung bleiben im Root-Strang.

## Ziel
Die ganze Web-App läuft auf **ES-Modulen ohne Build** (`<script type="module">`). Danach erfolgen alle weiteren Ausbauschritte modular: kleine Dateien mit ausdrücklichen `import`/`export`, kein gemeinsamer globaler Namensraum, jede Datei einzeln testbar. Verhalten und Aussehen bleiben **unverändert**; es ist ein reiner Umbau.

## Ausgangslage (Stand `4c47d71`, 12.11.2026, geprüft im Root-Strang)
- Kein `type="module"`, kein `export`, kein `import` im ganzen Repo. Alle 28 JS-Dateien sind klassische Skripte mit Namensraum an `window` (`Heinz`, `HeinzStore`, `HeinzProviders`, `HeinzCaps`, `HeinzMarkdown`, `HeinzDashboardData`, `HeinzSeries`; `personas.js` hängt an `HeinzProviders`).
- `dashboard.html`: 19 Dateien `lib/dashboard/*.js` (282 Namen auf oberster Ebene, **gemeinsam genutzter veränderlicher Zustand** wie `settings`, `chatHistory`, `generating`, `currentAbortController` in `state.js`), zwei Inline-Skripte, 0 Inline-Handler. Schritt 6 (Inline-Handler → `data-click`/`data-input`/`data-change` plus `ACTIONS` in `lib/dashboard/actions.js`) ist erledigt; die Fassade `HeinzDashboard` ist der feste Zugriff der Tests (132 Stellen in `tests/test_pages.py`).
- `chat.html` (Heinz Chat): ein Inline-Skript (rund 26 KB, 73 Namen), 2 Inline-Handler, lädt `core`, `providers`, `store`.
- `index.html` und `tools/*`: `lib/core.js` plus ein Inline-Skript, 0 bis 1 Inline-Handler. `hub.html` nur Inline.
- `lab.html`, `sheet.html`, `vitals.html`: nur Inline-Skript, laden keine `lib/`-Dateien, 35 Inline-Handler, rufen Ollama direkt auf (Ausnahme in `tests/test_rules.py`).
- `server.py` liefert `.js` als `text/javascript` (Pflicht für Module, ist gesetzt). `sw.js`: Netz zuerst, Cache als Rückfall; Module werden automatisch mitgecacht.

## Warum von oben nach unten
Ein Modul läuft **nach** dem Seitenaufbau und nach allen klassischen Skripten und sieht deren globale Namen. Ein klassisches Skript sieht ein Modul **nicht**. Würde man zuerst `lib/core.js` zum Modul machen, bräche jede Seite, die es klassisch lädt. Deshalb:

1. **Zuerst die Verbraucher** (Seitencode, `lib/dashboard/*`, Chat-Skript, Tool-Seiten) zu Modulen machen; sie lesen die noch klassischen Bibliotheken über `window.*`.
2. **Dann die Bibliotheken** zu Modulen mit benannten Exporten machen und die Zugriffe über `window.*` durch `import` ersetzen.
3. Die `window.*`-Zuweisungen der Bibliotheken bleiben als dokumentierter Zugriff für Tests und Konsole (`HeinzStore` usw.), sie sind keine Abhängigkeit des Codes mehr.

## Aufgaben (Reihenfolge einhalten; nach **jedem** Schritt alle Tests grün, ein Commit je Schritt, pushen)

### Schritt 0 – Vorbereitung
1. Lesen: `STAND.md`, `UEBERGABE.md`, `TECHNIK.md` (Fallstricke, „Schlankes Web-UI“, „Bedienelemente des Dashboards“, „Tests laufen parallel“), `docs/DASHBOARD_INVENTUR.md`, `docs/LOKALE_MODELLE.md`, `docs/DESIGN.md` 7.
2. Sicherungsbranch `sicherung/vor-es-module-2026-11-12` (Tag-Push geht aus dem Container nicht). Zeile unter „Aktive Arbeit“ eintragen und sofort pushen (berührt: `lib/`, `dashboard.html`, `chat.html`, `index.html`, `hub.html`, `tools/*`, `tests/`, `sw.js`).
3. **`docs/MODULE.md` anlegen** (kurz): Ordnerplan, Regeln und Abhängigkeitsgraph der Dateien (wer importiert wen, keine Kreise). Vorschlag für die Regeln, im Strang prüfen und festschreiben:
   - Eine Seite lädt genau **ein** Einstiegsmodul (`<script type="module" src="lib/dashboard/main.js">`); Verdrahtung und Start nur dort.
   - Importpfade relativ zur importierenden Datei, mit Endung `.js`. Keine Ordner-Importe, kein Importmap, kein Build.
   - Zustand in **einem** Objekt (`export const state = {…}`) je Bereich; veränderliche Werte nie als einzelne `export let` (andere Module dürfen importierte Bindungen nicht neu zuweisen). Funktionen setzen Felder, nicht Variablen.
   - Keine Kreis-Importe: Gemeinsames in eine tiefere Datei; Rückrufe (zum Beispiel `renderAll` aus `state.js`) über eine kleine Registrierung (`state.on('change', fn)`) oder über `ACTIONS`.
   - Der Kopf-Inline-Block für Thema/Sprache (gegen Aufblitzen) bleibt **klassisch** im `<head>`.
   - Module sind strikt (`"use strict"`): implizite Globale, `with`, Oktalzahlen, Zuweisung an nicht deklarierte Namen werfen Fehler. Funktionen auf oberster Ebene werden **nicht** mehr zu `window`-Eigenschaften.
   - `window.HeinzDashboard` (Fassade) bleibt, wird im Einstiegsmodul gesetzt, `ready` wie bisher.

### Schritt 1 – Dashboard: `lib/dashboard/*` zu Modulen (Verbraucher zuerst)
1. Eine Datei nach der anderen, in der Reihenfolge des Graphen (Blätter zuerst): jede Datei bekommt `export` für das, was andere brauchen, und `import` für das, was sie nutzt. `state.js` wird das Zustandsobjekt (alle `let`-Variablen der Datei werden Felder von `state`; alle Verwendungen im Code umstellen).
2. Zugriff auf die Bibliotheken zunächst als `const { HeinzStore } = window;` am Dateianfang (Brücke bis Schritt 4).
3. `lib/dashboard/main.js`: Einstieg, importiert alles, setzt `ACTIONS` und die Fassade, startet wie das bisherige `init`. `dashboard.html` lädt nur noch dieses Modul (plus die klassischen Bibliotheken und den Kopf-Block). Die zwei Inline-Skripte der Seite wandern in `main.js` bzw. entfallen.
4. Fassade `HeinzDashboard` und `ACTIONS` bleiben das feste Gegenstück für die Tests; `tests/test_pages.py` darf sich **nicht** ändern müssen (außer Wartezeit auf `HeinzDashboard.ready`). Wenn ein Test geändert werden muss, ist das ein Befund und gehört in den Verlauf.
5. Test: neuer Regeltest in `tests/test_rules.py`: Seite lädt Einstiegsmodul, kein klassisches Skript unter `lib/dashboard/`, keine freien Globalnamen zwischen den Dateien (Prüfung zum Beispiel, indem jede Datei einzeln in einer leeren Seite importiert wird und sich ohne Fehler laden lässt, soweit ihre Importe es zulassen).

### Schritt 2 – Heinz Chat: `chat.html` zum Modul
1. Das Inline-Skript (26 KB) in `lib/chat/*.js` zerlegen (Vorschlag: `state`, `i18n`, `messages`, `conversations`, `send`, `model`, `main`), gleiche Regeln wie Schritt 1. Die zwei Inline-Handler durch `data-click` plus Tabelle ersetzen (wie im Dashboard).
2. Schnittstellen zum Dashboard bleiben unverändert: `HeinzProviders` (`runtime`, `activeModel`, `chatSystemFor`, `chatSamplingFor`), die Schlüssel `heinz_active`, `heinz_chat_system`, `heinz_chat_options`, `heinz_slim_chats` (über `HeinzStore`), `data-heinz-chat=ready`.
3. Wo Heinz Chat und Dashboard dasselbe tun (Markdown, Nachrichten zeichnen, Unterhaltungsliste, Modellblatt), prüfen, ob eine gemeinsame Datei unter `lib/` entsteht; **nur festhalten** (`docs/MODULE.md`, Abschnitt „Gemeinsames“), nicht in diesem Auftrag zusammenführen, wenn das Verhalten oder Aussehen berührt wird.

### Schritt 3 – Hub und Tool-Seiten
`index.html`, `hub.html`, `tools/setup`, `tools/models`, `tools/filter`, `tools/scan`, `tools/studio`, `tools/design/*`: Inline-Skript zu `type="module"` (bei kleinen Seiten reicht das, wenn sie keine Funktionen an `window` erwarten), den einen Inline-Handler in `tools/design/index.html` ersetzen. `tools/design/index.html` bleibt ein lebender Katalog; prüfen, dass er nach dem Umbau weiter alle Bausteine zeigt.

### Schritt 4 – Bibliotheken zu Modulen (jetzt von unten nach oben)
Reihenfolge nach dem Graphen, vermutlich: `lib/markdown.js`, `lib/pixel.js`, `lib/dashboarddata.js`, `lib/store.js`, `lib/core.js`, `lib/testreihe.js`, `lib/personas.js`, `lib/providers.js` (zuletzt, größte Datei mit 600 Zeilen und Fundament der Modellregeln; **Verhalten nicht ändern**, `docs/LOKALE_MODELLE.md` beachten).
- Je Datei: `export` der Namen, `window.X = X` bleibt als Zugriff für Tests und Konsole; in allen Verbrauchern `const { X } = window;` durch `import` ersetzen; die klassische `<script src>`-Zeile der Seiten entfernen.
- `HeinzCaps` ist an `lib/providers.js` gekoppelt (nach `docs/SCHNITTSTELLEN.md`/`lib/capabilities.json`); die Kopplung vor dem Umbau lesen.
- `lib/store.js`: IndexedDB-Öffnen und Rückfall (`open()`, `onProblem`) dürfen sich nicht ändern; `tests/test_store.py` (11 Tests, echtes IndexedDB) muss unverändert grün bleiben.

### Schritt 5 – Abschluss und Gesamtprüfung
1. Prüfen, dass **kein** klassisches Skript mehr in einer Seite steht außer dem Kopf-Block und den drei alten Seiten (siehe unten). `tests/test_rules.py` bekommt die Regel: kein `<script>` ohne `type="module"` (Ausnahmen als Liste, wie `LEGACY`).
2. `sw.js`: prüfen, ob beim Update (`POST /api/update` plus Neuladen) ein Mischstand aus altem und neuem Modulgraphen entstehen kann (alte Datei aus dem Cache, neue vom Netz). Netz zuerst deckt das meist ab; falls nicht, `CACHE`-Name an `VERSION.txt` koppeln. Ergebnis in `TECHNIK.md` festhalten.
3. Dokumente: `docs/MODULE.md` fertig, `TECHNIK.md` neuer Abschnitt „ES-Module“ (Regeln, Fallstricke, wie man ein Modul anlegt und testet), `docs/DASHBOARD_INVENTUR.md` Nachtrag, `STAND.md` (Module, Stränge, Reihenfolge, Chronik „Berührt Fundament“), `ENTWICKLUNGSVERLAUF.md`, `UEBERGABE.md` (Regel: neue Dateien sind Module).
4. Dem Entwickler sagen, was am Handy zu prüfen ist (siehe Handytest).

### Optional, nur nach Rücksprache (nicht Teil dieses Auftrags): alte Seiten
`lab.html`, `sheet.html`, `vitals.html` auf `HeinzProviders` und Module umstellen (35 Inline-Handler, direkte Ollama-Aufrufe). Erst fragen.

## Fallstricke (im Strang beachten, Fehlschlag meldet sich meist leise)
- **Ausführungsreihenfolge:** Module laufen verzögert. Code, der beim Seitenaufbau sofort laufen muss (Thema, Sprache, Aufblitzen), bleibt klassisch im `<head>`. `HeinzDashboard.ready` und `data-heinz-chat=ready` müssen weiter zum selben Zeitpunkt „bereit“ melden, sonst werden Tests unregelmäßig.
- **Kreis-Importe** laufen oft ohne Fehler, liefern aber `undefined`/TDZ-Fehler erst zur Laufzeit. Den Graphen in `docs/MODULE.md` mit einem kleinen Test absichern (zum Beispiel Skript, das die Importzeilen liest und Kreise meldet).
- **Zustand:** Wer `chatHistory = []` in einer anderen Datei schreibt, ändert nur eine lokale Kopie. Nach dem Umbau jede Zuweisung an einen ehemals globalen Namen suchen (`grep` nach dem Namen und `=`).
- **Funktionen auf `window`:** Alles, was früher über einen globalen Namen aufrufbar war (Tests, `evaluate`, Konsole), geht jetzt nur über die Fassade oder `window.X`. Die 382 `evaluate`-Aufrufe in `tests/test_pages.py` zeigen, was gebraucht wird.
- **Browser-Cache am Handy:** Alte Modulgraphen können nach `git pull` einzeln aus dem Cache kommen. Beim Handytest mit hartem Neuladen und mit der installierten App prüfen.
- **Nie** mehrere Schritte in einen Commit packen; bei Rot zurück zum letzten grünen Stand.

## Tests
- Beim Arbeiten nur betroffene Tests (`bash tests/run_all.sh <Wort>`), vor jedem Push der volle Lauf (parallel, rund 2 Minuten, im Hintergrund starten, weil ein Aufruf im Container auf 120 s begrenzt ist).
- Alles bleibt simuliert (Playwright, simuliertes Ollama). **Nichts als am Gerät geprüft melden**, was nur simuliert lief.
- Mutationstest je neuer Regel (Regel ausschalten oder Fehler einbauen, Test muss rot werden).

## Handytest (vom Entwickler, nach Schritt 1, 2 und 4 jeweils kurz; Anleitung am Ende des Strangs)
Installierte App und normaler Browsertab, je nach hartem Neuladen: Dashboard öffnet, Modell laden und antworten, Regler, Unterhaltungen bleiben erhalten (Speicher), „In den Chat übernehmen“, Heinz Chat öffnet und antwortet, Hub-Kacheln, Update-Knopf. Die Zeit bis zur ersten Antwort darf nicht schlechter werden (4 bis 6 s auf beiden Seiten, Stand 11.11.2026).

## Grenzen
- Kein Umbau von Aussehen, Texten, Verhalten, Schlüsseln, `server.py` (Ausnahme: nichts nötig), `lib/capabilities.json`, Modellregeln.
- Während dieses Strangs ändern die Stränge Dashboard, Chat, Design und Modelle **nichts** an `dashboard.html`, `chat.html`, `lib/*`, `tools/*`, `index.html`, `sw.js` (Eintrag in „Aktive Arbeit“ gilt für alle). Reine Doku und `lib/data/*.json` sind frei, wenn sie `lib/dashboard/*` nicht berühren.
- Strang Modi und Assistent: nicht starten.
- Bei allem, was das Verhalten ändern würde oder was nicht in diesem Auftrag steht: Entwickler fragen.
