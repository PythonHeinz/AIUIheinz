# Lokale Modelle ansprechen – Pflichtregeln für alle Chats und Seiten

Stand 11.11.2026, Beschluss des Entwicklers. Hintergrund: Es hat mehrere Tage gedauert, bis Heinz Chat und Prüfstand auf dem Pixel 9 Pro mit lokalen Modellen schnell antworteten (3–4 s bis zum ersten Zeichen). Diese Grundfunktion darf kein neues Modul, keine neue Chat-Seite und kein Umbau wieder in Frage stellen. Wer ein lokales Modell (Ollama, später auch LiteRT-LM) anspricht, folgt diesen Regeln von Anfang an und prüft die Performance nicht neu.

## Die Regeln

1. **Nur über `lib/providers.js`.** Jede Seite spricht Modelle ausschließlich über `HeinzProviders` an (`chat`, `runtime`, `prepare`, `preload`, `status`, `loaded`, `unload`). Keine eigenen `fetch`-Aufrufe an `/api/chat` oder `/api/generate`, keine eigenen Werte für `num_thread`, `num_ctx` oder `keep_alive`. Ein Test (`tests/test_rules.py`) lässt neue Seiten mit direkten Aufrufen durchfallen. Ältere Seiten, die noch direkt aufrufen (`sheet.html`, `lab.html`, `vitals.html`; im Prüfstand nur Tempo-Test und Testreihen, die absichtlich eigene Werte messen), stehen dort in einer Liste und werden bei Gelegenheit umgestellt.
2. **Laufzeitwerte kommen aus `HeinzProviders.runtime(id, model)`.** Threads pro Modell (im Prüfstand nach Tempo-Test festgelegt, Standard 4, am Pixel 9 Pro meist 2), Kontext (8192) und Haltezeit (`keep_alive` 30 m) gelten für alle Seiten gleich. Weicht eine Anfrage bei Threads oder Kontext ab, lädt Ollama das Modell neu: das kostet Sekunden bis Minuten.
3. **Vor jeder Anfrage `HeinzProviders.prepare(id, model)`.** Es bleibt nur ein Modell im Arbeitsspeicher; alle anderen werden entladen. Mehrere Modelle gleichzeitig bremsen sich aus oder lassen Android Termux beenden.
4. **Eine gemeinsame Modellwahl.** Wer ein Modell wählt, schreibt es mit `HeinzProviders.setActiveModel(provider, model)` und übernimmt beim Start `HeinzProviders.activeModel()` (Schlüssel `heinz_active`). Sonst wirft der Seitenwechsel das Modell aus dem Speicher.
5. **Vorladen nur, wenn nötig: `HeinzProviders.preload(id, model)`.** Es lädt das Modell vorab (Ring orange, danach blau). Es sendet nichts, wenn das Modell schon mit denselben Threads und demselben Kontext geladen ist (`HeinzProviders.loadedWith`). Eigenes Vorladen mit anderem Text überschreibt den Zwischenspeicher von Ollama; die nächste Antwort liest dann den ganzen Gesprächsverlauf neu (30 Sekunden und mehr bei langen Chats).
6. **Seite verlassen bricht die laufende Anfrage ab.** `HeinzProviders.chat` bricht bei `pagehide` die Anfrage selbst ab, die Engine hört auf zu rechnen. Die nächste Seite findet das Modell frei und geladen vor. Eigene Seiten brauchen dafür nichts zu tun, sie dürfen `HeinzProviders.chat` nur nicht umgehen.
7. **Verbindungsstatus über `HeinzProviders.status`.** Ring-Farben und ihre Bedeutung stehen in `lib/providers.js` (rot, gelb, orange, blau), keine eigene Statuslogik.
8. **Der Chat schickt keinen Modus.** Der Prüfstand testet Modelle (Modus, Systemprompt, Regler). Der Heinz Chat schickt nur den Gesprächsverlauf, ohne Systemprompt, und übernimmt vom Prüfstand nur die Laufzeitwerte pro Modell.
9. **Keine Persona-Modelle im Heinz Chat.** Modelle mit Persona im Modelfile (`heinz-fakt`, `heinz-wilson`, allgemein alles, was mit `heinz-` beginnt) gehören zur alten Heinz UI und zum Prüfstand. Der Chat bietet sie nicht an: Ton und Verhalten kommen vom Modell selbst (native Einstellungen), und der lange Persona-Prompt (bei `heinz-fakt` rund 340 Token, etwa 11 s Lesezeit) bremst jede Anfrage. Beschluss des Entwicklers 11.11.2026. Neue Chat-Seiten halten es genauso.
10. **Diagnose:** Das Modellblatt im Heinz Chat zeigt, was Prüfstand und Chat zuletzt an Ollama gesendet haben. Stehen dort unterschiedliche Threads oder Kontextwerte, ist das die Fehlerquelle. `ollama ps` am Handy zeigt, ob das Modell geladen bleibt (gleiche ID, Zeitanzeige „UNTIL“).

## Neue Chat-Seite in fünf Zeilen
```js
var PV = HeinzProviders, rt = PV.runtime(provider, model);
await PV.prepare(provider, model);
await PV.chat(provider, { model: model, messages: msgs, options: rt.options, keepAlive: rt.keepAlive, stream: true, signal: ac.signal, onDelta: fn });
// beim Öffnen und bei Modellwahl: PV.preload(provider, model); Modellwahl speichern: PV.setActiveModel(provider, model)
```

## Wenn etwas langsam ist: nicht an der Laufzeit drehen
Erst prüfen: Termux im Vordergrund (im Hintergrund drosselt Android stark), `ollama ps` (gleiche ID, kein zweites Modell), Modellblatt (Threads, Kontext gleich), Länge des Gesprächs (langer Verlauf heißt lange Lesezeit nach einem Wechsel). Messwerte stehen in `docs/OLLAMA_UND_MODELLE.md`. Änderungen an `runtime`, `prepare`, `preload`, `loadedWith`, `chat` und `heinz_active` gehören zum Fundament: nur ein Chat zur Zeit, vorher den Entwickler fragen.

Gemessen am Gerät ist: gleiche Werte und gemeinsames Modell lassen das Modell beim Seitenwechsel geladen (Gemma und Qwen, 11.11.2026). Noch nicht am Gerät bestätigt: dass das Auslassen des Vorladens die erste Antwort nach dem Wechsel auf 3–4 s bringt.
