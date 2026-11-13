# AUFTRAG Personen (Strang AIUIheinz-Personen)

Angelegt 13.11.2026 im Root-Strang. Grundlage: `docs/agent/ANWEISUNG_Personenleiste.md` (Tertius, Beschlüsse des Entwicklers vom 13.11.2026). Sie ist die Regel, die `KONZEPT.md` 23 Punkt 6 vorsah, und gehört zum MVP intern. Lies sie ganz, bevor du anfängst; dieser Auftrag sagt nur, **was davon in welcher Reihenfolge gebaut wird** und wo der Root-Strang etwas festlegt.

Startsatz: „AIUIheinz-Personen: Phase 1 nach `docs/agent/AUFTRAG_Personen.md`.“

## Voraussetzung
- Fundament Phase 2 ist gepusht (259f920); „Aktive Arbeit“ in `STAND.md` war leer. Trotzdem vor der ersten Änderung `git pull --rebase`, Zeile eintragen, pushen.
- Der Handytest von Fundament Phase 2 (`docs/HANDYTEST.md`) steht noch aus. Er läuft **zusammen mit Phase 1 dieses Auftrags** nach dem Push von Phase 1; Phase 2 und 3 beginnen erst nach seiner Rückmeldung des Entwicklers.
- Dieser Strang berührt `lib/dashboard/*`, `dashboard.html`, `lib/chat/*`, `lib/providers.js`, später `lib/store.js`: Fundament-Dateien. Es arbeitet **nur dieser Strang** daran (Regel „Fundament ein Strang“); der Entwickler hat das mit diesem Auftrag freigegeben. Phase 4 (`lib/store.js`, gemeinsame Schlüssel) erst nach erneuter Rücksprache.

## Umfang (aus Abschnitt 9 der Anweisung)
- **Phase 1:** Personenleiste im Dashboard (Anweisung 3), Start auf Heinz, Rücksprung, Markierung „geändert“, Begriffe in EN und DE (Anweisung 2). Tests Anweisung 10, Handytest.
- **Phase 2:** Laufzeit je Modell beim Start (Anweisung 4), Anzeige in Blöcken und Zusammenfassung (Anweisung 5). Dabei erledigt sich `STAND.md` 2b zur Hälfte (Standard 2 Threads für lokale Ollama-Modelle).
- **Phase 3:** Chat-Standard mit Vorschau, „Für den Heinz Chat speichern“, „Auslieferzustand“ (Anweisung 6), **lokal für Ollama und LiteRT-LM**.
- **Danach** (eigener Handschlag mit dem Entwickler, nicht automatisch): Rückstau `STAND.md` 2a (Start im Heinz Chat statt Dashboard, Reste „Prüfstand“, Konfigurationsexport = Phase 4), Phase 4 und 5 der Anweisung.
Phase 1 bis 3 sind MVP. Jede Phase: eigene Commits, alle Tests grün, `ENTWICKLUNGSVERLAUF.md` und `STAND.md` ergänzen, Handytest-Liste in `docs/HANDYTEST.md` fortschreiben, dem Entwickler sagen, was nur simuliert getestet ist.

## Root-Entscheidungen (Präzisierungen und Einwände zur Anweisung)
1. **Phase 3 gilt für Ollama und LiteRT-LM.** `applyToChat()` meldet heute „nur Ollama“. B2 (Heinz Chat antwortete auf LiteRT-LM mit Audit-artigem Text) trat gerade auf LiteRT-LM auf; ein Chat-Standard nur für Ollama ließe ihn ungelöst. Für LiteRT-LM muss der Strang zuerst klären (simuliert, dann am Handy), wie ein Systemprompt je Anfrage gesendet wird und ob der Server eine frühere Systemanweisung hält (`STAND.md` „Offen“ B2). **B2 gilt erst als behoben, wenn der Entwickler es am Handy bestätigt**; die Vorschau macht nur sichtbar, was gesendet wird.
2. **Cloud ist nicht Teil des MVP.** Anweisung 6 (Cloud-Absatz, „Modellstandard“, `thinking_level`) und Offen 1 und 2 bleiben als Vorgabe stehen, werden aber erst gebaut, wenn Online im Heinz Chat ein Ziel ist. Die Regeln in `lib/capabilities.json` gelten schon jetzt: nie einen Ton senden, den das Modell nicht annimmt. Die Quellen der Anweisung (12a) sind Drittquellen zum Teil; vor dem Bau an der Anbieterdoku prüfen und in `docs/SCHNITTSTELLEN.md` nachtragen.
3. **Laufzeit ist geteilt, Person und Ton sind getrennt.** Threads und Kontext gehören laut Anweisung zu Modell und Gerät. Sie werden **je Modell einmal gespeichert und von Dashboard und Heinz Chat gelesen** (so ist es seit `AUFTRAG_Fix_Threads` und am Handy bestätigt 11.11.; ein Tempo-Test im Dashboard soll den Chat schneller machen). Person und Ton im Chat kommen nur aus dem Chat-Standard. Verstellt der Entwickler im Dashboard Threads, gilt das auch im Chat; verstellt er dort Heinz, ändert sich der Chat nicht.
4. **Gespeicherte Unterhaltung öffnen** (`lib/dashboard/conversations.js`, setzt heute den Modus der Unterhaltung): bleibt, die Person der Unterhaltung wird gewählt, Ton und Systemprompt stehen dann auf der **Vorgabe dieser Person** (nicht auf einem früheren eigenen Stand); „geändert“ ist aus. Nur beim Start der App gilt immer Heinz.
5. **Begriff „Person“ und „Persona“:** `lib/personas.js` („Persona“, Rollenbeschreibung als Daten) bleibt unter diesem Namen, **Person** heißt in der Oberfläche der frühere Modus. Der Strang ergänzt `BEGRIFFE.md` (Person, Ton, Laufzeit, Konfiguration, Nativ; Zeile „Modus“ wird „Person (früher Modus; Code: `mode`)“) und sorgt dafür, dass Oberflächentexte nirgends beide Wörter für dasselbe verwenden. Einmalig, in EN und DE.
6. **Nativ** nutzt die vorhandene Mechanik (Quelle „Modell“ in `sysSrc`/`paramSrc`, `modesOnly`); sie darf nicht zu einem vierten Schalter werden. Wenn die Mechanik die drei Quellen (Modell, Modus, Eigene) nach außen weiter zeigt, ist das der Entwicklerwunsch „keine Zusatzschalter“ verletzt: Der Strang schlägt vor, wie die Quellen-Auswahl in den Einstellungen verschwindet oder zur Anzeige „Vorgabe / geändert“ wird, **und fragt den Entwickler, bevor er sie entfernt**.
7. **Zielzustand Handytest:** Mit Phase 1 prüft der Entwickler am Handy: Start auf Heinz, Wechsel Wilson → Nativ → Heinz setzt Ton und Prompt zurück, Stern erscheint und verschwindet, kein Überlappen bei 426 × 803, beide Themen und Sprachen.
8. **Keine Konfigurationsdatei und keine Symbole vor Phase 4 und 5.** `heinz_chat_system` und `heinz_chat_options` je Modell bleiben die Ablage von Phase 3 (Anweisung 6, „auf vorhandener Mechanik“); keine neuen Schlüssel ohne Rücksprache.

## Nicht im Umfang
Anweisung 13 (keine „magische“ Funktion, kein neuer Menüaufbau, kein Assistent, `mode` bleibt im Code), außerdem Cloud-Chat-Standard, Konfigurationsformat und Symbole bis zur Freigabe.
