# Auftrag: Strang „AIUIheinz-Design“

## Stand 11.11.2026 02:15 (Root-Strang): Design-Review 1 abgeschlossen, Auftrag für den Folgestrang
Erledigt: Manifest, Variablen und Themes, Symbolsatz, Hub, Oberfläche des Dashboards, Einstellungspanel mit Schnellbereich, Parameter in drei Ansichten, Prompts-Reiter, Tempo-Test-Kacheln, Unterhaltungsliste, Sicherung (Details `docs/agent/ENTWICKLUNGSVERLAUF.md`, `docs/DESIGN.md`). Offen und für **Design-Review 2** vorgemerkt: Gliederung des Einstellungsmenüs (Daumenbereich, Doppelung Engine-Liste und Verbindungsdaten), Modus-Schieberegler, Parameter-Schnellöffner, Menü für **mehrere eigene Engines**, Tools im neuen Design (Sheet, Filter, Lab, Vitals), Lesemodus in warmer Serife, dazu neu: **Heinz Chat (schlanke Seite) als zweiter Hub-Eintrag** (`docs/KONZEPT.md` 18.1; Namen der Einträge noch offen, Entwickler entscheidet), Gestaltung für **Medien** (Anhang-Knopf, Bildanzeige in Antworten, Vermerk „KI-erzeugt“, Anzeige „lokal oder über das Netz“ bei Sprache; Konzept 20). Vor dem Start: Entwickler fragen, was zuerst kommt; Fundament nur nach Rückfrage und nicht gleichzeitig mit dem Strang AIUIheinz-Chat. Hinweis: `docs/DESIGN.md` ist nach DR1 teilweise veraltet (Menü als Bottom-Sheet, Pixelchip); als Erstes angleichen.

Strangname: **AIUIheinz-Design**. Start: nach Projektanweisung, dann diese Datei lesen. Angelegt 09.11.2026 im Root-Strang.

## Ziel
Das Design-Manifest (`docs/DESIGN.md`, Kopie im Claude-Projekt als `design-manifest.md`) weiterentwickeln, mit dem Entwickler abstimmen und in die Oberfläche bringen. Dieser Strang hat Einfluss auf die Gestaltung aller Seiten, ändert aber zuerst nur das Fundament und Beispiele, keine Fachlogik.

## Zuständigkeit (Fundament, ein Strang zur Zeit)
- `lib/core.css`, `lib/core.js` (Kopfzeile), `index.html` (Hub), neue Bausteine unter `lib/`, `docs/DESIGN.md`.
- Nicht anfassen ohne Rückfrage: `dashboard.html` (Strang „AIUIheinz-Chat“, bis dieser gepusht hat), `server.py`, Anbieterschicht, Engine-Aufrufe.

## Reihenfolge
1. **Manifest schärfen** mit dem Entwickler: Einsatzorte der Serife (Beispiele aus INCIheinz zeigen lassen), Zuschnitt der zwei Hauptbereiche, Symbolsatz (Ordner `INCI-App-Projekt/symbole` prüfen, Linien-Symbole wie das Gehirn im Ring), Inter lokal mitliefern ja/nein.
2. **Variablen und Schriften** in `lib/core.css` (Namen wie INCIheinz: `--bg --surf --line --pri --sub --txt --muted --onpri`).
3. **Bausteine** als Beispielseite (z. B. `tools/design/index.html`, nur zum Ansehen): Listenzeile mit Symbol, Pille, Kopierknopf (klein, rund, Häkchen), Bereichsumschalter, untere Leiste mit rundem Mittelknopf, „Mehr“-Bottom-Sheet. Jeder Baustein EN/DE, Test bei 426 × 803 und 426 × 400 px (Splitscreen).
4. **Hub** auf das neue Muster umstellen; danach Platzhalterseiten.
5. **Dashboard** erst, wenn der Strang „AIUIheinz-Chat“ gepusht hat und der Entwickler zustimmt (gemeinsam abstimmen, dort steht die Logik für Kopieren auf zwei Ebenen).

## Regeln
- Deckende Farben, keine Transparenz, keine Verläufe, reines HTML/CSS/JS ohne Build, keine Webfonts aus dem Netz.
- Wischen zum Aktualisieren abschalten (`overscroll-behavior-y: none`), kein Wischen zwischen Bereichen.
- Feste Leisten höchstens etwa 56 px hoch.
- Tests: `bash tests/run_all.sh`; Seitentests für jeden neuen Baustein; Screenshots mit Playwright prüfen (Viewport 426 × 803).
- Was nur simuliert lief, nicht als auf dem Gerät geprüft bezeichnen. Der Entwickler prüft auf dem Handy.
- Doku: `docs/DESIGN.md` aktuell halten, danach die Kopie im Claude-Projekt (`project_write`, Pfad `claude/design-manifest.md`) erneuern; `docs/agent/ENTWICKLUNGSVERLAUF.md`, `docs/agent/STAND.md`, `INDEX.md` wie in der Projektanweisung.

## Bekannte Ausgangslage (Handytest 09.11.2026)
- Hub und Kopfzeile laufen, App ließ sich vom Hub aus installieren.
- Kopierknopf in `dashboard.html` ist zu klobig, Gestaltung der Blasen gefällt dem Entwickler.
- Konsole im Splitscreen läuft unten bis zum Bildschirmrand und soll sich weiter harmonisch einfügen.
