# AUFTRAG Filter (Strang AIUIheinz-Filter)

Angelegt 20.11.2026 im Root-Strang auf Wunsch des Entwicklers („wir bauen jetzt Filter“). Filter ist der **Nachfolger des Data Lab** (`lab.html`, 659 Zeilen, alter Stil, ruft Ollama direkt auf `localhost:11434` auf). Platzhalter liegt in `tools/filter/` (`status` `placeholder`, Symbol `i-layers`). Startsatz: „AIUIheinz-Filter: nach `docs/agent/AUFTRAG_Filter.md`.“ Lies zuerst `docs/agent/NEUES_WERKZEUG.md`, `docs/MODULE.md`, `docs/DESIGN.md`, `docs/agent/TECHNIK.md`, `docs/LOKALE_MODELLE.md`. Muster für Zuschnitt und Ablauf: `AUFTRAG_convert2.md` (Inventur, Module, Oberfläche, Aufnahme).

## Ziel
Listen und Texte **nach einer Regel in einem Satz bewerten und filtern**, offline mit einem kleinen lokalen Modell. Leitsatz aus `KONZEPT.md` (Archiv v1): Text oder Liste einfügen, Regel in einem Satz, nur Treffer anzeigen. **Das Modell klassifiziert nur (Etikett je Eintrag); Zählen, Auswählen, Sortieren, Trefferquote und Export macht der Code.** Alle Parameter bleiben manuell regelbar. Nichts geht nach außen; ohne „Online erlauben“ keine Anfrage über das Gerät hinaus.

Kein Modell ist verlässlich genug, um jede Einzelbewertung blind zu übernehmen (Erfahrung des Entwicklers mit 3B-Modellen im Lab). Deshalb gehört die **Kontrolle** ins Werkzeug: Kontrollspalte mit Trefferquote, Stichprobe zufällig, kurze Begründung auf Wunsch, Ergebnis immer als Vorschlag, nie als Urteil.

## Was das Lab heute kann (Funktionsvorlage, vom Strang zu inventarisieren)
Eingabe per Datei (CSV, TSV, TXT, JSON, XML, RSS/Atom) oder Einfügen; Spaltenwahl; Kontrollspalte mit Vergleich und „Werte der Kontrollspalte als Etiketten übernehmen“; Voreinstellungen (Presets) für Regel und Etiketten; eigene Etiketten und Regel; Grenzwert Einträge, Temperatur, Kontextfenster; Schalter „kurze Begründung“ und „zufällig wählen“; Auswertung mit Kacheln, Stapel, Tabelle (Eintrag, Etikett, Kontrolle, Grund), Export; Fortschritt und Abbruch; Vorladen und Prüfung des geladenen Modells über `/api/ps`.

## Schritt 0: Vorbereitung und Inventur
- `git pull --rebase`, Zeile unter „Aktive Arbeit“ (`tools/filter/`, `lib/providers.js` nur lesend; **Hub-Eintrag und Statuswechsel am Ende als Mini-Commit mit Rückfrage**), sofort pushen.
- `lab.html` bleibt unverändert, solange Filter nicht abgenommen ist. Als Vorlage nutzen, nicht kopieren: Inventur in `docs/agent/FILTER_INVENTUR.md` (Funktionen je Datei, was ist Oberfläche, was Logik, direkter Ollama-Zugriff, doppelter Code zu `lib/`, Fehler). Modulzuschnitt dem Entwickler **vorlegen, bevor gebaut wird**.

## Schritt 1: Kern ohne Oberfläche (Module mit Tests, Node oder Playwright)
- **Einlesen:** CSV/TSV (mit Anführungszeichen, Trennerkennung), JSON (Feldliste), XML/RSS/Atom (Einträge), Klartext (eine Zeile oder ein Absatz je Eintrag). Eigene Module; Funktionsvorlage in `convert2` darf **gelesen**, aber nicht importiert werden (Insel-Regel); gemeinsame Teile nur nach Rücksprache nach `lib/shared/`.
- **Bewerten:** Aufbau der Anfrage (Regel, Etiketten, Eintrag; **ein Eintrag je Anfrage**, kurzes festes Format der Antwort, Ausgabe auf erlaubte Etiketten geprüft, sonst „unklar“), Schleife mit Abbruch und Wiederaufnahme, Parameter (Temperatur 0 als Standard, Kontext, Token-Grenze) manuell.
- **Auswerten:** Zählung, Trefferquote gegen Kontrollspalte, Verwechslungstabelle, Stichprobe zufällig mit festem Startwert, Sortieren und Filtern der Treffer.
- **Ausgabe:** Export CSV/TSV/JSON/Markdown der Treffer oder der ganzen Tabelle, Kopieren in die Zwischenablage (Tabellen so, dass sie in Sheets ankommen).
- **Modellzugriff nur über `lib/providers.js` (`HeinzProviders`)**, kein direkter `fetch` auf Ollama oder LiteRT-LM; Antworten werden in der Seite nie geraten, nur geparst.

## Schritt 2: Oberfläche (`tools/filter/index.html`)
Ablauf in drei klaren Schritten wie im Lab, aber im neuen Design: **1 Eingabe** (Datei, Einfügen, Spalte), **2 Regel** (ein Satz, Etiketten, Presets, Parameter ausklappbar), **3 Ergebnis** (Kacheln, Tabelle, Kontrolle, Export). Nur Treffer anzeigen als Schalter; Begründung und Zufallswahl wie im Lab. Gestaltung nach `DESIGN.md` (Bausteine `lib/core.css`, Symbole aus dem Sprite, EN und DE, 426 × 803 und 426 × 400, Hell und Dunkel). Lange Läufe: Fortschritt, Abbruch, Fortsetzen nach Neuladen, kein Verlust bei App im Hintergrund.

## Offene Entscheidungen (dem Entwickler zur Wahl vorlegen, nicht raten)
1. **Welches Modell?** Vorschlag: die Standardkonfiguration des Heinz Chat (Qwen 2.5 3B) als Vorgabe, im Werkzeug **änderbar** (Modellwahl nur hier, keine Abhängigkeit vom Dashboard); Engine und Modell als Fakt in der Kopfzeile des Ergebnisses. Laufzeit (Threads, Kontext) wird wie beim Heinz Chat geteilt gelesen, nicht geschrieben.
2. **Ein Eintrag je Anfrage oder Stapel?** Vorschlag: einer (zuverlässiger bei kleinen Modellen), Stapel nur als Option mit Warnhinweis.
3. **Online-Modelle erlaubt?** Vorschlag: nein in dieser Fassung; Mauer Offline/Online wie im Heinz Chat erst, wenn ein Anbieter eingebunden wird.
4. **Presets mitnehmen?** Vorschlag: die bewährten aus dem Lab, gekürzt, mit Beschreibung in EN und DE.
5. **Eigene Daten:** Ergebnisse und letzte Eingaben nur lokal in eigener IndexedDB `heinz_filter`; Einstellungen klein über `HeinzStore` mit Präfix `heinz_filter_…`.

## Schritt 3: Aufnahme und Abschluss
- `tools/filter/tool.json` (`status` `beta`, Beschreibung ohne „Platzhalter“), Hub: Eintrag steht bereits in `AREAS` (prüfen), **Lab auf „alt“ lassen, bis Filter abgenommen ist**; danach auf Wunsch des Entwicklers Lab entfernen.
- Tests (`bash tests/run_all.sh` grün): Einlesen, Antwortprüfung, Trefferquote, Abbruch, Export, Seite mit simuliertem Ollama (Route `**/localhost:11434/**`), Hub zeigt Werkzeug.
- Handytest-Abschnitt in `docs/HANDYTEST.md` (Datei laden am Handy, Einfügen aus Zwischenablage, Lauf mit echtem Qwen 2.5 3B und mit Gemma, Abbruch, Fortsetzen, Export, Kontrollspalte); **nichts als am Gerät geprüft melden, was nur simuliert lief**. Messwerte (Tempo je Eintrag, Trefferquote an einem Testsatz) in `docs/OLLAMA_UND_MODELLE.md` eintragen, sobald der Entwickler sie vom Handy liefert.
- `STAND.md`, `ENTWICKLUNGSVERLAUF.md`, `docs/MODULE.md` (Modulübersicht) ergänzen.

## Nicht im Umfang
Änderungen an `lib/*`, `server.py`, `sw.js`, gemeinsamen Schlüsseln; Bibliotheken ohne Rückfrage; Netzzugriffe; automatisches Ändern von Daten (Filter **liest und kennzeichnet**, schreibt nie in die Quelle). Später, einzeln beauftragt: Anbindung an Sheet (Ergebnis als Tabelle übergeben), Wissensquellen/Embedding, Online-Modelle.
