/* lib/dashboard/settings.js – Einstellungsfelder: Regler, Threads, Systemprompt, „In den Chat übernehmen“, Vorladen-Haken.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV } from './base.js';
import { buildOptions, buildSystemPrompt, sysSrc } from './build.js';
import { copyText } from './clipboard.js';
import { hooks } from './hooks.js';
import { t } from './i18n.js';
import { applyParamSrc } from './params.js';
import { saveSettings } from './persist.js';
import { settings, state } from './state.js';

export function pwTab(id) {
    document.querySelectorAll('.pw-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pw') === id); });
    $('pw-params').hidden = id !== 'params'; $('pw-prompts').hidden = id !== 'prompts';
}

function threadsFor(model) {
    return PV.threadsFor(model, settings);   // eine Regel für alle Tools: lib/providers.js
}
export function loadThreads() {
    const n = threadsFor($('model-select').value || settings.model);
    $('param-threads').value = n; $('val-threads').innerText = n;
}
export function onThreads() {
    const n = parseInt($('param-threads').value, 10);
    $('val-threads').innerText = n;
    if (!settings.threads) settings.threads = {};
    settings.threads[$('model-select').value] = n;
    saveSettings();
    hooks.call('schedulePreload');
}

export function setSysSrc(v) {
    settings.sysSrc = v; settings.ownSystem = v === 'model';
    saveSettings(); hooks.call('schedulePreload'); renderPrompts();
    if (v === 'own') setTimeout(function () { const e = $('ps-text'); if (e && !(settings.ownPrompt || '').trim()) e.focus(); }, 0);
}
export function onModesOnly() {
    settings.modesOnly = $('modes-only').checked; saveSettings();
    applyParamSrc(); renderPrompts(); hooks.call('schedulePreload');
}
export function onOwnPromptInput() {
    if (sysSrc() === 'model' || settings.sysSrc === 'mode') return;
    settings.ownPrompt = $('ps-text').value; saveSettings(); hooks.call('schedulePreload'); renderPrompts(true);
}
export function seedOwnPrompt() { settings.ownPrompt = buildSystemPrompt(settings.mode, true); setSysSrc('own'); }
// Übergibt dem Heinz Chat, was das Dashboard für dieses Modell sendet: Prompt (ohne Antwortsprache-Satz, der Chat antwortet in der Sprache des Nutzers)
// und Sampling-Werte. Threads und Kontext teilen beide Seiten ohnehin (PV.runtime).
export function applyToChat() {
    const model = $('model-select').value || settings.model, sub = $('to-chat-sub');
    if (settings.provider !== 'ollama' || !model) { sub.textContent = t('toChatOnly'); return; }
    const P = state.PROMPTS[settings.lang];
    const src = sysSrc();
    const sys = src === 'model' ? '' : src === 'own' ? settings.ownPrompt : P[settings.mode];
    const o = buildOptions(state.MODE_PRESETS[settings.mode]);
    PV.setChatSystem(model, sys);
    PV.setChatSampling(model, o);
    const parts = [];
    if (o.temperature !== undefined) parts.push('T ' + o.temperature);
    if (o.top_p !== undefined) parts.push('Top-P ' + o.top_p);
    if (o.top_k !== undefined) parts.push('Top-K ' + o.top_k);
    if (o.stop && o.stop.length) parts.push('Stop ' + o.stop.length);
    sub.textContent = t('toChatDone', { m: model, n: sys.length, v: parts.length ? parts.join(', ') : t('toChatNoVals') });
}
export function copySysPrompt() {
    const v = settings.sysSrc === 'own' ? settings.ownPrompt : buildSystemPrompt(settings.mode, true);
    const sp = $('ps-copy').querySelector('span'), old = sp.textContent;
    copyText(v || '').then(function () { sp.textContent = '✓'; }).catch(function () { sp.textContent = '✕'; })
        .then(function () { setTimeout(function () { sp.textContent = old; }, 1500); });
}
export function renderPrompts(typing) {
    if (!$('ps-text')) return;
    const src = settings.sysSrc === 'model' || settings.sysSrc === 'own' ? settings.sysSrc : 'mode';
    ['mode', 'model', 'own'].forEach(function (k) { $('ps-' + k).classList.toggle('on', src === k); });
    const ta = $('ps-text'), empty = !(settings.ownPrompt || '').trim();
    ta.readOnly = src !== 'own';
    if (!typing) ta.value = src === 'own' ? (settings.ownPrompt || '') : (src === 'mode' ? buildSystemPrompt(settings.mode, true) : '');
    ta.placeholder = src === 'model' ? t('psNothing') : t('psPh');
    $('ps-count').textContent = ta.value.length ? ta.value.length + ' ' + t('chars') : '';
    $('ps-copy').disabled = src === 'model' || (src === 'own' && empty);
    $('ps-seed').hidden = src !== 'mode';
    $('ps-note').textContent = src === 'mode' ? t('psNoteMode', { m: t('mb_' + settings.mode) }) : src === 'model' ? t('psNoteModel') : (empty ? t('psNoteOwnEmpty') : t('psNoteOwn'));
    ['mode', 'model', 'own'].forEach(function (k) { $('ps-' + k).disabled = !!settings.modesOnly; });
    if (settings.modesOnly) $('ps-note').textContent = t('noteLocked');
}
export function onFast() {
    settings.fast = $('fast-mode').checked;
    const n = parseInt($('param-fastn').value, 10);
    if (n > 0) settings.fastN = Math.min(1024, Math.max(16, n));
    $('param-fastn').value = settings.fastN; $('fastn-val').textContent = settings.fastN;
    saveSettings();
    hooks.call('schedulePreload');
}

