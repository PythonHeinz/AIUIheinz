# AIUIheinz – Stand

Projekt „Heinz UI“: Weboberfläche für lokale Modelle (Ollama in Termux, Pixel 9 Pro). Maßgeblich ist das GitHub-Repo (Branch main), der Ordner `repo/` ist die Offline-Kopie.

## Aktive Arbeit
Hier trägt jeder Chat vor der ersten Änderung eine Zeile ein (Datum, Chat-Name, Vorhaben, berührte Dateien) und löscht sie nach dem Push. Einträge älter als 24 Stunden gelten als verwaist; vor dem Entfernen den Nutzer fragen.
Aktuell: keine.

## Stand 09.11.2026 (Umzug des Projekts vom Handy in den Projektordner)
Der gesamte Code entstand auf dem Handy im Chat „Heinz UI“ und wurde am 09.11.2026 als Repo aufgesetzt. Danach wird erst weiterentwickelt. Alle Seiten wurden mit Playwright und simuliertem Ollama geprüft; auf dem Gerät liefen Hub, Chat, Lab, Sheet, Server und Vitals im Grundsatz. Ein Test auf dem Gerät durch Claude fand nie statt.

## Module
| Modul | Datei | Stand | Nächster Schritt |
|---|---|---|---|
| Hub | `index.html` | fertig, auf dem Handy benutzt | Kachel für neue Module ergänzen |
| Chat | `chat.html` | fertig (5 Modi, Presets, manuelle Regler, EN/DE) | nach Bedarf |
| Data Lab | `lab.html` | fertig, bewusst unverändert, Experimentierfeld | nur auf Wunsch des Entwicklers ändern |
| Sheet | `sheet.html` | Logik fertig und mit simuliertem Modell getestet; Dateien auf dem Handy per Server | echtes 3B-Modell auf Rohstoffliste erproben |
| Vitals | `vitals.html` | läuft; Akku und Temperatur nur mit Termux:API | auf Gerät prüfen, welche Kacheln erscheinen |
| Server | `server.py` | läuft auf dem Handy; Sicherheitsfälle per curl getestet | Messdienst schonender (siehe Offen) |
| Start | `start.sh` | läuft | – |

## Nächste Aufgaben (Reihenfolge nach Wunsch des Entwicklers festlegen)
1. Repo auf GitHub anlegen und Handy auf `git clone` umstellen (siehe UEBERGABE „Auf das Handy bringen“).
2. Termux-Abstürze (Signal 9) eingrenzen: Test mit `bash start.sh --vitals-interval 0`; Entwickleroption für untergeordnete Prozesse und Akku-Optimierung für Termux prüfen.
3. Sheet mit echtem Qwen 2.5 3B auf der Rohstoffliste erproben, Prompt und Schema nachschärfen.
4. Playwright-Tests mit simuliertem Ollama ins Repo (`tests/`).
5. `heinz-fakt:latest` in die Auswahllisten, falls gewünscht.
6. Ideen aus `docs/GEPLANT.md`.

## Berührt Grundgerüst (Chronik der Eingriffe)
Noch keine. Als Grundgerüst gelten: gemeinsame localStorage-Schlüssel (`heinz_settings`), das EN/DE-Verfahren, die Kopfzeile mit Hub-Link, die Schnittstelle des Servers und die Ollama-Aufrufe.

## Offen
- Termux-Sessions werden mit Signal 9 beendet (beobachtet 26.10.2026 mehrfach, auch nach Tempotest bei unter 1 GB freiem RAM). Ursache nicht gesichert: Speicherdruck oder Prozess-Limit von Android, möglicher Beitrag des Messdienstes (startet jede Minute `termux-battery-status` und `termux-sensor`). Test ohne Messdienst steht aus.
- Akku und Akkutemperatur fehlten beim ersten Start, weil Termux:API nicht antwortete; Stand nach Einrichtung nicht bestätigt.
- CPU-Temperatur und Luftdruck: abhängig davon, was Android freigibt.
- `heinz-fakt:latest` ist installiert, aber nicht in den Auswahllisten.
- Keine automatischen Tests im Repo.
- Rohstofflisten des Entwicklers (`Lager_JW.pdf`) gehören nicht ins Repo.
