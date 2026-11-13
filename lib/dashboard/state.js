/* lib/dashboard/state.js – Zustand der Seite: `settings` (gespeicherte Einstellungen) und `state` (veränderliche Werte, die mehrere Dateien teilen).
 * ES module (docs/MODULE.md). Leaf: imports nothing, so every other file may import it at any time. Speicherzugriffe: persist.js. */

// Fallback-Liste, solange /api/tags nicht antwortet; danach gilt die echte Liste von Ollama.
export const FALLBACK_MODELS = ['gemma2:2b', 'qwen2.5:3b', 'gemma:2b'];

// Gespeicherte Einstellungen (heinz_settings). Das Objekt wird nie ersetzt, nur geändert; deshalb `export const`.
export const settings = { model: 'gemma2:2b', mode: 'heinz', lang: 'en', params: null, threads: {}, ownPrompt: '', ownOn: false, toneOn: false, preload: true, fast: false, fastN: 300, provider: 'ollama', backend: 'cpu', modelByProvider: {} };

// Veränderlicher Zustand, der von mehreren Dateien gelesen oder gesetzt wird. Wert nie als einzelne `export let`-Bindung (Importe sind schreibgeschützt):
// immer state.feld = wert.
export const state = {
    // Definitionen liegen als Daten in lib/data (modes.json, dashboard.i18n.json, dashboard.json); init.js setzt sie nach dem Laden (HeinzDashboardData).
    // MODE_PRESETS: Modus-Presets (Modell + Sampling, bei kleinen Modellen bewusst polarisiert).
    PROMPTS: { en: {}, de: {} },   // config.js
    MODELS: FALLBACK_MODELS.slice(),   // config.js
    modelsFor: 'ollama',   // config.js
    // Modus = Daten: model (bevorzugt), alt (Ersatz, falls nicht installiert), stop (Stoppsequenzen).
    // Modell ist in jedem Modus frei wählbar (Modus und Modell sind getrennte Angaben).
    MODE_PRESETS: {},   // config.js
    I18N: { en: {}, de: {} },   // i18n.js
    chatHistory: [],   // state.js
    currentAbortController: null,   // state.js
    generating: false,   // state.js
    currentSavedId: null,   // state.js
    currentName: '',   // state.js
    activeAdopted: false,   // state.js
    preloadAbort: null,   // preload.js
    preloadKey: '',   // preload.js
    preloadReady: false,   // preload.js
    loadedNames: [],   // status.js
    speaking: false,   // speech.js
    // Antwort-Kennzahlen getrennt: Denk-Tokens eigener Wert, Quelle (Anbieter oder Schätzung) sichtbar.
    // Solange unklar ist, ob die Ausgabe die Denk-Tokens enthält (outputIncludesReasoning = unknown), wird nichts abgezogen und nichts als vergleichbar ausgegeben.
    lastStats: null,   // messages.js
    // Mehrfachauswahl: langes Druecken auf eine Zeile startet sie, danach waehlt ein Tipp ab oder an. Kein "Alle waehlen" (Beschluss des Entwicklers, 12.11.2026).
    selMode: false,   // conversations.js
    // Update-LED: klein und fein (Raster 2 px, 3x5-Schrift), wie ein kleiner Rechner
    updState: { mode: 'idle', f: 0 },   // update.js
    speedTesting: false,   // speedtest.js
    stRows: [],   // speedtest.js
    stMeta: null,   // speedtest.js
    ST_SHORT: '',   // speedtest.js
    ST_LONG: '',   // speedtest.js
    seriesRunning: false,   // series.js
    srRuns: [],   // series.js
    srMeta: null,   // series.js
    SR_AXES: [],   // series.js
    chipPx: null,   // pixelbar.js
    eqPx: null,   // pixelbar.js
    gotToken: false,   // pixelbar.js
    qStatus: '',   // quick.js
    qLockEng: null,   // quick.js
    modelFromPanel: false,   // quick.js
};

export const selIds = new Set();
