# Design-Manifest Heinz UI

Stand: 09.11.2026. Quelle: Wünsche des Entwicklers und seine Screenshots (Heinz UI, INCIheinz, Convert2), dazu die Farbvariablen und Schriften aus dem Code von INCIheinz. Das ist eine Leitlinie, noch nichts davon ist umgesetzt (außer der Kopfzeile und `lib/core.css`). Maßgeblich ist dieses Dokument im Repo; die Kopie im Claude-Projekt kann älter sein.

## 1 Grundsätze
- **Reines HTML, CSS und JavaScript, ohne Build, ohne Bibliotheken.** Alles läuft offline.
- **Klare Farben auf Schwarz, keine Transparenz.** Keine Verläufe, keine Weichzeichner-Schatten, keine halbdurchsichtigen Flächen. Jede Fläche ist deckend.
- **Pillen und Bubbles** statt eckiger Kästen: runde Ecken, großzügige Abstände, eine Form pro Funktion (Schaltfläche, Chip, Blase, Karte).
- **Listen statt Tabellen und statt umbrechender Fließtexte.** Eine Zeile hat Symbol, Titel, grauen Untertitel und rechts eine Zahl oder einen Pfeil. Tabellen nur dort, wo echte Spalten gebraucht werden (Sheet, Auswertung).
- **Symbole statt Wörter**, wo sie eindeutig sind (Linien-Symbole, siehe 4).
- **Nüchtern, aber typografisch schön.** Gliederung durch Schrift (Versalien, Wechsel Serife/serifenlos), nicht durch Rahmen.
- **Ein Daumen-Bedienkonzept** für den Pixel 9 Pro (rund 426 × 803 px): wichtige Aktionen unten, Bereiche oben wechselbar.

## 2 Farben
Heinz UI (dunkel), aus `lib/core.css`:

| Zweck | Wert |
|---|---|
| Hintergrund | `#000` (Flächen `#121212`, Karten `#202124`) |
| Linien | `#3c4043` (Kopfzeile `#2a2a2a`) |
| Text | `#e8eaed`, Nebentext `#9aa0a6` |
| Blau / Grün / Gelb / Rot | `#4285f4` / `#34a853` / `#fbbc05` / `#ea4335` |

- **Jeder große Bereich bekommt eine Akzentfarbe** (Chat blau, Modelle grün, Filter gelb, Sheet rot). Modusfarben im Chat bleiben wie in `chat.html`.
- **Vorbild INCIheinz:** zwei Bereiche mit eigener Stimmung bei gleicher Form, ein kühles (Lager: Grün `#2D5A43` auf `#F6F8F5`) und ein warmes (Rezeptbuch: Braun `#8B4A2B` auf `#FAF4E8`). Variablen dort: `--bg --surf --line --pri --sub --txt --muted --onpri --amb --err`. Heinz UI nutzt dieselben Variablennamen, damit ein Bereich seine Stimmung allein über die Werte ändert.
- Auf gelben Flächen dunkle Schrift (`#202124`), sonst weiße.

## 3 Schrift
- **Fließtext und Oberfläche:** Inter, mit Rückfall auf `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` (so in INCIheinz). Es werden keine Webfonts aus dem Netz geladen. Soll Inter garantiert sein, liegt die Datei (`woff2`, Lizenz OFL) im Repo unter `lib/fonts/`.
- **Serife:** Georgia (`Georgia, 'Times New Roman', serif`) als Gegenstück für ausgewählte Überschriften und Kennzahlen. Der Wechsel Serife/serifenlos ist ein Gliederungsmittel. Genaue Einsatzorte legt der Entwickler anhand von INCIheinz-Beispielen fest; im Code von INCIheinz kommt Georgia nur an wenigen Stellen vor.
- **Monospace:** `ui-monospace, Menlo, Consolas, monospace` für Code, Zahlen in Tabellen (`font-variant-numeric: tabular-nums`), Messwerte (Token, T/s).
- **Versalien und Kapitälchen für Gliederung:** kleine Abschnittsüberschriften in Großbuchstaben, 0,62–0,75 rem, Sperrung 0,12–0,2 em, Nebenfarbe (Beispiele: „KATEGORIEN“, „DRUCKEN & GESTALTEN“, Untertitel in der Kopfzeile). Keine Versalien in Fließtext.
- Abstufung: Titel 1,15–1,3 rem Gewicht 600, Listentitel 1 rem, Untertitel 0,85 rem in Nebenfarbe, Messwerte 0,8 rem.

## 4 Formen und Bedienelemente
- **Radien:** 12 px (Karten, Eingaben), 14 px (große Karten), 99 px (Pillen, Chips, Umschalter). Ring in der Kopfzeile 32 px, Rand 1,8 px.
- **Höhen:** Schaltflächen 40–46 px, Antippfläche mindestens 44 px, Chips 26–36 px.
- **Listenzeile:** links ein Symbol in einer kleinen abgerundeten Kachel, dann Titel und darunter ein grauer Untertitel, rechts Zahl oder Pfeil (Vorbild: Menü „Mehr“ in INCIheinz). Gruppen mit Versalien-Überschrift darüber, Linie als Trenner statt Kasten.
- **Symbole:** einheitliche Linien-Symbole, Strichstärke 1,8, abgerundete Enden, Farbe der Akzentfarbe (so das Gehirn im Ring). Emojis nur als Notlösung und nicht in neuen Menüs. Zu prüfen: der Ordner `INCI-App-Projekt/symbole` des Entwicklers als Quelle.
- **Eingabe:** abgerundetes Feld, Mikrofon als eigene runde Schaltfläche in der Akzentfarbe, Senden als breite Pille.
- **Kopieren:** kleines rundes Symbol (32–36 px) oben rechts in der Blase, Rahmen dünn, ohne Füllung, Bestätigung durch ein Häkchen für etwa 1,2 s. Heute zu klobig. Zwei Ebenen: je Blase und für den ganzen Chat (Schaltfläche am Kopf des Chatfensters).
- **Blasen im Chat:** wie in `chat.html` (Eigene Nachricht und Antwort mit eigener Fläche, Code mit Syntaxfarben). Beibehalten.

## 5 Navigation (Zielbild)
1. **Kopfzeile:** links Zurück, Mitte Ring mit Gehirn, Schriftzug AIUI+heinz und kleine Versalien-Beschriftung des Bereichs, rechts EN/DE.
2. **Bereichsumschalter** direkt unter der Kopfzeile: zwei große Pillen nebeneinander (wie Lager | Rezeptbuch in INCIheinz). Für Heinz UI zum Beispiel Chat | Werkzeuge. Genauer Zuschnitt offen.
3. **Untere Leiste** mit vier Einträgen und einer **runden Schaltfläche in der Mitte** (Daumen-Knopf, größer, ragt über die Leiste, Beispiel „Neu“ = neuer Chat) und rechts „Mehr“ mit Burger-Symbol.
4. **„Mehr“ öffnet ein Bottom-Sheet** mit gruppierten Listen unter Versalien-Überschriften („Daten“, „Einstellungen“, „KI“, „Für die ganze App“).
5. **Kein Wischen zwischen Bereichen** (kollidiert mit Code und Tabellen). **Kein Wischen zum Aktualisieren** (`overscroll-behavior-y: none`), weil sonst der Chat verloren gehen kann.

## 6 Splitscreen mit der Konsole
Der Entwickler arbeitet oft mit Termux im geteilten Bildschirm; die Konsole läuft unten bis zum Bildschirmrand, die Android-Tasten liegen darüber. Das gefällt ihm und soll bleiben.
- Inhalt scrollt unter dem Seitenrand weiter; unten bleibt Abstand (`padding-bottom: max(90px, 45vh)`), damit nichts verdeckt wird.
- **Feste Leisten dünn halten** (höchstens etwa 56 px), weil im Splitscreen nur etwa die halbe Höhe bleibt. Jede neue Seite wird bei 426 × 400 px geprüft.
- Die Seite darf keinen Hintergrund durchscheinen lassen, damit sie neben der schwarzen Konsole sauber wirkt.

## 7 Regeln für neue Seiten
- `lib/core.css` und `lib/core.js` einbinden, `<div id="app-header">` anlegen.
- Farben nur über die Variablen, Texte immer EN und DE.
- Relative Pfade, Server nur über `/api/...`.
- Vor dem Umbau einer bestehenden Seite kurz fragen; Hub, Kopfzeile und `lib/` gehören zum Fundament (ein Chat zur Zeit).

## 8 Umsetzung
Vorgeschlagen als eigener Strang „AIUIheinz-Design“, weil Hub, Kopfzeile und `lib/core.css` zum Fundament zählen und nur ein Chat zur Zeit daran ändert. Reihenfolge: (1) Variablen und Schriften in `lib/core.css`, (2) Bausteine (Listenzeile, Pille, Kopierknopf, Bottom-Sheet, untere Leiste mit Mittelknopf) als kleine Beispielseite, (3) Hub, dann Chat-Seite. Die Chat-Seite (Strang „AIUIheinz-Chat“) übernimmt bis dahin nur die zwei Kopierebenen.

Offen: Einsatzorte der Serife, Zuschnitt der zwei Hauptbereiche, Symbolsatz, ob Inter lokal mitgeliefert wird.
