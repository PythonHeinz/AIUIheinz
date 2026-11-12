# AUFTRAG Aufräumen (Strang AIUIheinz-Aufraeumen)

Neuer Strang, angelegt 12.11.2026 im Root-Strang auf Beschluss des Entwicklers. Strangname: **AIUIheinz-Aufraeumen**. Kein neues Feature, kein Code der Seiten. Dieser Strang läuft **allein**: Er ändert Ablageorte und Regeln, die alle anderen Stränge betreffen.

**Vorrang:** Dieser Strang startet noch unter der alten Projektanweisung (mit PC-Abgleich und `cmp`). Für diesen Strang gilt dieser Auftrag, nicht der alte Ablauf; der Strang **endet mit der neuen Projektanweisung** (`docs/agent/PROJEKTANWEISUNG.md`), die der Entwickler danach ins Projekt setzt.

## Beschlüsse des Entwicklers (12.11.2026)
1. **Doppelte Ablage PC und Repo beenden.** Alle Steuerdateien liegen nur noch im Repo (GitHub, maßgeblich). Der PC-Ordner `AIUIheinz` enthält nur noch den Klon `repo/` (nur lesen, `git pull`) und die Projektübersicht `Toolsbyclaude\INDEX.md`. Das Abgleichen per `cmp` und das Schreiben von STAND.md in den PC-Ordner **entfallen aus der Routine**. Der Entwickler kann den Root-Strang weiter auf Anweisung bitten, einen Stand in den PC-Ordner oder in `INDEX.md` zu schreiben.
2. **Dokumenten-Wildwuchs beheben:** Überholtes archivieren, `UEBERGABE.md` in Prozess und Technik trennen, `STAND.md` kurz halten.
3. **Neue Projektanweisung** (Systeminstruktion des Claude-Projekts) und eine **Arbeitsanweisung für den Entwickler** entstehen als Ergebnis dieses Strangs. Der Entwickler setzt die neue Projektanweisung selbst ins Projekt; kein Chat kann sie ändern.
4. **Nicht Teil dieses Strangs:** Zerlegung von `chat.html`, IndexedDB, Menü, Bausteinkatalog (eigene Stränge, siehe Reihenfolge in `STAND.md`).

## Startbedingungen (vor dem ersten Schritt prüfen, sonst nicht starten)
- Der Strang AIUIheinz-Chat hat gepusht und seine Zeile unter „Aktive Arbeit“ in `STAND.md` entfernt; dort steht **keine** Zeile. Jede Zeile eines anderen Chats unter 24 Stunden: Entwickler fragen.
- Der Entwickler hat „Go“ gegeben und weiß, dass in dieser Zeit kein anderer Chat baut.
- `git pull`, `bash tests/run_all.sh` grün (Ausgangsstand notieren).

## Schritte
0. **Sicherung:** Git-Tag `vor-aufraeumen-2026-11-12` auf den aktuellen main-Stand pushen. Am PC den ganzen Ordner `AIUIheinz` (ohne `repo/`) nach `Toolsbyclaude\_Sicherung_vor_Aufraeumen_2026-11-12\` kopieren. Nichts am PC löschen, nur verschieben (Lösch-Erlaubnis nur für `git pull` nötig).
1. **Bestandsaufnahme:** Liste aller Steuer- und Fachdokumente mit Ort (Repo/PC), Größe und Zweck. Dem Entwickler in wenigen Sätzen zeigen, bevor etwas verschoben wird.
2. **Zielstruktur im Repo** (Vorschlag, mit dem Entwickler bestätigen):
   - `docs/agent/`: `STAND.md`, `NAECHSTER_CHAT.md`, `UEBERGABE.md` (nur Prozess), `BEGRIFFE.md` (Begriffstabelle), `TECHNIK.md` (Architektur, Fallstricke, Designregeln, Tests, Termux; aus dem Rest von `UEBERGABE.md`), `ENTWICKLUNGSVERLAUF.md` (nur die letzten rund 10 Tage), alle `AUFTRAG_*.md` (auch die zwei, die bisher nur am PC liegen), `PROJEKTANWEISUNG.md`, `ARBEITSANWEISUNG_ENTWICKLER.md`.
   - `docs/`: Fachdokumente bleiben (`KONZEPT.md`, `DESIGN.md`, `DESIGN_DR2.md`, `SCHNITTSTELLEN.md`, `OLLAMA_UND_MODELLE.md`, `LOKALE_MODELLE.md`, `TERTIUS.md` …).
   - `docs/archiv/`: `KONZEPT_v1_entwurf.md` (Abschnitte 1 bis 14 aus `KONZEPT.md`), `ENTWICKLUNGSVERLAUF_bis_2026-11-10.md`, alte Fassungen. Die **Abschnittsnummern der verbleibenden KONZEPT-Abschnitte nicht ändern** (andere Dokumente verweisen darauf); Abschnitt 0 (Beschlüsse) bleibt.
   - Repo-Wurzel: `README.md` (kurzer Einstieg, Verweis auf `docs/agent/`), sonst nur Code. Keine Stub-Dateien im Repo.
3. **Verschieben mit Git** (`git mv`), danach **alle Verweise nachziehen**: `grep -rn` nach `STAND.md`, `UEBERGABE.md`, `ENTWICKLUNGSVERLAUF.md`, `NAECHSTER_CHAT`, `AUFTRAG_` in Repo, Tests und den Dokumenten des Claude-Projekts (`claude/*.md`). **Bekannt:** `tests/test_rules.py` liest `UEBERGABE.md` aus der Wurzel; Pfad anpassen, Test muss grün bleiben. Verweise der Form „`UEBERGABE.md` Abschnitt X“ auf den richtigen neuen Ort (Prozess oder `TECHNIK.md`) legen.
4. **Entschlacken:** `UEBERGABE.md` trennen (Prozess: Quellen und Start, Routine, Arbeitsweise, Git; Technik: alles andere nach `TECHNIK.md`) und dabei Veraltetes korrigieren (zum Beispiel die Zeile „Jede Seite ist eigenständig, I18N und Basisstile kopiert“: seit DR1/DR2 liegen Gemeinsames in `lib/core.js` und `lib/core.css`; prüfen, was wirklich noch kopiert ist). `KONZEPT.md`: Abschnitte 1 bis 14 archivieren, im Kopf von `KONZEPT.md` einen Satz „Frühere Abschnitte 1–14 in `docs/archiv/KONZEPT_v1_entwurf.md`“. `STAND.md`: kurz, nach Bereichen; Alt-Stände nach `docs/archiv/`.
4a. **Begriffe vereinheitlichen (Wunsch des Entwicklers 12.11.2026):** „Chat“ meint heute vier verschiedene Dinge und führt zu Verwechslungen. Festlegen und überall durchziehen: **Strang** oder mit Namen „AIUIheinz-Chat“ (ein Agent-Chat im Projekt, nie nur „Chat“); **Heinz Chat** (die schlanke Seite `tools/heinz`); **Heinz Prüfstand** (`chat.html`, bisher „Heinz UI“/„Chat-Seite“); **Unterhaltung** (ein gespeicherter Gesprächsverlauf in der App, früher „Chat“); **Chatmenü** nur für das Menü des Prüfstands. Eine kurze Tabelle `docs/agent/BEGRIFFE.md` anlegen und in `PROJEKTANWEISUNG.md` verlinken. In `STAND.md`, allen `AUFTRAG_*.md`, `UEBERGABE.md`, `TECHNIK.md` und `KONZEPT.md` das mehrdeutige „Chat“ durch den passenden Begriff ersetzen (Text der Oberfläche, Dateinamen und Codebezeichner nicht ändern; nur Dokumente). Begriffe in der Oberfläche melden, nicht selbst ändern.
5. **Neue Routine** (in `UEBERGABE.md` Prozess und in `PROJEKTANWEISUNG.md`): `git pull --rebase`; „Aktive Arbeit“ in `docs/agent/STAND.md` lesen; eigene Zeile eintragen **und sofort pushen**; arbeiten; Tests; `ENTWICKLUNGSVERLAUF.md` und `STAND.md` im Repo ergänzen, Zeile entfernen, pushen. **Kein PC-Abgleich, kein `cmp`.** Der Klon am PC wird vom Entwickler bei Bedarf per `git pull` gezogen. Weil mehrere Chats dieselbe `STAND.md` im Repo schreiben, gilt: vor jedem Schreiben `git pull --rebase`, Konflikte nie überschreiben, sondern beide Stände behalten.
6. **Alle `AUFTRAG_*.md` anpassen:** Abschnitt „Vor dem Start lesen“ und alle Pfade auf `docs/agent/`, PC-Schritte streichen. Die Reihenfolge der folgenden Stränge in `STAND.md` eintragen (siehe unten).
7. **PC-Ordner:** Die alten Dateien (`STAND.md`, `UEBERGABE.md`, `ENTWICKLUNGSVERLAUF.md`, `NAECHSTER_CHAT.md`, `AUFTRAG_*.md`) nach `AIUIheinz\archiv_vor_2026-11-12\` verschieben. An ihrer Stelle je eine **Hinweisdatei** gleichen Namens mit drei Zeilen: „Umgezogen: GitHub PythonHeinz/AIUIheinz, `docs/agent/<Datei>`; der Klon liegt in `repo\`.“ (Übergang, solange die alte Projektanweisung noch gilt.) `TERTIUS_privat` bleibt unverändert. `INDEX.md`: Zeile des Projekts auf den neuen Ort und die Routine umstellen.
8. **Projektanweisung und Arbeitsanweisung schreiben:**
   - `docs/agent/PROJEKTANWEISUNG.md`: neuer Text für das Claude-Projekt. Kürzer als heute, neue Pfade, Schritt 1 nur noch Repo anhängen (push); die Desktop-Verbindung ist nur noch für Dateien am PC auf Wunsch nötig. Strangnamen, Stränge, Routine, Arbeitsweise, Designregeln-Verweis wie bisher.
   - `docs/agent/ARBEITSANWEISUNG_ENTWICKLER.md`: Schritte für den Entwickler in der Reihenfolge, die er ausführt (neue Projektanweisung ins Projekt kopieren, Dokumente des Projekts `claude/*` prüfen, am PC `git pull` im Klon, alte Hinweisdateien nach Bestätigung löschen, Handy: nichts zu ändern). Kurz, nummeriert, mit Wo und Was.
9. **Prüfen:** `bash tests/run_all.sh` grün (gleich viele Tests wie vorher), Test aus einem frischen Klon, Hub und Seiten unverändert erreichbar (nichts im Code geändert). Fund-Liste: Verweise, die ins Leere zeigen.
10. **Abschluss:** `ENTWICKLUNGSVERLAUF.md`-Eintrag, `STAND.md` (Stand, Reihenfolge, „Aktive Arbeit“ leer), Push. Dem Entwickler sagen, wann er die neue Projektanweisung einsetzen kann und welche Chats danach zu starten sind.

## Datenschutz am Rande (Beschluss 12.11.2026)
In allen **aktuellen** Dateien (Repo, Dokumente des Claude-Projekts, `INDEX.md`) den Pfad mit dem Benutzernamen ersetzen: Windows `%USERPROFILE%\Toolsbyclaude` (PowerShell `$env:USERPROFILE`), sonst „PC-Ordner“. Die Git-Historie bleibt **unverändert**, die Versionierung wird nicht angetastet (Entscheidung des Entwicklers). In der Historie stehen nur ein Windows-Pfad und Heimnetz-Adressen, keine Schlüssel (geprüft 12.11.2026). Bei einer späteren Portierung wird der Verweis ohnehin ersetzt.

## Grenzen
- Kein Code von Seiten, `lib/`, `server.py`, `sw.js` ändern (Ausnahme: der Pfad in `tests/test_rules.py`).
- Keine Abschnitte in `KONZEPT.md` umnummerieren, keine Inhalte löschen, nur verschieben.
- Nichts als am Gerät geprüft melden.

## Ergebnis und Abweichungen (12.11.2026, Strang AIUIheinz-Aufraeumen)
- Umgesetzt wie beschrieben: `docs/agent/` (Steuerdateien, auch die vier bisher nur am PC liegenden), `docs/archiv/` (`KONZEPT_v1_entwurf.md`, `ENTWICKLUNGSVERLAUF_bis_2026-11-09.md`, `STAND_bis_2026-11-12.md`, `NAECHSTER_CHAT_bis_2026-11-12.md`), neue Dateien `BEGRIFFE.md`, `TECHNIK.md`, `PROJEKTANWEISUNG.md`, `ARBEITSANWEISUNG_ENTWICKLER.md`; Wurzel nur `README.md` und Code.
- Abweichung 1: Der alte Verlauf heißt `ENTWICKLUNGSVERLAUF_bis_2026-11-09.md` (nicht „bis_2026-11-10“), weil alle Abschnitte ab 10.11.2026 im Verlauf bleiben.
- Abweichung 2: Die Sicherung ist der Branch `sicherung/vor-aufraeumen-2026-11-12` (Commit `c20127f`), kein Tag: Tag-Pushes bricht der Proxy des Strang-Containers ab (`UEBERGABE.md`, „Werkzeug-Fallstricke“).
- Der Begriff „Chat“ ist in `STAND.md`, `UEBERGABE.md`, `TECHNIK.md`, den Aufträgen und `KONZEPT.md` nach `BEGRIFFE.md` vereinheitlicht; in `DESIGN.md`, `DESIGN_DR2.md`, `SCHNITTSTELLEN.md`, `TERTIUS.md`, `GEPLANT.md` und im Entwicklungsverlauf (Chronik) blieb er unverändert; das zieht jeder Strang nach, wenn er das Dokument ohnehin ändert.
- Bekannte Verweise ins Leere: nur in alten Chronik-Einträgen des Verlaufs (`docs/AUFTRAG_*.md`, damals richtig); geplante, noch nicht angelegte Dateien (`docs/HANDYTEST.md`, `lib/store.js`, `lib/series/`).
