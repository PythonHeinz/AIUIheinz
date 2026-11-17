# AIUIheinz (Heinz UI)

Offline-Weboberfläche für kleine lokale Sprachmodelle: Ollama läuft in Termux auf dem Pixel 9 Pro, die Seiten sind reine HTML/JS-Dateien ohne Build-Schritt, ein kleiner Python-Server (nur Standardbibliothek) liefert sie aus und speichert Tabellen als Dateien. Alles läuft ohne Internet. Oberfläche Englisch, Deutsch per EN|DE-Schalter.

Arbeitsweise, Stand und Regeln für Entwicklung mit Claude-Strängen: `docs/agent/` (Einstieg: `docs/agent/UEBERGABE.md`, Stand: `docs/agent/STAND.md`, Begriffe: `docs/agent/BEGRIFFE.md`).

## Seiten
| Datei | Zweck |
|---|---|
| `index.html` | Hub (Startseite der App: Chat, Werkzeuge, Einrichten, Ollama-Status, Version); `hub.html` leitet nur dorthin weiter |
| `chat.html` | Heinz Chat: ruhige Seite für Gespräche mit dem gewählten Modell |
| `dashboard.html` | Heinz Dashboard: Modi, alle Parameter manuell, Tempo-Test, Testreihen |
| `lab.html` | Data Lab: Einträge einzeln vom Modell nach Regel bewerten lassen |
| `sheet.html` | Tabelle per Befehl: Modell übersetzt nur in JSON, Code zählt und ändert |
| `vitals.html` | Akku, Temperatur, RAM, Verlauf, Ollama-Tempotest |
| `server.py` | Statische Seiten, Dateien in `data/`, Vitals-Logger, Update-Endpunkt |
| `start.sh` | Termux-Start: Wake-Lock, Ollama und LiteRT-LM starten (falls nötig), Server starten |

Weitere Werkzeuge liegen unter `tools/` (Setup, Modelle, Filter, Scan, Studio, Design); gemeinsamer Code in `lib/`.

## Start (Termux)
Voraussetzungen: Termux mit `git` und `python` (`pkg install -y git python`), Ollama (`pkg install -y ollama`) und ein Modell (`ollama pull qwen2.5:3b`). Optional LiteRT-LM (`litert-lm`, Modelle wie `gemma4-e2b`). Wer vom frischen Handy startet, nimmt den Einrichtungsassistenten unter `tools/setup/` (kopierbare Befehle Schritt für Schritt).

    git clone https://github.com/PythonHeinz/AIUIheinz.git ~/AIUIheinz     # einmalig
    cd ~/AIUIheinz && bash start.sh      # dann http://localhost:3000

`start.sh` hält das Handy wach, startet Ollama und, falls installiert, `litert-lm serve --cors-origin http://localhost:3000` (jeweils nur wenn nicht schon laufend), setzt `OLLAMA_MAX_LOADED_MODELS=1` (ein Modell im Speicher; vor dem Aufruf überschreibbar) und startet dann den Seitenserver. Nach dem Beenden von Termux genügt derselbe Befehl erneut. Abkürzung, einmalig einrichten:

    echo "alias heinz='cd ~/AIUIheinz && git pull && bash start.sh'" >> ~/.bashrc && source ~/.bashrc

Danach startet `heinz` (klein geschrieben) aus jedem Ordner Aktualisierung und Server. Als App installieren: http://localhost:3000 im Browser öffnen, Menü „Zum Startbildschirm hinzufügen“; die App öffnet den Hub.

Aktualisieren: `heinz` oder `cd ~/AIUIheinz && git pull` und Server neu starten (oder im Dashboard ☰ → „Nach Updates suchen“). Der Ordner `data/` (Tabellen, Messwerte) ist nicht im Repo und bleibt beim Pull unberührt. Standard der Threads: 2 (im Dashboard je Modell einstellbar).

## Tests
Server und Seiten werden ohne Ollama getestet (Ollama wird simuliert). Einmalig `pip install playwright && playwright install chromium`, dann `bash tests/run_all.sh`. Echte Modelle laufen nur auf dem Handy.

## Dokumentation
- `docs/agent/` Steuerdateien: `STAND.md` (Stand, aktive Arbeit, nächste Aufgaben), `UEBERGABE.md` (Prozess), `TECHNIK.md` (Architektur, Fallstricke, Tests), `BEGRIFFE.md`, `ENTWICKLUNGSVERLAUF.md` (Chronik der letzten Tage), `AUFTRAG_*.md` (Aufträge je Strang), `PROJEKTANWEISUNG.md`
- `docs/KONZEPT.md` Zielbild und Beschlüsse; `docs/DESIGN.md` Designregeln; `docs/SCHNITTSTELLEN.md` Anbieterwissen; `docs/OLLAMA_UND_MODELLE.md` Modelle, Pfade, Ollama-Schnittstelle; `docs/LOKALE_MODELLE.md` Regeln für lokale Modelle; `docs/GEPLANT.md` Ideen
- `docs/archiv/` Überholtes, unverändert (alter Konzeptentwurf, alter Verlauf, alter Stand)
