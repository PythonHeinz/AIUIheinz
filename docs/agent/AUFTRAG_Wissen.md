# AUFTRAG Wissen (Strang AIUIheinz-Wissen)

Angelegt 26.11.2026 im Root-Strang nach den Antworten des Entwicklers auf `docs/agent/WISSEN_ENTWURF.md` (Entwurf des Strangs AIUIheinz-WikiHeinz, Commit f34303b). Startsatz: „AIUIheinz-Wissen: nach `docs/agent/AUFTRAG_Wissen.md`.“ **Berührt das Fundament** (`lib/`, `lib/store.js`, Konfigurationsformat in `lib/providers.js`, später `lib/chat`, `lib/dashboard`): läuft allein, Zeile unter „Aktive Arbeit“, vorher dort nachsehen (Stand 26.11.: keine Zeile; berührt der WikiHeinz-Strang `server.py` oder `tools/wikiheinz/`, erst abwarten oder fragen). Lies zuerst `WISSEN_ENTWURF.md`, `AUFTRAG_WikiHeinz.md`, `WIKIHEINZ_ENTWURF.md`, `docs/MODULE.md`, `docs/agent/NEUES_WERKZEUG.md`, `docs/agent/TECHNIK.md`, `docs/BEDIENKONZEPT_DASHBOARD.md`, `AUFTRAG_Konfiguration.md`.

## Ziel
Das lokale Wissen (Wikipedia aus der ZIM, „Mein Wiki“, später Bücher aus docHeinz, weitere Wikis) steht den **anderen Werkzeugen als Baustein** zur Verfügung: Ein kleines lokales Modell bekommt zur Frage **belegte Auszüge mit Quelle**, übersetzt und formuliert nur; Suchen, Auswählen, Zählen und Zitieren macht der Code. Alles bleibt auf dem Gerät. Wording: **„belegt durch Quelle (Stand der ZIM-Datei)“**, nicht „verifiziert“; die Quelle ist in jeder Antwort sichtbar, nichts gefunden heißt „nicht gefunden“.

## Entscheidungen des Entwicklers (26.11.2026)
1. **Module ziehen um, keine Fassade.** Die reinen Module von WikiHeinz (`tools/wikiheinz/mod/`: `db`, `eigene`, `frage`, `import`, `quelle`, `schluessel`, `speicher`, `suche`, `volltext`, `zip`) wandern nach **`lib/wissen/`**. WikiHeinz wird Nutzer davon (Importe angepasst, Tests laufen unverändert grün). Grund: Das Fundament darf nicht von einem Werkzeug abhängen, jede App soll einzeln exportierbar bleiben. **Die IndexedDB behält den Namen `heinz_wikiheinz`** (kein erneuter Import der 4,6 Mio. Einträge, am Handy ca. 1,5 Stunden); neue Quellen dürfen eigene Stores bekommen, Umbenennung nur mit Migration und Rückfrage.
2. **Eigener Strang AIUIheinz-Wissen** (dieser), allein am Fundament. Chat-Strang ruht (es gibt keinen laufenden; `lib/chat` ist frei).
3. **Der Haken „Wissen nutzen“ kommt nicht in den Heinz Chat**, sondern als **Feld der Konfiguration** (Dashboard setzt, Heinz Chat liest nur, wie bei Laufzeit und Person). Standard aus. Das Konfigurationsformat bekommt ein **optionales** Feld `wissen` (z. B. `{ an: true, quellen: [...], begriffe: 'app'|'modell' }`); ältere Dateien bleiben gültig (Format-Version nur anheben, wenn der Import ältere Dateien sonst ablehnt), Modelfile-Export und LM-Studio-Vorlage ignorieren das Feld.
4. **Suchbegriffe standardmäßig von der App (Code)**, nicht vom Modell (jeder Modellaufruf kostet am Handy 0,8 bis 1,9 Token/s mit Ollama). **Rückfall auf das Modell**, wenn die App keinen Treffer findet; „Modell“ als wählbare Option für Fremdsprache und Umschreibungen. Wie oft der Rückfall greift, misst der Entwickler am Handy (Handytest-Abschnitt, Messwert in den Entwurf).

## Aufgaben in dieser Reihenfolge (jede Stufe pushen und abnehmen lassen)
**Stufe 1: Umzug und Baustein (Fundament).**
- Zeile unter „Aktive Arbeit“, sofort pushen; Zuschnitt dem Entwickler in kurzen Sätzen vorlegen.
- `lib/wissen/` mit den verschobenen Modulen und `lib/wissen/index.js` (`HeinzWissen`, ES-Modul, keine Kreise, ein Einstieg). Aufrufe nach Entwurf: `quellen()`, `suche(...)`, `kontext(frage, {senden, quellen, begriffeVom})` (Begriffe, Suche, Auszüge, **ohne Antwort**), `beantworte(...)`, `wert(titel, feld)` (Infobox, kein Modell), `merke(...)` (über Postfach, mit Rückfrage). **`senden` ist die Funktion der aufrufenden App** (eigenes Modell, eigene Konfiguration, eigener Statusring); der Baustein ruft nie selbst ein Modell auf. Modellzugriff nie direkt, nur über `HeinzProviders` der aufrufenden Seite.
- Variante B (ganze Artikel aus der ZIM über `server.py`: `/api/wiki/status`, `/api/wiki/artikel`) wird **mitbenutzt**, nicht neu gebaut; fehlt die ZIM, fällt `suche` auf Variante A (IndexedDB) zurück und meldet den Weg („voll“ oder „Auszug“).
- Wenn eine Quelle fehlt (nichts importiert, ZIM nicht da), melden die Aufrufe das als Zustand, nie als Fehler; Aufrufer blenden die Funktion aus. Werkzeuge bleiben ohne `lib/wissen/` voll nutzbar (optionale Fähigkeit).
- Tests: Node (reine Module), Seite mit simuliertem Ollama, WikiHeinz-Tests grün; `bash tests/run_all.sh`. `docs/MODULE.md`, `STAND.md`, `ENTWICKLUNGSVERLAUF.md`.

**Stufe 2: Postfach.**
- `HeinzPostfach` über **`HeinzStore`** (IndexedDB), **nicht** über `localStorage` (50 Einträge × 20 000 Zeichen sprengen dessen 5-MB-Grenze). Eintrag `{id, von, an, art ('merke'|'zitat'), daten, zeit}`; Grenzen 50 Einträge, 20 000 Zeichen je Eintrag, 30 Tage; API `legen`, `offen`, `entfernen`, `beiNeu` (BroadcastChannel). Schlüssel nicht in den Sicherungen mit API-Schlüsseln.
- Regel: Die empfangende App **fragt den Nutzer** („Ins Wiki aufnehmen?“), erst danach wird übernommen und der Eintrag gelöscht; nie automatisch schreiben.
- Gemeinsamer Schlüssel in `HeinzStore` ist Fundament: Mini-Commit mit Test, vorher kurz melden.

**Stufe 3: Konfiguration und Heinz Chat.**
- Feld `wissen` in Konfiguration (Dashboard-Menü „Konfiguration“: Schalter „Wissen nutzen“, Quellenwahl, „Suchbegriffe: App / Modell“); Hub-Kachel „Konfigurationen“ zeigt es lesend; Export und Import erweitert; Test.
- Heinz Chat: Hat die zugewiesene Konfiguration `wissen.an`, läuft vor dem Senden `kontext()`; die Auszüge gehen als nummerierter Zusatz in den Systemtext („nutze sie, zitiere [n]; ohne passenden Auszug sage das und antworte nur, wenn du sicher bist, und kennzeichne es als Einschätzung“), **Quellenchips** unter der Antwort (Titel, Link, Lizenz), in der Unterhaltung gespeichert. Statusring und Phasen („suche … lese … antworte“) wie in WikiHeinz. Der Chat bleibt ohne Auswahl und ohne eigene Schalter (Beschluss 13.11.).
- Tests: simulierter Ollama, mit und ohne Treffer, Konfiguration ohne `wissen` unverändert.

**Stufe 4 (nur auf Zuruf, einzeln, andere Stränge oder Anschlussaufträge):**
- docHeinz: Knopf „An WikiHeinz senden“ (Postfach) und „Nachschlagen“ über `suche()`; docHeinz könnte danach auf die Wikipedia aus `lib/wissen/` zugreifen statt eine eigene Kopie (363 MB) zu halten (Änderung durch den docHeinz-Strang, Migration klären).
- Tabelle (`sheet`): erst **nach dem Sheet-Umbau** (`sheet.html` ruft Ollama noch direkt auf, Block B); dann Spaltenvorlage („Einwohnerzahl von {Stadt}“): Code sucht, `wert()` liest ohne Modell, sonst zieht das Modell nur den Wert aus dem Auszug; Quelle und Link je Zelle, unsichere Fälle markiert, nie erfunden.
- Filter: Auszüge als Zusatzkontext zur Regel (optional). Faktencheck („stützt / widerspricht / nicht gefunden“), weitere Quellen (Bücher, MediaWiki-Export).

## Grenzen
- Nur ein Strang am Fundament; `server.py`, `sw.js`, `lib/providers.js` nur für das Konfigurationsfeld und nur als Mini-Commit mit Rückfrage und Test; keine Bibliotheken ohne Rückfrage; kein Netzzugriff ohne Haken „Online erlauben“ (der Baustein selbst fragt nie nach außen).
- Keine Antwort aus dem Gedächtnis des Modells als „belegt“ kennzeichnen; Lizenz der Quellen (Wikipedia CC BY-SA) in jeder Ansicht und Antwort.
- Nichts als am Gerät geprüft melden, was nur simuliert lief; Handytest-Abschnitt in `docs/HANDYTEST.md` (Chat mit Wissen, Konfiguration setzen, Flugmodus, Rückfall Variante A ohne ZIM, Postfach), Messwerte (Antwortzeit mit Wissen, Häufigkeit des Modell-Rückfalls) in `KONZEPT.md` 19.6.
