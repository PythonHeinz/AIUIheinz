/* lib/chat/model.js – Modellblatt: Engine und Modell wählen, Systemprompt und Laufzeit anzeigen, Modelle laden.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, PV, esc } from './base.js';
import { save } from './conversations.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { head, renderLog } from './view.js';

// ---- model sheet ----
function engineOk(p) { return p.local || (PV.onlineAllowed() && (!p.needsKey || PV.getKey(p.id))); }
// what this chat sends to Ollama for the chosen model (same rule and same stored values as the dashboard; kept on the dashboard page)
function runtimeNote() {
    var r = PV.runtime(state.S.provider, state.S.model), o = r.options, el = $('rt-h');
    if (!state.S.model || !r.keepAlive) { el.textContent = ''; return; }
    var lr = PV.lastRequests(), fmt = function (x) { return x ? x.model + ': ' + t('rtT') + ' ' + (x.threads === null ? t('rtDef') : x.threads) + ', ' + t('rtC') + ' ' + (x.ctx === null ? t('rtDef') : x.ctx) + ', ' + new Date(x.ts).toTimeString().slice(0, 8) : '–'; };
    el.textContent = t('rtH', { n: o.num_thread || t('rtDef'), c: o.num_ctx || t('rtDef'), k: r.keepAlive }) + '\n' + t('rtLast') + '\n' + t('rtB') + ' ' + fmt(lr.bench) + '\n' + t('rtCh') + ' ' + fmt(lr.chat);
}
export function sysNote() {
    $('sys-l').textContent = t('sysL'); $('sys-reset').textContent = t('sysReset'); $('sys-h').textContent = t('sysH');
    $('sys').value = state.S.model ? PV.chatSystemFor(state.S.model) : ''; $('sys').disabled = !state.S.model;
    var sm = state.S.model ? PV.chatSamplingFor(state.S.model) : {}, parts = [];
    if (sm.temperature !== undefined) parts.push('T ' + sm.temperature);
    if (sm.top_p !== undefined) parts.push('Top-P ' + sm.top_p);
    if (sm.top_k !== undefined) parts.push('Top-K ' + sm.top_k);
    if (sm.stop) parts.push('Stop ' + sm.stop.length);
    $('smp-h').textContent = parts.length ? t('smpSet', { v: parts.join(', ') }) : t('smpNone');
    $('smp-reset').textContent = t('smpReset'); $('smp-reset').style.display = parts.length ? '' : 'none';
}
export function renderSheet() {
    sysNote();
    $('sm-h').textContent = t('model'); $('onl-t').textContent = t('onl'); $('onl-h').textContent = t('onlH'); $('onl').checked = PV.onlineAllowed(); runtimeNote();
    var ps = PV.list().filter(engineOk);
    if (!ps.some(function (p) { return p.id === state.S.provider; })) { state.S.provider = 'ollama'; }
    $('eng').innerHTML = ps.map(function (p) { return '<button type="button" class="pill' + (p.id === state.S.provider ? ' on' : '') + '" data-eng="' + esc(p.id) + '">' + esc(p.name) + '</button>'; }).join('');
    var hasList = state.modelsFor === state.S.provider && state.modelsList.length;
    $('models').innerHTML = hasList ? state.modelsList.map(function (m) {
        return '<button type="button" class="row' + (m === state.S.model ? ' sel' : '') + '" data-model="' + esc(m) + '"><span class="tx"><b>' + esc(m) + '</b></span>' + (m === state.S.model ? '<svg class="i sm"><use href="/lib/icons.svg#i-check"/></svg>' : '') + '</button>';
    }).join('') : '<p class="hint">' + (state.modelsFor === state.S.provider ? t('noModels') : t('loading')) + '</p>';
    var free = !hasList; $('free').hidden = !free; $('free-l').hidden = !free; $('free-l').textContent = t('freeL'); $('free').value = free ? (state.S.model || '') : '';
}
export function loadModels() {
    var id = state.S.provider; state.modelsFor = ''; renderSheet();
    PV.models(id).then(function (l) {
        if (state.S.provider !== id) return;
        state.modelsList = (l || []).map(function (m) { return typeof m === 'string' ? m : (m.id || m.name || ''); }).filter(Boolean);
        // Own persona models (heinz-fakt, heinz-wilson: system prompt and sampling in the Modelfile) belong to the old Heinz UI and the dashboard;
        // the chat is a plain conversation with a plain model, so they are not offered here.
        if (id === 'ollama') state.modelsList = state.modelsList.filter(function (m) { return !/^heinz-/.test(m); });
        state.modelsFor = id;
        if (!state.S.model || (state.modelsList.length && state.modelsList.indexOf(state.S.model) < 0 && id === 'ollama')) {
            state.S.model = state.modelsList[0] || state.S.model; save();
        }
        head(); renderSheet(); renderLog(state.gen);
    }, function () { if (state.S.provider !== id) return; state.modelsList = []; state.modelsFor = id; renderSheet(); });
}
export function pickEngine(id) { state.S.provider = id; state.S.model = ''; save(); head(); loadModels(); }
export function pickModel(m) { state.S.model = m; save(); head(); renderSheet(); renderLog(state.gen); Heinz.sheetClose(); }
