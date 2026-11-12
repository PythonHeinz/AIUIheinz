/* lib/dashboard/persist.js – Speicherzugriffe der Seite: Hinweisband bei Speicherproblemen, Info-Zeile, Einstellungen und aktuelle Unterhaltung sichern (Speicher: lib/store.js).
 * ES module (docs/MODULE.md). */

import { $, HeinzStore, PV } from './base.js';
import { updateChatBar } from './caps.js';
import { t } from './i18n.js';
import { settings, state } from './state.js';

// ===== Speicher: lib/store.js (HeinzStore) =====
// Speicherprobleme (IndexedDB nicht nutzbar, voll, Umzug fehlgeschlagen) stehen sichtbar in einem Hinweisband; die Info-Seite zeigt den Zustand.
const STORE_MSG = { fallback: 'stFallback', quota: 'stQuota', write: 'stWrite', migrate: 'stMigrate', nearfull: 'stNearfull' };
let storeProblems = [];
export function showStoreProblem(p) {
    if (!storeProblems.some(function (q) { return q.code === p.code; })) storeProblems.push(p);
    renderStoreNote();
}
export function renderStoreNote() {
    const el = $('store-note'); if (!el) return;
    el.hidden = !storeProblems.length;
    el.textContent = storeProblems.map(function (p) { return t(STORE_MSG[p.code] || 'stWrite'); }).join(' ');
}
function fmtBytes(n) { return n === null || n === undefined ? t('stUnknown') : n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : (Math.max(n, 0) / 1e6).toFixed(n < 1e7 ? 1 : 0) + ' MB'; }
export function renderStoreStatus() {
    const el = $('store-status'); if (!el) return;
    HeinzStore.status().then(function (i) {
        el.textContent = t('stTitle') + ': ' + t('stLine', { b: t(i.backend === 'indexeddb' ? 'stIdb' : 'stLs'), p: i.persisted === null ? t('stUnknown') : t(i.persisted ? 'stYes' : 'stNo'), u: fmtBytes(i.usage), q: fmtBytes(i.quota) });
    });
}
export function saveSettings() { HeinzStore.set('heinz_settings', settings); if (state.activeAdopted) PV.setActiveModel(settings.provider, settings.model); }
export function persistCurrent() {
    updateChatBar();
    if (!state.chatHistory.length) { HeinzStore.remove('heinz_current'); return; }
    HeinzStore.set('heinz_current', {
        model: settings.model,
        provider: settings.provider,
        mode: settings.mode,
        messages: state.chatHistory,
        context: document.getElementById('context').value,
        savedId: state.currentSavedId,
        name: state.currentName
    });
}
