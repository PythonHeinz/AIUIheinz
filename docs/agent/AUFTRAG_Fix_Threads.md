# AUFTRAG Fix Threads (Strang „AIUIheinz-Fix-Threads“)

Korrektur-Strang, angelegt 11.11.2026 im Root-Strang. Nur das gemeldete Problem beheben, einen Eintrag in `docs/agent/ENTWICKLUNGSVERLAUF.md` ergänzen, keine Struktur ändern.

## Problem (Handytest des Entwicklers, 11.11.2026)
Lokale Ollama-Modelle antworten im neuen **Heinz Chat** (`tools/heinz/index.html`) deutlich langsamer als im **Prüfstand** (`chat.html`). Cloud-Modelle antworten schnell, Modellwahl für Ollama und eigene OpenAI-kompatible Engine funktioniert.

## Vermutete Ursache (aus dem Code, noch nicht am Gerät geprüft)
- Der Prüfstand sendet an Ollama immer `options.num_thread` (`chat.html`, `threadsFor(model)`, Wert aus `heinz_settings.threads[Modell]`, Standard 4, aus dem Tempo-Test übernehmbar, 0 = Engine-Standard).
- Der Heinz Chat ruft `PV.chat(S.provider, { model, messages, stream, signal, onDelta })` **ohne `options`** auf (`tools/heinz/index.html`, Funktion beim Senden, rund Zeile 214). Ollama nimmt dann seinen eigenen Thread-Standard; gemessen (KONZEPT 17.2, OLLAMA_UND_MODELLE) ist der auf dem Pixel 9 Pro schlecht (8 Threads unbrauchbar, 2 am besten). Weitere Unterschiede (Kontext, Temperatur, `keep_alive`, Vorladen) sind möglich.

## Ziel
Ein lokales Ollama-Modell läuft im Heinz Chat so schnell wie im Prüfstand mit denselben Einstellungen.

## Vorgehen
1. Vor dem Bau: im Prüfstand dasselbe Modell mit Threads 0 messen (bestätigt oder widerlegt die Vermutung; Entwickler macht das am Handy). Ohne Bestätigung nichts anderes vermuten, sondern auch `num_ctx`, `keep_alive` und die gesendeten Optionen beider Seiten vergleichen (Testprotokoll des Prüfstands zeigt, was gesendet wurde).
2. Im Heinz Chat bei `S.provider === 'ollama'` die Optionen mitsenden, die der Prüfstand für dieses Modell nutzt: mindestens `num_thread` aus `heinz_settings.threads[S.model]` (lesen, nicht neu erfinden; gleicher Standard 4; 0 oder fehlend = nichts senden, wie im Prüfstand). Lesen über `Heinz.lsGet('heinz_settings', {})`. Gemeinsamen Code aus `lib/` nutzen, falls schon vorhanden; eine kleine neue Hilfsfunktion in `lib/core.js` ist erlaubt, weil Prüfstand und Heinz Chat sie teilen sollen (dem Entwickler vorher sagen).
3. Nur für Ollama; Cloud und eigene OpenAI-Engines unverändert (`capSendable('num_thread')` beachten, `lib/capabilities.json`).
4. Der Heinz Chat schreibt Threads nicht selbst; der Wert wird weiter im Prüfstand (Regler, Tempo-Test) gepflegt. Ein Hinweis im Schnellblatt „Threads: wie im Prüfstand, Modell X: n“ ist optional und nur mit EN und DE.
5. Test: Seitentest mit simuliertem Ollama (Route `**/localhost:11434/**`): `num_thread` steht im Request, wenn in `heinz_settings.threads` gesetzt; fehlt bei 0; fehlt bei Cloud. Mutation: Zeile entfernen, Test muss rot werden. `bash tests/run_all.sh` grün.
6. Nicht behaupten, es sei am Gerät schneller, solange nur simuliert getestet ist. Messung nennt der Entwickler; Wert in `docs/OLLAMA_UND_MODELLE.md` eintragen.

## Berührt
`tools/heinz/index.html`, ggf. `lib/core.js`, Tests. **Nicht** `chat.html`, `server.py`, Engine-Aufrufe in `lib/providers.js` (nur lesen). Berührt der Eingriff `lib/providers.js` doch, vorher dem Entwickler sagen und fragen.

## Fertig, wenn
Heinz Chat und Prüfstand senden für dasselbe Ollama-Modell dieselben Thread-Optionen, Tests grün, Eintrag in `docs/agent/ENTWICKLUNGSVERLAUF.md`, nach `main` gepusht; Entwickler misst am Handy.

## Nebenbefund (nur melden, nicht bauen)
Der Cursor im Heinz Chat ist blau-violett; ob er die Farbe des Heinz-Logos oder des Modus zeigen soll, ist offen und gehört in den Design-Strang.
