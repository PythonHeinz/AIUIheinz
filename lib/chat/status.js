/* lib/chat/status.js – Statusring, Vorladen und Statusabfrage des gewählten Modells (Zustand und Farben aus lib/providers.js, gemeinsam mit dem Dashboard).
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, PV } from './base.js';
import { t } from './i18n.js';
import { state } from './state.js';

// ---- view ----
export function pv() { return PV.get(state.S.provider) || PV.get('ollama'); }
export function ring() {
    var c, k;
    if (state.gen) { c = state.gotTok ? 'green' : 'blue'; k = state.gotTok ? 'stAnswering' : 'stThinking'; }
    else if (state.preAbort) { c = 'orange'; k = 'preLoading'; }
    else if (state.stLast) { c = state.stLast.color; k = state.stLast.key; }
    else { c = 'yellow'; k = 'stHandshake'; }
    var el = $('ring'); el.className = 'ring-btn metal s-' + c;
    el.title = t(k); el.setAttribute('aria-label', 'Hub: ' + t(k));
}
// Like the dashboard: the chosen Ollama model is loaded as soon as the page opens or the model is picked (switch "preload" of the dashboard, default on),
// so the ring turns blue by itself and the first answer does not wait for loading.
export function preload() {
    var s = Heinz.lsGet('heinz_settings', {}) || {};
    if (s.preload === false || state.gen || !state.S.model || !pv().local || (PV.get(state.S.provider) || {}).format !== 'ollama') return;
    var r = PV.runtime(state.S.provider, state.S.model), key = state.S.provider + '|' + state.S.model + '|' + JSON.stringify(r.options);
    if (key === state.preKey) return;
    state.preKey = key;
    if (state.preAbort) state.preAbort.abort();
    var ac = new AbortController(); state.preAbort = ac; ring();
    PV.preload(state.S.provider, state.S.model, ac.signal).then(function () { }, function () { if (state.preKey === key) state.preKey = ''; }).then(function () {
        if (state.preAbort === ac) { state.preAbort = null; ring(); checkStatus(); }
    });
}
export function checkStatus() {
    var prov = state.S.provider, model = state.S.model;
    PV.status(prov, model).then(function (st) { if (prov !== state.S.provider) return; state.stLast = st; ring(); });
}
