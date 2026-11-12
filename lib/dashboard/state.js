/* lib/dashboard/state.js – Zustand und Speicherzugriffe der Seite (Speicher: lib/store.js).
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

// ===== Zustand =====
let chatHistory = [];        // {role, content, note?}
let currentAbortController = null;
let generating = false;
let currentSavedId = null, currentName = '';
let settings = { model: 'gemma2:2b', mode: 'wilson', lang: 'en', useDefault: false, params: null, threads: {}, ownSystem: false, sysSrc: 'mode', ownPrompt: '', modesOnly: false, preload: true, fast: false, fastN: 300, provider: 'ollama', backend: 'cpu', modelByProvider: {} };

// ===== Speicher: lib/store.js (HeinzStore) =====
let activeAdopted = false;   // before the first adoption the default model must not overwrite the shared choice
function saveSettings() { HeinzStore.set('heinz_settings', settings); if (activeAdopted) PV.setActiveModel(settings.provider, settings.model); }

function persistCurrent() {
    updateChatBar();
    if (!chatHistory.length) { HeinzStore.remove('heinz_current'); return; }
    HeinzStore.set('heinz_current', {
        model: settings.model,
        provider: settings.provider,
        mode: settings.mode,
        messages: chatHistory,
        context: document.getElementById('context').value,
        savedId: currentSavedId,
        name: currentName
    });
}
