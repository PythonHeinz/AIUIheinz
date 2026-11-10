# Analyse: Menüstruktur aus Sicht des Anwenders

Stand 10.11.2026, Strang „AIUIheinz-Design“. Nur Analyse, es wurde nichts umgebaut. Grundlage: `chat.html` im Commit nach dem Rückbau der Pixeldisplays.

## 1 Der Anwendungsfall
Der Anwender testet ein lokales Modell: (1) Quelle und Modell wählen, (2) mit den Standardwerten fragen, (3) bei zu viel Halluzination so lange an den Parametern drehen, bis es passt, (4) die Werte notieren oder in der App als eigenen Standard behalten, (5) prüfen, ob es schnell genug läuft.

## 2 Wie die Funktionen heute gruppiert sind
Menü (Programmierersicht, nach Technik): Schnellschalter (Engine, Online erlauben, Eigener Systemprompt, Schnellmodus, Modell vorladen) · Chats (Chatliste, Speichern, Verwerfen) · Modell und Leistung (Parameter, Tempo-Test) · Online (Schlüssel) · App (Darstellung, Update und Info). Außerhalb des Menüs: Modus-Leiste, Modellchip, Kontext-Karte, Chatleiste (Chatliste, Kopieren, Neu).

Gruppierung nach Fragen des Anwenders:

| Frage | Was dazugehört | Wo es heute liegt |
|---|---|---|
| Was frage ich? | Modus, Kontext, Chats | Modus-Leiste, Kontext-Karte, Chatleiste, Menü „Chats“ (verteilt) |
| Wen frage ich? | Engine, Modell, Online, Schlüssel | Engine: Menü, Modell: Chip, Online-Schalter: Menü Zeile 2, Schlüssel: eigene Gruppe |
| Wie antwortet er? | Temperatur, Top-P, Top-K, Kontextfenster, max. Tokens, Systemprompt, Schnellmodus | Parameter-Seite, Schnellschalter (getrennt) |
| Wie schnell? | Threads, Tempo-Test, Vorladen, Kontextgröße | Threads im Parameter-Dialog, Tempo-Test eigene Seite, Vorladen Schnellschalter |
| Die App | Darstellung, Sprache, Update | Menü „App“, EN/DE in der Kopfzeile |

## 3 Befunde
1. **Engine vor Modell.** Der Anwender denkt „welches Modell“, die Engine ist Technik. Heute sind es zwei Orte in falscher Reihenfolge: Engine im Menü (Unterseite), Modell am Chip. Wer von Ollama auf LiteRT-LM wechselt, muss ins Menü, dort die Engine wählen, zurück, dann den Chip antippen. Nichts verrät diese Reihenfolge. Für Einsteiger mit nur einer Engine ist die Zeile „Engine“ außerdem Rauschen.
2. **„Online erlauben“ ist ein Datenschutzschalter, steht aber unter den Alltagsschaltern.** Er wirkt nicht auf die Antwort, sondern darauf, was überhaupt sichtbar wird (Online-Engines, Gruppe „Online“). Aus = die Online-Engines fehlen einfach; wer sie sucht, findet sie nirgends und liest den Grund nur auf der Engine-Seite. Sichtbar gesperrt (grau mit Schloss und dem Hinweis „Online erlauben“) wäre verständlicher als unsichtbar.
3. **Threads gehören zu „Wie schnell“, stehen aber bei „Wie antwortet er“.** Das Kontextfenster ist beides (Qualität und Speicher). „Max. Antwort-Tokens“ steht als Regler im Parameter-Dialog und wirkt zugleich als Teil des Schnellmodus: doppelt. „Eigener Systemprompt“ ist Antwortcharakter, steht aber neben „Modell vorladen“ (Tempo) und „Online“ (Datenschutz).
4. **Chat-Funktionen sind verteilt:** Liste, Kopieren, Neu in der Chatleiste; Speichern und Verwerfen nur im Menü.
5. **Der Haupttestablauf ist heute der teuerste Weg.** Parameter ändern = Menü → Parameter (Sheet verdeckt den Chat) → schließen → neu senden. Man sieht die Antwort nicht, während man den Regler dreht.
6. **Parameter gehen verloren oder fehlen:** Die Regler sind eine globale Einstellung. Bei jedem Moduswechsel werden sie auf das Preset des Modus zurückgesetzt (und das Modell sowie der Chat wechseln gleich mit). Gespeichert wird nur die Thread-Zahl je Modell. Es gibt keinen „als Standard für dieses Modell speichern“, keinen Weg zum Notieren und keine Ausgabe der Werte im Format, das man außerhalb der App braucht (Ollama-Modelfile: `PARAMETER temperature 0.15`). Der Schalter „Standardwerte“ meint die internen Ollama-Werte, nicht eigene.
7. **Modus koppelt Modell, Regler und Chat.** Das ist im Alltag bequem, im Test hinderlich: Wer einen Wert gefunden hat und den Modus wechselt, verliert ihn.

## 4 Vorschläge (nicht umgesetzt, zur Entscheidung)
- **Parameter-Schnellzugriff:** ein kleiner Knopf (Regler-Symbol) in der Chatleiste oder neben dem Prompt, der ein halbhohes Sheet nur mit den Antwort-Parametern öffnet; der Chat bleibt darüber sichtbar. Darin: Temperatur, Top-P, Top-K, Kontext, max. Tokens; „Zurück auf Standard“; „Als Standard für dieses Modell speichern“; „Werte kopieren“ (Text mit Modell und Werten, auch als Modelfile-Zeilen). Threads, Tempo-Test, Vorladen bleiben unter „Leistung“.
- **Engine ins Modell-Sheet:** oben eine Umschalt-Zeile mit den Engines, darunter die Liste der Modelle dieser Engine. Eine Stelle für „Wen frage ich?“. Die Engine-Seite im Menü behält nur Verbindungsdaten (Adresse, Backend, Schlüssel).
- **Online sichtbar sperren:** Online-Engines in der Auswahl grau mit Schloss; Tippen erklärt den Schalter und bietet das Freischalten an. Der Schalter selbst wandert in eine Gruppe „Datenschutz und Online“.
- **Menü nach Fragen ordnen:** Gespräche · Antwort (Parameter, Systemprompt, Schnellmodus) · Leistung (Threads, Kontextgröße, Vorladen, Tempo-Test) · Verbindung (Engine-Daten, Schlüssel, Online) · App.
- **Parameter-Standard je Modell und Modus festlegen:** vorab entscheiden, wem ein Wertepaket gehört (Modell, Modus oder beides); für den Test ist „je Modell“ naheliegend.

## 5 Farblogik (Beobachtung)
Die Modusfarbe färbt heute Sendepfeil, Schalter, Eingabefeld, Zähler, Modus-Pille und den Ring-Rahmen. Der Status-Ring nutzt dieselben Farben als Signal (Blau = bereit, Grün = antwortet, Gelb/Orange = Warnung, Rot = Fehler). Konflikte: Wilson (Blau) gegen „bereit“ (Blau), Audit (Gelb) gegen Orange. Der Hub zeigt den Ollama-Status im Ring, darf aber keine Modusfarbe tragen. Ansatz des Entwicklers: Modusfarbe nur an dünnen Rahmen- und Trennlinien, gedimmt, bei Berührung und Fokus stärker (wie ein leuchtender Fensterrand unter Windows); Signalfarben nur für Status.

## 6 Weitere Wünsche zur Chat-Seite (aus dem Test am Handy, offen)
- Die Chat-Titelzeile grenzt sich nicht vom Chat ab und wiederholt meist den ersten Prompt. Abgrenzen (Haarlinie, ruhiger) oder erst anzeigen, wenn der Chat gespeichert oder benannt ist.
- Die Chatliste braucht einen Anker: die linke Spalte des Chats (Einzug) als Platz, in dem sich die Chatübersicht aufklappt; Tippen daneben oder X schließt sie.
- Der Modellchip als Pixeldisplay gefällt als Zeile, die Schrift ist zu groß, und bewegter Text mindert die Lesbarkeit. Ziel: nichts muss laufen (kleinere Schrift, weniger Text, Engine nicht in der Zeile).

## 7 Vorschlag nach Rückmeldung des Entwicklers (10.11.2026, Baumstruktur; noch nicht umgesetzt)

### 7.1 Grundidee
Einstellungen öffnen sich als Panel von rechts über **zwei Drittel** der Breite; das linke Drittel zeigt den Chat, Tippen darauf schließt das Panel (man dreht an einem Wert, tippt in den Chat, sendet, sieht die Wirkung). Oben im Panel steht der **Schnellbereich** („Jetzt“, etwa Passfoto-Format), darunter die Rubriken. Der Schnellbereich richtet sich nach der Seite: im Chat Engine, Modell, Parameter und Threads; auf „Modelle“ und „Tools“ die dort wichtigen Regler und Optionen. Im Menü selbst keine Pixelanimation, nur klar lesbare Einträge.

### 7.2 Baum
```
Einstellungen (Panel rechts, 2/3 Breite)
├─ JETZT (Schnellbereich, im Chat)
│  ├─ Engine          Ollama · LiteRT-LM · Online-Engines (grau mit Schloss, solange „Online erlauben“ aus ist)
│  │                  Statuspunkt + Klartext, warum es nicht geht (nicht erreichbar / Schlüssel fehlt / Online gesperrt)
│  ├─ Modell          Name, Tippen öffnet die Modellliste dieser Engine
│  ├─ Parameter       Temperatur · Top-P · Top-K · Kontext · max. Tokens · Threads   (wirken sofort auf die nächste Nachricht)
│  │                  Markierung „geändert“ gegenüber dem Standard des Modells
│  │                  [Zurück] [Als Standard für dieses Modell speichern] [Werte kopieren]
│  └─ Online-Sperre   erscheint direkt am gesperrten Eintrag: „Online erlauben?“ (die Einstellung selbst liegt unter Datenschutz)
├─ GESPRÄCHE
│  ├─ Chatliste · Aktuellen Chat speichern · Aktuellen Chat verwerfen
├─ ANTWORT
│  ├─ Eigener Systemprompt des Modells
│  └─ Schnellmodus (kurz, reiner Text)
├─ LEISTUNG
│  ├─ Modell vorladen
│  └─ Tempo-Test
├─ VERBINDUNG
│  ├─ Engine-Daten (Adresse, Backend)
│  └─ Schlüssel und Online-Dienste
├─ DATENSCHUTZ
│  └─ Online erlauben (aus = es wird nichts gesendet, Online-Engines gesperrt)
└─ APP
   ├─ Darstellung (Hell/Dunkel/Auto)
   ├─ Update und Info
   └─ Seite neu laden
```
EN/DE bleibt in der Kopfzeile.

### 7.3 „Online erlauben“ (geprüft)
Der Schalter ist mehr als ein Ausblenden: `lib/providers.js` blockiert jede Anfrage an eine Online-Engine mit `ONLINE_BLOCKED`, solange er aus ist. Das deckt sich mit dem Eindruck aus dem Test (ohne Schalter lädt kein Online-Modell). Er gehört deshalb unter **Datenschutz**, und im Schnellbereich wird die Sperre dort sichtbar, wo sie wirkt (an der gesperrten Engine).

### 7.4 Wirkungsbereich sichtbar machen
Jede Einstellung trägt eine von drei Marken: **Dieser Chat** (Modus, Kontext), **Dieses Modell** (Parameter, Threads, als Standard gespeichert), **Überall** (Darstellung, Online, Sprache). Im Schnellbereich zeigt ein Punkt, welche Werte gerade vom gespeicherten Standard des Modells abweichen.

### 7.5 Farbe und Chat-Seite (Entscheidungen des Entwicklers)
- Modusfarbe als **dünne Linie direkt unter der Modus-Leiste** (wechselt mit dem Modus), Umrandung der Prompt-Pille und Modellname im Chip; dauerhaft sichtbar, nicht nur bei Berührung. Aktive Fenster und Eingaben leuchten stärker (höhere Sättigung/Helligkeit).
- Wilson bekommt eine eigene Farbe (kein Blau), damit sie nicht mit „bereit“ (Blau) kollidiert.
- Der Ring um „Heinz UI“ zeigt den Status nur im Chat; im Hub ist er neutral.
- Informationszeile des Chats (Liste, Titel, Kopieren, Neu) bleibt zusammen, wird typografisch/grafisch klarer vom Chattext abgesetzt (Haarlinie oder als Bubble).
- Modellchip: Modus entfällt (steht in der Leiste), stattdessen Engine (Ollama, LiteRT-LM, Cloud); kleinere Schrift, Laufschrift nur bei langen Modellnamen.
