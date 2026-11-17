# Convert2 – Inventur (Strang AIUIheinz-convert2, Schritt 0)

Stand 17.11.2026. Grundlage: `tools/convert2/_original/convert2.html` (1731 Zeilen, unverändert, nur Funktionsvorlage). Gelesen wurden Kopf, Markup, Skript und alle Funktionen von Eingabe, Erkennung, Umwandlung, Export. Nichts davon ist am Gerät geprüft; Aussagen zum Verhalten stammen aus dem Quelltext.

## 1 Was die Datei heute kann

**Eingabe:** Textfeld; Knopf „Einfügen“ (`navigator.clipboard.readText`, Rückfall `execCommand('paste')`); Leeren. Keine Datei-Auswahl. Aus der Zwischenablage kommt nur der Text, nie die HTML-Fassung (Tabellen aus Webseiten oder Sheets gehen also als Text hinein).

**Auto-Erkennung** (`detectAndNormalize`, Reihenfolge): JSON (Liste von Objekten wird Tabelle, sonst Code-Block) → HTML (auch in Code-Zaun, `htmlToMarkdown` über `DOMParser`) → TSV (alle Zeilen gleich viele Tabs) → CSV nur mit **Semikolon** (mindestens 2 Zeilen) → Markdown/Fließtext (Heuristik nur für die Anzeige „Erkannt: …“). Alles wird zu Markdown normalisiert; daraus entstehen Ansichten und Ausgaben.

**Zielformate** (16 im Dropdown): TSV, CSV, ASCII-Box, Klartext, PDF, ePub, HTML Rich, HTML-Quelltext, BBCode, JSON, YAML, Markdown (normalisiert), LaTeX, Typst, AsciiDoc, DITA-XML. Tabellenformate nehmen nur die Tabellen des Dokuments (`extractAllTables`), fehlen Tabellen, kommt das Markdown zurück.

**Ansichten:** Blatt (weißes Papier, Schrift Arial/Georgia) und Code; Vollbild-„E-Book“-Ansicht (kopiert nur das HTML des Blatts in ein Overlay, keine Seiten, kein Inhaltsverzeichnis, keine Kapitel).

**Ausgabe:** Kopieren (Text, bei „HTML Rich“ zusätzlich `text/html` über `ClipboardItem`), Datei sichern (`showSaveFilePicker`, Rückfall Download), Teilen (`navigator.share`, auch Datei für ePub), PDF ansehen/speichern (html2pdf.js: Seite wird als Bild gerendert, A5, Fußzeile „Seite x von y“).

## 2 Aufteilung nach Art

| Teil | Zeilen (ca.) | Art | Ziel |
|---|---|---|---|
| Dropdown, Ansicht umschalten, Schriftwahl, Toast, Reader-Overlay, `updateAll`, `clearInput`, Markup, CSS | 10–580, 589–707 | Oberfläche | `tools/convert2/index.html` plus Oberflächenmodule |
| `escapeHtml`, `escapeLatex`, `escapeYaml`, `isTableSeparator`, `splitTableRow` | 709–786, 1174–1181 | reine Logik | Modul Text/Tabellen |
| `parseInline`, `parseMarkdownToHtml` (Überschriften, Listen, Tabellen, Code, Zitate, Callouts `[!NOTE]`/`[!WARNING]`) | 719–735, 1023–1137 | reine Logik | Modul Markdown→HTML |
| `markdownToPlainText` | 741–778 | reine Logik | Modul Markdown→HTML (Klartext) |
| `looksLikeHtml`, `htmlToMarkdown` | 789–926 | Logik, braucht `DOMParser` (Browser-Schnittstelle, kein Seitenbezug) | Modul HTML→Markdown |
| `detectAndNormalize` | 928–1020 | Logik **vermischt mit Oberfläche** (schreibt das Erkennungsschild direkt in den DOM) | Modul Erkennen, liefert nur `{type, md}`; Schild setzt die Oberfläche |
| `extractAllTables`, `parseBBCode`, Formatzweige in `convertNow` | 1139–1363 | Logik **vermischt mit Oberfläche** (ein `switch` in `convertNow`, liest und schreibt DOM-Felder) | Modul Tabellenformate (eine Funktion je Format) |
| `generateEpubBlob` | 1551–1625 | Logik, hängt an JSZip, liest `normalizedMarkdown` als Globale | Module Zip und EPUB schreiben |
| `handlePDF` | 1396–1549 | Oberfläche plus Bibliothek | entfällt, Druckdialog |
| `copyResult`, `saveWithFolderChoice`, `shareViaAndroid` | 1365–1728 | Oberfläche, Browser-Schnittstellen | Oberflächenmodul Ausgabe |

## 3 Doppelt zu `lib/`

- **Theme:** eigene Farbvariablen (`--bg-main`, `--accent-green` …), nur dunkel, kein Hell/Auto. Entfällt, es gelten die Variablen aus `lib/core.css` (Papier der Vorschau bleibt bewusst weiß).
- **Kopfzeile, Sprache:** eigene Kopfzeile, nur Deutsch. Entfällt (`#app-header`, EN/DE über `lib/core.js`).
- **Markdown:** eigener Parser, daneben `lib/shared/markdown.js` (Antworten der Modelle, mit Syntax-Hervorhebung). Beide unabhängig. Zur Entscheidung siehe Abschnitt 7, Frage 2.
- **Toast, Dropdown, Pillenschalter:** eigene Bausteine; im Design-Katalog vorhanden (genaue Zuordnung beim Bau, Klassen vorher mit `grep` prüfen).
- **Zwischenablage:** eigene Funktionen; `lib/dashboard/clipboard.js` ist Dashboard-intern und wird nicht benutzt.

## 4 Bibliotheken und Netzzugriffe

Genau zwei, beide beim Laden der Seite von `cdnjs.cloudflare.com`: `html2pdf.js 0.10.1` (zieht `html2canvas` und `jsPDF` mit) und `jszip 3.10.1`. Weitere `fetch`-Aufrufe gibt es nicht, kein `localStorage`, keine Schriften von außen. **Ohne Netz** fällt die Seite damit aus: `html2pdf` und `JSZip` fehlen, ePub und PDF werfen Fehler. Beides entfällt (Auftrag): ZIP selbst (`CompressionStream`, CRC32), PDF über den Druckdialog. Ziel: keine Netzzugriffe, kein Fremdcode.

## 5 Fehler und Schwächen (aus dem Quelltext)

1. **Netz nötig** für ePub und PDF (siehe 4).
2. **PDF als Bild:** `html2canvas` rendert Seiten als JPEG; Text nicht auswählbar, Tabellen unscharf, große Dokumente bremsen das Handy stark.
3. **ePub zu dünn:** ein einziges Kapitel, Inhaltsverzeichnis mit festem Eintrag „Kapitel 1“, Sprache fest `de`, keine Bilder, kein Autor; Ersatz-UUID ohne `crypto.randomUUID` ist ungültig formatiert; Datei wird mit JSZip-Standard gepackt (Mimetype STORE ist gesetzt, ob JSZip die Reihenfolge einhält, ist nicht geprüft).
4. **Lesen fehlt** (ePub, ZIP, Dateien): keine Rückrichtung „ePub → Markdown“, keine Datei-Auswahl.
5. **CSV nur mit Semikolon erkannt;** Komma-CSV wird als Fließtext behandelt (und das Erkennungsschild sagt „Fließtext“). Zellen mit eingebettetem Semikolon in Anführungszeichen werden zerschnitten (kein echter CSV-Leser). TSV nur, wenn alle Zeilen gleich viele Tabs haben (leere Zellen am Zeilenende brechen das).
6. **Clipboard:** `copyResult` fängt Fehler von `writeText` nicht ab (ohne Berechtigung bricht es still ab); Einfügen holt kein `text/html`, also kommen formatierte Tabellen nicht als Tabellen an.
7. **Neuberechnung bei jedem Tastendruck** (`oninput` → `convertNow`, kein Entprellen): bei großen Eingaben zäh.
8. **`showSaveFilePicker`** gibt es in Android-Chrome nicht; der Rückfall (Download) greift. Der Knopf „Datei sichern“ verspricht aber eine Ordnerwahl (Name `saveWithFolderChoice`). `navigator.share` mit Datei: Verfügbarkeit am Pixel nicht geprüft.
9. **Reader-Overlay** ist die Blattansicht in Vollbild (keine Schriftgröße, kein Seitenwechsel, kein Fortschritt, kein Inhaltsverzeichnis); Schriftwahl nur Arial/Georgia.
10. **Sicherheit:** Vorschau setzt `innerHTML` aus dem eigenen Parser; Text wird durch `escapeHtml` geschützt, Links nur `https`/`mailto`. HTML-Eingabe geht über `DOMParser` (keine Ausführung). Das ist in Ordnung und wird in Tests festgehalten (Skript-Eingabe darf nirgends ausgeführt werden).
11. **Fest verdrahtete Texte:** nur Deutsch, Emoji als Symbole, Kopfzeile „Pixel 9 Pro“ im PDF.
12. **Zustand in Globalen** (`currentFormat`, `normalizedMarkdown` …) und Inline-Handler (`onclick=`): widerspricht `MODULE.md`.

## 6 Vorschlag Zuschnitt: Module und Reihenfolge

Ort der Bausteine: **`tools/convert2/mod/`** (innerhalb der Insel; keine Verweise auf `lib/*` außer Oberfläche). Jedes Modul exportiert eine kleine, reine Schnittstelle und kennt die Oberfläche nicht. Tests: Node-Skripte unter `tests/` (Node 22 hat `CompressionStream`, `TextEncoder`), aufgerufen über `tests/test_convert2.py` (unittest, `bash tests/run_all.sh convert2`); Module mit `DOMParser` laufen in Playwright (`page.evaluate`).

| Nr | Modul (Datei) | Aufgabe | Testart |
|---|---|---|---|
| 1 | `zip.js` | Zip lesen und schreiben, CRC32 selbst, `CompressionStream('deflate-raw')`/`DecompressionStream`, Methoden STORE und DEFLATE, kein ZIP64 | Node, feste Beispiel-Zips, Rundlauf, Gegenprüfung mit `unzip`/Python `zipfile` |
| 2 | `text.js` | Escapes (HTML/XML, LaTeX, YAML), Zeilenenden, Bereinigung (geschützte Leerzeichen, Zero-Width, KI-Müll wie Zitatmarken `[1]`, doppelte Leerzeilen) | Node |
| 3 | `markdown.js` | Markdown → HTML (wohlgeformt als XHTML, Option für EPUB), Markdown → Klartext | Node |
| 4 | `html.js` | HTML → Markdown (`DOMParser`), `looksLikeHtml`, sauberes Einfügen von Tabellen | Playwright |
| 5 | `tabellen.js` | Tabellen aus Markdown holen; TSV, CSV, ASCII-Box, JSON, YAML, BBCode, LaTeX, Typst, AsciiDoc, DITA-XML schreiben; CSV, TSV, JSON lesen (echter CSV-Leser mit Anführungszeichen, Komma und Semikolon) | Node |
| 6 | `epub-schreiben.js` | gültiges EPUB 3: `mimetype` zuerst und unkomprimiert, `container.xml`, `content.opf`, `nav.xhtml` aus den Überschriften, Kapitel je Überschrift 1, Metadaten, Sprache, Bilder (data-URL) | Node, Rundlauf mit 7; `epubcheck` falls verfügbar (im Container nicht installiert: Java ist da, das Programm nicht; ohne Netz nicht zu holen, dann „nicht geprüft“) |
| 7 | `epub-lesen.js` | EPUB lesen: Container, OPF, Spine, Inhaltsverzeichnis, Kapitel, Metadaten, Bilder | Node, Rundlauf |
| 8 | `erkennen.js` | `detectAndNormalize` ohne DOM: liefert `{type, md}` (Markdown, HTML, JSON, TSV, CSV, Fließtext) | Node und Playwright |
| 9 | Oberfläche: `index.html`, `ui/main.js`, `ui/view.js`, `ui/output.js`, `ui/state.js` | Eingabe, Dropdown, Blatt/Code/Vollbild, Kopieren, Download, Teilen, Druck | Playwright |

Reihenfolge Schritt 1: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Danach Schritt 2 (Oberfläche) und Schritt 3 (Aufnahme). Gebaut wird erst nach Freigabe durch den Entwickler.

## 7 Fragen an den Entwickler (vor dem Bau)

1. **Ort der Module:** `tools/convert2/mod/` (Insel) ist mein Vorschlag; der Reader-Auftrag entscheidet später über Kopie oder `lib/shared/`. Einverstanden?
2. **Markdown-Parser:** Der Tool-Parser muss wohlgeformtes XHTML liefern (für EPUB), Callouts und Tabellen mit Ausrichtung können, und er soll ohne `lib/` auskommen. `lib/shared/markdown.js` ist für Modellantworten gebaut (Highlighting, HTML ohne XML-Gewähr). Mein Vorschlag: eigener Parser im Tool, **`lib/shared/markdown.js` bleibt unberührt und wird nicht importiert**. Einverstanden?
3. **PDF:** nur über den Druckdialog (Druck-Stylesheet, „Als PDF speichern“); Text bleibt auswählbar, kein Bibliotheks-PDF. Das ersetzt die beiden Knöpfe „PDF ansehen“ und „PDF speichern“ durch einen Knopf „Drucken / PDF“. Einverstanden, oder soll echtes PDF-Schreiben ohne Bibliothek später als eigener Auftrag kommen?
4. **Tests der Module:** Node-Skripte über `tests/test_convert2.py` (kein neues Werkzeug, Node ist im Container vorhanden). Einverstanden? (Die bisherigen Tests laufen nur mit Python und Playwright; die Aufnahme von Node als Voraussetzung ist neu, aber nur für diese Tests.)
5. **Umfang der Zielformate:** alle 16 behalten und zusätzlich Lesen von CSV (Komma und Semikolon, mit Anführungszeichen), TSV, JSON, HTML, EPUB. DOCX/ODT bleiben draußen (Auftrag). Abweichungen gewünscht?
6. **Kamera/Foto, Modellhilfe:** nicht in dieser Fassung (laut Auftrag).
