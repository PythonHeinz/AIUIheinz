# AUFTRAG convert2 (Strang AIUIheinz-convert2)

Angelegt 17.11.2026 im Root-Strang. Der Design-Strang ist fertig (Handytest R bis T bestätigt, Entwickler: zeigbar), das Fundament steht. Reihenfolge nach `KONZEPT.md` 23 Punkt 4: **convert2 zuerst, der eBook-Reader (`AUFTRAG_docHeinz.md`) entsteht danach als Derivat.** Startsatz: „AIUIheinz-convert2: nach `docs/agent/AUFTRAG_convert2.md`.“ Lies zuerst `docs/agent/NEUES_WERKZEUG.md` (Regeln für jedes Werkzeug), `docs/MODULE.md`, `docs/DESIGN.md`, `docs/agent/TECHNIK.md`.

## Ziel
Das bestehende Werkzeug **Convert2** (eigenes HTML-Dashboard für den Pixel 9 Pro, Quelle liegt beim Entwickler) wird als Werkzeug der Webseite aufgenommen: **id `convert2`, Ordner `tools/convert2/`**, Bereich Werkzeuge im Hub. Es konvertiert vornehmlich **Markdown** in andere Zielformate und zurück, mit Code-Ansicht, formatierter Vorschau, Vollbild-EPUB-Ansicht und PDF-Erzeugung. Leitgedanke aus der Projektbeschreibung: Menschen scheitern daran, Tabellen aus KI-Antworten zu kopieren (Müll im Zielprogramm) oder wissen nicht, dass sich eBooks selbst aus Inhalt erzeugen lassen; ein Klick und der Text steht sauber im Zielformat, in beide Richtungen. Alles offline; **kein Modell nötig** (Umwandlung macht Code).

## Wichtig für später (der Reader hängt daran)
Der eBook-Reader wird auf convert2 aufsetzen. Deshalb werden die Formatbausteine **als eigene, in sich geschlossene Module** gebaut: Einlesen von Dateien, Zip lesen und schreiben (ohne Bibliothek, mit `CompressionStream`/`DecompressionStream`, CRC32 selbst), EPUB lesen und schreiben (Inhaltsverzeichnis, Kapitel, Metadaten, Bilder), HTML und Markdown parsen und erzeugen, Text bereinigen. Jedes Modul: eine Einstiegsdatei, **keine Verweise auf die Oberfläche**, eigene Tests, Beschreibung in `docs/MODULE.md`. Die Oberfläche von convert2 ruft sie nur auf. Wo die Bausteine später liegen (hier belassen, kopieren oder nach `lib/shared/`), entscheidet der Entwickler im Reader-Auftrag; **Werkzeug-Seiten importieren keine Dateien aus fremden Werkzeugen** (Insel-Regel).

## Schritt 0: Vorbereitung und Inventur
- `git pull --rebase`, Zeile unter „Aktive Arbeit“ (`tools/convert2/`, am Ende Hub-Zeile in `index.html`), sofort pushen.
- **Der Entwickler übergibt die vorhandene Convert2-Datei** (Anhang im Strang-Chat; sie liegt nicht im Repo und nicht im PC-Ordner `Toolsbyclaude`). Sie wird unverändert als Referenz abgelegt (`tools/convert2/_original/`, nur bis zur Abnahme) und nie als Muster für Struktur genommen, sondern als **Funktionsvorlage**.
- **Inventur** (Tabelle in `docs/agent/CONVERT2_INVENTUR.md`): Was kann sie heute (Eingaben, Zielformate, Ansichten), welche Teile sind Oberfläche, welche reine Logik, was ist doppelt zu `lib/` (Theme, Markdown, Kopfzeile), welche Bibliotheken und Netzzugriffe stecken drin (**Ziel: keine**), was ist fehlerhaft. Daraus Zuschnitt der Module und Reihenfolge; dem Entwickler vorlegen, **bevor** gebaut wird.

## Schritt 1: Kern ohne Oberfläche (Module mit Tests)
Reihenfolge: Zip (lesen, schreiben), Markdown ↔ HTML (kann auf `lib/shared/markdown.js` aufbauen, soweit passend; keine Änderung dort ohne Rücksprache), HTML → Text/Markdown (sauberes Einfügen aus Zwischenablage und Tabellen), EPUB schreiben (gültiges EPUB 3: `mimetype` ohne Kompression als erster Eintrag, `container.xml`, `content.opf`, `nav.xhtml`), EPUB lesen. Tests mit festen Beispieldateien; ein erzeugtes EPUB muss sich mit dem eigenen Leser wieder öffnen lassen (Rundlauf). Prüfen gegen ein externes Prüfwerkzeug (z. B. `epubcheck`) nur, wenn im Container verfügbar; sonst als „nicht geprüft“ vermerken.

## Schritt 2: Oberfläche (`tools/convert2/index.html`)
Eingabe (Einfügen, Datei wählen), Zielformat, Code-Ansicht und Vorschau, Vollbild-EPUB-Ansicht, Ausgabe (Kopieren, Herunterladen). **PDF** über den Druckdialog des Browsers (Stylesheet für Druck, kein Bibliotheks-PDF); echtes PDF-Schreiben ohne Bibliothek nur, wenn der Entwickler es verlangt (dann vorlegen). Gestaltung nach `DESIGN.md` (Bausteine aus `lib/core.css`, Symbole aus dem Sprite, EN und DE, 426 × 803 und 426 × 400, Hell und Dunkel, ruhig und leserorientiert). Zwischenablage: Einfügen von Tabellen und formatiertem Text bereinigen, Kopieren als Markdown, HTML oder Klartext.

## Schritt 3: Aufnahme und Abschluss
- `tools/convert2/tool.json` (`status` `beta`), **Hub-Eintrag `convert2` in `AREAS` (Werkzeuge) als eigener Mini-Commit, mit Rückfrage**; Fundament ist frei (kein anderer Strang aktiv), sonst erst fragen.
- Eigene Daten (Entwürfe, zuletzt benutzte Dateien) nur klein in `HeinzStore` mit Präfix `heinz_convert2_…`; größere Daten in eigener IndexedDB `heinz_convert2`.
- Tests grün (`bash tests/run_all.sh`), Test, dass das Werkzeug im Hub erscheint; Handytest-Abschnitt in `docs/HANDYTEST.md` (Datei laden, Einfügen aus Zwischenablage am Handy, EPUB erzeugen und in einem echten Reader öffnen, Druck als PDF, große Datei); `STAND.md`, `ENTWICKLUNGSVERLAUF.md`, `MODULE.md`. `_original/` erst nach Abnahme durch den Entwickler entfernen.

## Optional, nicht in dieser Fassung
Modellhilfe (Aufbereitung von Texten über `lib/providers.js`, `KONZEPT.md`: Testfeld für andere Tools), Kamera/Foto-Einlesen (`scan`), weitere Formate (DOCX, ODT). Erst nach Abnahme, einzeln beauftragt.

## Nicht im Umfang
Änderungen an `lib/*`, `server.py`, `sw.js`, `lib/icons.svg`, gemeinsamen Schlüsseln; Bibliotheken ohne Rückfrage; Netzzugriffe.
