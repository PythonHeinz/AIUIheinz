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
3. Heinz Chat: die dem Chat **zugewiesene Konfiguration** (Engine, Modell, Prompt, Ton), sonst seine Standardkonfiguration.
4. Vorgabe (Standard des Modells bzw. der Seite).

Aussagen für die Praxis:
- Der Heinz Chat wird **allein über die Zuweisung einer Konfiguration** gesteuert (Entscheidung Entwickler 13.11.2026). Den Knopf „In den Chat übernehmen“ gibt es nicht mehr: Er hätte Person und Ton an ein Modell gegeben, das sie nicht annimmt. Zum Ausprobieren im Heinz Chat: Konfiguration speichern, „Im Heinz Chat verwenden“ tippen.
- Ohne zugewiesene Konfiguration gilt die Standardkonfiguration des Heinz Chat.
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
- **Zuweisung zum Heinz Chat** (Knopf „Im Heinz Chat verwenden“ im Dashboard-Menü und auf der Verwaltungsseite, `heinz_chat_config`): Der Chat startet mit der Engine und dem Modell der Konfiguration (online nur bei „Online erlauben“), mit ihrem Prompt und Ton. Zweiter Tipp löst die Zuweisung; danach gilt wieder die Standardkonfiguration des Heinz Chat.
- **Export/Import:** Datei `heinz-configuration` (Format 1, mit Modellname). Import legt immer einen neuen Eintrag an. Export als Ollama-Modelfile oder LM-Studio-Preset: nicht gebaut.

## 6. Konfiguration je Modell und Heinz Chat als eigenes Tool (gebaut 13.11.2026, Stufen a und b, nur simuliert getestet; Auftrag `docs/agent/AUFTRAG_Konfiguration.md`)
- **Zuordnung je Modell:** Im Dashboard-Menü „Dem Modell zuordnen“ (zweiter Tipp löst). Das Modell lädt danach bei jedem Laden mit der Konfiguration (App-Start, Modellwechsel): Person, Prompt, Ton, Laufzeit. Ein Band nennt es und die gesetzte Laufzeit („gilt auch für den Heinz Chat“). Ohne Zuordnung lädt das Modell mit seinem Standard; kam das Kontextfenster von der Konfiguration des vorigen Modells, geht es zurück auf den Standard. Das Dashboard startet weiter auf Heinz.
- **Heinz Chat:** eigenes Tool mit genau einer Konfiguration: der zugewiesenen („Im Heinz Chat verwenden“), sonst der eingebauten **Standardkonfiguration** (nicht löschbar). Er liest das Dashboard nicht; Engine, Modell, Prompt und Ton kommen nur von ihr. Sein Modellblatt ist reine Anzeige (Konfiguration, Engine, Modell, Person, Prompt, Ton, Laufzeit „geteilt, im Dashboard eingestellt“, Status, Link zur Kachel „Konfigurationen“). Hat die Standardkonfiguration noch kein Modell, bietet der Chat einmalig die Modellwahl an und speichert sie dort.
- **Engine nicht erreichbar:** roter Ring und Hinweis im Chat, nie ein stiller Wechsel auf eine andere Engine oder ein anderes Modell.
- **Noch nicht gebaut:** Offline/Online-Mauer mit Rückfrage je Sitzung (Stufe c), Hub-Kachel mit deutlicher Kennzeichnung (Stufe d), Laden über Engine-Grenzen.

## 7. Offen
- Offline/Online-Mauer und Hub-Kachel (Punkt 6); Laden über Engine-Grenzen im Dashboard; Export als Modelfile und LM-Studio-Preset.
- Gestaltung der LED, Farben und Hinweise, was je Person und was nur je Modell gilt: Designer, später.
