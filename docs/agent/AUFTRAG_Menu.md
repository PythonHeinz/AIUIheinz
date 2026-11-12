# AUFTRAG Menü (Strang AIUIheinz-Menu)

**Stand 12.11.2026:** Phase 0 (Bausteinkatalog) ist erledigt, siehe `ENTWICKLUNGSVERLAUF.md`. Der Entwickler hat entschieden, dass das **Menü des Dashboards vorerst bleibt, wie es ist**. Die Aufgaben unter „Gliederung“ und „Aufgaben“ (neue Gliederung, Zustandsmarke mit Legende, Parameter-Schnellöffner, Modus-Schieberegler) sind deshalb **nicht beauftragt**; sie bleiben als Vorschlag stehen und werden erst nach ausdrücklichem Auftrag gebaut.

Neuer Strang, angelegt 11.11.2026 im Strang AIUIheinz-Design (DR2 Phase B). Strangname: **AIUIheinz-Menu**.

## Ziel
Das Einstellungsmenü das Dashboard-Seite (`dashboard.html`, heute Seitenblatt von rechts mit Hauptmenü, Engine, Tempo-Test, Testreihe, Aussehen, Update, Info) logisch neu ordnen und so umbauen, dass häufige Dinge im Daumenbereich liegen. Das Seitenblatt von rechts **bleibt nur im Dashboard (Heinz UI) der Standard**. Der Heinz Chat (`chat.html`) nutzt ein **Schnellblatt von unten** (`Heinz.sheetOpen`, `.bsheet`).

## Vor dem Start lesen
`docs/agent/STAND.md`, `docs/agent/UEBERGABE.md`, `docs/DESIGN.md`, `docs/DESIGN_DR2.md` (Zonen, Bausteine, Entscheidungen), `docs/agent/AUFTRAG_Modi.md`, `lib/core.css` (`.bsheet`, `.notice`, `.step`, `.cmd`).

## Phase 0: Bausteinkatalog (zuerst, Auftrag des Entwicklers 11.11.2026 13:25)
Anlass: Immer mehr Seiten (Heinz Chat, Setup, Menü, später Scan und Studio) brauchen dieselben Schalter, Pillen, Felder und Blätter. Der Katalog soll die Arbeit beschleunigen und Designänderungen vermeiden. Das Menü braucht die meisten Bausteine und ist der erste Nutzer, daher gehört Phase 0 in diesen Strang (ein Strang im Fundament).
1. **Katalogseite:** `tools/design/index.html` zeigt jeden Baustein aus `lib/core.css` (`.sw`, `.pill`, `.round`, `.ibtn`, `.row` mit `.tile`, `.slidercard`, `.notice`, `.step`, `.cmd`, `.bsheet`, `.sheet`, `.sel-pop`, `.status`/`.led`, `.caps`, `.card`, Eingabefeld) mit Klassenname, kurzer Verwendung und kopierbarem Beispiel, in beiden Themes, EN und DE. Alles, was in `dashboard.html` nur inline steht und wiederkehrt, wird zum benannten Baustein in `lib/core.css` (Verhalten der Seite bleibt gleich).
2. **Verhalten nach `lib/`:** Wiederkehrende Teile als kleine Funktionen in `lib/core.js`, nicht in den Seiten: Schalter mit Speicherung, Blatt öffnen und schließen (`Heinz.sheetOpen` gibt es), Auswahlliste mit Filter, Regler mit Wertanzeige und Zustandsmarke (wirkt, ungeklärt, gesperrt, nur lokal; Legende). Zuerst prüfen, was schon da ist (`Heinz.sheetOpen`, `.sel-pop`), nichts doppelt bauen.
3. **Regel für alle Seiten** in `docs/agent/UEBERGABE.md` (Designregeln) und `docs/DESIGN.md` 7: Erst im Katalog nachsehen; nur bei echter Lücke einen neuen Baustein anlegen und ihn im Katalog nachtragen. Eigene Varianten auf einer Seite sind zu vermeiden.
4. **Tests:** Katalogseite lädt ohne Konsolenfehler, jede dort genannte Klasse existiert in `lib/core.css`, jedes benutzte Symbol im Sprite; Geometrie 426 × 803. Mutation: Klasse aus der CSS entfernen, Test wird rot.
5. **Danach** das Menü (Aufgaben unten) mit den Bausteinen aus dem Katalog.
- Grenzen: `lib/providers.js` und Engine-Aufrufe gehören dem Strang AIUIheinz-Chat (bis dessen Bibliotheksarbeit fertig ist, nicht anfassen); nur `lib/core.css`, `lib/core.js`, `lib/icons.svg`, `tools/design/index.html`. Vor dem Start „Aktive Arbeit“ lesen und eigene Zeile eintragen.

## Gliederung (Vorschlag, mit dem Entwickler abstimmen)
- **Jetzt** (oben, ein Tipp): Engine und Modell, Modus, Schnell | Tief, „Online erlauben“.
- **Messen**: Tempo-Test, Testreihe, Parameter (Modell | Modus | Meine), Prompts.
- **Einrichten**: Engines und Schlüssel, Modelle, Einrichtungsassistent (`/tools/setup/index.html`).
- **App**: Aussehen (Thema, Sprache), Update, Info, Sicherung und Export.

## Aufgaben
1. Gliederung mit dem Entwickler festlegen, Zustand der Regler (wirkt, ungeklärt, gesperrt, nur lokal) einheitlich als Zustandsmarke mit Legende.
2. Schnellöffner für Parameter im Daumenbereich (Schnellblatt von unten) für das Dashboard prüfen; Seitenblatt bleibt für die tiefen Seiten.
3. Modus-Schieberegler: Mockup `tools/design/modus.html` ist bedienbar; Übernahme in das Dashboard erst nach Freigabe (Strang Modi legt die Modi fest, Farben stehen in `MODE_PRESETS`).
4. EN und DE für alle Texte, Tests (Geometrie 426 × 803, Navigation, Speicherung), docs/agent/ENTWICKLUNGSVERLAUF.md und docs/agent/STAND.md pflegen.

## Regeln
- Fundament (`lib/`, `server.py`, gemeinsame localStorage-Schlüssel, Engine-Aufrufe) nur nach Rückfrage; `dashboard.html` berührt auch der Strang AIUIheinz-Chat, Zeile unter „Aktive Arbeit“ eintragen.
- Nichts als am Gerät getestet melden, was nur simuliert lief.
