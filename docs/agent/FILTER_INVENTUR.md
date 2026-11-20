# Inventur Data Lab → Filter (Root, 20.11.2026, Schritt 0 von `AUFTRAG_Filter.md`)

Quelle: `lab.html` (659 Zeilen, ein Inline-Skript, ca. 35 Funktionen). `lab.html` bleibt bis zur Abnahme von Filter unverändert.

## Was drin ist
| Bereich | Funktionen | Einordnung |
|---|---|---|
| Einlesen | `detectDelim`, `parseCSV`, `looksLikeTable`, `ingest` (CSV/TSV, JSON-Liste, RSS/Atom-Titel, Text je Zeile), `buildColumnPicker`, `rebuildItems`, `normCat` | reine Logik → Modul **Einlesen** |
| Kontrolle | `onCompare`, `takeLabels`, `mkResult` (Treffer gegen Kontrollspalte), Kachel „Trefferquote“ in `renderSummary` | reine Logik → Modul **Auswerten** |
| Bewerten | `buildBody` (Systemprompt, JSON-Schema mit `enum`), `classifyOne` (Rückfall auf `format: 'json'` bei HTTP 400), `runJob` (Schleife, Zufallswahl, Abbruch, Fehlerabbruch bei Netz/404) | Logik + Modellzugriff → Modul **Bewerten** |
| Presets | `PRESETS` (mood, urgency, spam, material [Naturkosmetik-Rohstoffe, INCIheinz-nah], topic) | Daten → `presets.js`, `material` prüfen (Sonderfall) |
| Ausgabe | `renderSummary` (Kacheln, Stapel, Farben), `addRow`, `exportCsv`, `exportJson`, `download` | Logik (Export) → Modul **Ausgabe**; Rest Oberfläche |
| Oberfläche | `renderPresets`, `renderChips`, `refreshInfo`, `setStatus`, `applyI18n`, Beispieldaten (`SAMPLE`) | Oberfläche |
| Zustand | `lsGet/lsSet` auf `heinz_lab`, `heinz_settings` | → `HeinzStore` mit Präfix `heinz_filter_` |

## Befunde
1. **Direkter Ollama-Zugriff** (`OLLAMA_URL`, `/api/chat`, `/api/ps`): Es gibt keinen Weg über `HeinzProviders`, LiteRT-LM ist nicht möglich. Modellliste fest: `qwen2.5:3b`, `gemma2:2b`, `gemma:2b`.
2. **Strukturierte Ausgabe ist ein Muss, aber nicht im Provider.** Das Lab zwingt das Modell per `format` (JSON-Schema mit `enum` der erlaubten Etiketten) auf gültige Antworten. `HeinzProviders.chat` → `chatOllama` reicht `format` **nicht** durch (nur model, messages, stream, keep_alive, options). **Das ist eine Änderung in `lib/providers.js` (Fundament)** und muss der Entwickler freigeben, bevor der Strang sie macht. Alternative ohne Fundament-Änderung: nur Prompt + Parsen + Prüfen gegen erlaubte Etiketten (schwächer bei 2B/3B, mehr „unklar“) — Messung nötig. LiteRT-LM (OpenAI-Format) kennt `response_format`; ob die Engine es unterstützt, steht in `docs/SCHNITTSTELLEN.md` nicht gesichert.
3. **Sprache:** eigene I18N-Tabelle in der Seite (EN/DE), nicht aus dem Hub-Verfahren; muss auf `lib/core.js` umgestellt werden.
4. **Zufallswahl** ohne festen Startwert (nicht reproduzierbar); Kontext 2048 Standard und `MAX_CHARS` 500 je Eintrag sind harte Grenzen ohne Hinweis in der Oberfläche.
5. **Fehlerbehandlung:** Bei erstem Netzfehler/404 bricht der Lauf ab; sonst zählt jeder Fehler als „unklar“. Kein Fortsetzen nach Neuladen, keine Speicherung der Ergebnisse.
6. **Keine Netzzugriffe nach außen**, keine Bibliotheken (positiv). Farben fest (`COLORS`), nicht aus den Seitenvariablen.
7. Presets `material` ist INCIheinz-spezifisch (Rohstoff-Kategorien); gehört eher dorthin als in ein allgemeines Werkzeug.

## Vorschlag Zuschnitt (zur Entscheidung des Entwicklers)
`tools/filter/mod/`: `einlesen.js`, `bewerten.js`, `auswerten.js`, `ausgabe.js`, `presets.js`, `db.js` (eigene IndexedDB `heinz_filter`: letzte Eingabe, Ergebnisse, Fortsetzen); `tools/filter/ui/`: `main.js` und je Schritt eine Datei (`eingabe.js`, `regel.js`, `ergebnis.js`); Tests `tests/filter/*.test.mjs` (Node) plus Seitentest mit simuliertem Ollama. Neu gegenüber dem Lab: Modellzugriff über `HeinzProviders`, Ergebnisse speichern und nach Neuladen fortsetzen, fester Startwert für die Zufallswahl, Hinweis bei gekürzten Einträgen.

## Fragen an den Entwickler (beantwortet 20.11.2026: 1 ja, 2 nein, 3 ja; siehe `AUFTRAG_Filter.md`)
1. `lib/providers.js` darf **`format` (Schema) an Ollama durchreichen** (kleine Änderung, Fundament, Mini-Commit mit Test)? Sonst nur Prompt + Prüfung.
2. Preset `material` ins Filter übernehmen oder weglassen (gehört zu INCIheinz)?
3. Modelle: Vorgabe Qwen 2.5 3B aus der Standardkonfiguration, Wahl im Werkzeug frei aus der Liste der Engine (auch LiteRT-LM)?
