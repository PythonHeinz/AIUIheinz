# AUFTRAG Speicher (Strang AIUIheinz-Speicher)

Neuer Strang, angelegt 12.11.2026 im Root-Strang. Strangname: **AIUIheinz-Speicher**. Startet **nach** AIUIheinz-Dashboard (dort entsteht die Speicherschicht mit asynchroner Schnittstelle).

## Ziel
IndexedDB einführen, wie in `docs/KONZEPT.md` 20 und `docs/SCHNITTSTELLEN.md` 16 beschlossen und vom Entwickler am 11.11.2026 bestätigt. `localStorage` bleibt nur für kleine Schalter (Thema, Sprache, Online-Haken, aktives Modell, Zustand der Oberfläche). Unterhaltungen, Testreihen und später Medien liegen in IndexedDB.

## Aufgaben
1. **Vor dem Bau lesen:** `docs/KONZEPT.md` 20 (Medien, Speicher), `docs/SCHNITTSTELLEN.md` 16 (Browser-Speicher, Persistenz im Termux-Tab ist dort **vermutet, am Gerät offen**), die Speicherschicht aus dem Strang Dashboard.
2. **Zuerst klären (Entwickler kurz fragen, 2 bis 3 Sätze Vorschlag):** welche Schlüssel nach IndexedDB wandern (`heinz_chats`, `heinz_series`, Prüfprotokolle; Schlüssel für Anbieter bleiben getrennt und nie in Exporten ohne Haken), Aufbau der Speicher (Objektspeicher je Art), Umgang mit Quote und `navigator.storage.persist()`.
3. **Schicht bauen** (`lib/store.js` o. ä., asynchrone API): lesen, schreiben, löschen, Liste, Export, Import. Wenn IndexedDB nicht verfügbar ist (private Fenster, Fehler), **Rückfall auf `localStorage` mit sichtbarem Hinweis**, nicht stilles Verlieren.
4. **Migration:** Beim ersten Start mit der neuen Version vorhandene `localStorage`-Daten kopieren, **erst nach erfolgreicher Prüfung** (Anzahl und Stichprobe) die alten Einträge markieren, nicht sofort löschen (Rückweg offen halten; endgültig löschen erst nach Freigabe in einer späteren Version).
5. **Sicherung und Wiederherstellung** (bestehende Funktionen in `dashboard.html` und Heinz Chat) auf die neue Schicht umstellen; Export/Import bleiben kompatibel mit alten Sicherungsdateien.
6. **Seiten umstellen:** Heinz Chat und Dashboard lesen und schreiben über die Schicht. Bedienung des Dashboards darf nicht spürbar langsamer werden (Wartezeiten messen, nur simuliert).
7. **Tests:** Playwright mit echtem IndexedDB (Chromium): Schreiben, Neuladen, Migration aus altem `localStorage`, Rückfall, Export und Import; Mutation (Migration ohne Kopie) wird erkannt.
8. **Handytest** in `docs/HANDYTEST.md` eintragen: Daten bleiben nach Neustart von Termux und Browser erhalten; Quote und `persist` am Gerät prüfen (offene Annahme aus SCHNITTSTELLEN 16).

## Grenzen
- Fundament (`lib/`, gemeinsame Schlüssel): läuft allein, Zeile unter „Aktive Arbeit“.
- `lib/providers.js` nur lesen. Medienspeicher (Bilder, Audio) ist nicht Teil dieses Auftrags, nur die Struktur so wählen, dass er später dazukommt.
- Nichts als am Gerät geprüft melden, was nur simuliert lief.
