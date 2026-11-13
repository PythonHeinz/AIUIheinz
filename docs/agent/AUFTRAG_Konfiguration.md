# AUFTRAG Konfiguration (Strang AIUIheinz-Konfiguration)

> **Freigegeben 13.11.2026** (Entwickler; Tertius hat dem Gesamtkonzept zugestimmt, die Logik der Bedienung ist freigegeben). Startsatz: „AIUIheinz-Konfiguration: nach `docs/agent/AUFTRAG_Konfiguration.md`.“ Die Präzisierungen des Root-Strangs unten (Abschnitt „Root-Entscheidungen“) gelten mit.

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

## Root-Entscheidungen (13.11.2026, Querprüfung)
1. **Reihenfolge der Schritte:** (a) Zuordnung Modell → Konfiguration und Autoladen im Dashboard, (b) Standardkonfiguration und Zuweisung, Heinz Chat liest nur sie, (c) Offline/Online-Mauer, (d) Hub-Kachel. Nach (b) Handytest des Entwicklers, bevor (c) und (d) beginnen. Jede Stufe eigene Commits, Tests grün, Verlauf und STAND ergänzt.
2. **Erstinbetriebnahme nicht doppelt bauen:** Der Dialog „Modell für den Heinz Chat festlegen“ ist der erste Schritt des späteren Einrichtungsassistenten (`KONZEPT.md` 18.3). Gebaut wird jetzt nur das Minimum: Hat die Standardkonfiguration noch kein Modell, zeigt der Heinz Chat eine Modellwahl (ein Satz, ein Knopf) und speichert die Wahl dort. Kein eigener Mehrschritt-Dialog.
3. **Modellwechsel im Heinz Chat:** Das Schnellblatt des Chat hat heute eine Modellwahl. Mit „festes Modell“ wird daraus die Wahl der zugewiesenen Konfiguration. Der Strang legt dem Entwickler vor, ob der Chat dafür eine kurze Liste der Konfigurationen anbietet (Vorschlag) oder die Zuweisung nur im Dashboard und im Hub geändert wird.
4. **Alte Schlüssel:** `heinz_chat_system`, `heinz_chat_options` und `heinz_slim*` werden vom Heinz Chat nicht mehr gelesen und nicht gelöscht (wie `sysSrc` und `modesOnly`). „Eigene Prompt- und Ton-Felder entfallen“ heißt: aus der Oberfläche entfernen, Tests anpassen, nicht ersatzlos streichen.
5. **Laufzeit bleibt geteilt, Chat liest nur** (`AUFTRAG_Personen.md` Punkt 3). Die Laufzeit einer Konfiguration wirkt nur beim Laden im Dashboard (mit sichtbarem Hinweis, Tertius), nie im Chat.
6. **B2 am Gerät prüfen:** Hat der Chat „kein Prompt“ (Nativ) und der LiteRT-LM-Server hält eine frühere Systemanweisung aus dem Dashboard, wirkt „kein Prompt“ womöglich nicht. Der Strang prüft zuerst simuliert, was gesendet wird (keine Systemnachricht), und legt dem Entwickler eine Handyprobe vor: Dashboard Audit senden, dann im Heinz Chat mit Nativ-Konfiguration auf `gemma4-e2b`; Server mit `litert-lm serve --cors-origin http://localhost:3000` zuvor neu starten. B2 gilt erst nach seiner Bestätigung als erledigt; ohne Lösung wird entschieden, ob der Chat bei LiteRT-LM einen leeren Systemprompt ausdrücklich senden muss.
7. **Cloud-Voreinstellungen** (`thinking_level`, Modellstandard) nur bauen, wenn Online im Heinz Chat Ziel ist; vorher an der Anbieterdoku prüfen (Tertius).

