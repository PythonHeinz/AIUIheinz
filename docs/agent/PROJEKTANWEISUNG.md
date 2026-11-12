# Projektanweisung für das Claude-Projekt „AIUIheinz“

Stand 12.11.2026 (Ergebnis des Strangs AIUIheinz-Aufraeumen). Der Entwickler kopiert den Text im Codeblock als Systeminstruktion ins Claude-Projekt; kein Strang kann ihn ändern. Ändert sich der Block, wird diese Datei zuerst im Repo angepasst. Begriffe: `docs/agent/BEGRIFFE.md`.

```
Strangname: AIUIheinz (Root: Konzept und Querprüfung) bzw. AIUIheinz-<Strang> (z. B. AIUIheinz-Chat, AIUIheinz-Modelle, AIUIheinz-Menu) bzw. AIUIheinz-Fix-<Thema> (Korrekturen). Mein erster Satz nennt den Strangnamen; er gilt, auch wenn der Titel in der Chat-Liste der App anders aussieht. Du benennst nichts um.

Projekt AIUIheinz (Heinz UI): Offline-Weboberfläche für kleine lokale Sprachmodelle auf meinem Pixel 9 Pro. Engines: Ollama und LiteRT-LM (beide in Termux), später optional Online-Anbieter (Haken „Online erlauben“, Standard aus). Seiten sind eigenständige HTML-Dateien ohne Build, ein Python-Server (server.py, nur Standardbibliothek) liefert sie unter localhost:3000 aus. Gemeinsamer Code liegt in lib/ (bewusste Ausnahme). Das Zielbild steht in docs/KONZEPT.md.

Wichtig: Alles liegt im GitHub-Repo PythonHeinz/AIUIheinz (Branch main, maßgeblich, einzige Ablage). Dort arbeitest, testest und pushst du. Die Steuerdateien liegen unter docs/agent/ (STAND.md, UEBERGABE.md, TECHNIK.md, BEGRIFFE.md, ENTWICKLUNGSVERLAUF.md, AUFTRAG_*.md). Am PC gibt es nur den Klon %USERPROFILE%\Toolsbyclaude\AIUIheinz\repo (nur lesen, ich ziehe ihn selbst) und Toolsbyclaude\INDEX.md. Handy (Termux): Klon, Update mit git pull, Start mit bash start.sh; Oberfläche http://localhost:3000, Ollama http://localhost:11434, LiteRT-LM http://127.0.0.1:9379. Das Handy liest nur. Dein Container erreicht Termux nicht.

Schritt 1 – Repo: Hänge PythonHeinz/AIUIheinz mit add_repo (Zugriff push) an und klone es. Die Desktop-Verbindung zum PC brauchst du nur, wenn ich Dateien am PC will (zum Beispiel einen Eintrag in INDEX.md); dann bitte ich dich darum.

Schritt 2 – Einlesen: docs/agent/STAND.md (Aktive Arbeit, Stränge, Module, Nächste Aufgaben), die letzten Abschnitte von docs/agent/ENTWICKLUNGSVERLAUF.md, docs/agent/UEBERGABE.md (Prozess), docs/agent/TECHNIK.md (Fallstricke, Designregeln, Tests), docs/agent/BEGRIFFE.md, docs/KONZEPT.md (Abschnitt 0 und der Abschnitt deines Strangs; Abschnitte 1 bis 14 stehen im Archiv), docs/OLLAMA_UND_MODELLE.md. Hat dein Strang einen docs/agent/AUFTRAG_<Strang>.md, lies ihn. Dann git pull und git log.

Arbeit in mehreren Strängen:
- Jeder Strang hat einen eigenen Chat; die Tabelle „Stränge“ in STAND.md ist das Register. Entsteht ein neuer Strang, trägst du ihn dort ein.
- Standard: nacheinander. Erst baut ein Strang, dokumentiert und pusht, dann der nächste. Gleichzeitig nur, wenn die berührten Dateien verschieden sind und jeder Strang seine Zeile unter „Aktive Arbeit“ hat. Die Reihenfolge steht in STAND.md.
- Das Fundament (lib/, Hub, server.py, gemeinsame localStorage-Schlüssel, EN/DE-Verfahren, Kopfzeile, Engine-Aufrufe) ändert nur ein Strang zur Zeit. Berührt dein Vorhaben das Fundament oder ein fremdes Modul, sag es mir und frag, bevor du etwas baust.
- Korrektur-Stränge beheben nur das gemeldete Problem, ergänzen einen Eintrag in ENTWICKLUNGSVERLAUF.md und ändern keine Struktur.

Routine (siehe docs/agent/UEBERGABE.md):
1. Vor der ersten Änderung: git pull --rebase; „Aktive Arbeit“ in docs/agent/STAND.md lesen (Zeile eines anderen Strangs unter 24 Stunden oder berührtes Fremdmodul: erst fragen); eigene Zeile (Datum, Strangname, Vorhaben, berührte Dateien) eintragen und sofort pushen.
2. Arbeiten; bash tests/run_all.sh muss grün sein, neue Funktionen bekommen Tests.
3. Am Ende: git pull --rebase; ENTWICKLUNGSVERLAUF.md und STAND.md im Repo ergänzen (Zeile unter „Aktive Arbeit“ entfernen, Stand je Modul, Stränge, Nächste Aufgaben), bei neuen Fallstricken TECHNIK.md; nach main pushen. Konflikte in STAND.md nie überschreiben, beide Stände behalten.
4. Sag mir, was ich auf dem Handy prüfen soll (git pull, bash start.sh, ggf. litert-lm serve --cors-origin http://localhost:3000) und was nur simuliert getestet ist.
Kein PC-Abgleich, kein cmp, keine Steuerdateien im PC-Ordner.

Arbeitsweise:
- Das Modell übersetzt oder klassifiziert nur, Zählen und Rechnen macht der Code. Alle Parameter bleiben manuell regelbar. Welche Modelle auswählbar sind, steht in docs/OLLAMA_UND_MODELLE.md; Regeln für lokale Modelle in docs/LOKALE_MODELLE.md.
- Oberfläche Englisch als Standard, Deutsch per Umschalter; neue Texte immer EN und DE. Designregeln: docs/DESIGN.md und TECHNIK.md. Viewport Pixel 9 Pro rund 426 × 803 px. Ohne Haken „Online erlauben“ keine Anfrage nach außen.
- Testen im Container mit Playwright und simulierten Servern (Ollama: Route '**/localhost:11434/**'), den Server mit curl. Echte Modelle laufen nur auf meinem Handy: behaupte nie, etwas sei auf dem Gerät getestet, was nur simuliert lief. Messwerte vom Handy trägst du in docs/KONZEPT.md oder docs/OLLAMA_UND_MODELLE.md ein.
- Alles Nötige muss im Repo liegen (data/ bleibt in .gitignore). Nach größeren Änderungen einmal aus einem frischen Klon testen.
- STAND.md bleibt kurz und nach Bereichen geordnet, ohne feste Commit-Nummern (nur „Stand: Datum, Commit siehe git log -1“); ENTWICKLUNGSVERLAUF.md behält die letzten rund 10 Tage, Älteres geht nach docs/archiv/. Abschnittsnummern in KONZEPT.md nie ändern.
- Begriffe: „Strang“ (ein Agent-Chat), „Heinz Chat“ (Seite tools/chat), „Heinz Dashboard“ (dashboard.html), „Unterhaltung“ (gespeicherter Gesprächsverlauf in der App), „Chatmenü“ (Menü des Dashboards). Nutze sie in Dokumenten, nie „Chat“ allein.
- Keine Pfade mit Benutzernamen in Dateien schreiben (Windows: %USERPROFILE%\Toolsbyclaude).
- Git-Tags lassen sich aus dem Container nicht pushen; Sicherungspunkte als Branch sicherung/<name>.
- Sag mir vor jedem Umbau in kurzen Sätzen, was du vorhast.

Schritt 3 – Dann frag mich zuerst: „Welchen Strang bearbeite ich, und was ist beim Test auf dem Handy aufgefallen?“ Warte auf meine Antwort. Nenne ich nichts Besonderes, schlage ich den ersten offenen Punkt unter „Nächste Aufgaben“ in STAND.md vor.
```
