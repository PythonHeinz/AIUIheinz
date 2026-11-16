# AUFTRAG docHeinz (Strang AIUIheinz-docHeinz) — zurückgestellt bis nach convert2

Angelegt 14.11.2026 im Root-Strang. Werkzeug: **eBook-Reader**, Anzeigename „docHeinz“, **id `docheinz`** (ein h), Ordner `tools/docheinz/`. **Noch nicht starten** (siehe Einordnung). Späterer Startsatz: „AIUIheinz-docHeinz: nach `docs/agent/AUFTRAG_docHeinz.md`.“ Lies zuerst `docs/agent/NEUES_WERKZEUG.md` (Regeln für jedes neue Werkzeug), `docs/MODULE.md`, `docs/DESIGN.md`, `docs/agent/TECHNIK.md`.

## Einordnung
- **Status 16.11.2026: zurückgestellt, nicht starten.** Entscheidung des Entwicklers: Erst wird **convert2** in die Webseite aufgenommen (`KONZEPT.md` 23 Punkt 4), der **eBook-Reader ist ein Derivat davon** und entsteht danach. Der Parallelstart vom 14.11.2026 entfällt. Dieser Auftrag bleibt als Vorplanung stehen; vor dem Start schreibt der Root-Strang ihn gegen den Stand von convert2 neu.
- **Folge für convert2:** Was der Reader später braucht (Dateien einlesen, EPUB/HTML/Text/Markdown parsen und erzeugen, Zip ohne Bibliothek, Metadaten), soll im Auftrag convert2 **als eigene, in sich geschlossene Module** gebaut werden (Ordner mit Einstiegsdatei und Tests, kein Bezug auf die Oberfläche von convert2), damit der Reader sie übernehmen kann. Wo sie dann liegen (weiter unter `tools/convert2/`, kopiert, oder nach Abstimmung in `lib/shared/`), entscheidet der Entwickler beim Reader-Auftrag; **Werkzeug-Seiten importieren keine Dateien aus fremden Werkzeugen** (`NEUES_WERKZEUG.md`, Insel-Regel).
- Kein MVP-Bestandteil. Hängt nicht von KI, Ollama oder `lib/providers.js` ab. **Gespräche mit einem Buch (Embedding) sind ausdrücklich viel später.**

## Ziel
Ein leserorientierter eBook-Reader für den Pixel 9 Pro, offline: eBooks verwalten und hinzufügen, viele Formate lesen, vielfältige Leseeinstellungen wie bei modernen Readern (Schriftgröße, Zeilenabstand, Ränder, Schrift, Theme, mitlaufender Textsatz). Erste Fassung klein halten: eine Bibliothek, ein Lesemodus, Fortschritt je Buch.

## Beschlüsse des Entwicklers (13.11.2026)
- **PDF ist Pflichtformat**; die übrige Formatstaffelung akzeptiert er. Die Staffelung selbst steht im Projektordner `AiUiHeinz_docHeinz` am PC und wird von dort übernommen (hier nicht erfunden). Vorschlag für die Reihenfolge, falls dort nichts anderes steht: EPUB und Text/Markdown/HTML zuerst, PDF danach (eigene Stufe wegen der Technik, siehe Entscheidungsbedarf), weitere Formate später.
- **Eigene Datenbank:** Das Werkzeug hält seine Daten selbst (`heinz_docheinz`), damit es einzeln als App portierbar ist. Nicht in die Datenbank `heinz` schreiben.
- Gebaut wird nach seinen **Funktionsbaugruppen**, modular: z. B. Bibliothek (Speicher und Liste), Import (Dateien lesen, Metadaten), Formatleser je Format (EPUB, PDF, Text), Leseansicht (Seiten/Fluss, Einstellungen), Fortschritt und Lesezeichen. Jede Baugruppe ein Modul unter `tools/docheinz/`, ohne Kreise (`MODULE.md`), Testbar einzeln.

## Entscheidungsbedarf (dem Entwickler vorlegen, bevor gebaut wird)
1. **PDF ohne Bibliothek ist im Browser nicht machbar.** Android-Chrome zeigt PDF nicht selbst im Seitenrahmen. Üblich ist `pdf.js` (Apache 2.0), lokal im Ordner `tools/docheinz/vendor/` mitgeliefert (offline, kein Build). Das weicht von der Regel „keine Bibliotheken“ ab. Der Strang legt Größe, Lizenz und Version vor und baut PDF erst nach dem Okay.
2. **EPUB:** Zip-Inhalt mit dem Browser (`DecompressionStream`, eigener kleiner Zip-Leser), Inhalt (XHTML, CSS, Bilder) selbst darstellen; Fremd-CSS und Skripte der Bücher neutralisieren (Sicherheit: keine Skripte aus Büchern ausführen).
3. **Wo die Bücher liegen:** IndexedDB (Datei als Blob) reicht für wenige Bücher; Grenze und Warnung bei vollem Speicher festlegen; Export/Import der Bibliothek später.
4. **Hub-Eintrag:** `docheinz` in `AREAS` (Werkzeuge) als Mini-Commit am Ende, mit Rückfrage; `tool.json` mit `status` `beta`.

## Schritte
0. **Vorbereitung:** `git pull --rebase`, Zeile unter „Aktive Arbeit“ (`tools/docheinz/`, später Hub-Zeile), pushen; Projektordner `AiUiHeinz_docHeinz` (Formatstaffelung, Anweisungen des Einzelprojekts) lesen; Entscheidungsbedarf 1 bis 3 dem Entwickler vorlegen.
1. **Gerüst:** `tools/docheinz/tool.json`, Seite, Einstiegsmodul, Kopfzeile und Theme aus `lib/core.*`, EN/DE-Texte, Bibliothek mit eigener Datenbank, Datei hinzufügen (Auswahl über Dateidialog), Liste mit Titel und Fortschritt; Test mit simulierten Dateien.
2. **Lesen (Text und EPUB):** Leseansicht in Georgia wie im Heinz Chat (`--serif`), Seiten- oder Fließmodus, Einstellungen (Schriftgröße, Abstand, Ränder, Theme), Fortschritt je Buch.
3. **PDF** nach Entscheidung 1.
4. **Abschluss:** Hub-Eintrag, Handytest-Liste in `docs/HANDYTEST.md`, `STAND.md` (Modul- und Strangtabelle), Verlauf, `MODULE.md`. Dem Entwickler sagen, was am Handy zu prüfen ist (große Datei, Hintergrund und Rückkehr, Speicherdruck, Dateidialog).

## Nicht im Umfang
KI-Anbindung und Embedding; Cloud-Dienste und Online-Bibliotheken; Kopierschutz (DRM); Änderungen an `lib/*`, `server.py`, `sw.js`, `lib/icons.svg` oder gemeinsamen Schlüsseln.
