# AIUIheinz (Heinz UI)

Offline-Weboberfläche für kleine lokale Sprachmodelle: Ollama läuft in Termux auf dem Pixel 9 Pro, die Seiten sind reine HTML/JS-Dateien ohne Build-Schritt, ein kleiner Python-Server (nur Standardbibliothek) liefert sie aus und speichert Tabellen als Dateien. Alles läuft ohne Internet. Oberfläche Englisch, Deutsch per EN|DE-Schalter.

Projektinstruktion für neue Chats: `NAECHSTER_CHAT.md` (im Projektordner, eine Ebene über diesem Repo).

## Seiten
| Datei | Zweck |
|---|---|
| `index.html` | Hub mit Kacheln und Ollama-Status |
| `chat.html` | Chat mit fünf Modi (Wilson, Heinz, Audit, Code, Creative), alle Parameter manuell |
| `lab.html` | Data Lab: Einträge einzeln vom Modell nach Regel bewerten lassen |
| `sheet.html` | Tabelle per Befehl: Modell übersetzt nur in JSON, Code zählt und ändert |
| `vitals.html` | Akku, Temperatur, RAM, Verlauf, Ollama-Tempotest |
| `server.py` | Statische Seiten, Dateien in `data/`, Vitals-Logger |
| `start.sh` | Termux-Start: Wake-Lock, Ollama starten, Server starten |

## Start (Termux)
    git clone <Repo-URL> ~/AIUIheinz     # einmalig
    cd ~/AIUIheinz && bash start.sh      # dann http://localhost:3000

Aktualisieren: `cd ~/AIUIheinz && git pull`, Server neu starten. Der Ordner `data/` (Tabellen, Messwerte) ist nicht im Repo und bleibt beim Pull unberührt.

## Tests
Server und Seiten werden ohne Ollama getestet (Ollama wird simuliert). Einmalig `pip install playwright && playwright install chromium`, dann `bash tests/run_all.sh`. Echte Modelle laufen nur auf dem Handy.

## Dokumentation
- `STAND.md` (nur im Projektordner, nicht im Repo) Stand je Modul, aktive Arbeit, nächste Aufgaben
- `UEBERGABE.md` Start für neue Chats, Fallstricke, Regeln
- `ENTWICKLUNGSVERLAUF.md` Chronik der Änderungen
- `docs/OLLAMA_UND_MODELLE.md` Modelle, Pfade, Ollama-Schnittstelle je Seite
- `docs/GEPLANT.md` geplante Funktionen und Ideen
