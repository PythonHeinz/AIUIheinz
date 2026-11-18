# AUFTRAG Update (Strang AIUIheinz-Update)

Neuer Strang, angelegt 17.11.2026 im Strang AIUIheinz-convert2 auf Wunsch des Entwicklers. Strangname: **AIUIheinz-Update**. convert2 ist abgeschlossen (17.11.). Start möglich, sobald kein anderer Strang `index.html` bearbeitet (docHeinz berührt nur `AREAS`; vor dem Start „Aktive Arbeit“ lesen). Berührt das Fundament (Hub, `server.py`, Schema `tool.json`): läuft allein, Zeile unter „Aktive Arbeit“, vorher beim Entwickler nachfragen.

## Ausgangslage (geprüft 17.11.2026)
- Der Server liefert alle Seiten und Tools aus dem Ordner auf dem Handy aus (`server.py`, ohne Cache für Seiten). Der Service Worker (`sw.js`) holt zuerst aus dem Netz, der Cache ist nur Rückfall.
- Ein neuer Stand kommt nur an, wenn im Ordner `git pull` läuft. Das löst der Knopf „Update“ im Dashboard aus (`POST /api/update`, `update_from_git()`, `lib/dashboard/update.js`), oder von Hand `git pull`.
- Version gibt es nur für die ganze App (`VERSION.txt`, Commit, Datum in `/api/ping`). Tools und Module haben keine eigene Version.

## Ziel
Der Entwickler muss nicht mehr ins Dashboard, um zu aktualisieren, und sieht im Hub, was sich geändert hat. Alle Tools bleiben in einem Repo und einem Stand (keine getrennten Versionen der Tools, weil sie `lib/` teilen).

## Entscheidungen des Entwicklers (18.11.2026)
- **Dashboard-Knopf bleibt** unverändert bestehen.
- **Hub: Update-Knopf unten auf der Hauptseite, mit LCD-Anzeige wie im Dashboard** (gleiche Pixeldisplay-Zeile/Zustände: bereit, prüfe, Update verfügbar, aktuell, Fehler). Kein eigener Bereich „Einrichten“ dafür; der Knopf sitzt fest unten im Hub.
- **Später (nicht jetzt):** ein zentrales Menü „Info · Sicherung · Update“ für die ganze App ersetzt die verstreuten Stellen. Der Knopf im Hub und die gemeinsame Update-Logik unter `lib/` sind so zu bauen, dass sie dort einfach einziehen können (kein Hub-spezifischer Code in der Logik, nur in der Darstellung).
- Beide Knöpfe nutzen dieselbe Logik und denselben Endpunkt `POST /api/update`; es bleibt **ein** Stand für alle Tools.

## Aufgaben
1. **Update im Hub (beschlossen: Knopf unten mit LCD, siehe oben).** Der Hub zeigt, ob es einen neueren Stand auf GitHub gibt, und bietet einen Knopf, der denselben Endpunkt `POST /api/update` nutzt wie das Dashboard. Das Dashboard behält seinen Knopf, beide rufen dieselbe Funktion; die Logik liegt an einer Stelle (neues Modul unter `lib/`, nicht in zwei Seiten kopieren).
2. **Prüfen nur mit Haken.** Die Prüfung („gibt es Neues?“) macht der Server per `git fetch` und vergleicht Commits; sie braucht Netz und läuft nur bei gesetztem Haken „Online erlauben“ (Standard aus) oder auf ausdrücklichen Tipp des Entwicklers. Neuer Endpunkt `GET /api/update/check` (nur lesend, fester Befehl, keine Eingabe). Ohne Haken bleibt der Knopf „Update“ von Hand. Die Seite selbst stellt keine Anfrage nach außen.
3. **Optional:** `start.sh` macht beim Start `git pull --ff-only`, wenn Netz da ist, und startet auch ohne Netz fehlerfrei. Vorher mit dem Entwickler abstimmen.
4. **Versionsfeld je Tool.** `tool.json` bekommt `version` (Text, optional). Der Hub zeigt sie je Kachel klein an. Alle bestehenden `tool.json` ergänzen (Beschluss mit dem Entwickler: Startwert `0.1`, convert2 `0.1 beta`).
5. **Änderungsdatum je Tool.** `/api/tools` liefert je Tool das Datum der letzten Änderung (`git log -1 --format=%cs -- tools/<ordner>`; für ältere Seiten ohne Ordner die Datei). Der Hub markiert Tools, die sich seit dem letzten Update geändert haben (Vergleich mit dem zuletzt gesehenen Commit in `heinz_settings` oder einem eigenen Schlüssel). Ohne `.git` (kein Klon) entfällt die Angabe, ohne Fehler.
6. **Service Worker prüfen.** Nach einem Update darf kein alter Stand aus dem Cache erscheinen (Netz zuerst ist schon so); mit Test belegen. Kein Eingriff in `sw.js`, wenn nicht nötig; sonst fragen.
7. **Tests:** `tests/test_server.py` (Check-Endpunkt mit einem lokalen Test-Repo als Quelle statt GitHub, Fehler ohne Netz, ohne `.git`; Tool-Liste mit Version und Datum), `tests/test_pages.py` (Hub zeigt Hinweis und Marke, Knopf ruft den Endpunkt, ohne Haken keine Anfrage nach außen), `tests/test_rules.py` bleibt grün.
8. **Handytest** in `docs/HANDYTEST.md`: Hub zeigt „Update verfügbar“ nach einem Push, Knopf aktualisiert und lädt neu, Tool-Kacheln zeigen Version und Änderung; ohne Netz kein Fehlerband.

9. **Auseinandergelaufener Verlauf erklären.** Beobachtet am 17.11.2026 am Handy: Der Klon hatte einen lokalen Commit, den es auf GitHub nicht gab; `git pull --ff-only` meldete „Diverging branches“ und das Dashboard zeigte nur die rohe Git-Meldung. Der Server erkennt diesen Fall (`git rev-list --left-right --count HEAD...origin/main`, lokale und entfernte Commits getrennt zählen), die Oberfläche erklärt ihn in einem Satz (EN und DE) und nennt den sicheren Weg (Zweig `sicherung/handy` anlegen, dann `git reset --hard origin/main`). Der Server führt den Abgleich nie von sich aus durch; ein Knopf dafür nur mit ausdrücklicher Rückfrage und nur bei sauberem Arbeitsordner. Test mit einem lokalen Test-Repo mit abweichendem Commit.

## Grenzen
- Keine getrennte Installation einzelner Tools, keine Paketverwaltung, keine Bibliothek aus dem Netz.
- Der Server führt nur feste Git-Befehle aus, nie Eingaben des Browsers.
- Nichts als am Gerät geprüft melden, was nur simuliert lief (echtes GitHub vom Container aus nicht erreichbar: der Check wird mit einem lokalen Repo simuliert).
- Am Ende: `STAND.md` (Zeile entfernen, Strang, Module), `ENTWICKLUNGSVERLAUF.md`, Chronik „Berührt Fundament“, `docs/MODULE.md`, `bash tests/run_all.sh` grün.

## Startsatz
„AIUIheinz-Update: nach docs/agent/AUFTRAG_Update.md“
