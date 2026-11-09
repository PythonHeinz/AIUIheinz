# Geplante Funktionen und Ideen

Stand 09.11.2026. Reihenfolge der konkreten Aufgaben steht in `STAND.md` („Nächste Aufgaben“). Hier steht, was darüber hinaus besprochen wurde. Nichts davon ist beschlossen, außer wo es „beschlossen“ heißt.

## Konkret in Arbeit oder als Nächstes
- **Sheet mit echtem 3B-Modell** auf einer realen Rohstoffliste (Lager Jakobswiese) erproben: Befehlsübersetzung („wie viele blaue Artikel?“, „7 entnehmen“) mit Qwen 2.5 3B. Bisher nur mit simuliertem Modell geprüft.
- **Vitals stabilisieren:** Termux-Abstürze (Signal 9) eingrenzen, Messdienst schonender machen (Sensor seltener), prüfen, welche Sensoren Android in Termux freigibt.
- **Tests ins Repo:** Playwright-Skripte mit simuliertem Ollama (bisher nur im Chat-Container, nicht gesichert).
- **`heinz-fakt:latest`** in die Auswahllisten aufnehmen, falls gewünscht.

## Ideen (besprochen, nicht begonnen)
- **Mail- und Newsfeed-Stimmung:** Betreffzeilen oder Feed-Einträge im Data Lab nach Regel bewerten lassen (Stimmung, Dringlichkeit, Spam, Thema). Der Entwickler hält das für 3B-Modelle nur bei wenigen Zeilen für tragfähig; Lab bleibt zum Experimentieren erhalten und wird nicht umgebaut.
- **Sensor-Dashboards über Termux:API:** Akku, Temperatur, Luftdruck, Bewegung im Verlauf (Grundlage ist der Vitals-Logger).
- **Spotify-Tempo neben Schlafzeiten:** Die Spotify-Audioanalyse-Schnittstelle wurde 2024 eingeschränkt (nicht neu geprüft); Schlafdaten sind aus Termux vermutlich nicht erreichbar (nicht geprüft).
- **Claude-ermittelte Werte regelmäßig tracken:** Weboberfläche, die extern ermittelte Werte in `data/` ablegt und im Verlauf zeigt.
- **Chat:** Chats speichern und später fortführen, Python-Code mit Farbmarkierung offline (Absicht des Entwicklers; Stand im Chat-Modul gegen `chat.html` prüfen).

## Plattform
- Zweites Gerät als reine Experimentierhardware für lokale Modelle (zunächst ein Pixel mit neuerem Tensor-Chip, später ein gebrauchtes Gerät mit 24 GB RAM und Snapdragon, mit Root oder alternativem System), um 4B bis 12B zu testen. Erfahrungen vom Pixel 9 Pro sollen übertragen werden.
- Das Projekt soll auch am PC laufen können (`python server.py --vitals-interval 0`), sobald dort ein Ollama zur Verfügung steht (nicht geprüft).

## Leitplanken (beschlossen)
- Komplett offline, autark („Schweizer Taschenmesser“ ohne Strom und Internet).
- Kleine Modelle bewusst, Antworten nativ Englisch; Deutsch nur per Umschalter.
- Alle Parameter immer manuell regelbar.
- Das Modell klassifiziert und übersetzt, der Code rechnet.
- Stil: minimalistisch, schwarzer Hintergrund, kräftige Google-Farben.
