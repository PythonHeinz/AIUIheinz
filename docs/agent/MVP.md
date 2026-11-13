# MVP intern: Zeile, Lücken, nächste Schritte

Root-Strang, 13.11.2026, nach Abschluss der Stränge Fundament, Personen und Konfiguration. Zielbild: `KONZEPT.md` 23 („erste Fassung für eine zweite Person“). Nur simuliert getestet gilt, wo nicht „am Handy bestätigt“ steht.

## MVP-Zeile (Vorschlag, der Entwickler entscheidet)
**Der MVP ist erreicht, wenn:**
1. Hub, Heinz Chat und Heinz Dashboard auf dem Pixel in der installierten App **und** im Browsertab ohne Fehler laufen und nach Neustart nichts verlieren. *(Speicher, Module: am Handy bestätigt; Rest der Grundliste siehe unten)*
2. Das Dashboard als Werkbank durchgängig bedienbar ist: Person, Prompt, Ton, Laufzeit mit LED und Reset, Konfigurationen. *(Handytest A bis M bestanden)*
3. Der Heinz Chat als eigenes Tool mit einer Konfiguration arbeitet, ohne Auswahl, ohne stillen Engine-Wechsel, mit Mauer Offline/Online. *(Grundfunktion am Handy bestätigt; N, O, P, Q teils offen)*
4. Die Oberfläche **zeigbar** ist: Design-Feinschliff erledigt (Cursorfarbe, Label „Model name“, Modellblatt und LED-Darstellung, DR2 nur soweit nötig). ○
5. Eine **zweite Person es starten kann**: Prüfliste `docs/HANDYTEST.md` Bereiche Allgemein, Hub, Chat, Dashboard abgehakt mit Commit; Startanleitung (README: Termux, Ollama, `bash start.sh`, optional LiteRT-LM) stimmt mit dem Ist-Zustand und ist von einer frischen Installation aus nachvollziehbar. ○

## Was fehlt (Stand 13.11.2026, abends)
| Punkt | Art | Aufwand (Schätzung, meist zu hoch) |
|---|---|---|
| Rückstau 2a/2b prüfen: Startpunkt der App (`start_url` ist `/`, also der Hub; prüfen, ob „öffnet im Chat statt Dashboard“ damit erledigt ist), „Prüfstand“-Reste (Suche in Code und Texten ergibt 0 Treffer, ggf. nur noch Doku), Standard 2 Threads auch im Browsertab (Standardkonfiguration und `DEFAULT_THREADS` setzen 2) | prüfen, kleine Korrektur | 20 bis 30 Min |
| Design-Feinschliff (siehe `AUFTRAG_MVP_Abschluss.md`) | Bau | 1 bis 2 Std |
| Handytest-Listen N, O, Q und B2-Probe, danach Abhaken der Grundliste | nur Entwickler, am Handy | 30 bis 45 Min |
| README/Startanleitung gegen frischen Klon prüfen | Prüfen und Doku | 30 Min |
| Personenwechsel durch Laden einer Konfiguration startet neue Unterhaltung (zu prüfen) | Entscheidung, kleine Korrektur | 15 Min |

## Ausstehende Tests (nur der Entwickler, am Handy)
1. **O, Reste**: Chat öffnet mit seinem Modell, Ollama-Wechsel erwartet, rote Anzeige bei nicht gestartetem LiteRT-LM, Zuweisung lösen.
2. **B2-Probe** (`HANDYTEST.md` O): LiteRT-LM neu starten, Audit im Dashboard, dann Chat mit Nativ. Entscheidet, ob B2 erledigt ist.
3. **N** (Zuordnung Modell → Konfiguration, Autoladen nach Neustart) und **Q** (Hub-Kachel, „Jetzt parametrieren“, Modelfile).
4. **Grundliste** (Allgemein, Hub, Heinz Chat, Dashboard): Haken setzen, was du ohnehin beim Benutzen gesehen hast, mit Datum und Commit. Viele Zeilen sind faktisch erledigt, aber nicht abgehakt.

## Darf warten (nach dem MVP oder bei Bedarf)
- **P** (Mauer Offline/Online mit echter Cloud-Konfiguration; braucht einen Online-Schlüssel, die lokale Seite ist schon geprüft).
- Modelfile-Probe mit `ollama create`; LM-Studio-Preset (Vorlage fehlt); Cloud-Voreinstellungen (`thinking_level`).
- Tool-Seiten (Tabelle, Lab, Vitals, Scan, Filter, Studio, Models, Setup): bleiben nach dem MVP; vor einem Zeigen an die zweite Person nur öffnen und eine Grundaktion prüfen, sonst im Hub als „in Arbeit“ lassen.
- Serie starten/fortsetzen, Vorlesen, Testprotokoll, Sonden: bewährte Funktionen, nur bei Auffälligkeit.
- Ursache der Termux-Ausfälle (Signal 9): nur bei Wiederholung (`date` und `tail -n 8 data/vitals/vitals.csv`).
- Embedding und Wikipedia offline, convert2, Sheet mit echtem Modell, Lab/Vitals, INCIheinz-Umbau, neue Apps, eBook-Reader: Becken und Block B.

## Reihenfolge ab morgen
1. **Strang AIUIheinz-Design** nach `AUFTRAG_MVP_Abschluss.md` (Schritt 0 Rückstau prüfen, danach Design-Feinschliff). Startsatz: „AIUIheinz-Design: nach `docs/agent/AUFTRAG_MVP_Abschluss.md`.“ Nur dieser Strang an `lib/core.*`, `dashboard.html`, `chat.html`.
2. Handytest N, O, Q, B2 durch den Entwickler (jederzeit, auch parallel).
3. Root prüft die MVP-Zeile, die Vormerkungen (Becken) und entscheidet über Block B.
4. Parallel erlaubt, solange isoliert (`tools/<id>/`): eBook-Reader (`docHeinz`), eigener Strang mit eigener Zeile unter „Aktive Arbeit“.
