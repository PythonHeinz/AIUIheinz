# Design-Review 2 (DR2): Vorbereitung

Stand 11.11.2026, 05:20, Strang AIUIheinz-Design. DR1 ist bestanden (`docs/DESIGN.md`). Dieses Papier sammelt, **was das Konzept, der Chat-Strang, der Modelle-Strang und der Außenblick (Tertius) an Gestaltung verlangen**, damit DR2 einmal sauber plant statt Stück für Stück nachzubessern. Gebaut wird erst nach Freigabe. Quellen: `docs/KONZEPT.md` 18 bis 21, `docs/HINWEIS_Konzept_Chat.md`, `docs/TERTIUS.md`, `docs/GEPLANT.md`, `docs/DESIGN.md`, Commits bis `60820ed`.

## 1 Ausgangslage (was die Oberfläche heute kann)
- Chat-Seite mit Kopf (Ring, Modellchip, EN/DE, Menü), Statuszeile, Modusleiste (5 Modi), Chatleiste, Telemetrie (In, Out, T/s, Start), Zeile „Denken Schnell | Tief", Eingabe, Kontextfeld.
- Menü als Seitenblatt von rechts mit den Seiten Hauptmenü, Engine, Tempo-Test, Testreihe, Aussehen, Update und Info. Bausteine in `lib/core.css` und `lib/core.js`: Pille, Kachel, Karte mit Balken, Popup-Auswahl, Ring und Logo, Sticky-Aktionsleiste.
- Bereits eingeflossen: Regler mit Fähigkeitenzustand (`data-cap-card`), mehrere eigene Engines, Testreihen mit Matrix, Export in Teilen.

## 2 Gestaltungsbedarf aus den Strängen (nach Quelle)

### 2.1 Hub und schlanker Chat (Konzept 18.1, Tertius)
- Neuer Hub-Eintrag „schlanker Chat": größte Textfläche, ruhige Typografie, **nur ein Modellwähler** („wie die Unterhosen" wechseln), keine Parameter. Braucht eine **eigene Gestaltungsvariante** (Lesemodus mit Schrift, Zeilenlänge, Blasen ohne Technikzeilen) auf denselben Variablen und eine Modellwahl-Komponente, die nur Namen und Fähigkeiten zeigt.
- Hub aufräumen: „placeholder", „Old versions", Binnensprache (Wilson, Heinz, Audit …), Fußzeile „Nothing leaves this device" im Verhältnis zum Online-Schalter (Tertius 3). Erste Schritte für Fremde sichtbar machen.
- Modi und Kennzahlen **erklären sich selbst** (kurzer Tipp-Text zu In, Out, T/s, Start und zu den fünf Modi; Strang Modi liefert die Texte).

### 2.2 Einrichtungsassistent (Konzept 18.3)
- Neue Bausteine: **Schrittkarte** (Nummer, Titel, Text, Status offen/erledigt), **Befehlsblock mit Kopieren** (Quelle offen sichtbar), Prüfanzeige (Ollama erreicht, Speicher frei, Akku-Einstellung), Fortschritt beim Modell-Pull.
- Muss ohne laufenden Server lesbar sein (Henne und Ei): gehostete Seite oder README; gleiche Tokens, aber unabhängig von `server.py`.

### 2.3 Fähigkeiten und Schnittstellenwissen (Konzept 19)
- Jeder Regler braucht **vier sichtbare Zustände**: wirkt, ungeklärt (regelbar, markiert), gesperrt (ausgegraut mit Grund), nur lokal. Heute teilweise als Graustufe; zu vereinheitlichen als **Zustandsmarke** (Symbol plus Kurztext) und als Legende.
- Denken: Schalter Schnell | Tief belegt eine eigene Zeile. Stufenzahl und Bedeutung hängen am Modell (Gemini 3 Stufen, 2.5 Budget); die Zeile braucht eine Variante für mehr als zwei Stufen und eine **Warnung** („Denken hat die Token-Grenze aufgebraucht", Idee aus 21.5a bei `finish: length` ab 80 % Denk-Anteil).
- Kosten je Antwort: nur Idee, offen.

### 2.4 Funktionsplätze (Konzept 20.1, 20.2)
- Neue Seite „Funktionen": je Platz (Chat, Bild lesen, Bild erzeugen, Sprache sagen, Sprache hören, Einbettung, Zweitprüfung) eine Karte mit **Wunschliste** (Fähigkeit, Rangfolge), aktueller Zuordnung, Zustand „ersetzt: A durch B" oder „nicht verfügbar (Grund)". Brauchen: Karte mit Ranglisten-Bearbeitung (nach oben/unten statt Ziehen), **Hinweisband** (Info, Warnung, Fehler) als eigener Baustein, der heute fehlt.

### 2.5 Medien (Konzept 20.3 bis 20.7)
- Anhang-Knopf an der Eingabe, **Vorschaustreifen** angehängter Dateien, Bild- und Audioblasen im Chat, Vorlesen-Knopf, Anzeige des Sprachwegs (Browser offline oder Gemini).
- **Datenschutzdialog** vor Cloudaufrufen mit Medien (was verlässt das Gerät, „nicht mehr fragen je Engine"): fehlender Baustein **Bestätigungsblatt** (heute nur Zweit-Tipp).
- **Kennzeichnung „KI-erzeugt"** an Bildern (Marke in der Oberfläche, im Export, in der Datei).
- Medienspeicher: Größenanzeige, Aufräumen, Export in der Sicherung (Seite Info).
- Einlesen (Hub-Tool), Bildstudio (Galerie, Serien) und **Modellvergleich** mit mehreren Antworten nebeneinander: auf 426 px nur als **horizontal wischbare Spalten** oder Tabs sinnvoll; Entwurf nötig, bevor ein Strang es baut.

### 2.6 Testreihen und Messen (Konzept 21, Tempo-Test)
- Testreihe und Tempo-Test sollten **dieselben Karten und Balken** nutzen (DR1: Live-Balken, Fortschrittsbalken, angeheftete Aktionsleiste). Heute zwei Bauformen.
- Matrix-Eingabe (Achsen, Werte, Wiederholungen, Obergrenze) braucht einen **kompakten Achsen-Editor**; Ergebnis als Karten pro Zeile, Prüfregel bestanden oder nicht als Marke, Export in Teilen mit Zähler.
- Schwellen der Leistungsfarben (T/s, Start) gegen echte Reihen kalibrieren (Konzept 21.5a liefert Messwerte).

### 2.7 Eigene Wünsche aus DR1
- **Modus-Schieberegler** am linken Rand (Halbkreis, senkrechte Leiste mit Kreisen in Modusfarben): Prototyp, danach Entscheidung. Er soll **Platz nach oben** schaffen und den Modus ständig sichtbar lassen. Verknüpft mit der Zeile „Denken" (siehe 2.3): beide kosten heute vertikalen Raum.
- **Wichtigstes im Daumenbereich** und **Parameter-Schnellöffner**: hängen an der neuen Gliederung des Menüs (3).
- **Brummen** (Entwickleroption, Modell-Traumanzeige statt „Bereit für Eingaben"): Gestaltung im Pixel-Display-Stil, siehe `docs/GEPLANT.md`.
- Engine-Seite: Überschrift „Verbindungsdaten · Name" bricht um; bei vielen eigenen Engines Liste einklappen oder in Gruppen (lokal, online, eigene).

## 3 Gliederung des Menüs (Kern von DR2)
Das Menü hat heute fünf Unterseiten, mit Konzept 19 bis 21 kommen mindestens hinzu: **Funktionen** (Plätze), **Medien** (Speicher, Datenschutz), **Wissensquellen** (19.6, später), **Assistent** und Entwickleroptionen. Ohne neue Ordnung wird die Hauptliste lang und die Wege tief. Vorschlag zur Prüfung:
1. **Zonen** statt flacher Liste: *Jetzt* (Engine, Modell, Denken, Modus: im Daumenbereich unten, als Schnellblatt), *Messen* (Tempo-Test, Testreihe), *Einrichten* (Funktionen, Engines, Medien, Datenschutz), *App* (Aussehen, Sprache, Update und Info, Entwickler).
2. Schnellblatt von unten für das, was man **während des Chats** ändert (Modell, Denken, Temperatur und Threads); das Seitenblatt von rechts bleibt für die Verwaltung. (Der Entwickler hat die Seitenblatt-Form für Einstellungen bestätigt; das Schnellblatt wäre **zusätzlich**, kein Ersatz. Entscheidung offen.)
3. Suche im Menü, falls die Liste über zwölf Einträge wächst.

## 4 Fehlende Bausteine (vor jedem Strang in `lib/core.css` klären)
Hinweisband (Info, Warnung, Fehler), Bestätigungsblatt, Zustandsmarke, Schrittkarte, Befehlsblock mit Kopieren, Vorschaustreifen und Mediablase, KI-Marke, wischbare Vergleichsspalten, Achsen-Editor, Ranglisten-Editor. Jeder braucht Variante hell und dunkel, EN und DE, Zielgröße von mindestens 44 px und einen Eintrag auf `tools/design/index.html`.

## 5 Vorschlag für Ablauf und Regeln
1. **Phase A (Entwurf, kein Fundament):** Bausteine aus 4 als Beispielseite in `tools/design/` bauen und vom Entwickler auf dem Handy ansehen lassen; Modus-Schieberegler als Prototyp auf der Beispielseite.
2. **Phase B (Gliederung):** Menü nach 3 neu ordnen. Das ändert Hauptmenü und Navigation von `chat.html`, also Fundament: **ein Chat auf einmal**, nach den laufenden Strängen (Chat: Schnittstellen und Testreihen, Modelle: Daten). Vorher Freigabe.
3. **Phase C (Schlanker Chat, Hub, Assistent):** neue Seiten auf den Bausteinen; Texte von Tertius und Modi.
4. **Phase D (Medien, Funktionen):** erst wenn Chat und Modelle die Daten und den Anhang liefern; Gestaltung liegt dann fertig vor.
Regeln wie bisher: kein Umbau ohne Absprache, nur simuliert getestet bleibt gekennzeichnet, jede neue Zeichenfolge EN und DE.

## 6 Entscheidungen, die vom Entwickler kommen müssen
1. Soll es zusätzlich ein **Schnellblatt von unten** geben, oder bleibt alles im Seitenblatt von rechts?
2. Modus-Schieberegler: Prototyp bauen und auf dem Handy ansehen, ja oder nein? Bleibt die Modusleiste bis dahin?
3. Hub: Fußzeile und Erste Schritte (Wortlaut des Datenschutzversprechens).
4. Reihenfolge Phase A bis D, und welcher Strang Phase B übernimmt.
5. Namen der Hub-Einträge und Funktionsplätze (offen in Konzept 18.4 und 20.10).

## Stand 11.11.2026, Phase A (Entscheidungen vom Entwickler, 05:10)
- **Neuer Hub** `hub.html` (alter `index.html` bleibt bis zur Freigabe). Tabs: **Chat | Werkzeuge | Einrichten** (EN: Chat | Tools | Set up). Namen: **Heinz Chat** (schlanker Text, `tools/heinz/index.html`), **Heinz Prüfstand / Heinz Test Bench** (bisherige Heinz UI, `chat.html`), **Einlesen / Read in** und **Bildstudio / Image studio** (Platzhalter), **Einrichtungsassistent / Setup guide** (`tools/setup/index.html`).
- **Schnellblatt von unten** (`.bsheet`) für den neuen Chat (Modell, Chats); das Seitenblatt von rechts bleibt nur im Prüfstand.
- **Fußzeile des Hubs sachlich**, kein Datenschutzversprechen mit Bezug auf Richtlinien oder Verordnungen.
- **Modus-Schieberegler**: bedienbares Mockup `tools/design/modus.html` (Kragen am linken Rand, senkrechte Leiste, Rahmen ziehen, Akzentfarbe live). Noch nicht im Prüfstand.
- **Phase B (Menü umbauen)** wird eigener Strang **AIUIheinz-Menu**, Auftrag `docs/agent/AUFTRAG_Menu.md`.
- Neue Bausteine in `lib/core.css`/`core.js`: `.notice`, `.bsheet`/`.bscrim`, `.step`, `.cmd`, `Heinz.copy`, `Heinz.sheetOpen/Close`. Nur simuliert getestet, nicht am Gerät.
