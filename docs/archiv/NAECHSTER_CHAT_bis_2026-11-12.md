# Startprompt für jeden neuen AIUIheinz-Chat (Archiv, Stand 09.11.2026)

Alte Fassung der `NAECHSTER_CHAT.md` mit der damaligen Projektanweisung (Doppelablage am PC), ausgelagert am 12.11.2026 beim Aufräumen; Text unverändert bis auf den Benutzernamen im Pfad (durch `%USERPROFILE%` ersetzt). Gilt nicht mehr, siehe `docs/agent/PROJEKTANWEISUNG.md`.

# Startprompt für jeden neuen AIUIheinz-Chat

Gilt für alle Chats des Projekts (Root, Stränge, Korrekturen). Dieser Text ist zugleich die Projektanweisung im Claude-Projekt „AIUIheinz“; ändert sich einer, wird der andere angeglichen. Stand 09.11.2026.

Chat-Namen: `AIUIheinz` (Konzept/Root), `AIUIheinz-<Strang>` (zum Beispiel `AIUIheinz-Chat`, `AIUIheinz-Modelle`), `AIUIheinz-Fix-<Thema>` (Korrekturen). Wer einen Strang bearbeitet, bekommt zusätzlich seinen `AUFTRAG_<Strang>.md` genannt.

```
Chat-Name: AIUIheinz (Konzept/Root) bzw. AIUIheinz-<Strang> (z. B. AIUIheinz-Chat, AIUIheinz-Modelle) bzw. AIUIheinz-Fix-<Thema> (Korrekturen)

Projekt AIUIheinz (Heinz UI): Offline-Weboberfläche für kleine lokale Sprachmodelle auf meinem Pixel 9 Pro. Engines: Ollama und LiteRT-LM (beide in Termux), später optional Online-Anbieter (Haken „Online erlauben“, Standard aus). Seiten sind eigenständige HTML-Dateien ohne Build, ein Python-Server (server.py, nur Standardbibliothek) liefert sie unter localhost:3000 aus. Gemeinsamer Code liegt in lib/ (bewusste Ausnahme). Das Zielbild steht in docs/KONZEPT.md im Repo. Gearbeitet, getestet und gepusht wird im angehängten GitHub-Repo (PythonHeinz/AIUIheinz, Branch main), nicht in der Offline-Kopie am PC.

Orte:
- Projektordner am PC: %USERPROFILE%\Toolsbyclaude\AIUIheinz (STAND.md, UEBERGABE.md, ENTWICKLUNGSVERLAUF.md, NAECHSTER_CHAT.md, AUFTRAG_*.md)
- Git-Repo am PC (Offline-Kopie): ...\AIUIheinz\repo. Nur lesen und per git pull aktualisieren, nie von Hand ändern. Kein Push-Zugang.
- GitHub (maßgeblich): https://github.com/PythonHeinz/AIUIheinz. Hier arbeitest und pushst du (add_repo mit Zugriff push).
- Sicherung der alten Chat-Seite: %USERPROFILE%\Toolsbyclaude\HeinzUI-Chat-Backup-2026-11-09 (nur lesen).
- Handy (Termux): Klon des Repos, Update mit git pull, Start mit bash start.sh; Oberfläche http://localhost:3000, Ollama http://localhost:11434, LiteRT-LM http://127.0.0.1:9379. Das Handy liest nur. Dein Chat-Container erreicht Termux nicht.

Schritt 1 – Verbindung: get_device_info und device_list_dir prüfen; wenn keine Verbindung besteht, sag mir, wie ich sie herstelle (Chat in der Claude-Desktop-App auf dem PC öffnen und eine Nachricht senden). Zugriff auf %USERPROFILE%\Toolsbyclaude prüfen, sonst device_request_folder_access. Repo mit add_repo (push) anhängen und klonen. Für git pull am PC einmal device_request_delete_permission.

Schritt 2 – Einlesen: Toolsbyclaude/INDEX.md, AIUIheinz/STAND.md (Aktive Arbeit, Stränge, Module, Nächste Aufgaben), ENTWICKLUNGSVERLAUF.md (letzte Abschnitte), UEBERGABE.md (Quellen & Start, Fallstricke, Arbeitsweise, Designregeln, Tests), docs/KONZEPT.md (Abschnitt 0 Beschlüsse und der Abschnitt deines Strangs), docs/OLLAMA_UND_MODELLE.md. Hat dein Strang einen AUFTRAG_<Strang>.md, lies ihn. Im Repo git pull und git log.

Arbeit in mehreren Chats:
- Jeder Strang hat einen eigenen Chat; die Tabelle „Stränge (Chats)“ in STAND.md ist das Register. Entsteht ein neuer Strang (neue Idee, Korrektur-Chat), trägst du ihn dort ein.
- Standard: nacheinander. Erst baut ein Chat, dokumentiert (ENTWICKLUNGSVERLAUF.md, STAND.md) und pusht, dann der nächste. Gleichzeitig nur, wenn die berührten Dateien verschieden sind und jeder Chat seine Zeile unter „Aktive Arbeit“ hat.
- Das Fundament (lib/, Hub, server.py, gemeinsame localStorage-Schlüssel, EN/DE-Verfahren, Kopfzeile, Engine-Aufrufe) ändert nur ein Chat zur Zeit. Berührt dein Vorhaben das Fundament oder ein fremdes Modul, sag es mir und frag, bevor du etwas baust.
- Korrektur-Chats beheben nur das gemeldete Problem, ergänzen einen Eintrag in ENTWICKLUNGSVERLAUF.md und ändern keine Struktur.

Vor der ersten Änderung: git pull und git log; STAND.md „Aktive Arbeit“ lesen (Eintrag eines anderen Chats unter 24 Stunden oder berührte letzte Änderung: erst fragen); eigene Zeile (Datum, Chat-Name, Vorhaben, berührte Dateien) sofort in STAND.md schreiben (liegt nur im Ordner, per Desktop-Verbindung).

Nach jeder Änderung, spätestens am Chat-Ende:
1. Tests: bash tests/run_all.sh muss grün sein; neue Funktionen bekommen Tests.
2. Im Repo ENTWICKLUNGSVERLAUF.md ergänzen, bei neuen Fallstricken UEBERGABE.md; nach main pushen.
3. Am PC in AIUIheinz\repo git pull; mit cmp prüfen, dass UEBERGABE.md und ENTWICKLUNGSVERLAUF.md im Ordner und im Repo gleich sind.
4. Nur im Ordner: STAND.md (Stand je Modul, Zeile unter „Aktive Arbeit“ entfernen, Stränge und Nächste Aufgaben anpassen) und die Zeile in INDEX.md.
5. Sag mir, was ich auf dem Handy prüfen soll (git pull, bash start.sh, ggf. litert-lm serve --cors-origin http://localhost:3000).

Arbeitsweise:
- Das Modell übersetzt oder klassifiziert nur, Zählen und Rechnen macht der Code. Alle Parameter bleiben manuell regelbar. Welche Modelle auswählbar sind, steht in docs/OLLAMA_UND_MODELLE.md.
- Oberfläche Englisch als Standard, Deutsch per Umschalter; neue Texte immer EN und DE. Stil: minimalistisch, schwarzer Hintergrund, Google-Farben. Viewport Pixel 9 Pro rund 426 × 803 px. Ohne Haken „Online erlauben“ keine Anfrage nach außen.
- Testen im Chat-Container mit Playwright und simulierten Servern (Ollama: Route '**/localhost:11434/**'), den Server mit curl. Echte Modelle laufen nur auf meinem Handy: behaupte nie, etwas sei auf dem Gerät getestet, was nur simuliert lief. Messwerte vom Handy trägst du in docs/KONZEPT.md oder docs/OLLAMA_UND_MODELLE.md ein.
- Dateien zwischen Cloud und PC: lesen mit device_bash oder device_stage_files, schreiben mit device_bash im PC-Ordner oder device_commit_files.
- Alles Nötige muss im Repo liegen (data/ bleibt in .gitignore). Nach größeren Änderungen einmal aus einem frischen Klon testen.
- STAND.md bleibt eine einzige, nach Bereichen geordnete Datei ohne feste Commit-Nummern (nur „Stand: Datum, Commit siehe git log -1“); wird sie zu lang, die alte Fassung nach archiv/ verschieben.
- Sag mir vor jedem Umbau in kurzen Sätzen, was du vorhast.

Schritt 3 – Dann frag mich zuerst: „Welchen Strang bearbeite ich, und was ist beim Test auf dem Handy aufgefallen?“ Warte auf meine Antwort. Nenne ich nichts Besonderes, schlage ich den ersten offenen Punkt unter „Nächste Aufgaben“ in STAND.md vor.
```
