# Hinweis des Chat-Strangs an den Konzept-Agenten (11.11.2026)

Stand nach Handytests am Pixel 9 Pro (Google AI Studio, `gemini-3.8-flash`). Alles Folgende ist am Gerät beobachtet, nicht geraten; Messwerte stehen in `docs/SCHNITTSTELLEN.md` 8.1 bis 8.4.

## 1 Native Chat-Anfrage (`generateContent`): vom Entwickler als eines der wichtigsten Themen eingestuft
- Gründe: Die kompatible Route sendet `top_k` nicht, meldet keine Denk-Token einzeln, kennt keine Bild-Ein- und Ausgabe. Die native Route liefert `thoughtsTokenCount`, `topK`, Bilder (`inlineData`) und Denkzusammenfassungen.
- Machbarkeit: Der Browser darf `generativelanguage.googleapis.com/v1beta/models` direkt lesen (CORS ist am Gerät bestätigt, die native Modellliste läuft). Ein nativer Chat-Adapter (`streamGenerateContent`, Schlüssel im Header) in `lib/providers.js` ist ein mittlerer Umbau und sollte der nächste Schritt im Strang Chat sein.
- Danach, als eigener Schritt: Bildausgabe und Bildauswertung. Beschluss des Entwicklers: möglichst in der Chat-Seite, **und/oder** als eigene Seiten auf der Startseite (Hub). Die Chat-Ansicht darf dafür springen, muss aber nicht. Gehört zu den Funktionsplätzen in `docs/KONZEPT.md` 19.

## 2 Denken (am Gerät festgestellt)
- Der Schalter Schnell/Tief wirkt: bei „Tief“ 30 s bis zum ersten Text, rund 5300 Denk-Token.
- Die kompatible Route meldet keine `reasoning_tokens`; `total_tokens` enthält sie aber. Die Seite leitet sie daraus ab (`~`, markiert) und zeigt sie im Chip „Think“. `outputTokens` enthält die Denk-Token demnach **nicht** (Out 165 bei sichtbarer Antwort dieser Länge). Das gilt als Beobachtung eines Laufs; `outputIncludesReasoning` in `lib/capabilities.json` sollte der Modell-Agent nach weiteren Läufen von `unknown` ändern.
- „Schnell“ = `low` für alle Gemini-3-Flash-Versionen (`minimal` wird von 3.8 mit HTTP 400 abgelehnt).

## 3 Verhalten, das erhalten bleiben soll
- Standard offline. Online aus fällt auf Ollama zurück; Online wieder an wechselt nicht von selbst zurück zur Cloud-Engine. Ein gewähltes Modell bleibt je Engine gewählt.

## 4 Export (umgesetzt 11.11.2026, vom Entwickler beschlossen)
Unter **jeder** Antwort der laufenden Sitzung steht ein Knopf „Testprotokoll dieser Antwort kopieren“ (Momentaufnahme zum Sendezeitpunkt: Parameter, Fähigkeiten, gesendeter Body ohne Nachrichtentext und Schlüssel, rohes `usage`, Zeiten, bei Fehlern Status und Meldung). Nach dem Neuladen oder Laden eines gespeicherten Chats gibt es für alte Antworten kein Protokoll mehr. „Parameter kopieren“ in den Einstellungen liefert nur noch Kopfparameter und Modelfile.

## 5 Weiteres, noch nicht gebaut
`heinz.sh` (Server starten und stoppen), Überarbeitung des Schnellmodus (reiner Text, eigene Token-Grenze), API-Vorlagen mit Hilfetexten, `top_k` erst mit der nativen Anfrage wirksam.
