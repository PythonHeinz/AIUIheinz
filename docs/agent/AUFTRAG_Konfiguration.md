# AUFTRAG Konfiguration (Strang AIUIheinz-Konfiguration, noch nicht begonnen)

Entwurf nach Entscheidungen des Entwicklers vom 13.11.2026 im Strang Personen. Baut erst nach der Beurteilung des Gesamtkonzepts durch Tertius und nach Bestätigung des Entwicklers. Berührt das Fundament (`lib/providers.js`, `lib/chat/*`, Hub), nur ein Strang zur Zeit. Beschreibung der heutigen Funktionsweise: `docs/BEDIENKONZEPT_DASHBOARD.md`.

## Leitgedanke
- **Dashboard = Werkbank.** Dort wird parametriert. Die **Konfiguration gehört zum Modell** und enthält Engine, Modell, Laufzeit, Person (als Startpunkt), Prompt und Ton.
- **Heinz Chat = eigenes Tool.** Es hat immer genau eine zugewiesene **Konfiguration für den Heinz Chat** mit festem Modell (lokal oder Cloud). Es gibt keinen Heinz Chat ohne Konfiguration. Diese Zuweisung überstimmt jede Modellzuordnung aus dem Dashboard.
- **Keine Kopplung mehr:** Was im Dashboard geladen ist, wirkt nicht mehr auf den Heinz Chat. Der Chat liest das Dashboard beim Start nicht. Parametriert wird im Dashboard, der Heinz Chat bleibt danach unverändert und braucht keine eigenen Prompt- und Tonfelder mehr.
- Modellwechsel zwischen Dashboard und Heinz Chat lädt bei lokalen Modellen neu (ein Modell im Speicher). Das ist erwartetes Verhalten, kein Fehler.

## Regeln
1. **Modell mit zugeordneter Konfiguration** (Zuordnung im Dashboard): lädt nach jedem Neustart automatisch mit ihr, samt Person und Laufzeit. Erst das Entfernen der Zuordnung bringt wieder den Standard ohne zuletzt geänderte Parameter. Modell ohne Zuordnung lädt mit seinem Standard; das Dashboard startet im Heinz-Modus.
2. **Weitere Konfigurationen** darf der Nutzer frei anlegen, exportieren und in anderen Anwendungen laden. Keine Höchstzahl.
3. **Standardkonfiguration für den Heinz Chat:** immer vorhanden, nicht löschbar, kopierbar. Sie hat bei der Auslieferung noch kein Modell: Bei der **Erstinbetriebnahme** legt der Nutzer es fest (erste Aufgabe der Parametrierung). Danach gilt sie wie jede Zuweisung; „Zuweisung lösen“ heißt zurück auf diese Standardkonfiguration.
4. **Mauer Offline/Online:** Hat der Heinz Chat eine Online-Konfiguration und „Online erlauben“ ist aus, sendet er nichts. Beim Öffnen fragt er: „Diese Konfiguration nutzt einen Cloud-Dienst. Online für diese Sitzung zulassen?“ Die Bestätigung gilt nur für die Sitzung und schaltet den globalen Haken nicht um. Lokale Konfigurationen fragen nie. Wer nur offline arbeiten will, wählt ein lokales Modell und sendet nie etwas nach außen.

## Aufgaben
- Speicher: Zuordnung Modell → Konfiguration (neuer gemeinsamer Schlüssel), Standardkonfiguration des Heinz Chat (eingebaut, Schloss), Erstinbetriebnahme-Dialog.
- Dashboard: Zuordnung je Modell pflegen und beim Laden anwenden; Menü „Konfiguration“ trennt Modellzuordnung und „Für den Heinz Chat verwenden“.
- Hub: Kachel „Konfigurationen“ bleibt Bibliothek (Liste, Umbenennen, Export, Import, Löschen) und kennzeichnet die Heinz-Chat-Zuweisung deutlich; Hinweis auf Standardkonfiguration.
- Heinz Chat: startet nur mit seiner zugewiesenen Konfiguration; übernimmt nichts mehr vom Dashboard (Befund B1 erledigt sich); eigene Prompt- und Ton-Felder entfallen; Online-Rückfrage nach Regel 4.
- Tests (nur simuliert), Handytest-Liste, BEGRIFFE, STAND, ENTWICKLUNGSVERLAUF, TECHNIK (neue gemeinsame Schlüssel).

## Offen für den Entwickler
- Standardkonfiguration sichtbar (mit Schloss) oder unsichtbar.
- Mehrere Konfigurationen je Modell möglich (eine davon als Zuordnung)? Vorschlag: ja.
- Gestaltung ist Sache des Designers.

## Ergänzt nach Prüfung durch Tertius (13.11.2026)
- Beim Laden einer Konfiguration schreibt das Dashboard still die geteilte Laufzeit (Kontextfenster, Threads): sichtbaren Hinweis dazu zeigen.
- Laden über Engine-Grenzen im Dashboard (heute nur Hinweis).
- Cloud-Voreinstellungen (Modellstandard, `thinking_level`) stützen sich teils auf Sekundärquellen: vor dem Einbau gegen die offizielle Doku des Anbieters prüfen.
- B2 (Heinz Chat ohne Antwort bei LiteRT-LM) erst nach Bestätigung am Gerät erledigt; Export als Modelfile und LM-Studio-Preset folgt später.
