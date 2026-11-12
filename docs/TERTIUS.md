# Tertius: Außen- und Querblick auf AIUIheinz

Strang „AIUIheinz-Tertius“, Rolle: unbeteiligter Dritter, nur lesen. Kein Schlüssel, keine privaten Daten. Alles, was nur simuliert lief, ist nicht auf dem Gerät geprüft.

# Durchgang 1, 11.11.2026 (Stand: Commit `63e998b`, danach kamen weitere Chat-Commits dazu)

**Auftrag des Entwicklers:** Reicht das Projekt (jetzt oder in einem späteren Ausbau) für eine Bachelor- oder Masterarbeit? Was folgt daraus, dass es allein, mit KI, in rund 16 Arbeitsstunden entstand? Welche Qualifikationsprofile und Stellen lassen sich ableiten? Ausdrücklich analysieren, nicht loben.

**Grundlage und Grenzen:** Ich habe das Repo gelesen, die Seiten mit simuliertem Server angesehen (Viewport 426 × 803) und `bash tests/run_all.sh` laufen lassen (grün; 90 Seitentests im letzten Block, Server- und Capabilities-Tests laufen mit). Ich kenne weder Lebenslauf noch Zeugnisse noch Prüfungsordnungen, ich habe den Arbeitsmarkt nicht recherchiert und nichts auf einem Gerät geprüft. Aussagen zu Stellen und Hochschulen sind Einschätzungen aus den Artefakten, keine Marktdaten. Die 16 Stunden kann ich nicht belegen (siehe 4).

## Eindruck von außen (festgehalten vor dem Lesen von KONZEPT, UEBERGABE, ENTWICKLUNGSVERLAUF, Aufträgen)

Blickwinkel: Outsider. Einschränkung: `INDEX.md`, `docs/agent/STAND.md` und `AUFTRAG_Tertius.md` hatte ich vorher gelesen (Pflichtlektüre), der Außenblick ist deshalb nicht rein. Gelesen wurden danach nur `README.md` und die Oberfläche (Hub, Chat, Designseite; Viewport 426 × 803, simulierter Ollama-Server; nichts davon auf einem Gerät geprüft).

- Hub: Der Satz „Private AI tools that work offline“ ist verständlich. Drei Wörter sind Binnensprache: „Heinz UI“ (Name ohne Erklärung), „Wilson, Heinz, Audit, Code, Creative“ (fünf Namen ohne Erklärung, was sie tun), „Models: placeholder“. „Old versions“ mit „Data Lab (old)“ und „Phone Vitals (old)“ zeigt dem Fremden Baustellen statt eines Einstiegs.
- Ein „Erste Schritte“ fehlt auf der Oberfläche. Wer ohne Ollama startet, sieht „LiteRT-LM not reachable (optional)“, ohne zu wissen, was LiteRT-LM ist. Im Chat steht „Server online (model asleep)“ und „Preparing model …“ ohne Hinweis, was jetzt zu tun ist.
- Chat: Der obere Bereich ist dicht (Logo, Pixeldisplay mit Modellname, Sprachschalter, Menü, Statusleiste, zweites Mini-Display). Die Kennzahlen „In / Out / T/s / Start“ setzen Wissen über Token und Ladezeit voraus. Das Eingabefeld „What should Heinz do?“ spricht den Nutzer als Auftraggeber eines Agenten an, nicht als Gesprächspartner.
- README: Beschreibt Technik (Termux, Ollama, Standardbibliothek), nicht den Nutzen. Es nennt „fünf Modi“ und „Data Lab“, die Oberfläche nennt inzwischen zwei neue Einträge; der Hub und die README-Tabelle passen nicht mehr zusammen (README kann veraltet sein). Der Start setzt voraus, dass Termux, Ollama und ein Modell schon laufen; wie man dorthin kommt, steht nicht da.
- Positiv, als Fremder sofort erkennbar: einheitliches Aussehen, Hell/Dunkel/Auto, EN/DE-Schalter, der Satz „Offline first · nothing leaves this device“, eine Designseite mit Bausteinen, die ein ungewöhnlich diszipliniertes Vorgehen für ein Handyprojekt zeigt.
- Ersteindruck zum Reifegrad: Ein sehr gut gebautes Werkzeug für jemanden, der es schon kennt. Als Produkt für Dritte noch nicht verständlich; als Werkstück eines Einzelnen aber weit über „Bastelprojekt“.

## Befunde zum Außenblick und zur Dokumentation (nach Gewicht)

**Hoch**
1. **Zwei Ziele, ein Bild.** `docs/KONZEPT.md` 1 (seit 12.11.2026 im Archiv: `docs/archiv/KONZEPT_v1_entwurf.md`) nennt „persönliches Taschenmesser“ und „Starterkit für Einsteiger“. Hub, README und Chat bedienen nur das erste. Ein Fremder erkennt nicht, für wen die App gedacht ist. Konzept 18 (zwei Hub-Einträge, Assistent) löst das auf dem Papier, gebaut ist nichts davon.
2. **Es gibt keinen Einstieg für Dritte.** `README.md` beginnt bei Termux und Ollama; wie ein Fremder dorthin kommt, steht erst in `KONZEPT.md` 18.3 als Planung. Der Hub zeigt „placeholder“ und „old versions“.
3. **Das Versprechen ist im Hub unbedingter als im Detail.** Fußzeile „Nothing leaves this device“ (Hub) und README „Alles läuft ohne Internet“ gegen: Online-Schalter, Cloud-Engines mit Schlüssel im Browser, Update per `git pull` (braucht Internet), Modellsuche (`KONZEPT.md` 18.3, Schritt 6). Der Chat formuliert es richtig bedingt („Off: nothing leaves this device“, `chat.html` Hilfetext). Für ein Datenschutz-Versprechen ist die unbedingte Fassung angreifbar.
4. **Doku widerspricht sich und veraltet schnell.** `README.md` nennt fünf Seiten und „Data Lab“; der Hub zeigt andere Einträge und das Design-Manifest ist maßgeblich. `KONZEPT.md` 1 bis 13 (jetzt im Archiv) sind laut eigenem Vorspann „stellenweise überholt“, daneben stehen 15 bis 20. `INDEX.md` und `docs/agent/STAND.md` führen mehrere Stände in einer Zelle. Das ist für den Entwickler lesbar, für Dritte nicht, und es kostet jeden neuen Chat Lesezeit. Die Zellen der Strangtabelle in `docs/agent/STAND.md` sind so lang, dass sie wie Chroniken wirken, obwohl `docs/agent/UEBERGABE.md` die Datei als geordneten Stand vorsieht.

**Mittel**
5. **Binnensprache:** Wilson, Heinz, Audit, Code, Creative, Strang, Engine, Modus, Fundament, DR1, Funktionsplätze, Heimserver. In der Oberfläche fehlt zu den fünf Modi jede Erklärung. Vorschlag EN/DE für den Hub-Untertitel: „Ask offline AI, test small models on your phone.“ / „Offline-KI fragen, kleine Modelle auf dem Handy testen.“
6. **`chat.html` hat 2869 Zeilen und rund 223 KB in einer Datei** (198 Funktionen). Die Dokumente nennen es selbst („Wartbarkeit im Blick behalten“, `KONZEPT.md` 17.4 Punkt 5). Entscheidend ist die Folge: Der Entwickler kann diese Datei nicht prüfen, und die Agenten, die sie ändern, müssen sie jedes Mal komplett verstehen.
7. **Keine Lizenz im Repo** (`LICENSE` fehlt), obwohl das Repo öffentlich ist und ein Starterkit werden soll. Ohne Lizenz gilt Urheberrecht „alle Rechte vorbehalten“; Dritte dürfen nichts nutzen. Modelllizenzen (Gemma, Qwen, abliterierte Varianten) und der Umgang mit „heinz-fakt“ sind nirgends geordnet beschrieben.
8. **Sperre „Aktive Arbeit“ in der Praxis nicht belegt.** Beim Start meines Chats war die Zeile leer, trotzdem entstand um 02:23 ein Commit des Chat-Strangs (`63e998b`). Entweder trug sich der Strang nicht ein oder die Zeile war schon entfernt; ich kann es nicht prüfen. Falls ersteres: Der Mechanismus hält nur, solange alle Chats ihn bedienen.

**Gering**
9. Kein Test auf dem echten Gerät durch Dritte; die meisten Aussagen sind in den Dokumenten sauber als „simuliert“ gekennzeichnet (gut, siehe 3).
10. Mischstand der Oberfläche: neue Chat-Seite, alte Seiten (Lab, Sheet, Vitals) im alten Stil.

## 1 Abschlussarbeit: Eignung jetzt und später

**Bewertungsmaßstab (grob, Prüfungsordnungen weichen ab):** Bachelorarbeit = eigenständige Bearbeitung einer abgegrenzten Aufgabe mit Methodik, Auswertung und Reflexion. Masterarbeit = zusätzlich ein wissenschaftlicher Beitrag (neue Erkenntnis, belastbare Evaluation, Einordnung in den Forschungsstand).

**Als Bachelorarbeit (Informatik, Medieninformatik, Wirtschaftsinformatik, Technische Redaktion): im Umfang ausreichend, im wissenschaftlichen Rahmen noch nicht.**
- Für die Praxisleistung spricht: lauffähiges System (Server, Anbieterschicht, Chat, Design-System, rund 10 900 Zeilen inklusive Tests und Dokumente), Testsuite mit Playwright (20 Server-, 7 Capabilities-, 90 Seitentests; im Lauf grün), dokumentierte Entscheidungen (`KONZEPT.md` 0, 15 bis 20), Messungen (Tempo vs. Threads), Quellenstatus je Aussage in `SCHNITTSTELLEN.md` („belegt / Drittquelle / vermutet / unbekannt“). Der Umfang übersteigt, was in einer Bachelorarbeit sonst als Implementierung entsteht.
- Es fehlen die Teile, die Hochschulen bewerten: eine **Forschungsfrage**, eine **Methodik**, eine **Evaluation mit Gütekriterien** und ein **Stand der Forschung/Technik** (Literatur statt Anbieterdokus und Blogs). `MODELLQUELLEN.md` nennt selbst, dass fast alle Zahlen aus Drittquellen stammen.
- Die Messungen sind **Einzelstichproben** (`KONZEPT.md` 17.2: ein Modell, ein Prompt, ein Gerät, 32 Token, Läufe schwanken; Tabelle zeigt bei 3 Threads 3,6 gegen 7,0 Token/s zwischen Lauf 2 und 1). Das ist Befund, noch kein Ergebnis.
  - Nachtrag 02:32 (nach meinem ersten Lesen): `KONZEPT.md` 21 plant automatisierte Testreihen mit Matrix, Wiederholungen, Prüfregeln und Export und nennt als Ziel „Messreihen statt Einzelstichproben“. Das ist der richtige Baustein für eine Arbeit. Es fehlt im Entwurf noch die statistische Seite: Mindestzahl Wiederholungen, Streuungsmaße, Umgang mit Ausreißern, Vorab-Festlegung der Hypothesen. „Auswertung nur durch Code, der Agent wertet aus“ ist für Entwicklung praktisch, für eine Arbeit müsste der Auswerteweg nachvollziehbar und von dir erklärbar sein.
- **Eigenleistung und KI-Kennzeichnung** wären der kritischste Punkt: Der Code wurde von KI geschrieben. Hochschulen verlangen inzwischen fast überall eine Angabe, wo KI genutzt wurde; was die Eigenleistung ist, muss die Arbeit definieren (Anforderungen, Entwurfsentscheidungen, Teststrategie, Abnahme am Gerät, Prozess). Das ist machbar, aber nicht nebenbei.
- Passende Titelrichtungen: „Entwurf und Evaluation einer datensparsamen, offline-fähigen Oberfläche für kleine Sprachmodelle auf Smartphones“ oder „Qualitätssicherung KI-generierter Software in Einzelentwicklung“.

**Als Masterarbeit: im jetzigen Stand nein, mit Umbau möglich.**
- Es gibt keinen Beitrag über den Bau hinaus: keinen Vergleich gegen Alternativen (Open WebUI, Ollama-Apps, PocketPal u. ä. wären Pflicht), keine Nutzerstudie, keine statistisch tragfähige Messung, keinen Forschungsstand.
- Zwei tragfähige Umdeutungen:
  1. **Prozessforschung:** „Governance für Mehr-Agenten-Entwicklung durch eine Einzelperson“. Das Material ist da und ungewöhnlich: Strangregister, Sperrzeilen, Fundament-Freigabe, Aufträge je Strang, Review-Stufen (DR1), Übergabedokumente, 84 Commits mit Zeitstempeln in 36 Stunden (09.11. 14:29 bis 11.11. 02:23). Nötig: Hypothesen, Metriken (Fehlerquote, Nacharbeit, Konflikte, Zeit je Feature), Vergleich mit einem Referenzprozess, Befragung/Interviews.
  2. **Edge-KI-Messung:** Systematische Messreihe kleiner Modelle auf Smartphones (Tempo, Qualität je Aufgabe „Modell übersetzt, Code rechnet“) mit sauberem Versuchsdesign, mehreren Geräten und Wiederholungen. Das ist Messarbeit, die das Projekt vorbereitet (Tempo-Test, Sheet-Konzept), aber noch nicht leistet.
- **Formale Voraussetzungen** (Zulassung, Betreuer, Studiengang) kann ich nicht beurteilen.

**Reifegrad des Produkts jetzt:** Release-Candidate eines Prototyps; Chat und Server in sich stimmig, Teile am Gerät geprüft (Google-Anbindung, Tempo-Test), der Rest nur simuliert. Für eine Arbeit würde ein „Frozen Release“ mit Gerätetest und Protokoll gebraucht.

## 2 Was „allein, mit KI, ohne viele Quellen“ aussagt

**Belegbar aus den Artefakten:**
- Du hast **nicht den Code geschrieben**, sondern Anforderungen gesetzt, Entscheidungen getroffen, am Gerät getestet, abgenommen und einen Arbeitsprozess für mehrere KI-Instanzen gebaut. Die zentrale Leistung liegt dort, nicht im Programmieren.
- Das Gesamtbild ist **Produktverantwortung plus Prozessgestaltung**: Leitplanken (offline zuerst, „Modell übersetzt, Code rechnet“, alle Regler manuell, Schlüssel nur im Browser), klare Zuständigkeiten (Register, `AUFTRAG_*.md`), Änderungskontrolle für das Fundament, Sperrzeilen, Abnahmestufen, Übergabedokumente, ein unabhängiger Dritter (diese Rolle) als Gegenprobe.
- Die **Prüfdisziplin** ist ungewöhnlich hoch: „nie behaupten, etwas sei auf dem Gerät getestet, was nur simuliert lief“ (`docs/agent/UEBERGABE.md`), Status je Aussage (belegt/vermutet), Messungen mit Grenzen benannt (`KONZEPT.md` 17.2). In meinen Stichproben stimmen Aussage und Befund: Tests laufen grün, die Funde in 5 bis 8 hat das Projekt teils selbst genannt (17.4 Punkt 5).
- Die Domänenbefunde (Android beendet Termux mit Signal 9, Tempo hängt an `num_thread`, Hintergrund-cgroup) stammen aus Messung am Gerät, nicht aus Lehrtext.

**Nicht belegbar oder einzuschränken:**
- „Ohne Quellen“: Die Quellen hat mindestens teilweise die KI für dich gelesen (`SCHNITTSTELLEN.md`, `MODELLQUELLEN.md` tragen Anbieterlinks). Das ist zulässig, aber in einer Arbeit müsstest du **Primärquellen-Kompetenz** getrennt zeigen.
- **Verifikationslücke:** Ein Lauf der Tests beweist, dass Code zu den Tests passt, die dieselbe Werkzeugklasse schrieb. Du kannst das, wie du selbst sagst, nicht gegenlesen. Die sicherheitsrelevanten Teile (Update-Endpunkt, Ursprungsprüfung, Schlüsselablage im Browser, `server.py`) sind von Agenten entworfen und getestet; ein unabhängiges Review hat nicht stattgefunden. Das ist das stärkste Gegenargument gegen „Entwicklerniveau“.
- Das Tempo (36 Stunden Kalenderzeit, nach Commit-Zeitstempeln rund 29 Stunden mit Aktivität) ist mit parallelen Agenten plausibel. Die 16 Stunden eigener Arbeitszeit sind eine Angabe von dir; ich kann sie weder belegen noch widerlegen. Wichtig für die Einordnung: Die Geschwindigkeit sagt etwas über die **Werkzeuge** und die **Steuerung**, nicht über Programmierleistung. Dass es in einem Tag ging, belegt auch, dass das System ohne Pflege schnell veraltet (Befund 4).
- Vorarbeit: „Heinz UI“ (Oktober, mit Gemini) war der Ausgangspunkt; der Verlauf nennt das offen (`docs/agent/ENTWICKLUNGSVERLAUF.md`).

## 3 Qualifikationsprofil (aus den Artefakten abgeleitet)

| Kompetenz | Beleg im Repo | Grenze |
|---|---|---|
| Anforderungs- und Produktarbeit | Beschlüsse, Leitplanken, offene Entscheidungen (`KONZEPT.md` 0, 1, 13, 18 bis 20) | Zielgruppe und Wettbewerb nicht geklärt (Befund 1) |
| Prozess- und Änderungsmanagement | Register, Sperrzeilen, Fundament-Regel, Aufträge, Review-Stufen | Einhaltung nicht belegt (Befund 8), Doku-Überhang (Befund 4) |
| Qualitätssicherung (Denkweise) | Teststrategie, Status „simuliert/Gerät“, Messgrenzen | Keine Automatisierung von dir; keine unabhängige Codeprüfung |
| Technische Dokumentation | `docs/agent/UEBERGABE.md`, `DESIGN.md`, `SCHNITTSTELLEN.md` mit Quellenstatus | Zielgruppe Dritte fehlt |
| Systemverständnis Edge-KI | Messungen, Termux/Android-Fallstricke, Anbieterschicht als Daten (`capabilities.json`) | Einzelmessungen, keine Statistik |
| Datenschutz als Entwurfsprinzip | Online-Schalter, Schlüssel nur im Browser, Beschluss „nie die ganze Datenbank“ | Kein formales Datenschutzkonzept (DSGVO-Frage ist im Freiberufler-Konzept schon aufgetaucht) |
| Programmierung | – | Nicht belegt; du sagst selbst, dass du es nicht kannst |

Daraus folgt kein Titel, aber ein **Profil**: technisch versierter Produkt- und Prozessverantwortlicher mit starker Dokumentations- und Prüfhaltung im Umgang mit KI-Agenten; Entwicklerrolle nicht abgedeckt.

## 4 Einstellung: Rollen und Niveau (Einschätzung, kein Marktdatum)

**Ohne Lebenslauf kann ich nur das Niveau der KI-gestützten Produktarbeit einordnen**, nicht deine Gesamtseniorität. Diese Einordnung ist **mittleres Praktiker-Niveau mit ungewöhnlicher Prozessreife**, aber noch ohne externe Referenz (Team, Kunde, Review). Die Struktur ist die eines erfahrenen Technischen Redakteurs, der sie auf Softwareentwicklung überträgt; das passt zu deinem Beruf.

- **Heute plausibel besetzbar** (Nachweis wäre dieses Repo plus eine saubere Vorstellung): Technischer Redakteur / Docs-as-Code / Dokumentationsmanagement (stärkster Fit); Requirements Engineer oder Business Analyst in kleinen Teams; Product Owner oder technischer Produktmanager im KI-Umfeld (kleines Team, kein Konzern); QA-Koordination und Testmanagement (Strategie, nicht Automatisierung); KI-Einführung im Mittelstand (Prozesse, Prompts, Abnahme, Dokumentation); Knowledge-/Content-Engineering.
- **Heute nicht belegt:** Softwareentwickler (kein Verantwortungsnachweis für Code), ML-Engineer oder Data Scientist (keine Trainings- und Evaluationsstatistik), Security-Rollen.
- **Hürden unabhängig vom Können:** Viele Stellen filtern nach Abschluss oder Nachweis von Teamarbeit; ein öffentliches Repo ohne Lizenz, mit veraltetem README und einem Hub mit „placeholder“ wirkt unfertig. „Problemlos“ wäre zu stark; wahrscheinlich ist: für Rollen mit Dokumentation, Anforderungen und Prozess ja, für Entwicklerrollen nein.
- **Wirkung der KI-Nutzung:** Arbeitgeber werden fragen, was von dir stammt. Die gute Antwort ist hier ungewöhnlich konkret (Leitplanken, Entscheidungen, Prüfprozess), sie muss nur als Fallstudie aufgeschrieben sein.

## 5 Zusammenhänge und Ideen
- **Fallstudie statt Produkt:** Der am besten belegte und zugleich seltenste Teil ist der Prozess (Stränge, Sperre, Fundament, Reviews, Tertius). Als 15-seitige Fallstudie oder Bachelorarbeit mit Auswertung der Commit-Historie (Konflikte, Nacharbeit, Dauer je Strang) wäre er stärker als eine Produktbeschreibung.
- **Didaktik:** Der Lernpfad „frisches Handy bis erstes Gespräch“ (`KONZEPT.md` 18.3) ist als Lehrmaterial tragfähig, weil jeder Schritt benannt ist; es fehlt der Probelauf auf einem frischen Gerät.
- **Zielgruppe zuerst entscheiden:** Das Taschenmesser ist für dich, das Starterkit für andere. Beides mit einer Codebasis ist machbar, mit einer Oberfläche eher nicht (Befund 1).
- **Streichliste bei halber Kraft (Vorschlag):** Medien/Funktionsplätze (Konzept 20), Heimserver, zweite Anbieter jenseits Google, Pixeldisplay-Spielereien. Behalten: Chat, Tempo-Test, Fähigkeitendaten, Assistent.

## 6 Offene Fragen an den Entwickler
1. Wofür soll die Arbeit gelten: Hochschule (welche, welcher Studiengang), Bewerbungsmappe oder Veröffentlichung? Davon hängt ab, was fehlt.
2. Stimmen die 16 Stunden für die jetzige Ausbaustufe (09.11. 14:29 bis 11.11.) oder inklusive Vorarbeit im Oktober? Ich nutze sonst nur die Commit-Zeiten.
3. Wer hat die sicherheitsrelevanten Teile (`server.py`, Update-Endpunkt) geprüft außer den Agenten?
4. Soll `README.md` den Einstieg für Dritte tragen, oder bleibt das dem Assistenten (Konzept 18.3) vorbehalten?
5. Lizenz: Soll das Repo öffentlich nutzbar werden (z. B. MIT/Apache) oder ausdrücklich nicht?

---

# Durchgang 2, 11.11.2026: Produktkandidaten und Kommerzialisierung

**Auftrag:** Überblicken, welche Entwicklungen des Entwicklers sich als eigene Produkte eignen. **Nachtrag zu Durchgang 1:** Hub und Chat („Heinz UI“) sind Arbeitsgrundlage und Testumgebung; die Befunde 5 und 10 und die Teile von 1 und 2, die Aufbau und Beschriftung dieser Seiten bewerten, gelten nicht als Produktbefunde. Beurteilt wird hier nur, was als eigenes Produkt gedacht ist: der spätere schlanke Chat, die Testumgebung als Werkzeug, die Nischen-Apps (INCIheinz), Convert2, das Muster „Modell übersetzt, Code rechnet“ und der Entwicklungsprozess.

**Grenzen:** INCIheinz und Convert2 habe ich nur über `INDEX.md`, `docs/agent/STAND.md` und `KI_KONZEPT.md` gelesen, nicht gebaut oder getestet. Erlöse kann ich nicht schätzen (keine Marktzahlen recherchiert). Rechtliches ist Einschätzung, keine Rechtsberatung. Recherchierte Fakten stehen unten mit Quelle.

## Maßstab (aus den Zielen des Entwicklers)
Offline, kein Konto, keine Werbung, kein Abo; wenig Pflegeaufwand; ein Kern, mehrere Anwendungen; Zuverdienst oder Reputation, nicht sofort Lebensunterhalt.

## Kandidaten

| Kandidat | Reife (nach Dokumenten) | Erlösweg | Hauptrisiko | Einschätzung |
|---|---|---|---|---|
| **INCIheinz** (Lager, Rezeptbuch, Katalog 1053 Stoffe) | höchste: PWA, Testgruppe, KI-Import gebaut (`docs/agent/STAND.md` INCIheinz, 08.11.) | Einmalkauf im Store, Zuverdienst | kleiner Markt, Entdeckbarkeit; Katalog aus Fachbüchern (Rechte, Eigenformulierung); Sicherheits- und Warnhinweise (Haftung); Mehrsprachigkeit EN/ES nicht muttersprachlich geprüft | **Bestes erstes Produkt**, weil am weitesten und billig testbar (Marktbeweis vor Ausbau) |
| **Muster „Modell übersetzt, Code rechnet“** samt Fähigkeitendaten und Testreihen-Läufer (Konzept 19 bis 21) | Konzept und Teile gebaut | Kein Eigenprodukt, sondern **gemeinsamer Kern** der Apps (KI-Import, Schnittstellenwissen, Messläufer) | Wartung der Anbieterdaten (veralten schnell) | Als Baustein behalten, nicht verkaufen |
| **Heinz UI / Testumgebung** | Release Candidate, Gerätetests teilweise | kaum direkt; Reichweite, Reputation, Anleitung, Beratung | Wettbewerb (Apps für lokale Modelle auf dem Handy, z. B. Googles AI Edge Gallery, im Konzept selbst genannt; Wettbewerbsanalyse fehlt); Einrichtung über Termux ist für Laien eine Hürde | **Portfolio- und Reichweitenprodukt**, kein Erlösprodukt |
| **Schlanker Chat** (geplant) | nur Konzept 18.1 | wie oben | gleicher Markt wie viele Chat-Apps; Alleinstellung unklar (offline, Wechsel Lokal/Cloud, Datenschutzstufen) | erst nach Wettbewerbsvergleich entscheiden |
| **Convert2** (Markdown zu ePub/PDF) | Ort „noch zu verschieben“, Stand unbekannt | Gratis-Werkzeug als Türöffner, kaum Erlös | Konkurrenz durch freie Werkzeuge | Beiwerk; passt zum Open-Source-Umstieg und zu Doku-Themen |
| **EPREL-/Label-Werkzeug** (Idee) | nur Idee, zurückgestellt | Software oder Dienstleistung | siehe „Fachlicher Befund“ unten | als **Dienstleistung oder Checkliste** prüfen, nicht als Software, solange der Quellenstand fehlt |
| **Prozess-Playbook** (Stränge, Sperrzeile, Fundament-Regel, Review-Stufen, Tertius-Rolle, Vorlagen) | dokumentiert und im Einsatz (`docs/agent/UEBERGABE.md`, `docs/agent/STAND.md`, `AUFTRAG_*`) | Leitfaden oder Vorlagenpaket, Fallstudie, Beratung | Wirksamkeit bisher nicht gemessen; vor Veröffentlichung von Projektspezifika bereinigen | **Aussichtsreichstes Wissensprodukt**, auch für den Berufsweg (eigene Datei) |
| **Ratgeber „Lokale KI auf dem Handy“** (aus Konzept 18.3 ableitbar) | Material vorhanden (Einrichtungsschritte, Fallstricke, Messungen) | E-Book, Blog, später Kurs | Aktualität, Probelauf auf frischem Gerät fehlt | gut machbar, kleiner bis mittlerer Ertrag |

## Fachlicher Befund zum Label-Werkzeug (recherchiert)
- Das Energielabel nach 2019/2015 gilt für **Lichtquellen**, nicht für Leuchten mit austauschbarer Lichtquelle; solche Leuchten tragen kein Label mehr, vollintegrierte Leuchten gelten als Lichtquellen. Das Labeln nicht erfasster Produkte ist unzulässig (Quellen 1, 2).
- **Händler können das Label selbst aus EPREL herunterladen** (Quelle 1). Der Nutzen eines Werkzeugs „Daten rein, Label raus“ für kleine Händler ist damit kleiner als gedacht; Mehrwert bliebe bei Eigenmarken, Verpackungsdruck und Datenaufbereitung. Der Zuschnitt (wer genau, welcher Schritt) müsste vor jeder Software geklärt werden.

## Voraussetzungen für jede Kommerzialisierung (Hygiene, kein Rechtsrat)
1. **Lizenz** im Repo (`LICENSE` fehlt) und Klärung der Rechte an Katalogdaten und Modellen.
2. **Google Play:** Für private Entwicklerkonten, die nach dem 13.11.2023 erstellt wurden, verlangt Google vor dem Produktionszugriff einen geschlossenen Test mit mindestens 12 Testern, die 14 Tage am Stück angemeldet waren (Quelle 3). Das ist die zeitliche Grenze für „schnell im Store“; die Tester müssen echt sein.
3. **Marktbeweis vor Ausbau:** Landingpage mit Beschreibung, Warteliste oder Vorbestellung, Resonanz in passenden Foren, bevor weitere Nischen-Apps entstehen.
4. **Anbieterpflichten** (Impressum, Datenschutzerklärung, Gewerbeanmeldung, Steuern) vor dem ersten Verkauf klären.

## Reihenfolge (Vorschlag, der Entwickler entscheidet)
1. INCIheinz zum Marktbeweis (Play-Test mit 12 Testern, Landingpage).
2. Prozess-Playbook und Fallstudie (Reputation, Berufsweg).
3. Heinz UI als offenes Projekt mit Lizenz und Einstiegsanleitung.
4. Zurückstellen: Label-Software, Retro-Hardware, Medien/Heimserver, weitere Nischen-Apps vor dem Marktbeweis.

## Offene Fragen
1. Ist INCIheinz oder die Testumgebung das Produkt, an dem du gemessen werden willst?
2. Welche Rechte hast du an den Katalogdaten (Quellen, Eigenformulierung)?
3. Wo liegt Convert2, und in welchem Stand?
4. Soll das Playbook öffentlich (Reichweite) oder als Paket (Erlös) erscheinen?

## Quellen (Stand 11.11.2026)
1. IHK Lippe-Detmold, Energieverbrauchskennzeichnung: https://www.ihk.de/lippe-detmold/system/neue-energieverbrauchkennzeichnung-4327208
2. Ledvance, Überblick SLR/ELR: https://www.ledvance.com/00_Free_To_Use/asset-13083005_eu-gesetzgebung_-_die_elr-slr_im_uberblick.pdf
3. Google Play Console-Hilfe, Testanforderungen für neue private Konten: https://support.google.com/googleplay/android-developer/answer/14151465?hl=de
