/* lib/dashboard/quick.js – Schnellbereich im Parameterfenster.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, HeinzCaps, PV } from './base.js';
import { capCtx, renderModelSheet, renderQuick, thinkRule, thinkSend, thinkStage, thinkWire } from './caps.js';
import { onOnlineToggle, switchProvider } from './engine.js';
import { t } from './i18n.js';
import { openLayer } from './menu.js';
import { copyText } from './messages.js';
import { saveSettings } from './persist.js';
import { schedulePreload } from './preload.js';
import { onSlider, readSliders, setSliders } from './settings.js';
import { settings, state } from './state.js';

// ===== Schnellbereich im Einstellungs-Panel: Engine, Modell, Parameter =====
export function modelKey() { return settings.provider + '|' + ($('model-select').value || settings.model || '') + '|' + settings.mode; }
function legacyKey() { return settings.provider + '|' + ($('model-select').value || settings.model || ''); }
export function savedParams() { const m = settings.modelParams || {}; return m[modelKey()] || m[legacyKey()] || null; }
export const nativeParams = {};
export function nativeKey() { return settings.provider + '|' + ($('model-select').value || settings.model || ''); }
async function loadNative() {
    const k = nativeKey();
    if (nativeParams[k] !== undefined || settings.provider !== 'ollama') return;
    try { nativeParams[k] = await PV.show('ollama', $('model-select').value || settings.model); } catch (e) { nativeParams[k] = null; }
    if (nativeKey() === k) applyParamSrc();
}
function modePreset() { const p = state.MODE_PRESETS[settings.mode] || state.MODE_PRESETS.wilson; return { temp: p.temp, topp: p.top_p, topk: p.top_k, ctx: 8192 }; }
export function paramSrc() { if (settings.modesOnly) return 'mode'; const m = settings.paramSrcBy || {}, v = m[modelKey()]; if (v === 'model' || v === 'mode' || v === 'own') return v; return savedParams() ? 'own' : 'mode'; }
let ownStart = null;
export function setParamSrc(src) {
    if (src === 'own' && !savedParams()) ownStart = readSliders();
    if (!settings.paramSrcBy) settings.paramSrcBy = {};
    settings.paramSrcBy[modelKey()] = src;
    applyParamSrc(); schedulePreload();
}
function showDash(on) {
    ['temp', 'topp', 'topk', 'ctx'].forEach(function (n) { if (on) $('val-' + n).innerText = '–'; });
}
export function applyParamSrc() {
    const src = paramSrc();
    settings.useDefault = src === 'model';
    $('use-default').checked = settings.useDefault;
    let v = null;
    if (src === 'model') v = nativeParams[nativeKey()] || null;
    else if (src === 'mode') v = modePreset();
    else v = savedParams() || ownStart || readSliders();
    if (v) { setSliders(v.temp, v.topp, v.topk, v.ctx || 8192); if (src !== 'model') settings.params = readSliders(); }
    else showDash(true);
    saveSettings();
    ['model', 'mode', 'own'].forEach(function (k) { $('seg-' + k).disabled = !!settings.modesOnly; });
    if (settings.modesOnly) { /* note set in renderQuick */ }
    document.querySelectorAll('.slider-group').forEach(function (g) {
        g.classList.toggle('off', src !== 'own');
        g.querySelector('input').disabled = src !== 'own';
    });
    renderQuick();
}
export function applySavedParams() { applyParamSrc(); loadNative(); }
export function paramsDirty() {
    if (paramSrc() !== 'own') return false;
    const a = readSliders(), b = savedParams() || ownStart || a;
    return a.temp !== b.temp || a.topp !== b.topp || a.topk !== b.topk || a.ctx !== b.ctx;
}
export function resetParams() {
    if (paramSrc() !== 'own') return;
    const b = savedParams() || ownStart; if (!b) return;
    setSliders(b.temp, b.topp, b.topk, b.ctx); onSlider();
}
export function saveModelDefault() {
    if (paramSrc() !== 'own') return;
    if (!settings.modelParams) settings.modelParams = {};
    settings.modelParams[modelKey()] = readSliders();
    ownStart = null; saveSettings(); renderQuick();
    $('q-note').textContent = t('qSaved', { m: ($('model-select').value || settings.model || '') + ' · ' + t('mb_' + settings.mode) });
}
export function paramsText() {
    const v = readSliders(), th = parseInt($('param-threads').value, 10), m = $('model-select').value || settings.model || '';
    const pv = PV.get(settings.provider) || PV.get('ollama');
    let o = 'Heinz UI | ' + m + ' (' + pv.name + ')\ntemperature ' + v.temp + '\ntop_p ' + v.topp + '\ntop_k ' + v.topk + '\nnum_ctx ' + v.ctx;
    if (th > 0) o += '\nnum_thread ' + th;
    o += '\n\nModelfile:\nPARAMETER temperature ' + v.temp + '\nPARAMETER top_p ' + v.topp + '\nPARAMETER top_k ' + v.topk + '\nPARAMETER num_ctx ' + v.ctx;
    if (th > 0) o += '\nPARAMETER num_thread ' + th;
    return o;
}
// Testprotokoll einer Antwort (Knopf unter der Antwort): Zustand je Regler, Denkstufe, gesendete Anfrage, rohes usage, Zeiten. Nie Schlüssel, nie Nachrichtentext.
export function capsStates() {
    if (!HeinzCaps || !HeinzCaps.ready()) return '';
    const c = capCtx(), d = HeinzCaps.data();
    let o = '\n\nCapabilities (' + c.id + ' / ' + c.model + '):';
    Object.keys(d.parameters || {}).forEach(function (k) {
        const cell = HeinzCaps.cell(c.id, c.url, c.model, k);
        o += '\n' + k + ': ' + cell.state + (cell.status ? ' [' + cell.status + ']' : '') + (typeof cell.recommended === 'number' ? ' recommended ' + cell.recommended : '');
    });
    const mm = PV.modelMeta ? PV.modelMeta(c.model) : null;
    if (mm) o += '\nmodel list (native): inputTokenLimit ' + mm.inputTokenLimit + ', outputTokenLimit ' + mm.outputTokenLimit + ', thinking ' + mm.thinking + ', topK ' + mm.topK + ', maxTemperature ' + mm.maxTemperature;
    const r = thinkRule();
    if (r) { const sd = thinkSend(); o += '\nthinking: ' + (thinkStage() || 'model default') + (sd ? ' -> ' + thinkWire(sd) : ' (nothing sent)'); }
    return o;
}
// the sent body without any message text (neither the chat nor the system prompt)
export function exBodyText(b) {
    const c = Object.assign({}, b);
    ['messages', 'contents'].forEach(function (k) { if (Array.isArray(c[k])) c[k] = '[' + c[k].length + ' ' + k + ']'; });
    if (c.systemInstruction) c.systemInstruction = '[system]';
    return JSON.stringify(c);
}
export function exchangeText(st, ex, err) {
    let o = '';
    const d = HeinzCaps && HeinzCaps.ready() ? HeinzCaps.data() : {};
    if (st) {
        o += '\n\nLast answer: promptTokens ' + (st.promptTokens || 0) + ', outputTokens ' + (st.outputTokens || 0) + ', reasoningTokens ' + (st.reasoningTokens || 0) + (st.reasoningDerived ? ' (derived: total_tokens minus prompt and output)' : '') +
            ', visibleTokens ' + (st.visibleTokens || 0) + ', totalTokens ' + (st.totalTokens || 0) + ', source ' + (st.source || '?') + (st.approx ? ' (estimate)' : '') +
            ', finish ' + (st.finishReason || '?') + ', tokensPerSec ' + (st.tokensPerSec || 0).toFixed(1) + ', tokensPerSecAll ' + (st.tokensPerSecAll || 0).toFixed(1);
        const oir = d.stats && d.stats.outputIncludesReasoning;
        if (st.reasoningDerived) o += '\nNote: outputTokens exclude the thinking tokens (total_tokens is larger than prompt + output; no reasoning_tokens field reported).';
        else if ((st.reasoningTokens || 0) > 0 && (!oir || oir === 'unknown')) o += '\nNote: outputIncludesReasoning unknown, values not comparable.';
    }
    if (ex) {
        o += '\n\nLast request (' + ex.provider + ', HTTP ' + ex.status + '): ' + exBodyText(ex.body) +
            '\nLast response: usage ' + JSON.stringify(ex.usage) + ', finish ' + (ex.finish || '?') + ', chunks ' + ex.chunks + ', first content after ' + ex.firstMs + ' ms, total ' + ex.totalMs + ' ms';
    }
    if (err) o += '\n\nError: ' + err;
    return o;
}
export function copyParams() {
    const sp = $('q-copy').querySelector('span'), old = sp.textContent;
    copyText(paramsText()).then(function () { sp.textContent = '✓'; }).catch(function () { sp.textContent = '✕'; })
        .then(function () { setTimeout(function () { sp.textContent = old; }, 1500); });
}
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
