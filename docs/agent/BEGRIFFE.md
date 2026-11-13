# AIUIheinz – Begriffe

Festgelegt am 12.11.2026 (Strang AIUIheinz-Aufraeumen, Wunsch des Entwicklers). Das Wort „Chat“ meinte vier verschiedene Dinge und führte zu Verwechslungen. In Dokumenten gelten ab jetzt diese Begriffe. Text der Oberfläche, Dateinamen und Bezeichner im Code ändern sich dadurch **nicht**; Abweichungen in der Oberfläche melden die Stränge dem Entwickler, sie ändern sie nicht selbst.

## Die fünf Chat-Begriffe

| Begriff | Bedeutung | Nicht mehr sagen |
|---|---|---|
| **Strang** (mit Namen: „AIUIheinz-Chat“, „AIUIheinz-Menu“ …) | Ein Agent-Chat im Claude-Projekt mit eigenem Auftrag. Das Register steht in `STAND.md`. Der Strang „Root“ (Name `AIUIheinz`) macht Konzept und Querprüfung. | „der Chat“, „Chat-Strang“ (stattdessen „Strang AIUIheinz-Chat“) |
| **Heinz Chat** | Die schlanke Seite `chat.html` (ruhige Leseseite, Modell und Unterhaltungen im Schnellblatt). | „Chat-Seite“ |
| **Heinz Dashboard** (kurz: Dashboard) | Die Seite `dashboard.html`: Modi, Regler, Tempo-Test, Testreihen; bisher „Heinz UI“ oder „Chat-Seite“ genannt. | „Chat-Seite“, „Chat“ |
| **Unterhaltung** | Ein gespeicherter Gesprächsverlauf in der App (früher „Chat“, „Chats“; Code: `heinz_chats`). | „Chat“, „Chatliste“ |
| **Chatmenü** | Nur das Menü des Dashboards (Sheet mit Unterseiten). | „Chat-Menü“ für anderes |

## Weitere feste Begriffe

| Begriff | Bedeutung |
|---|---|
| **Root-Strang** | Der Strang `AIUIheinz`: Konzept, Querprüfung, neue Aufträge. |
| **Korrektur-Strang** | Strang `AIUIheinz-Fix-<Thema>`: behebt nur das gemeldete Problem. |
| **Fundament** | `lib/`, Hub, `server.py`, gemeinsame localStorage-Schlüssel, EN/DE-Verfahren, Kopfzeile, Engine-Aufrufe. Es ändert nur ein Strang zur Zeit. |
| **Hub** | Startseite der App (`index.html`) mit den Reitern Chat, Werkzeuge, Einrichten. |
| **Engine** | Ein Modellanbieter in der App: Ollama, LiteRT-LM, Google AI Studio, OpenRouter, Groq, Mistral oder eine eigene. |
| **Person** (früher Modus; Code: `mode`) | Nur die Auswahl in der Personenleiste: Nativ, Heinz, Wilson, Audit, Code, Kreativ. Sie lädt die Vorgaben für Prompt und Ton und hat selbst keinen Zustand „geändert“. Start immer auf Heinz. **Nativ** = keine Person: kein Prompt, kein Ton, es gelten die Werte des Modells. Gewählt = Taste in der Personenfarbe; Heinz hat zusätzlich eine bedruckte Fläche (Ausgangspunkt). |
| **Prompt** | Der Systemtext, im Menü bearbeitbar (Reiter „Prompt“). Gehört nicht zur Person, sondern wird von ihr vorbelegt. |
| **Ton** | Temperatur, Top-P, Top-K (Reiter „Ton“). Von der Person vorbelegt. |
| **Laufzeit** | Threads und Kontextfenster; gilt für jede Person, ein Personenwechsel ändert sie nie. |
| **Kontextfenster** | Wie viel Text das Modell auf einmal behält (`num_ctx`, Regler unter „Laufzeit“). |
| **Quelltext** | Das Zusatzfeld über dem Eingabefeld (Audit braucht ihn zwingend). Früher „Kontext“; das Wort „Kontext“ steht allein nirgends mehr. |
| **Letzter Stand** (Arbeitsname) | Der zuletzt geänderte Prompt und Ton einer Person für ein Modell. Die App legt ihn selbst ab, sobald du zurücksetzt, Person oder Modell wechselst oder die App neu startest; es gibt immer nur einen je Person und Modell. Knopf „Letzten Stand laden“ holt ihn zurück. Nicht zu verwechseln mit **Konfiguration**. |
| **Konfiguration** (seit 13.11.2026) | Vom Nutzer benannt gespeichert: Engine, Modell, Person als Ausgangspunkt, Prompt, Ton und Laufzeit (Abbild). Speichern und Laden im Dashboard (Menü „Konfiguration“), verwalten auf der Startseite unter Einrichten (Kachel „Konfigurationen“), eine davon dem Heinz Chat zuweisen. Keine Höchstzahl. **Export** = Konfiguration als Datei außerhalb der App (enthält den Modellnamen), **Import** = Datei wieder laden. |
| **Zuordnung** (seit 13.11.2026) | Verbindung Modell → Konfiguration, im Dashboard-Menü („Dem Modell zuordnen“). Das Modell lädt mit dieser Konfiguration (Person, Prompt, Ton, Laufzeit) bei jedem Laden, auch nach Neustart. Ohne Zuordnung lädt es mit seinem Standard. Nicht zu verwechseln mit **Zuweisung**. |
| **Jetzt parametrieren** | Knopf an jeder Konfiguration der Hub-Kachel (auch der Standardkonfiguration): öffnet das Dashboard mit dieser Konfiguration (`?config=`). |
| **Zuweisung** | Die dem Heinz Chat zugewiesene Konfiguration („Im Heinz Chat verwenden“). Der Heinz Chat läuft nur mit ihr; „Zuweisung lösen“ heißt zurück auf die Standardkonfiguration. |
| **Standardkonfiguration** (Heinz Chat) | Eingebaute Konfiguration des Heinz Chat: immer vorhanden, nicht löschbar, Prompt Standardtext für flüssigen Markdown-Chat, Qwen `qwen2.5:3b`, Ton 0,6/0,9/40, Kontext 4096, 2 Threads (Arbeitsgrundlage zum Nachjustieren); ein früher gewähltes Modell (`heinz_chat_default`) hat Vorrang. |
| **LED (geändert)** | Orange LED am Reiter „Prompt“ bzw. „Ton“ und an der Überschrift „Laufzeit“ (dort weicht etwas von der Vorgabe bzw. von den Standardwerten ab; die Laufzeit meldet sich nicht am Personenknopf) und als kleine LED unten in der Mitte des Knopfes der gewählten Person (mindestens eines von beiden). Zwei getrennte Angaben, keine Sterne, kein gemerkter Stand. Reset im Reiter wirkt nur dort; Tipp auf die aktive Person setzt beides zurück (Nativ: auf die Werte des Modells). |
| **Persona** | Rollenbeschreibung als Daten in `lib/personas.js`, wird mit der Anfrage gesendet. |
| **Aktive Arbeit** | Abschnitt in `STAND.md`, in dem jeder Strang vor der ersten Änderung seine Zeile einträgt. |
| **Handytest** | Prüfung des Entwicklers auf dem Pixel 9 Pro; nur sie zählt als „am Gerät geprüft“. Alles andere ist „nur simuliert getestet“. |
| **Klon am PC** | Der Ordner `AIUIheinz\repo` auf dem PC: nur lesen, per `git pull` aktualisieren. |

## Regeln für Texte

- „Chat“ steht allein nur noch in Namen: `AIUIheinz-Chat` (Strang), **Heinz Chat** (Seite), Menüpunkt „Chat“ im Hub, Dateinamen und Code (`dashboard.html`, `heinz_chats`).
- Sonst den passenden Begriff aus der Tabelle verwenden.
- Der Strangname gilt, nicht der Titel in der Chat-Liste der Claude-App (der weicht teils ab).

## Geplant (13.11.2026, Strang AIUIheinz-Personen; gilt erst nach dem Bau)
Person (früher Modus, dazu Nativ = keine Person), Ton (Temperatur, top_k, top_p, Wiederholungsstrafe), Laufzeit (Threads, Kontext, Engine, GPU), Konfiguration (Modell + Laufzeit + Person + Ton, benannt, exportierbar). Definitionen: `docs/agent/ANWEISUNG_Personenleiste.md` Abschnitt 2. „Persona“ (`lib/personas.js`) bleibt ein anderer Begriff.

