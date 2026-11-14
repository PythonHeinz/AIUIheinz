# Neues Werkzeug einhängen (Checkliste)

Root-Strang, 14.11.2026. Gilt für alle neuen Werkzeuge (docHeinz, später convert2, Sheet-Neuaufbau, Nischen-Apps). Ein Werkzeug ist eine **Insel**: Es nutzt das Fundament lesend und hält seine Daten selbst, damit es später einzeln als App portierbar ist (Beschluss Entwickler 13.11.2026).

## 1 Ordner und Anmeldung
- Ordner `tools/<id>/` mit `tool.json` und der Seite (`index.html` oder wie `entry` in `tool.json`). **`id` = Ordnername, nur kleine Buchstaben, Ziffern, Minus** (Server überspringt sonst still; Muster `TOOL_ID_RE` in `server.py`). Beispiel: `docheinz`.
- `tool.json` wie bei den vorhandenen Werkzeugen: `id`, `name` und `desc` (je `en` und `de`), `icon`, `entry`, `color`, `status` (`placeholder`, `beta`, `ready`), `order`, `area` (`tools`), `symbol` (vorhandenes `i-…` aus `lib/icons.svg`).
- Der Server findet das Werkzeug selbst. **Der Hub zeigt es nur, wenn die id in `AREAS` in `index.html` steht** (Bereich Werkzeuge, `grid`). Das ist die **einzige erlaubte Berührung des Fundaments**: ein Mini-Commit, vorher `git pull --rebase`, nach Rückfrage beim Entwickler.
- Der Service Worker braucht keinen Eintrag (Netz zuerst, Cache als Rückfall).

## 2 Was gelesen, nicht geändert wird
`lib/core.css`, `lib/core.js` (Kopfzeile `<div id="app-header">`, Theme, EN/DE, Bausteine), `lib/icons.svg` (fehlende Symbole zunächst im eigenen Ordner), `lib/store.js` (`HeinzStore`, nur kleine Einstellungen, eigener Schlüsselpräfix wie `heinz_<id>_…`), bei Bedarf `lib/shared/markdown.js`. **Nicht angefasst:** `lib/providers.js`, `lib/dashboard/*`, `lib/chat/*`, `server.py`, `sw.js`, `lib/icons.svg`, gemeinsame Schlüssel. Brauchst du dort etwas, fragst du den Entwickler (Regel „Fundament ein Strang“).

## 3 Eigene Daten
Große Daten (Dateien, Medien) in **einer eigenen IndexedDB** des Werkzeugs (`heinz_<id>`), nicht in der Datenbank `heinz`. Kleine Einstellungen über `HeinzStore` mit eigenem Präfix; Schlüssel `heinz…` landen im Backup, große Daten nicht (dokumentieren). Rückfall und Fehlermeldung bei vollem oder gesperrtem Speicher einplanen.

## 4 Code und Oberfläche
- ES-Module nach `docs/MODULE.md`: ein Einstiegsmodul, Importpfade mit `.js`, Zustand in einem Objekt, **keine Kreise**, kein Inline-Skript.
- Texte immer EN und DE; Farben nur über Variablen, Ränder über `var(--ol)`; Symbole aus dem Sprite; relative Pfade; Server nur über `/api/...`; `overscroll-behavior-y: none`. `docs/DESIGN.md` Abschnitt 7.
- Prüfen bei 426 × 803 und 426 × 400, Hell und Dunkel, EN und DE.
- Keine Bibliotheken ohne Rückfrage (Regel: reines HTML, CSS, JavaScript, ohne Build). Muss eine Bibliothek sein, liegt sie lokal im Werkzeugordner mit Lizenz und Version und wird dem Entwickler vorgelegt.

## 5 Tests und Doku
- Eigene Tests in `tests/` (Playwright, simulierte Daten), `bash tests/run_all.sh` bleibt grün; Test, dass `tool.json` gültig ist und das Werkzeug im Hub erscheint.
- Vor der ersten Änderung Zeile unter „Aktive Arbeit“ (`STAND.md`) mit den berührten Dateien, sofort pushen; am Ende `ENTWICKLUNGSVERLAUF.md` und `STAND.md` (Modultabelle), `docs/MODULE.md` (Modulgraph), `docs/HANDYTEST.md` (neuer Abschnitt). Sagen, was nur simuliert getestet ist.
- Ein Strang je Werkzeug, Name `AIUIheinz-<Werkzeug>`; Werkzeuge dürfen parallel zu Fundament-Strängen laufen, solange sie diese Liste einhalten.
