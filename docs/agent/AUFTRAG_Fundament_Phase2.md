# AUFTRAG Fundament, Phase 2 (Strang AIUIheinz-Fundament)

Angelegt 12.11.2026 im Root-Strang (Beschluss des Entwicklers: **Zusammenführen der doppelten Teile und Abbau der Kreise sind Teil des MVP intern**, `KONZEPT.md` 23). Folgt auf `AUFTRAG_Fundament.md` (Phase 1, Umstellung auf ES-Module, fertig 12.11.2026). Gleicher Strangname: **AIUIheinz-Fundament**; erster Satz im Chat: „AIUIheinz-Fundament: Phase 2 nach `docs/agent/AUFTRAG_Fundament_Phase2.md`.“

## Voraussetzung (nicht starten ohne)
Der Entwickler hat die Modulumstellung (Phase 1) am Handy geprüft und für gut befunden (Liste im Verlauf, `ENTWICKLUNGSVERLAUF.md`, 12.11.2026 Fundament). Sonst baut Phase 2 auf einem ungeprüften Stand.

## Ziel
1. **Das Dashboard hat eine Hierarchie statt einer verschränkten Gruppe:** keine Kreise zwischen den Dateien von `lib/dashboard/`, so dass jede Datei einzeln gelesen, getestet und ersetzt werden kann (Bild: Stückliste mit Baugruppen statt flacher Teileliste ohne Verwendungsnachweis).
2. **Was Heinz Chat und Dashboard doppelt haben, steht einmal** in gemeinsamen Dateien, so dass eine Design- oder Verhaltensänderung nur an einer Stelle gemacht wird.
3. **Nach dem MVP prüft der Entwickler nur noch am Handy** (Leitbild des Entwicklers, 12.11.2026): Jede Änderung ist durch Tests im Container abgesichert, und eine **Prüfliste für das Handy** (`docs/HANDYTEST.md`, bisher „nach Go des Entwicklers“; hiermit freigegeben) sagt je Modul, was am Gerät zu prüfen ist.

Aussehen und Verhalten bleiben **unverändert**, außer der Entwickler hat eine sichtbare Änderung ausdrücklich beschlossen (siehe Schritt 2).

## Ausgangslage (Stand `41d89cf`, im Root-Strang gemessen)
- `lib/dashboard/`: 19 Dateien bilden **eine** zusammenhängende Gruppe (`caps`, `config`, `conversations`, `engine`, `i18n`, `init`, `menu`, `messages`, `persist`, `pixelbar`, `preload`, `quick`, `send`, `series`, `settings`, `speech`, `speedtest`, `status`, `update`), 195 Importe, 25 unmittelbare Zweierkreise (zum Beispiel `send` ↔ `settings`). Blätter: `base`, `state`; außerdem `actions`, `main`, `failsafe` (Einstieg, Tabelle, Sicherheitsnetz). Ursache: früher ein gemeinsamer globaler Namensraum (`docs/MODULE.md`, Regel 4).
- `lib/chat/`: azyklisch.
- Doppelt (laut `docs/MODULE.md`, „Gemeinsames“): Markdown-Darstellung (Chat: `lib/chat/markdown.js`, 22 Zeilen; Dashboard: `lib/markdown.js` mit Syntaxfärbung, 173 Zeilen, **verschieden**), Nachrichten zeichnen (`lib/chat/view.js` gegen `lib/dashboard/messages.js`), Unterhaltungsliste (`lib/chat/conversations.js` gegen `lib/dashboard/conversations.js`), Modellblatt (`lib/chat/model.js` gegen `lib/dashboard/caps.js`/`quick.js`).

## Schritte (ein Commit je Schritt, nach jedem Schritt alle Tests grün)

### Schritt 0 – Vorbereitung
Sicherungsbranch `sicherung/vor-fundament-phase2-<datum>`; Zeile unter „Aktive Arbeit“ eintragen und pushen. Lesen: `docs/MODULE.md`, `TECHNIK.md` („ES-Module“), Verlauf Phase 1, `docs/DESIGN.md` 7. Berührt: `lib/dashboard/*`, `lib/chat/*`, neue Dateien unter `lib/`, `tests/`, `docs/MODULE.md`. Während Phase 2 ändern die Stränge Dashboard, Chat, Design und Modelle nichts an diesen Dateien.

### Schritt 1 – Kreise im Dashboard abbauen
1. **Ebenen festlegen und in `docs/MODULE.md` zeichnen** (Abhängigkeit nur von oben nach unten). Vorschlag zur Prüfung: Ebene 0 `base`, `state`, neues `hooks` (Registrierung, siehe 3); Ebene 1 reine Hilfen ohne Rückgriff nach oben (`i18n` nur `t()`, `status`, `pixelbar`, `persist`, `update`); Ebene 2 Engine, Konfiguration, Einstellungen; Ebene 3 Nachrichten, Unterhaltungen, Senden, Tempo-Test, Testreihen; Ebene 4 Schnellblatt, Modellblatt, Menü, Vorladen; Ebene 5 `init`, `actions`, `main`. Die tatsächliche Einteilung ergibt sich aus der Messung, nicht aus diesem Vorschlag.
2. **Für jeden Importkreis feststellen, warum die untere Datei die obere braucht.** Meist ist es „nach einer Änderung neu zeichnen“ (zum Beispiel `renderCaps`, `renderRing`, `applyI18n`, `saveSettings`) oder ein gemeinsamer Zustandswert.
3. **Lösungen, in dieser Reihenfolge der Vorliebe:** (a) Gemeinsames nach unten verschieben (eine Funktion, die beide brauchen, wandert in die tiefere Datei); (b) **Rückrufe über `hooks.js`**: `hooks.on('renderCaps', fn)` registriert die obere Datei beim Start in `init.js`, die untere ruft `hooks.call('renderCaps')`; (c) Wert statt Funktion in `state` legen. Keine neuen Kreise, keine dynamischen `import()` als Umgehung.
4. **Ergebnis messen:** Regeltest in `tests/test_rules.py`: Der Importgraph von `lib/dashboard/` (und `lib/chat/`) hat **keinen Kreis**; Mutation (einen Rückimport einbauen) muss den Test rot machen. Regel 4 in `docs/MODULE.md` entfällt, der Abschnitt „Dateien des Dashboards“ wird aus dem tatsächlichen Graphen neu geschrieben (am besten von einem Skript erzeugt, nicht von Hand).
5. Die Prüfung „jede Datei lädt einzeln als erstes Modul“ bleibt.

### Schritt 2 – Doppelte Teile prüfen (erst entscheiden lassen, dann bauen)
1. **Inventur, noch ohne Bau:** Tabelle je Doppelung (Markdown, Nachrichten zeichnen, Unterhaltungsliste, Modellblatt, weitere, die beim Lesen auffallen): Funktion, Dateien, **gleich oder verschieden** (Zeile für Zeile verglichen, mit Ausgabe bei gleicher Eingabe), wenn verschieden: worin und ob sichtbar. Ablage `docs/MODULE.md`, Abschnitt „Gemeinsames“.
2. **Entscheidungsvorlage an den Entwickler** für alles, was verschieden ist und sichtbar wäre (zum Beispiel: Heinz Chat zeigt Code ohne Syntaxfärbung, das Dashboard mit; Felder 46 gegen 44 px). Optionen je Punkt: (A) Verhalten des Dashboards, (B) Verhalten des Heinz Chat, (C) beides bleibt als Einstellung. **Ohne Beschluss nichts bauen, was sichtbar ändert.** Gleiche Teile werden ohne Rückfrage zusammengeführt.
3. **Bauen:** gemeinsame Dateien unter `lib/shared/` (Vorschlag: `lib/shared/markdown.js`, `lib/shared/messages.js`, `lib/shared/conversations.js`, `lib/shared/modelsheet.js`; Namen im Strang festlegen). Sie sind **Blätter oder tiefe Ebene**, kennen weder `lib/dashboard/` noch `lib/chat/`; was seitenspezifisch ist (Zustand, Schlüssel, Rückrufe), kommt als Parameter oder über eine kleine Übergabe. Dashboard und Heinz Chat importieren sie. Bibliothek `lib/markdown.js` und `HeinzMarkdown` bleiben als Brücke, solange etwas darauf zugreift (`window.X`), dann entfernen und in `docs/MODULE.md` vermerken.
4. Je zusammengeführtem Teil: Test, dass beide Seiten dieselbe Ausgabe liefern (gleiche Eingabe, gleiches Markup), Mutation geprüft.
5. Schnittstellen zwischen Dashboard und Heinz Chat bleiben unverändert (`HeinzProviders`, Schlüssel `heinz_active`, `heinz_chat_system`, `heinz_chat_options`, `heinz_slim_chats`).

### Schritt 3 – Prüfliste für das Handy und Testlücken
1. **`docs/HANDYTEST.md`** anlegen: je Modul (Hub, Heinz Chat, Dashboard, Tool-Seiten) eine kurze Liste „was am Gerät prüfen“ (Start der installierten App, Browsertab, harte Aktualisierung, Modell laden, Antwort, Regler, Speicher nach Neustart, Update-Knopf, Zeit bis zur ersten Antwort 4 bis 6 s, usw.), ein Ankreuzfeld pro Punkt mit Datum und Stand des Commits. Auslöser: Der Entwickler will nach dem MVP **nur noch am Handy prüfen**.
2. **Testlücken festhalten, nicht alle schließen:** Liste der Module, die kein eigenes Verhalten testen (zum Beispiel nur über die Fassade erreichbar), in `docs/MODULE.md`. Die Kernpfade (Senden, Abbrechen, Speichern, Laden, Update) müssen im Container getestet sein, bevor der Entwickler am Handy prüft.

### Schritt 4 – Abschluss
`docs/MODULE.md` (Graph, Ebenen, Gemeinsames), `TECHNIK.md` (Fallstricke der Hooks, Regel „keine Kreise“), `STAND.md` (Module, Stränge, Chronik „Berührt Fundament“), `ENTWICKLUNGSVERLAUF.md`, `UEBERGABE.md` falls sich eine Regel ändert. Dem Entwickler sagen, was am Handy zu prüfen ist (`docs/HANDYTEST.md`) und was nur simuliert getestet ist.

## Fallstricke
- **Hooks sind versteckte Abhängigkeiten.** Sie ersetzen den Importkreis, verstecken ihn aber, wenn man sie wahllos benutzt. Jeder Hook-Name steht in einer Liste in `hooks.js` mit Erklärung; Rückrufe nur für „neu zeichnen“ und „Zustand hat sich geändert“, nicht für Fachlogik.
- **Reihenfolge beim Start:** `init.js` muss alle Rückrufe registrieren, bevor etwas sie aufruft. `HeinzDashboard.ready` und `data-heinz-chat=ready` melden weiter zum selben Zeitpunkt (sonst werden Tests unregelmäßig).
- **Nichts Sichtbares nebenbei ändern.** Beim Zusammenführen fallen Unterschiede auf (Abstände, Klassen, Schreibweisen); sie gehören in die Entscheidungsvorlage, nicht stillschweigend in den Code.
- **Aussehen und Bausteine:** Vor neuen Klassen in `lib/core.css` in den Design-Katalog sehen (`tools/design/index.html`, `docs/DESIGN.md` 7).
- Bei Rot zurück zum letzten grünen Stand, nie mehrere Schritte in einem Commit.

## Tests
Beim Arbeiten nur betroffene (`bash tests/run_all.sh <Wort>`), vor jedem Push der volle Lauf (parallel, rund 2 Minuten, im Hintergrund starten). Alles bleibt simuliert; **nichts als am Gerät geprüft melden**, was nur simuliert lief. Neue Regeln mit Mutationstest.

## Grenzen
Kein Umbau von Aussehen, Texten, Schlüsseln, `server.py`, `lib/capabilities.json`, Modellregeln. Nicht angefasst werden `lab.html`, `sheet.html`, `vitals.html`. Bei allem, was nicht in diesem Auftrag steht oder sichtbar ändern würde: Entwickler fragen.
