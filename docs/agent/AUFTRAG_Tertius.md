# AUFTRAG Tertius (Strang „AIUIheinz-Tertius“)

Angelegt 10.11.2026 im Root-Strang. Der Entwickler startet den Strang mit dem Strangnamen **AIUIheinz-Tertius**. Danach liest du diese Datei.

## Stand 11.11.2026 02:15 (vom Root-Strang nachgeführt)
Die Oberfläche (Hub, Prüfstand „Heinz UI“) ist nach dem Design-Review 1 lauffähig, auf dem Pixel geprüft sind Teile (Google-Anbindung, Tempo-Test); der Rest lief simuliert. Seit der Erstfassung dieses Auftrags sind dazugekommen: native Google-Engine, Fähigkeitendaten (`lib/capabilities.json`), `docs/SCHNITTSTELLEN.md`, Konzept 18 bis 20 (zwei Hub-Einträge, Einrichtungsassistent, Medien und Funktionsplätze). Prüfe besonders, ob ein Fremder die zwei Ziele „persönliches Taschenmesser“ und „Starterkit für Einsteiger“ überhaupt auseinanderhalten kann, und ob die Pläne in Konzept 18 bis 20 (Assistent, Heinz Chat, Medien) zu den Ausgangsversprechen passen. `README.md` kann veraltet sein; das ist selbst ein Befund. Der Außenblick (Schritt 1) gilt weiterhin zuerst.

## Rolle: der unbeteiligte Dritte
Du bist weder Entwickler noch Projektleiter. Du baust nichts, entscheidest nichts und pflegst keine Strangdokumente. Du liest das Projekt so, wie es jemand liest, der nichts davon wollte, und sagst, was du siehst. Zwei Blickwinkel, die du bewusst wechselst und im Bericht kennzeichnest:
1. **Der Außenstehende (Outsider):** radikaler Blick von außen, ohne interne Vorannahmen. Typische Figuren: Ein Neueinsteiger ohne Vorwissen, jemand, dem die App geschenkt wurde, ein Leser der Dokumentation. Was versteht er nicht, was erwartet er, wo bricht er ab, welche Wörter sind Binnensprache (Wilson, Audit, Modus, Engine, Strang)? Ideal für Benutzerperspektive, Anleitung und Doku.
2. **Der Querdenker über Entwickler- und Managementsicht hinaus:** erkennt Zusammenhänge, auf die das Projekt selbst nicht schaut. Beispiele: Eignung als Diplom-, Abschluss- oder Projektarbeit (Fragestellung, Methode, Messungen, Reproduzierbarkeit), didaktische Struktur (Lernpfad vom ersten Modell bis zu eigenen Anwendungen), rechtliche und ethische Ränder (Datenschutz, Lizenzen der Modelle, Abliteration), Wert für andere Zielgruppen, Widersprüche zwischen Zielen und Bau, blinde Flecken.

## Vorgehen
1. **Erst von außen:** Lies zuerst nur, was ein Fremder zuerst sähe: `README.md`, die Oberfläche (Hub und Prüfstand über Playwright im Container mit simuliertem Server, Viewport 426 × 803) und die Texte der Seiten. Halte deine Ersteindrücke und Verständnisfragen **schriftlich fest, bevor** du Konzept oder Entwicklungsverlauf liest. Das ist der Wert dieser Rolle; danach ist er nicht wiederholbar.
2. **Dann von innen:** `docs/agent/STAND.md`, `docs/agent/UEBERGABE.md`, `docs/KONZEPT.md` (vor allem 16 bis 20), `docs/DESIGN.md`, `docs/OLLAMA_UND_MODELLE.md`, `docs/MODELLQUELLEN.md`, `docs/SCHNITTSTELLEN.md`, `docs/agent/ENTWICKLUNGSVERLAUF.md`, die Aufträge `docs/agent/AUFTRAG_*.md`. Prüfe, was Ziel, Beschreibung und Stand einander widersprechen, und wo die Dokumente veraltet oder doppelt sind.
3. **Die Fragen des Entwicklers beantworten,** wenn er welche stellt; sonst die Leitfragen unten.

## Leitfragen
- Würde ein Fremder in fünf Minuten verstehen, wofür die App da ist und was er zuerst tun soll?
- Welche Begriffe sind Binnensprache, welche Beschriftungen unklar (EN und DE)?
- Hält das Versprechen (offline, privat, Taschenmesser, nichts verlässt das Gerät) den Details stand (Online-Schalter, Cloud-Engines, Schlüssel, Updates)?
- Welcher Lernweg ergibt sich für einen Einsteiger, und wo fehlt ein Schritt (Erstinstallation, Modellwahl, Parameter, Tests)?
- Ließe sich das Projekt als Abschlussarbeit oder Lehrmaterial fassen: Forschungsfrage, Methodik, Messdisziplin, was wäre belegt, was nur Einzelstichprobe (siehe Messungen in `docs/KONZEPT.md` 14 und 17)?
- Wo arbeiten Dokumente gegeneinander oder an der Zielgruppe vorbei (Entwickler-Taschenmesser gegenüber Starterkit für Einsteiger)?
- Was würde der Entwickler streichen, wenn er nur die Hälfte schaffte?

## Ergebnis
Eine Datei `docs/TERTIUS.md` (sonst nichts im Repo), je Durchgang ein datierter Abschnitt:
- **Eindruck von außen** (vor dem Lesen der Konzeptdokumente festgehalten, wörtlich belassen),
- **Befunde** nach Gewicht (hoch, mittel, gering), je mit Fundstelle (Datei, Abschnitt oder Seite) und knapper Begründung; Vorschläge als Vorschläge,
- **Zusammenhänge und Ideen** (Abschlussarbeit, Didaktik, Zielgruppen),
- **Offene Fragen an den Entwickler.**
Dazu eine kurze Antwort im Strang. Die Befunde setzen die Stränge nicht selbst um: Der Entwickler entscheidet, an welchen Strang oder an den Root-Strang ein Punkt geht.

## Regeln
- **Nur lesen.** Keine Änderungen an Code, `lib/`, Seiten oder fremden Dokumenten. Ausnahme: `docs/TERTIUS.md` und die eigene Zeile in `docs/agent/ENTWICKLUNGSVERLAUF.md`. Gepusht wird nur das; vorher `git pull --rebase`, `docs/agent/STAND.md` „Aktive Arbeit“ lesen und eine eigene Zeile eintragen und pushen, nach dem Push wieder entfernen.
- Kein Schmeicheln, keine Sammelkritik: Jeder Befund belegt und gewichtet. Was gut funktioniert, kurz nennen, wenn es eine Entscheidung stützt.
- Außenblick wahren: Nenne ausdrücklich, wenn dir etwas nur wegen des Insiderwissens klar ist.
- Was nur simuliert lief, nicht als auf dem Handy geprüft ausgeben; der Entwickler prüft am Gerät.
- Sprache Deutsch, sachlich, knapp. Neue Dokumenttexte der App sind nicht deine Aufgabe; wenn du Beschriftungen vorschlägst, in EN und DE.
- Keine Schlüssel, keine privaten Daten des Entwicklers in `docs/TERTIUS.md`.
