/* lib/dashboard/quick.js – Schnellbereich im Parameterfenster.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV } from './base.js';
import { renderModelSheet, renderQuick } from './caps.js';
import { onOnlineToggle, switchProvider } from './engine.js';
import { openLayer } from './menu.js';
import { settings, state } from './state.js';

export function pickEngine(id) {
    const p = PV.get(id), locked = !p.local && !p.custom && !PV.onlineAllowed();
    if (locked) { state.qLockEng = id; renderQuick(); return; }
    state.qLockEng = null;
    if (id !== settings.provider) switchProvider(id); else renderQuick();
}
export function unlockOnline() {
    const id = state.qLockEng; state.qLockEng = null;
    $('online-on').checked = true; onOnlineToggle();
    if (id) switchProvider(id);
}
export function openModelsFromPanel() {
    $('model-search').value = ''; renderModelSheet();
    state.modelFromPanel = $('menu-sheet').classList.contains('open');
    if (state.modelFromPanel) $('model-sheet').classList.add('open'); else openLayer('model-sheet');
}
