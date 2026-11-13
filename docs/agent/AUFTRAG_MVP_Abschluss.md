# AUFTRAG MVP-Abschluss (Strang AIUIheinz-Design)

Angelegt 13.11.2026 im Root-Strang. Gehört zum MVP intern (`docs/agent/MVP.md`, Punkte 4 und 5). Startsatz: „AIUIheinz-Design: nach `docs/agent/AUFTRAG_MVP_Abschluss.md`.“ Vorher lesen: `docs/DESIGN.md`, `docs/DESIGN_DR2.md`, `docs/BEDIENKONZEPT_DASHBOARD.md` (Abschnitt 7: Gestaltung ist ausdrücklich Sache des Designers), `docs/agent/TECHNIK.md`. Vor der ersten Änderung: `git pull --rebase`, Zeile unter „Aktive Arbeit“, pushen. Nur dieser Strang berührt `lib/core.*`, `dashboard.html`, `chat.html`; Fundament-Umbau (neue gemeinsame Schlüssel, Speicher) bleibt ausgeschlossen, bei Bedarf fragen.

## Schritt 0: Rückstau prüfen (klein, vor dem Design)
- (a) `manifest.webmanifest` hat `start_url: "/"` (Hub). Prüfen, ob die installierte App damit nicht mehr im Heinz Chat oder Dashboard „hängt“; falls ein Verweis (Service Worker, Verknüpfungen, `/chat.html` im Cache) noch falsch zeigt, korrigieren. Melden, was der Entwickler am Handy sehen soll.
- (b) „Prüfstand“: Suche in Code, Texten (EN und DE) und Doku; Treffer ersetzen durch „Dashboard“ (Begriffe: `BEGRIFFE.md`). In Code und Texten steht es laut Root-Suche (13.11.) nicht mehr.
- (c) Standard 2 Threads auch im Browsertab (kein gespeicherter Wert): prüfen, dass `DEFAULT_THREADS` gilt und die Standardkonfiguration 2 Threads sendet; Test.
- Personenwechsel durch Laden einer Konfiguration startet eine neue Unterhaltung: Verhalten prüfen und dem Entwickler vorlegen (Vorschlag: Person der Konfiguration wird gewählt, die laufende Unterhaltung bleibt oder wird wie beim Personenwechsel geparkt).

## Schritt 1: Design-Feinschliff (Zeigbarkeit)
1. **Cursorfarbe** (Heinz Chat und Eingabefelder): klären und setzen, in beiden Themes lesbar.
2. **Label „Model name“** im Modellblatt des Dashboards (EN und DE).
3. **Modellblatt des Heinz Chat** (jetzt reine Anzeige): Gliederung lesbar (Konfiguration, Engine, Modell, Person, Prompt, Ton, Laufzeit „geteilt“, Status), kein Eindruck von Bedienelementen, wo keine sind; Link zu „Konfigurationen“ erkennbar.
4. **LED-Darstellung** (Reiter, Personenknopf, Laufzeit): Entscheidung des Designers zwischen kleiner LED unten mittig und Leuchtring mit Abstand (`STAND.md` 2q); danach einheitlich, bei 426 × 803 und 426 × 400, Hell und Dunkel, EN und DE.
5. **DR2 nur soweit nötig:** Punkte aus `DESIGN_DR2.md`, die ein Zeigen an eine zweite Person stören würden. Alles andere bleibt im Becken. Menü-Umbau nicht beauftragt.
6. **Hub:** Kacheln „in Arbeit“ (Lab, Vitals, Tabelle …) so kennzeichnen, dass eine zweite Person nicht an unfertigen Seiten scheitert (nur Kennzeichnung, keine Umbauten dieser Tools).

## Schritt 2: Startanleitung gegen frischen Klon
README und Einstieg (Termux, Ollama, `bash start.sh`, optional `litert-lm serve --cors-origin http://localhost:3000`, Installation als App) gegen den Ist-Zustand lesen und, wo es abweicht, korrigieren. Ein frischer Klon im Container muss mit `bash tests/run_all.sh` grün laufen (Hinweis, was nur am Handy geht). Handytest-Liste `docs/HANDYTEST.md`: Abschnitt für diesen Strang ergänzen.

## Regeln
Alles Sichtbare EN und DE; Farben nur über Variablen; keine neuen Schlüssel; Tests grün; nach jedem Schritt Verlauf und STAND; dem Entwickler sagen, was nur simuliert getestet ist.
