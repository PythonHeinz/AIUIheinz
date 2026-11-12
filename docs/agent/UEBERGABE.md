# AIUIheinz – Übergabe für neue Stränge (Prozess)

Gilt für jeden Strang (Root, Fachstränge, Korrektur-Stränge). Neu gefasst am 12.11.2026 (Strang AIUIheinz-Aufraeumen): **Alle Steuerdateien liegen nur noch im Repo** (`docs/agent/`), es gibt keine Doppelablage und keinen Abgleich mit `cmp`. Die Technik (Architektur, Fallstricke, Designregeln, Tests) steht in `TECHNIK.md`, die Begriffe in `BEGRIFFE.md`. Der Stand steht in `STAND.md`, die Projektanweisung des Claude-Projekts in `PROJEKTANWEISUNG.md`.

## Pflichtregel: lokale Modelle
Wer ein lokales Modell anspricht (jede Seite, jedes neue Tool), liest zuerst `docs/LOKALE_MODELLE.md` und nutzt nur `HeinzProviders` (Laufzeit, Vorladen, gemeinsame Modellwahl, Abbruch beim Verlassen der Seite). Die Performance darf nicht bei jedem Modul neu verhandelt werden (Beschluss des Entwicklers).

## Start (jeder Strang)
1. Repo `PythonHeinz/AIUIheinz` mit `add_repo` (Zugriff „push“) anhängen und klonen. Die Desktop-Verbindung zum PC ist nur nötig, wenn der Entwickler Dateien am PC will (zum Beispiel einen Stand in `INDEX.md`).
2. Lesen: `docs/agent/STAND.md` (Aktive Arbeit, Stränge, Module, Nächste Aufgaben), die letzten Abschnitte von `docs/agent/ENTWICKLUNGSVERLAUF.md`, diese Datei, `TECHNIK.md` (Fallstricke und Tests), `BEGRIFFE.md`, `docs/KONZEPT.md` (Abschnitt 0 und der Abschnitt des eigenen Strangs), `docs/OLLAMA_UND_MODELLE.md`. Hat der Strang einen `docs/agent/AUFTRAG_<Strang>.md`, lesen.
3. `git pull --rebase` und `git log`; dann die Routine unten.

## Routine (jede Änderung)
1. **Vor der ersten Änderung:** `git pull --rebase`; „Aktive Arbeit“ in `docs/agent/STAND.md` lesen. Steht dort eine Zeile eines anderen Strangs unter 24 Stunden, oder wird ein fremdes Modul oder das Fundament berührt: den Entwickler fragen.
2. **Eigene Zeile eintragen und sofort pushen** (Datum, Strangname, Vorhaben, berührte Dateien).
3. Arbeiten. Neue Funktionen bekommen Tests; `bash tests/run_all.sh` muss grün sein.
4. **Abschluss:** `git pull --rebase`, dann `ENTWICKLUNGSVERLAUF.md` (was, Dateien und Funktionen, welche Tests, was offen), `STAND.md` (Stand je Modul, Zeile unter „Aktive Arbeit“ entfernen, Stränge und Nächste Aufgaben anpassen) und bei neuen Fallstricken `TECHNIK.md` im Repo ergänzen; nach `main` pushen.
5. Dem Entwickler sagen, was er auf dem Handy prüfen soll (`git pull`, `bash start.sh`, ggf. `litert-lm serve --cors-origin http://localhost:3000`) und was nur simuliert getestet ist.

**Kein PC-Abgleich, kein `cmp`, kein Schreiben von `STAND.md` in den PC-Ordner.** Der Klon am PC wird vom Entwickler bei Bedarf mit `git pull` gezogen. Der Entwickler kann den Root-Strang bitten, einen Stand in `INDEX.md` am PC zu schreiben.

**Mehrere Stränge, eine `STAND.md`:** Vor jedem Schreiben `git pull --rebase`. Konflikte nie überschreiben, sondern beide Stände behalten.

## Arbeitsweise
- Genau ein Strang baut zur selben Zeit, wenn nichts anderes vereinbart ist (Absprache des Entwicklers). Gleichzeitig nur, wenn die berührten Dateien verschieden sind und jeder Strang seine Zeile unter „Aktive Arbeit“ hat.
- Das Fundament (`lib/`, Hub, `server.py`, gemeinsame localStorage-Schlüssel, EN/DE-Verfahren, Kopfzeile, Engine-Aufrufe) ändert nur ein Strang zur Zeit. Berührt ein Vorhaben das Fundament oder ein fremdes Modul, dem Entwickler sagen und fragen, bevor etwas gebaut wird. Eingriffe stehen in `STAND.md` unter „Berührt Fundament“.
- Ein Modul ändert nur seine eigene Seite. Neue Seiten bekommen eine Kachel im Hub und, wenn sie Ollama oder den Server neu ansprechen, einen Eintrag in `docs/OLLAMA_UND_MODELLE.md`.
- Korrektur-Stränge beheben nur das gemeldete Problem, ergänzen einen Eintrag in `ENTWICKLUNGSVERLAUF.md` und ändern keine Struktur.
- Neue sichtbare Texte immer mit EN und DE; Designregeln siehe `TECHNIK.md` und `docs/DESIGN.md`.
- **Oberfläche: erst den Design-Katalog ansehen** (`tools/design/index.html`, Regel in `docs/DESIGN.md` 7). Keine eigenen Varianten bestehender Bausteine auf einzelnen Seiten; fehlt ein Baustein, wird er in `lib/core.css` angelegt und im Katalog eingetragen.
- Vor jedem Umbau in kurzen Sätzen sagen, was geplant ist und was der Entwickler auf dem Handy prüfen soll.
- Nie behaupten, etwas sei auf dem Gerät getestet, was nur simuliert lief. Messwerte vom Handy kommen in `docs/KONZEPT.md` oder `docs/OLLAMA_UND_MODELLE.md`.
- Der Entwickler arbeitet auf Deutsch; Antworten sachlich und knapp, ohne Lob und Begeisterung.
- Der Root-Strang (`AIUIheinz`) macht Konzept und Querprüfung; der Entwickler meldet dort „Modul X fertig“.

## Ablage und Dokumente
- **Alles Nötige muss im Repo liegen.** Eine Hilfsdatei, die nur lokal existiert, verhindert, dass ein frischer Strang bauen oder testen kann (bei INCIheinz passiert). `data/` bleibt in `.gitignore`.
- `docs/agent/`: Steuerdateien (`STAND.md`, `NAECHSTER_CHAT.md`, `UEBERGABE.md`, `TECHNIK.md`, `BEGRIFFE.md`, `ENTWICKLUNGSVERLAUF.md`, `AUFTRAG_*.md`, `PROJEKTANWEISUNG.md`, `ARBEITSANWEISUNG_ENTWICKLER.md`). `docs/`: Fachdokumente (`KONZEPT.md`, `DESIGN.md`, `DESIGN_DR2.md`, `SCHNITTSTELLEN.md`, `OLLAMA_UND_MODELLE.md`, `LOKALE_MODELLE.md`, `TERTIUS.md` …). `docs/archiv/`: Überholtes, unverändert.
- **`STAND.md` bleibt kurz** und nach Bereichen geordnet, ohne feste Commit-Nummern (nur „Stand: Datum, Commit siehe `git log -1`“). Wird sie zu lang, die alte Fassung nach `docs/archiv/` verschieben. Der **`ENTWICKLUNGSVERLAUF.md`** behält nur die letzten rund 10 Tage; ältere Abschnitte wandern in `docs/archiv/ENTWICKLUNGSVERLAUF_bis_<Datum>.md`.
- Abschnittsnummern in `KONZEPT.md` werden nie geändert, Inhalte nur verschoben, nicht gelöscht (andere Dokumente verweisen darauf). Die Abschnitte 1 bis 14 stehen in `docs/archiv/KONZEPT_v1_entwurf.md`.
- In aktuellen Dateien keinen Pfad mit dem Benutzernamen schreiben: Windows `%USERPROFILE%\Toolsbyclaude` (PowerShell `$env:USERPROFILE`), sonst „PC-Ordner“.
- Dokumente und Namen der Stränge: Maßgeblich ist der Strangname aus der Tabelle „Stränge“ in `STAND.md`, nicht der Titel in der Chat-Liste der Claude-App. Stränge benennen nichts um.

## Auf das Handy bringen
Die Stränge arbeiten im angehängten GitHub-Repo, getestet wird auf dem Handy:
1. Der Strang pusht nach `main`. Am PC ist nichts nachzuziehen.
2. Auf dem Handy: `cd ~/AIUIheinz && git pull`, dann den Server mit Strg+C beenden und `bash start.sh`. Das Repo ist öffentlich, das Handy braucht zum Lesen keinen Login (der Login per Code hat in Termux nicht funktioniert) und schreibt nie.
3. **Ohne Eingabe in Termux (seit 09.11.2026):** Im Dashboard ☰ → „Nach Updates suchen“ ruft `POST /api/update` auf, der Server macht `git pull --ff-only` im Projektordner und die Seite lädt neu. Hat sich `server.py` geändert, startet sich der Server selbst neu (`os.execv`, gleiche Optionen) und die Seite wartet auf `/api/ping`. Einmalig von Hand nötig: das erste `git pull` und Neustart, damit der Server den Endpunkt überhaupt kennt. Geht nicht bei lokalen Änderungen im Handy-Klon (Meldung „git pull failed“ mit Ausgabe), nur mit Internet.
4. **Versionsnummer:** steht in `VERSION.txt` (Version 1.0 seit 09.11.2026). Ein Strang erhöht sie nur bei Änderungen, die der Entwickler als neue Fassung ansieht (zuerst fragen). Die Pille in ☰ zeigt Nummer, Commit und Datum.
5. Umstieg erfolgte am 09.11.2026: `git clone https://github.com/PythonHeinz/AIUIheinz.git ~/AIUIheinz`, `data/` aus dem alten Ordner `~/ollama_ui` kopiert (bleibt als Sicherung).
6. Fallback ohne Git: Dateien aus dem Strang in den Download-Ordner laden und per `cp ~/storage/downloads/<datei> ~/AIUIheinz/` kopieren. Android benennt doppelte Downloads um (`server(1).py`); vorher mit `ls ~/storage/downloads | grep <name>` prüfen.

## Werkzeug-Fallstricke im Strang-Container
- **Git-Tags lassen sich nicht pushen** (der Proxy bricht mit „unexpected disconnect“ ab, `gh api` für Referenzen ist gesperrt). Sicherungspunkte als Branch pushen: `git push origin <commit>:refs/heads/sicherung/<name>`. Erlebt 12.11.2026.
- Der erste Klon ist flach (`--depth 1`); vor dem Push `git fetch origin main`, sonst wird der ganze Baum hochgeladen.
- Am PC: Wer dort Git benutzt (`git pull` im Klon), braucht in der Sitzung einmal die Löschfreigabe für den Ordner (`device_request_delete_permission`), sonst bleiben Sperrdateien (`.lock`, `tmp_obj_*`) in `.git` liegen und spätere Git-Befehle scheitern mit „File exists“. Nur Sperrdateien löschen, die ein früherer Befehl hinterlassen hat.
- Dateien zwischen Strang-Container und PC: vom PC lesen mit `device_bash` oder `device_stage_files`, in den PC-Ordner schreiben mit `device_bash` oder `device_commit_files` (große Dateien als Zip übertragen und auf dem PC entpacken). Der Klon am PC wird nie von Hand geändert.

## Orte
- GitHub (maßgeblich, öffentlich, `main`; hier wird gearbeitet und gepusht): `https://github.com/PythonHeinz/AIUIheinz` (clone-URL `https://github.com/PythonHeinz/AIUIheinz.git`; GitHub meldete am 11.11.2026 beim Push „This repository moved“, die alte Schreibweise `PythonHeinz/aiuiheinz` leitet nur um; bei alter Adresse als `origin`: `git remote set-url origin https://github.com/PythonHeinz/AIUIheinz.git`). Im Strang per `add_repo` (push) angehängt.
- PC: `%USERPROFILE%\Toolsbyclaude\AIUIheinz\repo` ist der Klon (nur lesen, per `git pull` aktualisieren, kein Push-Zugang); `%USERPROFILE%\Toolsbyclaude\INDEX.md` ist die Projektübersicht; `…\HeinzUI-Chat-Backup-2026-11-09` ist die Sicherung der alten Dashboard-Seite (nur lesen); `…\AIUIheinz\archiv_vor_2026-11-12` und `…\_Sicherung_vor_Aufraeumen_2026-11-12` enthalten die alten Steuerdateien; `…\AIUIheinz\TERTIUS_privat` (privat, nicht im Repo).
- Sicherungsstand vor dem Aufräumen: Branch `sicherung/vor-aufraeumen-2026-11-12` (Commit `c20127f`).
- Handy (Termux): `~/AIUIheinz` (Klon, nur lesen), Oberfläche `http://localhost:3000`, Ollama `http://localhost:11434`, LiteRT-LM `http://127.0.0.1:9379`. Der Strang-Container erreicht Termux nicht.
