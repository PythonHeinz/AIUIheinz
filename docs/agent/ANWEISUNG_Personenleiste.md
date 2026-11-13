> **Aufgenommen im Root-Strang am 13.11.2026** (Entwickler: Konzept von Tertius gilt, soweit keine Einwände). Die Datei ist unverändert aus `TERTIUS_privat` am PC übernommen (nur diese; `TERTIUS_privat.md` bleibt privat und wird nicht ins Repo kopiert). Verbindlich ist sie zusammen mit den **Präzisierungen des Root-Strangs** in `AUFTRAG_Personen.md` (dort Abschnitt „Root-Entscheidungen“); bei Widerspruch gilt der Auftrag.

# ANWEISUNG Personenleiste, Ton und Chat-Standard (Entwurf zur Aufnahme durch den Root-Strang)

Stand: 13.11.2026. Herkunft: Beschreibung und Beschlüsse des Entwicklers vom 13.11.2026, geordnet von Tertius (nur Dokumentation, nichts im Repo geändert). Status: **Entwurf des Entwicklers; der Root-Strang nimmt ihn in die Planung auf und schreibt daraus Aufträge.** Vorrang hat immer der MVP. Ideen bleiben in `docs/GEPLANT.md`, Aufträge stehen in `STAND.md`.

Geprüft gegen GitHub-Stand `7656ba5` (13.11.2026, 02:16). Aussagen zum Ist-Zustand stammen aus gelesenem Code und Doku; nichts davon wurde ausgeführt.

## 0 Einordnung für den Root-Strang
- Diese Anweisung ist die Regel, die `KONZEPT.md` 23 Punkt 6 für den Workflow „Modell laden, einstellen, übernehmen“ vorsieht (Dashboard stellt ein, Heinz Chat übernimmt). Der Entwickler hat am 13.11.2026, 02:35 beschlossen, sie **jetzt** statt erst nach dem MVP festzulegen, weil sie zum MVP gehört („Hub, Heinz Chat und Dashboard perfekt auf dem Konzept“).
- Bezug zu den vertagten Befunden: **B1** (Chat übernimmt von `heinz_active` nur das Modell und nur bei gleicher Engine): Der Chat-Standard (Abschnitt 6) speichert Engine, Modell, Person und Ton ausdrücklich und liest sie selbst; er übernimmt nicht mehr mittelbar. **B2** (Chat antwortete mit dem Audit-Prompt, Ursache offen): Die Vorschau in Abschnitt 6 macht sichtbar, was der Chat sendet; ob B2 damit behoben ist, ist **nicht geprüft** und bleibt am Gerät zu klären.
- Bezug zum Rückstau `STAND.md` 2a und 2b (Start im Heinz Chat statt Dashboard, Reste „Prüfstand“, Standard `num_thread`, Konfiguration): Alles berührt dieselben Dateien (`lib/dashboard/*`, `dashboard.html`, `lib/store.js`) und sollte **ein** Strang nacheinander erledigen, nicht zwei gleichzeitig. Abschnitt 4 (Standard 2 Threads) erledigt 2b zur Hälfte; die Übertragung zwischen App und Browsertab bleibt bei Abschnitt 7.
- Vorbedingung nach der Projektregel: Eigene Zeile in „Aktive Arbeit“ (Datum, Strangname, Vorhaben, berührte Dateien) vor der ersten Änderung; Fundament-Freigabe des Entwicklers für `lib/providers.js`, `lib/store.js` und die gemeinsamen Schlüssel (Abschnitt 11).

## 1 Ziel
Der Benutzer soll Dashboard und Heinz Chat in wenigen festen Begriffen verstehen: **Modell, Laufzeit, Person, Ton.** Das Dashboard startet immer mit der Person Heinz und der für Modell und Gerät passenden Laufzeit, damit die erste Antwort sofort gut und schnell ist. Der Heinz Chat bleibt der feste Alltags-Chat mit einer eigenen, zurücksetzbaren Konfiguration.

## 2 Begriffe (für `docs/agent/BEGRIFFE.md`, Root entscheidet)
- **Person** (bisher „Modus“): Name, Systemprompt (Haltung, Stimme), Ton-Vorgabe und Ausgabeansicht (Markdown oder Code-Blöcke). Fünf Personen: Heinz, Wilson, Audit, Code, Kreativ. Dazu der Zustand **Nativ** (keine Person).
- **Ton:** Temperatur, top_k, top_p, Wiederholungsstrafe (und was sonst Antwortcharakter steuert, nicht Tempo).
- **Laufzeit:** Threads, Kontext, Engine, GPU. Gehört zu Modell und Gerät, gilt für alle Personen, wird durch Personenwechsel nie verändert.
- **Konfiguration:** Modell + Laufzeit + Person + Ton, benannt und exportierbar (vorgemerkt in `STAND.md` 2a (c)).
- Im Code bleibt der Schlüssel `mode`; geändert werden Oberflächentexte (EN und DE) und BEGRIFFE. Einmalig, nicht schrittweise.

## 3 Personenleiste (zweite Kopfzeile des Dashboards)
- Sechs Buttons von links nach rechts: **Nativ, Heinz, Wilson, Audit, Code, Kreativ.** Gleiche Breite, über die ganze Breite verteilt (wie heute), etwas kleiner als jetzt.
- **Heinz ist eingekreist** und beim Start immer gewählt (nicht der zuletzt benutzte Modus). Nativ steht links daneben und ist der Weg „ganz zum Anfang zurück“.
- **Nur in dieser Kopfzeile** stehen die Namen unter den Buttons; sonst gilt das Farbsystem.
- Nativ = Modell mit Herstellerwerten und ohne Systemprompt. Vorhandene Mechanik prüfen: Quelle „Modell“ in `sysSrc`/`paramSrc` (`lib/dashboard/settings.js`, `params.js`) und `settings.modesOnly`; Ziel ist, dass Nativ ohne Zusatzschalter genau das tut.
- Rücksprung: Jeder Button ist ein fester Rücksprungpunkt. Person gewählt: Ton und Systemprompt auf die **Vorgabe der Person** (`lib/data/modes.json`, `presets`), eigene Änderungen verworfen. Nativ gewählt: **Herstellerwerte des Modells.** Kein Neuladen und kein manuelles Zurücksetzen nötig.
- **Markierung „geändert“ (Beschluss Entwickler 13.11.):** Weicht der **Ton oder der Systemprompt** von der Vorgabe der Person ab, ist das ohne Text erkennbar: Markierungsfarbe und/oder ein Stern (*) in der Ecke des Markierungsrahmens. Sie gilt am Personenbutton und an der Anzeige in den Einstellungen des Dashboards (dort muss beim bloßen Lesen sichtbar sein, was von der Vorgabe abweicht). Zurücksetzen per Tipp auf die Vorgabe dieser Person.
- Laufzeit (Threads, Kontext) bleibt bei Personenwechsel unverändert.
- Bestehende Schlüssel und Fassade bleiben: `settings.mode`, `#mode-select`, `HeinzDashboard`, `ACTIONS`. Die Tests dürfen sich nur in Reihenfolge und Nativ-Zustand ändern.

## 4 Start mit richtiger Laufzeit
- Beim Start und beim Modellwechsel verwendet das Dashboard die gespeicherte Threadzahl **für dieses Modell** (`settings.threads`), nicht einen Globalwert. Ohne gespeicherten Wert: **Standard 2 Threads für lokale Ollama-Modelle** (Beschluss Entwickler 13.11., aus Erfahrung; am Pixel 9 Pro ist 8 am langsamsten, 3 bis 4 etwa doppelt so schnell, in der installierten App stehen 2). Gilt, bis ein Tempo-Test für das Modell einen eigenen Wert liefert; Messwerte trägt der Entwickler in `docs/OLLAMA_UND_MODELLE.md` ein.
- Das Ergebnis des Tempo-Tests wird je Modell und Gerät gespeichert und beim nächsten Laden angewendet. Die Annahme „gilt für alle Ollama-Modelle“ ist nicht belegt und nicht Teil der Anweisung.
- Befund aus `STAND.md` 2b (Browsertab nutzt 8 statt 2 Threads, getrennter Speicher von App und Tab) bleibt offen und wird durch den Konfigurationsexport/-import gelöst, nicht durch Doppelpflege.

## 5 Anzeige für den Benutzer
Die Menü-Schritte, die es heute schon gibt, erscheinen als gleichwertige, überspringbare Blöcke in dieser Reihenfolge: **Modell, Laufzeit (Tempo-Test), Ton, Person (Prompt), Speichern.** Die Person bleibt immer in der Kopfzeile. Kein starrer Assistent, nichts Neues im Menü, solange der MVP nicht erreicht ist. Eine Zusammenfassung zeigt Laufzeit, Person und Ton gemeinsam (eine Zeile je Gruppe), damit der Zusammenhang erkennbar ist.

## 6 Chat-Standard und Auslieferzustand (Heinz Chat)
- Der Heinz Chat liest eine eigene gespeicherte Konfiguration **„Chat-Standard“**, die als Kopie von Heinz beginnt. Sie ändert sich nur durch eine ausdrückliche Handlung: **„Für den Heinz Chat speichern“** mit Vorschau von Modell, Laufzeit, Person und Ton.
- Umsetzung auf vorhandener Mechanik: `applyToChat()` (`lib/dashboard/settings.js`) schreibt heute schon je Modellname Systemprompt und Sampling (`heinz_chat_system`, `heinz_chat_options` über `PV.setChatSystem/setChatSampling`); der Chat liest sie über `chatSystemFor/chatSamplingFor` (`lib/providers.js`). „Kein Eintrag“ bedeutet dort bereits Standard. Neu sind die Vorschau und der Knopf **„Auslieferzustand“**, der die Einträge löscht (Chat fällt auf Heinz-Vorgabe zurück).
- Der **Auslieferzustand ist unveränderlich und gehört zur App-Version.** Liefert eine spätere Version bessere Heinz-Werte, ändert sich die gespeicherte Kopie nicht von selbst; es erscheint der Hinweis „Neuer Auslieferzustand verfügbar“ mit Übernehmen.
- Heinz im Dashboard zu verstellen darf den Chat nie ändern. Die anderen vier Personen sind Prüfbank; sie lassen sich in die Chat-Konfiguration kopieren und sind dann als „geänderter Heinz“ erkennbar.
- **Standard je Modell:** Eine Konfiguration je Modell lässt sich als Standard markieren und wird beim Laden angewendet (setzt das Konfigurationsformat voraus, Abschnitt 7).
- Der Chat lädt dasjenige Modell, das der Benutzer dort bevorzugt; das ist unabhängig vom Dashboard.
- **Cloud-Modelle im Chat-Standard (Beschluss Entwickler 13.11.: Recherche statt Vermutung; Ergebnis unten, Stand 13.11.2026):** Standard ist **„Modellstandard“: keine Sampling-Werte senden** (kein `temperature`, `top_p`, `top_k`, keine Penalties), nur Systemprompt der Person. Gründe aus den Quellen: (a) Google rät bei Gemini 3 ausdrücklich, `temperature` bei 1.0 zu lassen; Absenken könne zu Schleifen und schlechterer Leistung führen. (b) OpenAI: Reasoning-Modelle (o-Reihe, GPT-5-Familie) akzeptieren nur den Standardwert 1 für `temperature`, abweichende Werte enden mit Fehler 400 (Forum und Drittquellen; Stand der Doku prüfen). (c) Claude: Standard 1.0; für neuere Modelle (ab Opus 4.7) berichten Drittquellen, dass `temperature`, `top_p`, `top_k` mit Fehler 400 abgelehnt werden, und für die API-Version vom 21.10.2026 werden die Parameter ganz entfernt (Sekundärquelle, vor Umsetzung an der Anthropic-Doku prüfen). Der Chat darf deshalb einem Cloud-Modell nie einen Ton schicken, den das Modell nicht annimmt; die Regeln in `lib/capabilities.json` (`rules`, Status je Parameter) entscheiden, der Ton-Regler wird sonst ausgegraut mit Grund.
  Was bei Cloud-Modellen auf dem Handy wirklich wirkt, sind **Denkaufwand und Antwortlänge**, nicht der Ton: Bei Gemini 3 ist `thinking_level` standardmäßig `high` (dynamisch, spürbar längere Zeit bis zum ersten Zeichen); Google nennt `low` ausdrücklich passend für Chat und einfache Anweisungen. **Vorschlag für den Chat-Standard bei Gemini 3:** `thinking_level: low` (bei Flash/Flash-Lite ggf. `minimal`), Max-Token mäßig begrenzt. Das ist ein Vorschlag nach Doku, am Gerät mit den Testreihen zu bestätigen. Eine Quelle, die Standardwerte speziell für die Nutzung auf dem Smartphone empfiehlt, wurde nicht gefunden; für Cloud-Modelle spielt das Gerät keine Rolle, nur Latenz (Denkaufwand) und Datenverbrauch (Antwortlänge).
  Threads, Kontext und Engine-Backend gelten nur für lokale Modelle und entfallen im Cloud-Chat-Standard.

## 7 Konfigurationsformat (schon vorgemerkt, `STAND.md` 2a (c))
Benanntes, exportierbares JSON mit Feldnamen von Ollama (`system`, `temperature`, `top_p`, `top_k`, `stop`, `num_ctx`, `repeat_penalty`, `seed`), plus Name, Modell, Person, Laufzeit, Versionsfeld `format`; Export als Ollama-Modelfile und als LM-Studio-Preset (Aufbau vorher an einer echten Datei prüfen). Heinz Chat und Dashboard laden daraus; „Standard je Modell“ und „Chat-Standard“ sind zwei Marken auf Konfigurationen. Berührt Fundament (`lib/store.js`, gemeinsame Schlüssel): Rücksprache mit dem Entwickler.

## 8 Symbole (später, Strang Design)
Köpfe als eigene Symbole der Personen (frei erfunden, keine geschützten Figuren), eine Datei im Sprite `lib/icons.svg`, Eintrag im Design-Katalog (`docs/DESIGN.md` 7). Mindestgröße der Tippfläche etwa 48 px; Name unter dem Symbol in der Kopfzeile, sonst Farbe. Erst nach Abschnitt 3.

## 9 Reihenfolge (Vorschlag)
1. Phase 1: Leiste (Abschnitt 3), Start auf Heinz mit Rücksprung und „geändert“; Tests; Handytest.
2. Phase 2: Laufzeit je Modell beim Start (Abschnitt 4) und Anzeige (Abschnitt 5).
3. Phase 3: Chat-Standard mit Vorschau und Auslieferzustand (Abschnitt 6).
4. Phase 4: Konfigurationsformat und Export (Abschnitt 7).
5. Phase 5: Symbole (Abschnitt 8).
Phase 1 bis 3 gehören zum MVP, Phase 4 und 5 prüft der Root-Strang gegen die MVP-Zeile (Vorschlag: „MVP ist erreicht, wenn … “, höchstens fünf Punkte).

## 10 Tests (sinngemäß; Root und Strang konkretisieren)
- Sechs Buttons in der richtigen Reihenfolge, Heinz beim Start gewählt, Namen nur in der Kopfzeile, keine Überlappung bei 426 × 803 px und in beiden Themes und Sprachen.
- Personenwechsel setzt Ton und Prompt auf die Vorgabe, Nativ auf Herstellerwerte (simuliertes Ollama: gesendete Optionen und Systemprompt prüfen); Laufzeit bleibt.
- „Geändert“ erscheint nach Änderung, verschwindet nach Zurücksetzen.
- Chat-Standard ändert sich nicht durch Dashboard-Änderungen; „Für den Heinz Chat speichern“ ändert genau ein Modell; „Auslieferzustand“ löscht die Einträge.
- Alles bleibt „simuliert“, bis der Handytest läuft (`docs/HANDYTEST.md`).

## 11 Berührt Fundament und andere Stränge
Dashboard (`dashboard.html`, `lib/dashboard/*`), Heinz Chat (`lib/chat/*`), `lib/providers.js` (Chat-Schlüssel), später `lib/store.js` und `lib/icons.svg`. Vorher den Entwickler fragen (Regel „Fundament nur ein Strang“); eigene Zeile in „Aktive Arbeit“.

## 12 Offen (Entwickler entscheidet)
Entschieden am 13.11.: Standard-Threadzahl 2 (Abschnitt 4); „geändert“ gilt für Ton und Systemprompt, ohne Text (Abschnitt 3); Cloud-Chat-Standard = Modellstandard (Abschnitt 6). Offen:
1. `applyToChat` meldet heute „nur Ollama“: Wie wird der Chat-Standard für Cloud-Modelle gespeichert (Modellname je Anbieter, Systemprompt der Person, `thinking_level`, Max-Token)? Der Entwickler entscheidet nach der Rückmeldung des Strangs Modelle (Phase 2 berührt `lib/providers.js`).
2. Den Gemini-Vorschlag (`thinking_level: low`) und die Claude-/OpenAI-Angaben aus Abschnitt 6 vor der Umsetzung an der jeweils aktuellen Anbieterdoku prüfen und in `docs/SCHNITTSTELLEN.md` nachtragen (Quellenangaben unten).
3. ~~Zeitpunkt~~ **Entschieden 13.11., 02:35 (Entwickler): jetzt gleich**, da das Fundament (Phase 2) fertig ist und „Aktive Arbeit“ in `STAND.md` leer war (Stand `7656ba5`). Der Handytest von Phase 2 (`docs/HANDYTEST.md`) steht noch aus; der Root-Strang legt fest, ob er vor Phase 1 oder parallel läuft.

## 12a Quellen der Cloud-Recherche (13.11.2026)
- Google, Gemini 3 Developer Guide (Temperatur 1.0 empfohlen, `thinking_level`, Standard `high`, `low` für Chat): https://ai.google.dev/gemini-api/docs/generate-content/gemini-3
- OpenAI-Community, GPT-5 und Temperatur (nur Standardwert 1, sonst 400; Forum, keine amtliche Doku): https://community.openai.com/t/gpt-5-models-temperature/1337957
- Zusammenstellung der Parameter für OpenAI-Reasoning-Modelle (Drittquelle): https://mixaill76.github.io/auto_ai_router/refs/openai_chat_completions/
- Claude: Standardtemperatur 1.0, Bereich 0 bis 1 (Drittquelle): https://claude-skills-guide-3lc.pages.dev/claude-temperature-settings-guide/
- Claude, Parameter ab Opus 4.7 mit 400 abgelehnt (Drittquelle): https://www.datallmlab.com/blog/can-you-change-claude-temperature.html
- Claude, API-Version 2026-10-21 entfernt `temperature`, `top_p`, `top_k` (Sekundärquelle, ungeprüft): https://smartscope.blog/en/blog/claude-api-2026-10-21-fixing-temperature-removal-2026/
- Projektinterne Vorarbeit: `docs/SCHNITTSTELLEN.md` Abschnitt 1 (Gemini) und `lib/capabilities.json`.

## 13 Nicht im Umfang
Keine neuen Funktionen für Heinz („magische Sonderfunktion“), kein neuer Menüaufbau, kein Assistent, keine Umbenennung von `mode` im Code. Ideen dazu bleiben in `docs/GEPLANT.md`.
