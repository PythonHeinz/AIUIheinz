# AUFTRAG WikiHeinz (Strang AIUIheinz-WikiHeinz)

Angelegt 25.11.2026 im Root-Strang auf Wunsch des Entwicklers („weiter mit dem neuen Tool WikiHeinz“). Vormerkung stand in `docs/GEPLANT.md` (25.11.2026). **id `wikiheinz`, Ordner `tools/wikiheinz/`.** Startsatz: „AIUIheinz-WikiHeinz: nach `docs/agent/AUFTRAG_WikiHeinz.md`.“ Lies zuerst `docs/agent/NEUES_WERKZEUG.md`, `docs/MODULE.md`, `docs/DESIGN.md`, `docs/agent/TECHNIK.md`, `docs/LOKALE_MODELLE.md`, `docs/KONZEPT.md` 19.6, `AUFTRAG_Filter.md` (Muster für Modellzugriff und Antwortprüfung) und die Einträge „docHeinz Nachschlagen offline“ in `ENTWICKLUNGSVERLAUF.md`.

## Ziel
Ein eigenes Werkzeug für das **lokale Nachschlagewerk aus der Wikipedia**, offline am Handy, ohne dass der Entwickler jede „dumme, gesellschaftliche oder menschliche“ Frage an ein Abo-Modell schicken muss (Projektbeschreibung). In drei Stufen, jede für sich nutzbar:
1. **Stöbern:** Suche (Titel, Weiterleitungen) und Artikelansicht (Einleitung, später Infobox), schnell und ohne Modell.
2. **Fragen:** Frage in eigenen Worten → das Modell **übersetzt sie in Suchbegriffe** (es klassifiziert/übersetzt nur) → der Code findet Artikel → die Auszüge gehen als Kontext an das Modell → Antwort **nur auf Grundlage der Auszüge**, mit Quellenangabe (Titel, Link, Lizenz). Nichts gefunden = „nicht gefunden“, nie aus dem Gedächtnis des Modells.
3. **Ausbau:** Infobox-Auslese, weitere Wikis (z. B. VW-T4-Wiki, MediaWiki-Export) als „Quellen“ im selben Werkzeug, Verknüpfung mit docHeinz/Sheet nur auf Wunsch.

Leitsatz des Projekts: Das Modell übersetzt oder klassifiziert nur; Suchen, Zählen und Auswählen macht der Code. Offline: keine Anfrage nach außen, **ohne Haken „Online erlauben“ nie**.

## Ausgangslage (geprüft 25.11.2026)
- docHeinz hat Nachschlagen: Wörterbücher importieren (TSV/CSV/JSON/JSONL, Wiktionary), im Leser „Wörterbuch“ in der Markierungsleiste, Wikipedia-Kurztext online hinter Haken (`mod/wikipedia.js`), **Wikipedia offline**: PC/Termux-Skript `tools/docheinz/skripte/zim_zu_woerterbuch.py` (eigener ZIM-Leser, nur Standardbibliothek plus `zstandard`) macht aus der Kiwix-ZIM „wikipedia_de_all_mini_2026-10“ (4,69 GB, nur Einleitungen) eine `wikipedia-de.jsonl.gz` (363 MB, 4.608.504 Einträge inkl. Weiterleitungen, Lauf in Termux ca. 1,5 Stunden, Begriffsklärungen ausgelassen, Einleitung auf 500 Zeichen gekürzt, Infobox und Tabellen fehlen). Import in docHeinz und Suche **am Handy bestätigt** (25.11.2026, Beispiel „Sokrates“).
- Das reicht für „Wort nachschlagen beim Lesen“, nicht für Stöbern und Fragen: kein Artikelvolltext, keine Infobox, Suche nur nach dem Wort selbst, kein Suchschritt vor dem Modell.
- `docs/KONZEPT.md` 19.6: Einbettungsmodelle (nomic-embed-text, EmbeddingGemma 2 über LiteRT-LM) sind **nicht auf dem Handy geprüft**; Volltext gegen Einbettungssuche ist offen.
- docHeinz bleibt unverändert (anderer Strang). **Keine Importe aus `tools/docheinz/`** (Insel-Regel); das Skript darf **kopiert** und erweitert werden (`tools/wikiheinz/skripte/`), die Wörterbuch-Logik wird neu geschrieben, wo sie gebraucht wird.

## Schritt 0: Vorbereitung und Zuschnitt (vor dem Bau dem Entwickler vorlegen)
- `git pull --rebase`, Zeile unter „Aktive Arbeit“ (`tools/wikiheinz/`, Hub-Eintrag `index.html` nur `AREAS` am Ende als Mini-Commit mit Rückfrage), sofort pushen.
- **Recherche und Kurzbericht** (`docs/agent/WIKIHEINZ_ENTWURF.md`), bevor Code entsteht:
  1. **Datenformat:** Rohe ZIM im Browser scheidet voraussichtlich aus (zstd im Browser nicht eingebaut, `DecompressionStream` kann es nicht; Bibliothek nur nach Rückfrage). Vorschlag: **eigenes Format durch Skript** (Titel-Index, Artikeltext, Weiterleitungen) und **eigene IndexedDB `heinz_wikiheinz`**. Messen, was am Handy in IndexedDB bei 4,6 Mio. Einträgen geht (Importzeit, Größe, Suchzeit Titelvorsilbe) — docHeinz hat den Lauf schon geschafft; Zahlen dort nachlesen, nicht neu raten.
  2. **Suche:** Titel-Vorsilbe und Weiterleitungen sind billig. **Volltext über 4,6 Mio. Einleitungen** am Handy braucht einen Wortindex (Größe, Aufbau durch das Skript) oder entfällt. Einbettungssuche über so viele Artikel am Pixel: erst messen, nicht annehmen. Vorschlag für Version 1: Titel und Weiterleitungen, dazu eine kleine Stichwortliste je Artikel nur wenn die Größe stimmt.
  3. **Infobox:** Das Skript nimmt bisher nur die Einleitung der Ausführung „mini“. Ob „mini“ Infoboxen enthält und welche Ausführung („nopic“, „maxi“) mit welcher Größe nötig wäre, ist **offen und liegt bei Kiwix** (aus dem Container nicht erreichbar): Entwickler nennt die Größen oder lädt die Datei. Bis dahin Stufe 3.
  4. **Frage-Ablauf:** Suchbegriffe aus der Frage (Modell, ein Aufruf, Antwort als Liste geprüft; Rückfall: Code zerlegt die Frage in Wörter und sucht Titel) → bis zu drei Artikel → Kontextbau mit festem Rahmen → Antwort mit Quellen. Kontextgröße und Antwortgrenze an `docs/LOKALE_MODELLE.md` ausrichten; Kontext knapp halten (Qwen 2.5 3B, Kontext 4096 als Standard).
  5. **Lizenz und Kennzeichnung:** Wikipedia CC BY-SA; jede Antwort und Artikelansicht nennt Quelle, Artikeltitel, Link und Lizenz; Hinweis „Auszug, am Stand der ZIM-Datei (Datum)“ in der Oberfläche.
- Dem Entwickler **den Zuschnitt in kurzen Sätzen vorlegen** und die Fragen unten stellen; erst nach seiner Antwort bauen.

## Schritt 1: Kern ohne Oberfläche (Module mit Tests)
Eigene Module (Muster `tools/filter/mod/`), keine Verweise auf die Oberfläche:
- `schluessel.js` (Normalisierung von Suchbegriffen: NFC, Groß/Klein, ß, Umlaute, Interpunktion),
- `quelle.js` (eine **Quelle** = Name, Sprache, Lizenz, Stand, Anzahl; Grundlage für weitere Wikis später),
- `import.js` + `db.js` (Import der jsonl.gz mit Fortschritt, Abbruch und Fortsetzen nach Neuladen; **Löschen in Stücken**, wie docHeinz es für große Wörterbücher gelöst hat; eigene IndexedDB),
- `suche.js` (Titel-Vorsilbe, Weiterleitungen folgen, Treffer sortieren; Wortindex nur nach Schritt 0 Punkt 2),
- `frage.js` (Suchbegriffe über `HeinzProviders`, **nur Antworten gegen das erwartete Format geprüft**; Rückfall ohne Modell; Kontext bauen; Antwort mit Quellen),
- Python-Skript `skripte/…` (Kopie und Erweiterung von `zim_zu_woerterbuch.py` nur, wenn Schritt 0 es verlangt; Test mit selbstgebauter Mini-ZIM).
Modellzugriff **nur über `lib/providers.js`**, kein direkter `fetch` auf Ollama/LiteRT-LM.

## Schritt 2: Oberfläche (`tools/wikiheinz/index.html`)
Zwei Reiter **Stöbern** und **Fragen** (zweiter erst, wenn Stufe 2 gebaut ist): Suchfeld oben, Trefferliste, Artikelansicht ruhig in Serife (Leseseite), Quelle und Lizenz sichtbar; Fragen: Eingabe, Fortschritt „suche … lese … antworte“, Antwort **mit den verwendeten Auszügen zum Aufklappen**; Modell wählbar (Vorgabe Qwen 2.5 3B, auch LiteRT-LM), Parameter manuell. Quellenverwaltung (Import, Löschen, Größe, Stand) in einem Bereich „Quellen“. Gestaltung nach `DESIGN.md` (Bausteine, Sprite, EN und DE, 426 × 803 und 426 × 400, Hell und Dunkel). Online nur mit Haken: ein optionaler Link „Artikel in der Wikipedia öffnen“ ist ein normaler Link, keine Anfrage der Seite.

## Schritt 3: Aufnahme und Abschluss
- `tools/wikiheinz/tool.json` (`status` `beta`), Hub-Eintrag in `AREAS` als eigener Mini-Commit mit Rückfrage; eigene Daten nur in `heinz_wikiheinz`, kleine Einstellungen über `HeinzStore` mit Präfix `heinz_wikiheinz_…`.
- Tests (`bash tests/run_all.sh` grün): Schlüssel, Import (kleine Probe), Suche, Frage-Ablauf mit simuliertem Ollama, Antwort ohne Treffer = „nicht gefunden“, Quellenangabe immer vorhanden, Hub zeigt Werkzeug.
- Handytest-Abschnitt in `docs/HANDYTEST.md` (Import der echten Datei, Suchzeit, Speicher, Frage mit Qwen 2.5 3B, Flugmodus); **nichts als am Gerät geprüft melden, was nur simuliert lief**; Messwerte (Importzeit, Größe, Suchzeit, Antwortzeit je Frage) in `docs/OLLAMA_UND_MODELLE.md` oder `KONZEPT.md` 19.6 eintragen, sobald der Entwickler sie liefert.
- `STAND.md`, `ENTWICKLUNGSVERLAUF.md`, `docs/MODULE.md`, `docs/GEPLANT.md` (Vormerkung als beauftragt kennzeichnen).

## Fragen an den Entwickler (im Strang, vor dem Bau)
1. **Reihenfolge:** Stufe 1 (Stöbern) zuerst, Fragen danach? (Vorschlag: ja.)
2. **Doppelte Daten:** WikiHeinz importiert die Wikipedia in **eigene** Datenbank (Insel-Regel), die Wikipedia liegt dann einmal in docHeinz und einmal in WikiHeinz (je ca. 363 MB Datei, IndexedDB größer). Einverstanden, oder soll docHeinz später auf WikiHeinz verweisen (nur Änderung durch den docHeinz-Strang nach Abnahme)? (Vorschlag: zunächst doppelt.)
3. **Datei:** Import per Dateiwahl wie in docHeinz (jsonl.gz vom Handy) oder später vom Server aus `data/`? (Vorschlag: Dateiwahl.)
4. **Infobox:** Welche ZIM-Ausführung kommt in Frage (Größe)? Ohne Antwort bleibt Stufe 3 Vormerkung.
5. **Weitere Quellen** (VW-T4-Wiki, MediaWiki-Export) erst nach Stufe 2 und nur auf Zuruf.

## Grenzen
- Keine Änderungen an `lib/*`, `server.py`, `sw.js`, gemeinsamen Schlüsseln (Ausnahme nur mit Freigabe, Mini-Commit); keine Bibliotheken ohne Rückfrage (zstd-Decoder im Browser, Volltextindex-Bibliothek, Embedding-Modelle: vorlegen); kein Netzzugriff ohne Haken; **keine Antwort aus dem Gedächtnis des Modells**, nur aus Auszügen; keine Änderung an docHeinz.
- Wikipedia-Text ist CC BY-SA: Quelle, Titel, Link, Lizenz immer sichtbar; Dateien nicht ins Repo (`data/` bleibt in `.gitignore`, Quelldateien liegen beim Entwickler).
