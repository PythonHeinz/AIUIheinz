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
    var r = PV.chatRuntime(state.S.provider, state.S.model), key = state.S.provider + '|' + state.S.model + '|' + JSON.stringify(r.options);
    if (key === state.preKey) return;
    state.preKey = key;
    if (state.preAbort) state.preAbort.abort();
    var ac = new AbortController(); state.preAbort = ac; ring();
    PV.preload(state.S.provider, state.S.model, ac.signal, PV.chatConfig().runtime).then(function () { }, function () { if (state.preKey === key) state.preKey = ''; }).then(function () {
        if (state.preAbort === ac) { state.preAbort = null; ring(); checkStatus(); }
    });
}
export function checkStatus() {
    var prov = state.S.provider, model = state.S.model;
    if (!model) { state.stLast = null; engineHint(null); onlineAsk(null); ring(); return; }   // first start: no model yet, nothing to ask
    PV.status(prov, model).then(function (st) { if (prov !== state.S.provider) return; state.stLast = st; ring(); engineHint(st); onlineAsk(st); });
}
// Wall offline/online: a configuration with an online engine while "Allow online" is off sends nothing. The chat asks once per opening whether online may be used
// for this session; "yes" is kept for the session only (sessionStorage) and does not switch the global setting. Local configurations never ask.
export function onlineAsk(st) {
    var el = $('online-ask'), ask = !!st && st.code === 'cloudOff' && !state.askNo;
    el.hidden = !ask;
    if (ask) { $('ask-t').textContent = t('askOnline'); $('ask-yes').textContent = t('askYes'); $('ask-no').textContent = t('askNo'); }
}
export function onlineAnswer(yes) {
    if (yes) { PV.setSessionOnline(true); state.preKey = ''; } else state.askNo = true;
    $('online-ask').hidden = true; checkStatus(); if (yes) preload();
}
// Engine not reachable (or online not allowed / key missing): red ring plus a plain hint. Never a silent switch to another engine or model.
function engineHint(st) {
    var el = $('eng-note'), red = !!st && st.color === 'red';
    el.hidden = !red || st.code === 'cloudOff' && !state.askNo;   // while the question is open, it says the same
    if (red) el.textContent = t('hint_' + st.code, { e: pv().name });
}
