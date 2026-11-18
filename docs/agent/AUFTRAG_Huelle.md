# Auftrag AIUIheinz-Huelle (Konzept, noch nicht begonnen)

Stand: 19.11.2026. Vorbereitung für später, auf Wunsch des Entwicklers. Es wird nichts gebaut, bevor der Entwickler den Strang startet und die offenen Fragen unten beantwortet.

## Anlass
Beim Test von docHeinz (Phase 2c) legte Chrome auf dem Pixel 9 Pro bei jeder Markierung sein eigenes Feld „Tap to Search“ unten über die Seite und sein Auswahlmenü (Kopieren, Alles auswählen) über die Markierung. Eine Seite kann beides nicht abschalten (Chrome-Funktionen außerhalb der Seite). Behelf heute: Leiste oben statt unten; Chrome-Einstellung „Tap to Search“ ausschalten. Weitere Eigenheiten, die in Chrome nicht in der Hand der Seite liegen: Auswahlmenü, Zurück-Taste, Vollbild, Leiste der Adresszeile, Autoscroll bei Markierungen, Hintergrund-Drosselung.

## Ziel
Eine schlanke Android-Hülle („Store App“ aus der Projektbeschreibung), die dieselben HTML-Seiten zeigt, ohne dass Chrome dazwischen steht. Die Seiten bleiben eigenständige HTML-Dateien ohne Build; die Hülle ersetzt nur den Browser.

## Optionen
| Option | Was | Kontrolle | Aufwand | Hinweis |
|---|---|---|---|---|
| A | Als Web-App auf den Startbildschirm (PWA aus Chrome) | gering: gleiche Chrome-Engine, Wirkung auf Tap to Search ungeklärt | sehr klein | schneller Test, zuerst probieren |
| B | Eigene kleine App mit Android-WebView (Kotlin, ein Fenster) | hoch: eigenes Auswahlmenü (Erklären/Suchen im Menü), Zurück-Taste, Vollbild, kein Chrome-Suchfeld | mittel | bevorzugt, kein Fremd-Framework |
| C | Capacitor (Web-Hülle mit Plugins) | hoch, dazu Plugin-System | mittel bis hoch, Node und Build nötig | widerspricht „ohne Build“ nur für die Hülle, nicht für die Seiten |
| D | TWA (Trusted Web Activity) | wie A: läuft in Chrome | klein | keine Lösung des Anlasses |

Empfehlung (vorläufig): A als Zehn-Minuten-Test, dann B. C nur, wenn Plugins (Dateizugriff, Benachrichtigungen) gebraucht werden.

## Was die Hülle können müsste
1. Seiten laden: von `http://localhost:3000` (Termux-Server) und später gebündelt aus der App (offline ohne Termux). Zu prüfen: Android blockiert unverschlüsselten Verkehr standardmäßig; Ausnahme für `localhost` per Netzwerk-Sicherheitskonfiguration nötig.
2. Engines ansprechen: Ollama (`:11434`), LiteRT-LM (`:9379`) aus der Seite; CORS wie heute. Zu prüfen: Verhalten der WebView bei diesen Anfragen.
3. Auswahlmenü: Einträge „Suchen“, „Erklären“, „Zusammenfassen“ im Android-Menü der Markierung (Rückruf der Textauswahl der WebView), die den markierten Text an die Seite geben. Die Seite behält ihre eigene Leiste als Rückfall im Browser.
4. Zurück-Taste an die Seite geben (heute `popstate` im Reader und im Analyse-Fenster).
5. Dateien: Bücher und Bilder wählen (Dateidialog der WebView), Speichern/Teilen aus der Seite.
6. Hintergrund: Verhalten beim App-Wechsel prüfen (Anfragen laufen weiter oder brechen ab, siehe `docs/LOKALE_MODELLE.md`, Regel 6).
7. Keine Anfrage nach außen ohne „Online erlauben“: die Hülle darf nur Adressen auf diesem Gerät laden, sonst Sperre.

## Offene Fragen an den Entwickler
- Wie wichtig ist „ohne Termux“ (gebündelte Seiten, eigener Server in der App) gegenüber „Seiten kommen vom Termux-Server“?
- Soll die App in den Play Store oder reicht eine APK zum Installieren (Seitenladen/Signieren)?
- Brauchst du die Hülle auch auf dem PC (Desktop-Fenster) oder nur am Handy?
- Wer baut und signiert: auf dem PC mit Android Studio oder in einem Container (Android-SDK dort evtl. nicht erreichbar, Netz-Allowlist prüfen)?

## Risiken
- Der Container erreicht weder Gerät noch Termux; die Hülle lässt sich dort nur bauen, nicht testen. Jede Prüfung läuft am Handy.
- Android-SDK und Gradle brauchen Netz (Allowlist): evtl. nur am PC baubar.
- Pflegeaufwand: WebView-Versionen, Android-Updates, Signaturschlüssel sicher verwahren (nie im Repo).
- Eine zweite Auslieferung neben der Web-Fassung: Seiten dürfen nicht von der Hülle abhängig werden (Rückfall im Browser bleibt).

## Vorgehen (wenn gestartet)
1. Konzeptabnahme mit dem Entwickler (Fragen oben).
2. Test A (PWA) am Handy: verschwindet das Chrome-Feld? Ergebnis in dieses Dokument.
3. Minimal-App B: ein Fenster, lädt `localhost:3000`, Zurück-Taste, Vollbild, kein Auswahlmenü. Handytest.
4. Auswahlmenü mit Brücke zur Seite (docHeinz zuerst, dann Heinz Chat und andere).
5. Gebündelte Seiten und Offline ohne Termux (nur wenn gewünscht).
6. Dokumentation in `STAND.md`, `TECHNIK.md`; Hinweise für Handytest.

## Nicht im Umfang
Änderungen an `lib/*`, `server.py` oder gemeinsamen Schlüsseln (Fundament, nur auf Freigabe); Play-Store-Veröffentlichung; Konten und Online-Dienste; Änderung der Seiten außer einer kleinen, optionalen Brücke für das Auswahlmenü.
