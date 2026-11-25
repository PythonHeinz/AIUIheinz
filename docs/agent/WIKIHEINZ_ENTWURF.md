# WikiHeinz – Entwurf (Schritt 0)

Strang AIUIheinz-WikiHeinz, 25.11.2026. Entwurf zum Auftrag `AUFTRAG_WikiHeinz.md`. Alles hier ist Planung, nichts gebaut, nichts am Handy gemessen.

## Beschlüsse des Entwicklers (25.11.2026)
1. **Start mit Variante A:** Import der gekürzten `wikipedia-de.jsonl.gz` in die eigene IndexedDB `heinz_wikiheinz`. **Variante B** (`server.py` liest die ZIM direkt, volle Artikel und Infobox, keine Doppelung) ist das Endprodukt; sie berührt `server.py` (Fundament) und wird erst nach Freigabe und eigener Rückfrage gebaut.
2. **„Mein Wiki“ so früh wie möglich:** eigene, schreibbare Quelle neben der Wikipedia.
3. **Knopf „Markierung an WikiHeinz senden“** in docHeinz ist erwünscht, Weg über ein **Postfach** (Fundament, nur nach Rückfrage; Änderung im docHeinz-Strang, nach Abnahme von WikiHeinz).
4. **Mindmap ist nicht Teil von WikiHeinz.** Verweise zwischen Seiten werden aber so gespeichert, dass ein späteres Werkzeug sie auslesen kann.
5. Weitere Wikis (VW-T4, MediaWiki-Export) erst nach Stufe 2 und nur auf Zuruf.

## Quelle als Grundbaustein
Eine **Quelle** hat: `id`, `name`, `sprache`, `lizenz`, `stand`, `anzahl`, `art` (`import` = schreibgeschützt, `eigen` = schreibbar). Die Wikipedia ist eine Quelle `import`, „Mein Wiki“ eine Quelle `eigen`. Suche und Frage laufen über alle Quellen oder über eine gewählte.

## Daten (IndexedDB `heinz_wikiheinz`)
- `quellen`: Metadaten je Quelle.
- `eintraege`: `[quelle, schluessel]` als Schlüssel, Felder `titel`, `text`, `verweis` (Weiterleitung auf Titel), `geaendert`. Index auf `schluessel` für die Vorsilbensuche (`IDBKeyRange.bound`).
- `eigene` (nur Quelle `eigen`): Seiten mit Markdown-Text, `tags`, `links` (aus `[[Titel]]` ausgelesen), `herkunft` (Buch, Autor, Kapitel, Zitat, Datum; kommt vom Senden-Knopf).
- Volltext: für „Mein Wiki“ ist er klein genug (Linearsuche oder Wortindex im Speicher). Für die Wikipedia in Version 1 **nicht**; Größe eines Wortindex über 4,6 Mio. Einleitungen erst messen.
- Import (Wikipedia): Dateiwahl, zeilenweises Lesen mit `DecompressionStream('gzip')`, Stapel, Fortschritt, Abbruch, Fortsetzen nach Neuladen, Löschen in Stücken. Importzeit, Größe und Suchzeit stehen bei docHeinz (4.608.504 Einträge am Handy importiert) und werden dort nachgelesen, nicht neu geschätzt.
- **Sicherung:** Die Wikipedia lässt sich neu importieren, „Mein Wiki“ nicht. Deshalb Export (Markdown je Seite in einer Zip, dazu JSON mit Verweisen) von Anfang an und eine Warnung, solange kein Export gemacht wurde. Große Daten landen nicht im App-Backup (`NEUES_WERKZEUG.md` 3).

## Suche
Titel-Vorsilbe nach `schluessel` (NFC, klein, ß, Umlaute, Interpunktion), Weiterleitungen folgen, Treffer sortieren (genau, Vorsilbe, kürzester Titel). „Mein Wiki“ zusätzlich Volltext und Tags.

## Frage-Ablauf (Stufe 2)
Modell übersetzt die Frage in Suchbegriffe (ein Aufruf, Antwort gegen das erwartete Format geprüft; Rückfall: Code zerlegt die Frage in Wörter) → Code sucht bis zu drei Artikel über die gewählten Quellen → fester Kontextrahmen → Antwort nur aus den Auszügen, mit Quelle. Nichts gefunden = „nicht gefunden“. Modellzugriff nur über `HeinzProviders`; Vorgabe Qwen 2.5 3B, Kontext 4096. Auszüge sind in Variante A höchstens 500 Zeichen; Fragen nach Zahlen oder Einzelheiten sind damit nur begrenzt beantwortbar (bekannte Grenze, löst Variante B).

## Senden aus docHeinz (Beschluss Entwickler 25.11.2026: über Postfach, Fundament nötig)
docHeinz legt die markierte Stelle (Text, Buchtitel, Autor, Kapitel, Zeit) in ein **Postfach**, WikiHeinz holt sie beim Öffnen ab und fragt „Ins Wiki aufnehmen?“ (Titelfeld, Zielseite neu oder anhängen); danach wird der Eintrag im Postfach gelöscht. Das Postfach ist ein gemeinsamer Speicherplatz zweier Werkzeuge und damit **Fundament** (gemeinsamer Schlüssel in `HeinzStore`, nur nach Rückfrage und Eintrag unter „Berührt Fundament“). Der Feinentwurf (Schlüssel, Format, Größe, Löschregel) folgt in Schritt 4; WikiHeinz liest das Postfach nur lesend und löscht eigene Abholungen. Den Knopf in docHeinz baut der docHeinz-Strang.

## Lizenz und Kennzeichnung
Wikipedia: CC BY-SA; jede Antwort und Artikelansicht nennt Quelle, Titel, Link, Lizenz und „Auszug, Stand der ZIM-Datei (2026-10)“. „Mein Wiki“: Herkunft (Buch, Autor) wird mitgespeichert; Zitate aus Büchern sind private Notizen, keine Veröffentlichung.

## Reihenfolge
1. **Kern:** `schluessel.js`, `quelle.js`, `db.js`, `import.js`, `suche.js`, `eigene.js` (Seiten anlegen, ändern, löschen, Verweise lesen, Export) mit Node-Tests.
2. **Oberfläche Stöbern und Mein Wiki:** Suche, Artikelansicht, Seiteneditor, Quellenverwaltung.
3. **Fragen** (`frage.js`, Reiter „Fragen“) über Wikipedia und Mein Wiki.
4. **Postfach** (Fundament, Rückfrage) und Aufnehmen in WikiHeinz; Knopf in docHeinz durch den docHeinz-Strang.
5. **Variante B** nach Freigabe (`server.py`-Endpunkt, `zstandard` in Termux).

## Offen
- Enthält „mini“ die Infobox? Prüfung mit dem ZIM-Leser in Termux an wenigen Artikeln (Rohausgabe), dann Stufe „Infobox“.
- Wortindex-Größe für die Wikipedia (nur messen, wenn Version 1 steht).
- Berührung des Fundaments: nur `index.html` `AREAS` (Mini-Commit, Rückfrage); sonst keine.
