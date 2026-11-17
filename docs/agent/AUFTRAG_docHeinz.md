# AUFTRAG docHeinz (Strang AIUIheinz-docHeinz)

Neu geschrieben 17.11.2026 im Strang AIUIheinz-convert2, gegen den abgenommenen Stand von convert2 (Handytest U bestanden). Ersetzt die Vorplanung vom 14.11.2026 und den Entwurf im PC-Ordner `AiUiHeinz_docHeinz` (dessen Inhalt ist hier eingearbeitet; eine Formatstaffelung außer dem Entwurf liegt dort nicht). Werkzeug: **eBook-Reader**, Anzeigename „docHeinz“, **id `docheinz`** (ein h, Kleinbuchstaben), Ordner `tools/docheinz/`.

Startsatz: „AIUIheinz-docHeinz: nach `docs/agent/AUFTRAG_docHeinz.md`“. Lies zuerst `docs/agent/NEUES_WERKZEUG.md`, `docs/MODULE.md` (Abschnitt „Werkzeug convert2“), `docs/DESIGN.md`, `docs/agent/TECHNIK.md`, `docs/agent/CONVERT2_INVENTUR.md`.

## Ziel
Ein leserorientierter eBook-Reader für den Pixel 9 Pro, offline, ohne Konto und Cloud: Bücher verwalten und hinzufügen, mehrere Formate lesen, Satz einstellen wie bei modernen Readern. Erste Fassung klein: eine Bibliothek, ein Lesemodus, Fortschritt je Buch. Gespräche mit einem Buch (Embedding) sind ausdrücklich viel später und eigener Auftrag; die Struktur verbaut sie nicht (Kapiteltext als sauberer Text abrufbar).

## Was convert2 schon liefert (am Handy bestätigt, 17.11.2026)
In `tools/convert2/mod/`, ohne Oberfläche, ohne Netz, mit Tests: `zip.js` (Lesen und Schreiben, `CompressionStream`), `epub-lesen.js` (`readEpub` → Metadaten, Inhaltsverzeichnis aus nav oder NCX, Kapitel, Bilder als `data:`; `epubToMarkdown`), `epub-schreiben.js`, `markdown.js` (`mdToHtml`, `mdToPlain`), `html.js` (`htmlToMarkdown`, Skripte werden entfernt), `text.js`, `erkennen.js`. Ein EPUB-Vollbildleser (Kapitel, Inhaltsverzeichnis, Schriftgröße) liegt in `tools/convert2/ui/reader.js`; er ist die Ausgangsbasis für die Leseansicht, ersetzt aber keine Bibliothek, keinen Fortschritt und keinen Seitenmodus. Nicht mit `epubcheck` geprüft.

## Entscheidungen des Entwicklers (bisher)
1. Eigene Datenbank je Werkzeug: IndexedDB `docheinz`, eigenes Modul, `lib/store.js` unberührt (einzeln als App portierbar). Export und Import der Bibliothek gehört dazu. (13.11.2026)
2. Reihenfolge: nach convert2. Erledigt. **PDF ist Pflichtformat.** (13.11.2026)
3. Gespräch mit dem Buch viel später, eigener Auftrag. (13.11.2026)
4. Schreibweise: id, Ordner, Schlüssel `docheinz`, Anzeigename frei. (13.11.2026)

## Entscheidungsbedarf (dem Entwickler vorlegen, **vor** dem Bau, je 2 bis 3 Sätze Vorschlag)
**A. Wo liegen die Formatbausteine?** Regel: Werkzeug-Seiten importieren keine Dateien aus fremden Werkzeugen. Optionen: (1) **kopieren** nach `tools/docheinz/mod/` (beide Werkzeuge einzeln portierbar, Pflege doppelt, Tests mitkopieren); (2) nach `lib/shared/` ziehen (eine Pflege, berührt das Fundament, convert2 muss umgestellt werden). Vorschlag: **kopieren**, weil Portierbarkeit je Werkzeug beschlossen ist; später nach `lib/shared/`, wenn ein drittes Werkzeug sie braucht.
**B. PDF.** Im Browser ohne Bibliothek nicht als Seitenbild lesbar. Vorschlag: `pdf.js` (Apache 2.0) lokal in `tools/docheinz/vendor/` mit Lizenz und Version, ohne Build, Worker lokal, **ohne Netz**; Größe vorher nennen (mehrere MB). Das ist die einzige Ausnahme von „keine Bibliothek“ und braucht die ausdrückliche Zustimmung des Entwicklers. Alternative ohne Bibliothek: PDF nur an die Systemansicht des Handys übergeben (kein eigenes Lesen, kein Fortschritt). Phase 4 nur mit Entscheidung.
**C. MOBI/AZW3, FB2, CBZ:** weglassen, später oder nach Rücksprache; Vorschlag: nicht in den ersten Phasen. Fremdformate zeigen eine klare Meldung (Format, Grund), nie eine leere Seite; DRM wird nicht gelesen.

## Grundsätze (gelten unverändert)
- ES-Module ohne Build (`docs/MODULE.md`), ein Einstiegsmodul, Brücke zu `lib/` nur über `base.js`, Zustand im Objekt `state`, keine Kreise, keine Inline-Handler. Ordnerform wie convert2: `tools/docheinz/{index.html,tool.json,docheinz.css,mod/,ui/}`. Zu den Daten gehören Texte EN/DE, Lesethemen, Schriftprofile.
- Design nur nach `docs/DESIGN.md` (erst Katalog), Farben über Variablen, Ränder `var(--ol)`, Symbole aus `lib/icons.svg`, Texte EN und DE, Viewport 426 × 803 und 426 × 400, hell und dunkel. Lesetext Serife (`--serif`), Werkzeugoberfläche kühl.
- Offline: keine Anfrage nach außen, keine Bibliothek aus dem Netz (Ausnahme nur nach B).
- Sicherheit: Buchinhalt ist fremd. Keine Skripte, keine externen Ressourcen, eigenes Buch-CSS bereinigt oder abschaltbar (Leser-Einstellung hat Vorrang), Anzeige entweder bereinigtes DOM oder sandboxed Frame ohne Skripte.
- Eigene Daten nur in `heinz_docheinz…`/IndexedDB `docheinz`; Einstellungen klein über `HeinzStore` mit Präfix `heinz_docheinz_`. Fundament (`lib/*`, `server.py`, `sw.js`, `lib/icons.svg`, gemeinsame Schlüssel) wird nicht geändert; einzige Berührung ist am Ende die Zeile in `AREAS` (Mini-Commit, vorher fragen).
- Neue Funktionen bekommen Tests (Node für Module, Playwright für die Oberfläche, `bash tests/run_all.sh`); nur simuliert Getestetes wird nie als am Gerät getestet gemeldet.

## Bibliothek und Verwaltung
Hinzufügen: Dateiwahl (mehrere), Ziehen und Ablegen am PC; Teilen-Intent der installierten App erst nach Prüfung am Handy. Anzeige: Liste und Raster mit Cover, Titel, Autor, Fortschritt, zuletzt gelesen; Suche, Sortierung, später Sammlungen; Löschen mit Bestätigung. Metadaten aus der Datei (EPUB-OPF), nachträglich editierbar. Speicher: Bücher als Blob, Cover, Metadaten, Lesestand, Lesezeichen; Grenze und Warnung bei fast vollem Speicher (`persist()`, Quote), eigene Hinweise statt Rückgriff auf den Hub-Speicher.

## Lesen und Satz
Schriftgröße stufenlos, Familie (Serife, Sans, Mono), Zeilen- und Absatzabstand, Ränder, Blocksatz oder linksbündig, Silbentrennung (`hyphens`, Sprache aus Metadaten), Zeilenlänge. Themen Hell, Dunkel, Sepia, Schwarz, Auto (über Variablen). Seitenmodus (Spalten) und Scrollmodus; Tippzonen, Wischen. Inhaltsverzeichnis, Suche im Buch, Lesezeichen, Markierungen mit Notizen, Fortschritt in Prozent, Fußnoten als Popup, Bilder tippen zum Vergrößern. Vorlesen nur vormerken (`speech.js` im Dashboard prüfen).

## Phasen
- **Phase 0:** Entscheidungen A bis C mit dem Entwickler klären; Zeile unter „Aktive Arbeit“; Gerüst-Plan in 5 Sätzen.
- **Phase 1:** Gerüst (`tool.json`, Seite, eigene Datenbank), Bausteine übernehmen nach A, Bibliothek (Hinzufügen, Liste, Löschen), Lesen von TXT, Markdown, HTML und EPUB in der einfachen Leseansicht (Schriftgröße, Thema, Fortschritt), Tests, Handytest-Liste in `docs/HANDYTEST.md`.
- **Phase 2:** Seitenmodus, Inhaltsverzeichnis, Cover, Lesezeichen, Fortschritt je Buch.
- **Phase 3:** voller Satz, Markierungen, Suche, Export und Import der Bibliothek.
- **Phase 4:** PDF nach B (bei Bedarf vor Phase 3 ziehen); weitere Formate nach C; Feinschliff Handy.
- **Abschluss je Phase:** `ENTWICKLUNGSVERLAUF.md`, `STAND.md` (Modul- und Strangtabelle, „Aktive Arbeit“ leeren), `MODULE.md`, Hub-Zeile am Ende von Phase 1 nach Rückfrage. Dem Entwickler sagen, was am Handy zu prüfen ist (große Datei, Hintergrund und Rückkehr, Speicherdruck, Dateidialog) und was nur simuliert lief.

## Nicht im Umfang
KI-Anbindung und Embedding; Cloud-Dienste, Online-Bibliotheken, Konten; Kopierschutz (DRM); Änderungen an `lib/*`, `server.py`, `sw.js`, `lib/icons.svg` oder gemeinsamen Schlüsseln.
