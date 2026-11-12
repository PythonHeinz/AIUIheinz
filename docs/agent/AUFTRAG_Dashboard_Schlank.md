# AUFTRAG Dashboard schlank (Strang AIUIheinz-Dashboard)

Neuer Strang, angelegt 12.11.2026 im Root-Strang. Strangname: **AIUIheinz-Dashboard**. Startet **nach** AIUIheinz-Menu (beide ändern `dashboard.html`), **vor** AIUIheinz-Speicher.

## Dogma (Beschluss des Entwicklers 12.11.2026, steht in `docs/KONZEPT.md` 22)
**Schlankes Web-UI: Die Seite zeigt an und bedient. Sie enthält keine Datenbanken, keine Prüfprozeduren-Texte und keine Ergebnisse.** Definitionen (Prompts, Prüfregeln, Parametermatrizen, Modellregeln) liegen als Daten im Repo, Nutzdaten und Ergebnisse im Speicher des Browsers (nächster Strang: IndexedDB) und gehen per Export nach außen. Eine neue Prüfprozedur ist eine neue Datendatei, nicht eine neue Funktion in `dashboard.html`.

## Ausgangslage
`dashboard.html` ist auf über 3000 Zeilen gewachsen: Unterhaltung, Menü, Tempo-Test, Testreihen, Modus- und Modellwerte, Texte in EN/DE. Neue Prüfverfahren und Ergebnisse landen im Skript. Das kostet beim Lesen und Ändern viele Token und erzeugt Regressionen.

## Phase 1 – Inventur und Vorschlag (kein Code)
1. `dashboard.html` in Blöcke gliedern: Anzeige (Markup, Stile), Bedienlogik, Engine- und Messlogik, Prüfverfahren, eingebettete Daten (Texte, Standardprompts, Regeln), Speicherzugriffe. Je Block Zeilenzahl, Abhängigkeiten, Ziel (Modul, Datendatei, bleibt).
2. Vorschlag für die Aufteilung mit **ES-Modulen ohne Build** (`<script type="module">`, Dateien unter `lib/` oder `lib/dashboard/`), Testreihen- und Prüfdefinitionen als **JSON** (zum Beispiel `lib/series/*.json`), Texte EN/DE aus dem Wörterbuch. Reihenfolge der Umzüge so, dass nach **jedem** Schritt alle Tests grün sind und das Verhalten gleich bleibt.
3. Dem Entwickler vorlegen und **auf seine Freigabe warten**. Nichts bauen vorher.

## Phase 2 – Umbau (nach Freigabe, in kleinen Schritten, je ein Commit)
- Verhalten und Aussehen bleiben **unverändert**; es ist ein reiner Umzug.
- Definitionen (Prompts, Prüfregeln, Matrizen, Sonden S1 bis S8) als Daten; der Läufer `lib/testreihe.js` liest sie.
- Ergebnisse nicht mehr fest in die Seite einbetten; Schreib- und Lesezugriffe hinter eine kleine Speicherschicht mit **asynchroner Schnittstelle** legen (zunächst weiter `localStorage`), damit der Strang Speicher nur die Schicht tauscht.
- Neue Regel in `docs/agent/TECHNIK.md`: Neue Prüfverfahren, Prompts und Regeln gehören in Datendateien.

## Fallstricke (vorab bekannt)
- **Inline-Handler** (`oninput="onThreads()"`, `onclick=…`) finden Funktionen in Modulen nicht, weil Module keine globalen Namen anlegen. Entweder Handler im Modul per `addEventListener` setzen oder gezielt an `window` hängen; nicht alles auf einmal.
- Module laufen verzögert (wie `defer`): Reihenfolge der Initialisierung prüfen (Sprache, Thema, Einstellungen vor dem ersten Zeichnen).
- `sw.js` hält Dateien im Zwischenspeicher (Netzwerk zuerst): neue Moduldateien in der Liste ergänzen, sonst fehlen sie offline.
- Playwright-Tests, die auf Funktionen der Seite zugreifen (`page.evaluate`), brauchen den neuen Zugriffsweg.
- Das Menü ist zu diesem Zeitpunkt umgebaut (Strang Menu): nicht gegen dessen Bausteine arbeiten, sondern sie nutzen (Katalog `tools/design/index.html`).

## Grenzen
- `lib/providers.js` und Engine-Aufrufe nur lesen, außer die Aufteilung verlangt es; dann vorher fragen.
- Nichts als am Gerät geprüft melden. Nach dem Umbau Handytest in `docs/HANDYTEST.md` eintragen (Unterhaltung, Tempo-Test, Testreihe, Modellwechsel), nicht einzeln beim Entwickler abfragen.
- Läuft allein; Zeile unter „Aktive Arbeit“ in `docs/agent/STAND.md`.
