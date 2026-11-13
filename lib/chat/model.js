/* lib/chat/model.js – Modellblatt des Heinz Chat: reine Anzeige der zugewiesenen Konfiguration (Name, Engine, Modell, Person, Prompt, Ton, Laufzeit, Status).
 * Der Heinz Chat hat keine eigene Auswahl (AUFTRAG_Konfiguration.md): Er läuft mit genau einer Konfiguration (der zugewiesenen, sonst der eingebauten
 * Standardkonfiguration). Die Standardkonfiguration bringt Qwen mit (PV.DEFAULT_CHAT_MODEL); die einmalige Modellwahl bleibt nur als Rückfall, falls dort kein Modell steht.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, PV, esc } from './base.js';
import { save } from './conversations.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { head, renderLog } from './view.js';

// The configuration the chat runs with (assigned one, else the default): engine and model come only from it, never from the dashboard.
export function applyChatConfig() {
    var c = PV.chatConfig();
    state.cfg = c;
    state.S.provider = c.provider; state.S.model = c.model;
}
export function needsSetup() { return !!state.cfg && !!state.cfg.builtin && !state.cfg.model; }   // the built-in default carries Qwen, so this only happens if the model was emptied

function row(label, value) { return '<div class="row"><span class="tx"><b>' + esc(value) + '</b><small>' + esc(label) + '</small></span></div>'; }
function engineOk(p) { return p.local || (PV.onlineAllowed() && (!p.needsKey || PV.getKey(p.id))); }
function toneText(c) {
    var parts = [];
    if (c.tone) {
        if (c.tone.temperature !== undefined) parts.push('T ' + c.tone.temperature);
        if (c.tone.top_p !== undefined) parts.push('Top-P ' + c.tone.top_p);
        if (c.tone.top_k !== undefined) parts.push('Top-K ' + c.tone.top_k);
    }
    if (c.stop && c.stop.length) parts.push('Stop ' + c.stop.length);
    return parts.length ? parts.join(', ') : t('toneOwn');
}
function runtimeText() {
    var r = PV.chatRuntime(state.S.provider, state.S.model), o = r.options || {};
    return t('rtShared', { n: o.num_thread || t('rtDef'), c: o.num_ctx || t('rtDef') });
}
// what the dashboard and this chat last sent to the engine for the chosen model (diagnosis; same record as before, kept in heinz_lastreq)
function lastSent() {
    var lr = PV.lastRequests(), fmt = function (x) { return x ? x.model + ': ' + t('rtT') + ' ' + (x.threads === null ? t('rtDef') : x.threads) + ', ' + t('rtC') + ' ' + (x.ctx === null ? t('rtDef') : x.ctx) + ', ' + new Date(x.ts).toTimeString().slice(0, 8) : '–'; };
    return t('rtLast') + '\n' + t('rtB') + ' ' + fmt(lr.bench) + '\n' + t('rtCh') + ' ' + fmt(lr.chat);
}
// display of the configuration (read only)
function renderView() {
    var c = state.cfg, p = PV.get(c.provider) || { name: c.provider, local: true };
    $('sm-h').textContent = t('cfgH');
    $('cfg-rows').innerHTML = row(t('cfgNameL'), c.builtin ? t('cfgDefault') : c.name) + row(t('engL'), p.name + (p.local ? '' : ' · ' + t('cloud'))) + row(t('modL'), c.model)
        + (c.builtin ? '' : row(t('perL'), t('p_' + c.person) === 'p_' + c.person ? c.person : t('p_' + c.person)))
        + row(t('toneL'), toneText(c)) + row(t('rtL'), runtimeText()) + row(t('stL'), $('ring').title || '–');
    $('cfg-prompt-l').textContent = t('proL');
    $('cfg-prompt').value = c.prompt || t('noPrompt');
    $('cfg-last').textContent = state.S.model && PV.get(state.S.provider) && PV.get(state.S.provider).format === 'ollama' ? lastSent() : '';
    $('cfg-manage').textContent = t('manage'); $('cfg-hint').textContent = t('roHint');
}
// one-time choice of the model for the default configuration (only while it has none)
function renderSetup() {
    $('sm-h').textContent = t('setupH'); $('setup-hint').textContent = t('setupHint');
    var ps = PV.list().filter(engineOk);
    if (!ps.some(function (p) { return p.id === state.S.provider; })) state.S.provider = 'ollama';
    $('eng').innerHTML = ps.map(function (p) { return '<button type="button" class="pill' + (p.id === state.S.provider ? ' on' : '') + '" data-eng="' + esc(p.id) + '">' + esc(p.name) + '</button>'; }).join('');
    var hasList = state.modelsFor === state.S.provider && state.modelsList.length;
    $('models').innerHTML = hasList ? state.modelsList.map(function (m) {
        return '<button type="button" class="row' + (m === state.S.model ? ' sel' : '') + '" data-model="' + esc(m) + '"><span class="tx"><b>' + esc(m) + '</b></span></button>';
    }).join('') : '<p class="hint">' + (state.modelsFor === state.S.provider ? t('noModels') : t('loading')) + '</p>';
    var free = !hasList; $('free').hidden = !free; $('free-l').hidden = !free; $('free-l').textContent = t('freeL'); $('free').value = free ? (state.S.model || '') : '';
}
export function renderSheet() {
    var setup = needsSetup();
    $('sh-setup').hidden = !setup; $('sh-view').hidden = setup;
    if (setup) renderSetup(); else renderView();
}
export function loadModels() {
    if (!needsSetup()) return;
    var id = state.S.provider; state.modelsFor = ''; renderSheet();
    PV.models(id).then(function (l) {
        if (state.S.provider !== id) return;
        state.modelsList = (l || []).map(function (m) { return typeof m === 'string' ? m : (m.id || m.name || ''); }).filter(Boolean);
        // Own persona models (heinz-fakt, heinz-wilson: system prompt and sampling in the Modelfile) belong to the old Heinz UI and the dashboard;
        // the chat is a plain conversation with a plain model, so they are not offered here.
        if (id === 'ollama') state.modelsList = state.modelsList.filter(function (m) { return !/^heinz-/.test(m); });
        state.modelsFor = id; renderSheet();
    }, function () { if (state.S.provider !== id) return; state.modelsList = []; state.modelsFor = id; renderSheet(); });
}
export function pickEngine(id) { state.S.provider = id; state.S.model = ''; loadModels(); }
// the choice is stored in the default configuration, then the chat runs with it; the sheet turns into the read-only display
export function pickModel(m) {
    m = String(m || '').trim(); if (!m) return;
    PV.setChatDefaultModel(state.S.provider, m);
    applyChatConfig(); save(); head(); renderSheet(); renderLog(state.gen); Heinz.sheetClose();
}
