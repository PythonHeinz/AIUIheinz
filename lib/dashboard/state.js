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
// Speicherprobleme (IndexedDB nicht nutzbar, voll, Umzug fehlgeschlagen) stehen sichtbar in einem Hinweisband; die Info-Seite zeigt den Zustand.
const STORE_MSG = { fallback: 'stFallback', quota: 'stQuota', write: 'stWrite', migrate: 'stMigrate', nearfull: 'stNearfull' };
let storeProblems = [];
function showStoreProblem(p) {
    if (!storeProblems.some(function (q) { return q.code === p.code; })) storeProblems.push(p);
    renderStoreNote();
}
function renderStoreNote() {
    const el = $('store-note'); if (!el) return;
    el.hidden = !storeProblems.length;
    el.textContent = storeProblems.map(function (p) { return t(STORE_MSG[p.code] || 'stWrite'); }).join(' ');
}
function fmtBytes(n) { return n === null || n === undefined ? t('stUnknown') : n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : (Math.max(n, 0) / 1e6).toFixed(n < 1e7 ? 1 : 0) + ' MB'; }
function renderStoreStatus() {
    const el = $('store-status'); if (!el) return;
    HeinzStore.status().then(function (i) {
        el.textContent = t('stTitle') + ': ' + t('stLine', { b: t(i.backend === 'indexeddb' ? 'stIdb' : 'stLs'), p: i.persisted === null ? t('stUnknown') : t(i.persisted ? 'stYes' : 'stNo'), u: fmtBytes(i.usage), q: fmtBytes(i.quota) });
    });
}
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
