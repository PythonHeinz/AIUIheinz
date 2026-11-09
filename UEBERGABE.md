# AIUIheinz – Übergabe für neue Chats

## Was das ist
Heinz UI ist eine Sammlung kleiner Web-Seiten für lokale Sprachmodelle. Ollama läuft in Termux auf dem Pixel 9 Pro des Entwicklers, die Seiten laufen im Handy-Browser unter `http://localhost:3000`. Ziel: ein privates „Schweizer Taschenmesser“, das ohne Internet und Strom aus der Steckdose funktioniert. Kleine Modelle (2B bis 3B) sind Absicht.

## Stand
Siehe `STAND.md` (Module, nächste Aufgaben, aktive Arbeit).

## Quellen & Start
- Kein Build-Schritt. Jede Seite ist eine eigenständige Datei mit eigenem CSS und JS (Ausnahme: `server.py`, `start.sh`).
- Start auf dem Handy: `bash start.sh` im Projektordner (Wake-Lock, startet Ollama bei Bedarf, startet `server.py`). Nur Seiten ohne Dateifunktionen: `python -m http.server 3000`.
- Details zu Pfaden, Modellen und Ollama-Aufrufen: `docs/OLLAMA_UND_MODELLE.md`.

## Auf das Handy bringen
Die Chats laufen am PC bzw. in der Cloud, getestet wird auf dem Handy. Weg:
1. Chat ändert die Dateien im Projektordner und pusht nach GitHub (`main`).
2. Auf dem Handy: `cd ~/AIUIheinz && git pull`, dann `bash start.sh`. Das Repo muss dazu öffentlich sein oder das Handy ein Token haben (der Login per Code hat in Termux nicht funktioniert; ein öffentliches Repo braucht auf dem Handy keinen Login zum Lesen).
3. Einmalig beim Umstieg: `git clone <Repo-URL> ~/AIUIheinz`, danach `cp -r ~/ollama_ui/data ~/AIUIheinz/` (Tabellen und Messwerte mitnehmen). Der Ordner `data/` steht in `.gitignore` und wird von Pull nie angefasst.
4. Fallback ohne Git: Dateien aus dem Chat in den Download-Ordner laden und per `cp ~/storage/downloads/<datei> ~/AIUIheinz/` kopieren.
Android benennt doppelte Downloads um (`server(1).py`); vor dem Kopieren mit `ls ~/storage/downloads | grep <name>` prüfen.

## Fallstricke
- **Jede Seite ist eigenständig.** I18N-Wörterbuch, `lsGet/lsSet`, Kopfzeile und Basisstile sind in jeder Datei kopiert. Änderungen an Gemeinsamem (Sprachumschalter, Einstellungen, Kopfzeile) in allen Seiten nachziehen.
- **localStorage-Schlüssel:** `heinz_settings` (Sprache, Regler und Standardwerte-Haken des Chats), `heinz_current`, `heinz_chats`, `heinz_lab`, `heinz_sheet`, `heinz_sheet_cfg`, `heinz_vitals`, `heinz_bench`. Jede Adresse (Host und Port) hat eigenen Speicher: `localhost:3000`, `127.0.0.1:3000` und `127.0.0.1:8081` sind getrennt.
- **Modellliste ist fest** in chat, lab, sheet, vitals eingetragen (`gemma2:2b`, `qwen2.5:3b`, `gemma:2b`). Neue Modelle dort ergänzen.
- **Strukturierte Ausgabe:** Lab und Sheet senden ein JSON-Schema in `format`. Bei HTTP 400 (ältere Ollama-Version) einmal mit `format:'json'` wiederholen. Der Code setzt das schon um.
- **Kleine Modelle rechnen nicht.** Alles, was gezählt, verglichen oder summiert wird, macht der Code. Das Modell liefert nur den Befehl bzw. das Label.
- **Top-P-Regler** braucht `step=0.01`, sonst wird 0.92 auf 0.9 gerundet.
- **Termux-Split-Fenster** verdeckt den unteren Seitenrand. Darum haben die Seiten `padding-bottom: max(90px, 45vh)`.
- **Termux-Sessions** werden von Android mit Signal 9 beendet (Speicherdruck, Prozess-Limit). Nicht jede Last auf einmal starten; siehe `STAND.md` „Offen“.
- **Server:** bindet nur an 127.0.0.1; Schreibzugriffe brauchen `X-Heinz: 1` und passenden Origin; Dateinamen per Regex; `/data`, `/server.py`, `/start.sh` werden nicht ausgeliefert. Neue Endpunkte müssen dieselben Schutzregeln einhalten. Antwortet `/api/vitals` aus dem Cache, damit die Seite nicht auf Termux-Aufrufe wartet.
- **Download-Namen:** Android hängt `(1)` an doppelte Dateien an.
- **Nicht ins Repo:** `data/` (Tabellen, Messwerte), Rohstofflisten, private Daten.

## Wichtige Strukturen
- **chat.html:** `MODE_PRESETS`, `MODELS`, `I18N`/`t()`/`applyI18n()`, `onSlider`, `onDefaultToggle`, `normalizeMode`; Streaming über `fetch` und `ReadableStream`.
- **lab.html:** drei Schritte (Daten, Regel, Ausführen), Spaltenwahl als Chips, Kontrollspalte mit Trefferquote (`takeLabels`, `normCat`, `mkResult`), Presets mood/urgency/spam/topic/material/custom, Export CSV und JSON.
- **sheet.html:** Zustand `headers, rows, qtyCol, log, undoStack`; `parseCSV`, `systemPrompt()`, `schema()`, `translate()`, `cleanCmd()`, `matches()/findRows()`, `evaluate(c)` (liefert `{error}`, `{text,idx,table}` oder `{plan}`), `applyPlan()`, `undoLast()`; Dateien über `srvOpen/srvSave/srvAutoSave` (nur mit Server). Sicherheitsregeln: Bestätigung standardmäßig an, Abbruch bei Entnahme über Bestand, Hinzufügen nur bei genau einer Zeile, `set` nur mit Filter. Mengenspalte wird per Namens-Regex erkannt (`menge|anzahl|bestand|stück|stk|qty|quantity|stock|count|amount`).
- **vitals.html:** `drawChart()` (SVG, Fadenkreuz, Tooltip), `refreshLatest/refreshHistory`, `runBench`.
- **server.py:** `Handler`, `sample_vitals`, `vitals_loop`, `vitals_history`.

## Designregeln des Entwicklers
- Minimalistisch, schwarzer Hintergrund, kräftige Google-Farben (`#4285f4`, `#34a853`, `#fbbc05`, `#ea4335`).
- Oberfläche Englisch als Standard, Deutsch nur über den EN|DE-Schalter. Das gilt für Oberfläche, Prompts und Sprache.
- Alle Parameter bleiben manuell regelbar, Voreinstellungen sind nur Vorschläge.
- Zielgerät: Pixel 9 Pro, Viewport rund 426 × 803 px, Pixeldichte 2,25. Alles muss ohne seitliches Scrollen passen; Tasten nicht in zweite Zeilen abschneiden.
- Vor Änderungen am Handy-Ablauf kurz sagen, was man vorhat und was der Entwickler auf dem Handy testen soll.
- Der Entwickler arbeitet auf Deutsch; Antworten sachlich und knapp, ohne Lob und Begeisterung.

## Tests
- Im Chat-Container mit Playwright und der vorinstallierten Chromium-Version; Ollama wird mit `page.route('**/localhost:11434/**', …)` simuliert (Pfade der Installation vor Gebrauch prüfen). `node --check` für die Skriptblöcke.
- Server mit curl prüfen: fehlender Header, fremder Origin, `../` im Namen, ungültige Endung, Löschen nach `_trash`, `/server.py` und `/data` müssen 404 liefern.
- Echte Modelle laufen nur auf dem Handy. Nach jeder Änderung sagen, was der Entwickler dort prüfen soll. Nie behaupten, etwas sei auf dem Gerät getestet, was nur simuliert lief.

## Arbeitsweise für Modul-Chats (verbindlich)
**Start:**
1. `INDEX.md` (Wurzelordner Toolsbyclaude) lesen, dann `AIUIheinz/STAND.md`, dann `ENTWICKLUNGSVERLAUF.md`.
2. In `AIUIheinz/repo/` zuerst `git pull`.
3. Ändern, testen, am Ende selbst nach `main` pushen (Repo ggf. mit Schreibrecht per `add_repo` anhängen).

**Während der Arbeit:**
- Genau ein Chat baut zur selben Zeit (Absprache des Entwicklers).
- Ein Modul ändert nur seine eigene Seite. Alles, was Hub, gemeinsame Schlüssel, Sprachumschalter, Kopfzeile, Server-Schnittstelle oder die Ollama-Aufrufe anderer Seiten betrifft, ist ein Eingriff ins Grundgerüst und wird in `STAND.md` unter „Berührt Grundgerüst“ gemeldet.
- Neue sichtbare Texte immer mit EN und DE.
- Neue Seiten bekommen eine Kachel im Hub und einen Eintrag in `docs/OLLAMA_UND_MODELLE.md`, wenn sie Ollama oder den Server neu ansprechen.

**Ende:**
1. `STAND.md`: Modulstatus, letzter Commit, Datum, Abschnitt „Berührt Grundgerüst“.
2. `ENTWICKLUNGSVERLAUF.md`: was geändert wurde, Dateien und Funktionen, welche Tests liefen, was offen ist.
3. `UEBERGABE.md` bei neuen Fallstricken ergänzen; Ordner und Repo gleich halten.
4. Zeile in `INDEX.md` aktualisieren. Der Entwickler meldet „Modul X fertig“ im Root-Chat „AIUIheinz“, dort erfolgt die Querprüfung.

## Ordner auf dem Rechner
Jeder Chat im Projekt bekommt die Desktop-Verbindung zu `C:\Users\Andreas\Toolsbyclaude`. `AIUIheinz/` enthält die Projektdokumente und `repo/` (Git). Maßgeblich ist GitHub (main). Chatname = Projektname.

## Regeln für Änderungen (mehrere Chats)
Vor der ersten Änderung: `git pull`, `git log`, `STAND.md` Abschnitt „Aktive Arbeit“ lesen; bei Eintrag unter 24 Stunden oder berührtem Fremdmodul den Entwickler fragen. Eigene Zeile in „Aktive Arbeit“ eintragen und sofort committen. Nach der Änderung: ENTWICKLUNGSVERLAUF.md, STAND.md (Zeile entfernen, Nächste Aufgaben anpassen), UEBERGABE.md, INDEX.md pflegen, pushen, im Projektordner `git pull`. Nur ein Chat baut gleichzeitig.
