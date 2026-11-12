/* lib/dashboard/status.js – Serverstatus und Ring.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV } from './base.js';
import { renderModelSheet, renderQuick } from './caps.js';
import { t } from './i18n.js';
import { renderStatusRow } from './pixelbar.js';
import { settings, state } from './state.js';

// ===== Server Status: Ring rot = Engine nicht erreichbar, orange = Modell laedt, blau = bereit, gruen = antwortet =====
export const hs = {};
let ringBase = { cls: '', color: 'red', title: '' };
export function renderRing() {
    const el = $('status-dot');
    let cls = ringBase.cls, color = ringBase.color, title = ringBase.title;
    if (state.generating) { cls = 'status-active'; color = state.gotToken ? 'green' : 'blue'; title = t(state.gotToken ? 'stAnswering' : 'stThinking'); }
    else if (state.preloadAbort) { cls = 'status-loading'; color = 'orange'; title = t('preLoading'); }
    el.className = 'ring-btn metal status-dot ' + (cls ? cls + ' ' : '') + 's-' + color;
    el.title = title; state.qStatus = title;
    renderStatusRow(title, color); renderQuick();
}
export async function checkServer() {
    const prov = settings.provider;
    // Zustand und Farbbedeutung kommen aus lib/providers.js (PV.status), gleich für alle Tools; Online-Engines werden nie von selbst angefragt
    const st = await PV.status(prov, $('model-select').value, { handshake: !!hs[prov] });
    if (prov !== settings.provider) return;
    const cls = { cloudReady: 'status-cloud', handshake: 'status-loading', asleep: 'status-loading', loaded: 'status-online', engineUp: 'status-online' }[st.code] || '';
    state.loadedNames = prov === 'ollama' ? st.names : [];
    ringBase = { cls: cls, color: st.color, title: t(st.key) };
    renderRing();
    if ($('model-sheet').classList.contains('open')) renderModelSheet();
}
setInterval(checkServer, 3000);
