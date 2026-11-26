# Entwurf: Wissensbaustein und Postfach (Skizze, nichts gebaut)

Stand 26.11.2026, Strang AIUIheinz-WikiHeinz, nach Wunsch des Entwicklers („fest vorliegendes Wissen und Modellwissen quer über die Apps verbinden“). Berührt das Fundament (`lib/`, `lib/chat`, `lib/store.js`): erst nach Freigabe bauen, nur ein Strang zur Zeit.

## Grundsatz
Fakten kommen aus einer Quelle (Wikipedia, Mein Wiki, später Bücher aus docHeinz), das Modell übersetzt, wählt aus und formuliert. Jede Antwort trennt „belegt [n]“ von „Einschätzung des Modells“. Nichts verlässt das Gerät.

## 1. Wissensbaustein `lib/wissen.js` (`window.HeinzWissen`)
Dünne Fassade, lädt die reinen Module von WikiHeinz (`tools/wikiheinz/mod/`, ohne Oberfläche) erst bei Gebrauch per `import()`. Die Inselregel von WikiHeinz bleibt unberührt; ziehen drei Werkzeuge den Baustein, wandern `mod/` später nach `lib/wissen/`.

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
Gemeinsamer Briefkasten zwischen Werkzeugen, Schlüssel `heinz_postfach` (nicht in den Schlüsseln, nicht im Export mit API-Schlüsseln).
- Eintrag: `{id, von, an, art, daten, zeit}`; `art`: `merke` oder `zitat`; `daten`: Text, Titel, Herkunft (Buch, Autor, Kapitel).
- API: `HeinzPostfach.legen(an, art, daten)`, `.offen(an)`, `.entfernen(id)`, `.beiNeu(an, fn)` (Ereignis `storage`/BroadcastChannel).
- Grenzen: höchstens 50 Einträge, 20 000 Zeichen je Eintrag, Einträge älter als 30 Tage verfallen.
- Regel: Die empfangende App fragt den Nutzer („Ins Wiki aufnehmen?“), erst danach wird übernommen und der Eintrag gelöscht. Nie automatisch schreiben.

## 3. Anwendungen in dieser Reihenfolge
1. **Fundament:** `lib/wissen.js` und `HeinzPostfach`, Tests (Node und Seite). Ein Strang.
2. **Heinz Chat:** Haken „Wissen nutzen“ (Standard aus, Modell der Unterhaltung bleibt). Vor dem Senden `kontext()`, Auszüge als nummerierter Zusatz im Systemtext („nutze sie, zitiere [n], sonst antworte aus eigenem Wissen und sage es“), Quellenchips unter der Antwort, in der Unterhaltung gespeichert. Option „Suchbegriffe durch die App statt Modell“ spart einen Aufruf.
3. **Tabelle:** Spalte mit Vorlage („Einwohnerzahl von {Stadt}“): Code sucht je Zeile, bei Infobox-Feldern liest `wert()` ohne Modell, sonst zieht das Modell nur den Wert aus dem Auszug. Zelle merkt Quelle und Link, unsichere oder leere Fälle werden markiert, nie erfunden.
4. **docHeinz:** Knopf „An WikiHeinz senden“ und „Nachschlagen“ (Kurzinfo zu einem markierten Wort) über Postfach und `suche()`.
5. **Später:** Faktencheck einer Behauptung („stützt / widerspricht / nicht gefunden“), automatische Verlinkung von Titeln im Text (nur Code), Bücher aus docHeinz als eigene Quelle.

## Offene Entscheidungen
- Fassade über `import()` (Vorschlag) oder `mod/` gleich nach `lib/wissen/` verschieben.
- Eigener Strang „AIUIheinz-Wissen“ für Schritt 1 und 2 (berührt `lib/chat`, daher Abstimmung mit dem Chat-Strang).
- Standard „Suchbegriffe durch die App“ im Chat: an oder aus.
