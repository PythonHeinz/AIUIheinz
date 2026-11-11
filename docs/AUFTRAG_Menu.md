# AUFTRAG Menü (Strang AIUIheinz-Menu)

Neuer Strang, angelegt 11.11.2026 im Strang AIUIheinz-Design (DR2 Phase B). Chat-Name: **AIUIheinz-Menu**.

## Ziel
Das Einstellungsmenü der Prüfstand-Seite (`chat.html`, heute Seitenblatt von rechts mit Hauptmenü, Engine, Tempo-Test, Testreihe, Aussehen, Update, Info) logisch neu ordnen und so umbauen, dass häufige Dinge im Daumenbereich liegen. Das Seitenblatt von rechts **bleibt nur im Prüfstand (Heinz UI) der Standard**. Der neue schlanke Chat (`tools/heinz/index.html`) nutzt ein **Schnellblatt von unten** (`Heinz.sheetOpen`, `.bsheet`).

## Vor dem Start lesen
`STAND.md`, `UEBERGABE.md`, `docs/DESIGN.md`, `docs/DESIGN_DR2.md` (Zonen, Bausteine, Entscheidungen), `docs/AUFTRAG_Modi.md`, `lib/core.css` (`.bsheet`, `.notice`, `.step`, `.cmd`).

## Gliederung (Vorschlag, mit dem Entwickler abstimmen)
- **Jetzt** (oben, ein Tipp): Engine und Modell, Modus, Schnell | Tief, „Online erlauben“.
- **Messen**: Tempo-Test, Testreihe, Parameter (Modell | Modus | Meine), Prompts.
- **Einrichten**: Engines und Schlüssel, Modelle, Einrichtungsassistent (`/tools/setup/index.html`).
- **App**: Aussehen (Thema, Sprache), Update, Info, Sicherung und Export.

## Aufgaben
1. Gliederung mit dem Entwickler festlegen, Zustand der Regler (wirkt, ungeklärt, gesperrt, nur lokal) einheitlich als Zustandsmarke mit Legende.
2. Schnellöffner für Parameter im Daumenbereich (Schnellblatt von unten) für den Prüfstand prüfen; Seitenblatt bleibt für die tiefen Seiten.
3. Modus-Schieberegler: Mockup `tools/design/modus.html` ist bedienbar; Übernahme in den Prüfstand erst nach Freigabe (Strang Modi legt die Modi fest, Farben stehen in `MODE_PRESETS`).
4. EN und DE für alle Texte, Tests (Geometrie 426 × 803, Navigation, Speicherung), ENTWICKLUNGSVERLAUF.md und STAND.md pflegen.

## Regeln
- Fundament (`lib/`, `server.py`, gemeinsame localStorage-Schlüssel, Engine-Aufrufe) nur nach Rückfrage; `chat.html` berührt auch der Chat-Strang, Zeile unter „Aktive Arbeit“ eintragen.
- Nichts als am Gerät getestet melden, was nur simuliert lief.
