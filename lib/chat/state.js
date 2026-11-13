/* lib/chat/state.js – Zustand des Heinz Chat (ein Objekt `state`, siehe docs/MODULE.md).
 * ES module. Leaf: imports nothing. `main.js` füllt S, chats, cur und msgs aus dem Speicher, nachdem HeinzStore.open() fertig ist. */

// Veränderlicher Zustand, der von mehreren Dateien gelesen oder gesetzt wird. Wert nie als einzelne `export let`-Bindung (Importe sind schreibgeschützt):
// immer state.feld = wert.
export const state = {
    S: null,   // Seitenzustand: provider, model (immer aus cfg), chat (Schlüssel heinz_slim; nur `chat` wird gelesen)
    cfg: null,   // Konfiguration, mit der der Heinz Chat läuft (zugewiesene oder eingebaute Standardkonfiguration)
    engNote: false,   // das Hinweisband zeigt gerade den Hinweis „Engine nicht erreichbar“
    chats: [],   // gespeicherte Unterhaltungen (heinz_slim_chats)
    cur: null,   // aktuelle Unterhaltung (Eintrag aus chats) oder null
    msgs: [],   // Nachrichten der aktuellen Unterhaltung
    gen: false,   // eine Antwort läuft
    abort: null,   // AbortController der laufenden Antwort
    modelsList: [],   // Modelle der gewählten Engine
    modelsFor: '',   // Engine, zu der modelsList gehört ('' = wird geladen)
    stLast: null,   // letztes Ergebnis der Statusabfrage (Farbe, Text) für den Statusring
    gotTok: false,   // erstes Token der Antwort ist da
    preAbort: null,   // AbortController des laufenden Vorladens
    selMode: false,   // Mehrfachauswahl in der Unterhaltungsliste
    selIds: new Set(),   // gewählte Unterhaltungen
    preKey: '',   // Schlüssel (Engine, Modell, Optionen) des zuletzt gestarteten Vorladens
};
