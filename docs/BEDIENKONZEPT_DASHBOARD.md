# Bedienkonzept Dashboard: Person, Prompt, Ton, Laufzeit, Konfiguration

Funktionsbeschreibung (Stand 13.11.2026, Strang Personen). Gestaltung (Farben, Form und Lage der LED) ist ausdrücklich Sache des Designers und hier nicht festgelegt. Begriffe: `docs/agent/BEGRIFFE.md`. Handytest A bis M bestanden (Entwickler, 13.11.2026); die automatischen Tests laufen weiter nur simuliert.

## 1. Das Gerätebild
Das Dashboard ist ein Bedienfeld mit **drei getrennten Blöcken** und je einer LED für „weicht von der Vorgabe ab“:

| Block | Inhalt | Gilt für | LED und Reset |
|---|---|---|---|
| **Prompt** | Anweisungstext an das Modell | aktuelle Person | Reiter „Prompt“ leuchtet, Reset im Reiter |
| **Ton** | Temperatur, Top-p, Top-k | aktuelle Person | Reiter „Ton“ leuchtet, Reset im Reiter |
| **Laufzeit** | Kontextfenster, Threads | jede Person, je Modell | Überschrift leuchtet, eigener Reset |

- **Person** hat selbst keinen Zustand, sie ist nur die Auswahl der Vorgaben für Prompt und Ton (Nativ, Heinz, Wilson, Audit, Code, Kreativ). Die LED am Personenknopf ist eine Sammelanzeige: Prompt oder Ton weichen ab.
- **Vorgabe** = der Standard der gewählten Person. Bei **Nativ** ist die Vorgabe der Standard des Modells: kein Prompt, kein Ton, nur `num_ctx` wird immer gesendet. Ein Regler oder ein eigener Prompt macht daraus „geändert“.
- **Zurücksetzen:** Reset im Reiter (nur dieser Block), Reset bei Laufzeit (nur Laufzeit), erneutes Tippen auf die aktive Person (Prompt und Ton). Ein Reset ändert nie den jeweils anderen Block.
- **Personenwechsel** verwirft Änderungen an Prompt und Ton ohne Rückfrage; die letzten Änderungen bleiben als „Letzter Stand“ erhalten (Punkt 3).

## 2. Was gilt wann (Beantwortung „was wird gesendet?“)
Reihenfolge der Quellen, höchste zuerst:
1. Quelltext-Feld und Eingabe (nur für die Anfrage).
2. Dashboard: aktueller Stand der Blöcke (Person-Vorgabe oder Änderung).
3. Heinz Chat: die dem Chat **zugewiesene Konfiguration** (Engine, Modell, Prompt, Ton).
4. Vorgabe (Standard des Modells bzw. der Seite).

Aussagen für die Praxis:
- Der Heinz Chat wird **allein über die Zuweisung einer Konfiguration** gesteuert (Entscheidung Entwickler 13.11.2026). Den Knopf „In den Chat übernehmen“ gibt es nicht mehr: Er hätte Person und Ton an ein Modell gegeben, das sie nicht annimmt. Zum Ausprobieren im Heinz Chat: Konfiguration speichern, „Im Heinz Chat verwenden“ tippen.
- Ohne zugewiesene Konfiguration gilt die Vorgabe der Seite.
- Die **Laufzeit** einer Konfiguration setzt nur das Dashboard beim Laden. Der Heinz Chat schreibt sie nie in die geteilte Laufzeit.
- Ohne Haken „Online erlauben“ geht keine Anfrage nach außen; eine zugewiesene Online-Konfiguration bleibt dann unwirksam.

## 3. Letzter Stand (Arbeitsname)
Das Dashboard merkt sich je **Person und Modell** den zuletzt geänderten Prompt und Ton (`settings.lastStand`). Es wird beim Zurücksetzen und beim Personenwechsel automatisch gesichert; der Knopf „Letzter Stand laden“ holt ihn zurück. Es ist kein Archiv: je Person und Modell gibt es einen Eintrag.

## 4. Entfallen: „In den Chat übernehmen“
Am 13.11.2026 entfernt (Dashboard-Knopf, Funktion und Texte). Alte Schnappschuss-Einträge im lokalen Speicher (`heinz_chat_system`, `heinz_chat_options`) bleiben liegen; der Heinz Chat selbst kann sie weiter lesen und seine eigenen Felder dort ablegen, solange keine Konfiguration zugewiesen ist.

## 5. Konfiguration
Benannter, gespeicherter Satz: Engine, Modell, Person (als Ausgangspunkt), Prompt, Ton, Laufzeit. Keine Höchstzahl.
- **Dashboard** (Menü, Block „Konfiguration“): Name eingeben, „Speichern“ (gleicher Name, Modell und Engine ersetzt den alten Eintrag); in der Auswahl wählen und „Laden“. Laden setzt Person, Prompt, Ton und Laufzeit; Modell und Engine nur innerhalb der aktuellen Engine, sonst Hinweis. Ein Nativ-Eintrag speichert „kein Prompt, kein Ton“.
- **Startseite → Einrichten → Konfigurationen:** zentrale Verwaltung (umbenennen, zuweisen, exportieren, importieren, löschen mit zweitem Tipp).
- **Zuweisung zum Heinz Chat** (Knopf „Im Heinz Chat verwenden“ im Dashboard-Menü und auf der Verwaltungsseite, `heinz_chat_config`): Der Chat startet mit der Engine und dem Modell der Konfiguration (online nur bei „Online erlauben“), mit ihrem Prompt und Ton. Zweiter Tipp löst die Zuweisung; danach gilt wieder die Vorgabe.
- **Export/Import:** Datei `heinz-configuration` (Format 1, mit Modellname). Import legt immer einen neuen Eintrag an. Export als Ollama-Modelfile oder LM-Studio-Preset: nicht gebaut.

## 6. Zielbild des Entwicklers (13.11.2026, noch nicht gebaut)
Leitgedanke: **Die Konfiguration gehört zum Modell und enthält alles** (Engine, Modell, Laufzeit, Person als Startpunkt, Prompt, Ton). Die Person ist nur eine Vorlage zum Ausprobieren; was der Entwickler dabei lernt, wird für das Modell als Konfiguration festgehalten und gilt dann im Dashboard, im Heinz Chat und (per Export) in anderen Anwendungen. Der Heinz Chat wird nur über Konfigurationen gesteuert (Abschnitt 4).

Regeln:
1. **Modell mit zugeordneter Konfiguration:** wird nach jedem Neustart automatisch mit ihr geladen, samt Person und deren Einstellungen, auch der Laufzeit. Erst das Entfernen der Zuordnung bringt wieder den Standard, ohne zuletzt geänderte Parameter.
2. **Modell ohne Konfiguration:** lädt mit seinem Standard; das Dashboard startet im Heinz-Modus.
3. **Heinz Chat ohne zugewiesene Konfiguration:** lädt den Auslieferungsstandard. Dafür gibt es eine **Standardkonfiguration für den Heinz Chat**, die immer vorhanden ist und nicht gelöscht werden kann (sichtbar oder unsichtbar, noch festzulegen). „Zuweisung lösen“ heißt: zurück auf diese Standardkonfiguration.

Heute gebaut: genau **eine** Zuweisung an den Heinz Chat; ohne sie gilt die Vorgabe im Code der Chat-Seite, die Laufzeit der Konfiguration übernimmt der Chat nicht.

Offene Fragen vor dem Bau (berührt gemeinsamen Speicher `lib/providers.js` und den Heinz Chat; Tertius-Prüfung steht an):
- Standardkonfiguration des Heinz Chat hat kein festes Modell (gilt für das jeweils aktive); sichtbar mit Schloss oder unsichtbar, änderbar oder nur kopierbar?
- Gibt es für ein Modell mehrere benannte Konfigurationen, von denen eine als Zuordnung gilt? Und was gewinnt im Heinz Chat, wenn sowohl eine Zuweisung an den Chat als auch eine Zuordnung des Modells besteht?

## 7. Offen
- Zuordnung je Modell (Punkt 6); Laden über Engine-Grenzen im Dashboard; Export als Modelfile und LM-Studio-Preset.
- Gestaltung der LED, Farben und Hinweise, was je Person und was nur je Modell gilt: Designer, später.
