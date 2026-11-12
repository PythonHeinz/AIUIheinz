# AIUIheinz – Begriffe

Festgelegt am 12.11.2026 (Strang AIUIheinz-Aufraeumen, Wunsch des Entwicklers). Das Wort „Chat“ meinte vier verschiedene Dinge und führte zu Verwechslungen. In Dokumenten gelten ab jetzt diese Begriffe. Text der Oberfläche, Dateinamen und Bezeichner im Code ändern sich dadurch **nicht**; Abweichungen in der Oberfläche melden die Stränge dem Entwickler, sie ändern sie nicht selbst.

## Die fünf Chat-Begriffe

| Begriff | Bedeutung | Nicht mehr sagen |
|---|---|---|
| **Strang** (mit Namen: „AIUIheinz-Chat“, „AIUIheinz-Menu“ …) | Ein Agent-Chat im Claude-Projekt mit eigenem Auftrag. Das Register steht in `STAND.md`. Der Strang „Root“ (Name `AIUIheinz`) macht Konzept und Querprüfung. | „der Chat“, „Chat-Strang“ (stattdessen „Strang AIUIheinz-Chat“) |
| **Heinz Chat** | Die schlanke Seite `tools/heinz/index.html` (ruhige Leseseite, Modell und Unterhaltungen im Schnellblatt). | „Chat-Seite“ |
| **Heinz Prüfstand** (kurz: Prüfstand) | Die Seite `chat.html`: Modi, Regler, Tempo-Test, Testreihen; bisher „Heinz UI“ oder „Chat-Seite“ genannt. | „Chat-Seite“, „Chat“ |
| **Unterhaltung** | Ein gespeicherter Gesprächsverlauf in der App (früher „Chat“, „Chats“; Code: `heinz_chats`). | „Chat“, „Chatliste“ |
| **Chatmenü** | Nur das Menü des Prüfstands (Sheet mit Unterseiten). | „Chat-Menü“ für anderes |

## Weitere feste Begriffe

| Begriff | Bedeutung |
|---|---|
| **Root-Strang** | Der Strang `AIUIheinz`: Konzept, Querprüfung, neue Aufträge. |
| **Korrektur-Strang** | Strang `AIUIheinz-Fix-<Thema>`: behebt nur das gemeldete Problem. |
| **Fundament** | `lib/`, Hub, `server.py`, gemeinsame localStorage-Schlüssel, EN/DE-Verfahren, Kopfzeile, Engine-Aufrufe. Es ändert nur ein Strang zur Zeit. |
| **Hub** | Startseite der App (`index.html`) mit den Reitern Chat, Werkzeuge, Einrichten. |
| **Engine** | Ein Modellanbieter in der App: Ollama, LiteRT-LM, Google AI Studio, OpenRouter, Groq, Mistral oder eine eigene. |
| **Modus** | Bündel aus Ton, Reglern und Regeln im Prüfstand (Wilson, Heinz, Audit, Code, Creative). |
| **Persona** | Rollenbeschreibung als Daten in `lib/personas.js`, wird mit der Anfrage gesendet. |
| **Aktive Arbeit** | Abschnitt in `STAND.md`, in dem jeder Strang vor der ersten Änderung seine Zeile einträgt. |
| **Handytest** | Prüfung des Entwicklers auf dem Pixel 9 Pro; nur sie zählt als „am Gerät geprüft“. Alles andere ist „nur simuliert getestet“. |
| **Klon am PC** | Der Ordner `AIUIheinz\repo` auf dem PC: nur lesen, per `git pull` aktualisieren. |

## Regeln für Texte

- „Chat“ steht allein nur noch in Namen: `AIUIheinz-Chat` (Strang), **Heinz Chat** (Seite), Menüpunkt „Chat“ im Hub, Dateinamen und Code (`chat.html`, `heinz_chats`).
- Sonst den passenden Begriff aus der Tabelle verwenden.
- Der Strangname gilt, nicht der Titel in der Chat-Liste der Claude-App (der weicht teils ab).
