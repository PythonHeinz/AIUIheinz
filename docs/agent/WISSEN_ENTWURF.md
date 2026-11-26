# Entwurf: Wissensbaustein und Postfach (Skizze, nichts gebaut)

Stand 26.11.2026 (Entscheidungen des Entwicklers eingearbeitet), Strang AIUIheinz-WikiHeinz, nach Wunsch des Entwicklers („fest vorliegendes Wissen und Modellwissen quer über die Apps verbinden“). Berührt das Fundament (`lib/`, `lib/chat`, `lib/store.js`): erst nach Freigabe bauen, nur ein Strang zur Zeit.

## Grundsatz
Fakten kommen aus einer Quelle (Wikipedia, Mein Wiki, später Bücher aus docHeinz), das Modell übersetzt, wählt aus und formuliert. Jede Antwort trennt „belegt [n]“ von „Einschätzung des Modells“. Nichts verlässt das Gerät.

## 1. Wissensbaustein `lib/wissen/` (`HeinzWissen`)
**Entscheidung: keine Fassade.** Die reinen Module von WikiHeinz (`tools/wikiheinz/mod/`: Schlüssel, Quelle, Speicher, Import, Suche, Frage, Volltext, Eigene, ZIP) ziehen nach `lib/wissen/`; WikiHeinz wird ein Nutzer davon. Grund: Das Fundament darf nicht von einem Werkzeug abhängen und der Einzelexport der Apps nicht blockiert werden. Die IndexedDB heißt weiter `heinz_wikiheinz`, ein bereits erfolgter Import bleibt gültig. Der Umzug ist Teil des neuen Strangs AIUIheinz-Wissen, nicht des WikiHeinz-Strangs (Tests wandern mit: `tests/wikiheinz/*.test.mjs` auf die neuen Pfade).

| Aufruf | Ergebnis | Modell? |
|---|---|---|
| `quellen()` | `[{id, name, art, lizenz, stand, bereit}]` | nein |
| `suche(text oder begriffe, {quellen, max})` | Treffer `[{q, titel, auszug, angabe, link, voll}]` | nein |
| `kontext(frage, {senden, quellen, begriffeVom: 'modell' oder 'code'})` | `{text, verwendet[], begriffe, von}` (Begriffe, Suche, Auszüge; ohne Antwort) | optional (Begriffe) |
| `beantworte(...)` | wie heute in WikiHeinz | ja |
| `wert(titel, feld)` | `{wert, quelle, link}` aus der Infobox der ZIM (z. B. Höhe, Einwohner) | nein |
| `merke({titel, text, herkunft, tags})` | legt eine Seite in Mein Wiki an (über Postfach, mit Rückfrage) | nein |

`senden` ist die Funktion der aufrufenden App (eigenes Modell, eigene Konfiguration, eigener Statusring). Der Baustein ruft nie selbst ein Modell auf.

## 2. Postfach (Fundament, `lib/store.js`)
Gemeinsamer Briefkasten zwischen Werkzeugen, läuft über `HeinzStore` (nicht über localStorage), Schlüssel `heinz_postfach`, nie im Export mit API-Schlüsseln.
- Eintrag: `{id, von, an, art, daten, zeit}`; `art`: `merke` oder `zitat`; `daten`: Text, Titel, Herkunft (Buch, Autor, Kapitel).
- API: `HeinzPostfach.legen(an, art, daten)`, `.offen(an)`, `.entfernen(id)`, `.beiNeu(an, fn)` (Ereignis `storage`/BroadcastChannel).
- Grenzen: höchstens 50 Einträge, 20 000 Zeichen je Eintrag, Einträge älter als 30 Tage verfallen.
- Regel: Die empfangende App fragt den Nutzer („Ins Wiki aufnehmen?“), erst danach wird übernommen und der Eintrag gelöscht. Nie automatisch schreiben.

## 3. Anwendungen in dieser Reihenfolge
1. **Fundament:** `lib/wissen.js` und `HeinzPostfach`, Tests (Node und Seite). Ein Strang.
2. **Konfigurationsfeld statt Chat-Haken (Entscheidung):** „Wissen nutzen“ ist ein Feld der Konfiguration, die das Dashboard setzt (Quellen, Anzahl Treffer, Begriffe durch App oder Modell). `lib/chat` bleibt unberührt; Apps lesen das Feld über `PV.configs()`. Wirkung in einer App: vor dem Senden `kontext()`, Auszüge als nummerierter Zusatz im Systemtext („nutze sie, zitiere [n], sonst antworte aus eigenem Wissen und sage es“), Quellenchips unter der Antwort.
3. **Tabelle:** Spalte mit Vorlage („Einwohnerzahl von {Stadt}“): Code sucht je Zeile, bei Infobox-Feldern liest `wert()` ohne Modell, sonst zieht das Modell nur den Wert aus dem Auszug. Zelle merkt Quelle und Link, unsichere oder leere Fälle werden markiert, nie erfunden.
4. **docHeinz:** Knopf „An WikiHeinz senden“ und „Nachschlagen“ (Kurzinfo zu einem markierten Wort) über Postfach und `suche()`.
5. **Später:** Faktencheck einer Behauptung („stützt / widerspricht / nicht gefunden“), automatische Verlinkung von Titeln im Text (nur Code), Bücher aus docHeinz als eigene Quelle.

## Entschieden (26.11.2026, Entwickler; Auftrag: `AUFTRAG_Wissen.md`)
- Module ziehen nach `lib/wissen/`, keine Fassade, IndexedDB `heinz_wikiheinz` bleibt.
- Eigener Strang **AIUIheinz-Wissen** (`lib/wissen/`, Postfach, Konfigurationsfeld). Start erst, wenn der WikiHeinz-Strang fertig ist und seine Zeile unter „Aktive Arbeit“ entfernt hat (beide berühren `server.py`). Ein Chat-Strang läuft nicht, `lib/chat` ist frei, wird aber nicht angefasst.
- **Standard: Suchbegriffe von der App** (am Handy kostet jeder Modellaufruf viel, 0,8 bis 1,9 Token/s mit Ollama). Das Modell ist Rückfall, wenn die App keinen Treffer findet, und Option für Fremdsprachen und Umschreibungen. Wie oft der Rückfall greift, misst der Entwickler am Handy; Messwert wird hier eingetragen: _offen_.
