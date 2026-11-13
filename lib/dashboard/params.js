/* lib/dashboard/params.js – Parameterquelle (Modell / Modus / eigene), gespeicherte Werte je Modell, Regler-Ereignis.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV } from './base.js';
import { hooks } from './hooks.js';
import { t } from './i18n.js';
import { saveSettings } from './persist.js';
import { readSliders, setSliders } from './sliders.js';
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
    applyParamSrc(); hooks.call('schedulePreload');
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
    hooks.call('renderQuick');
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
    ownStart = null; saveSettings(); hooks.call('renderQuick');
    $('q-note').textContent = t('qSaved', { m: ($('model-select').value || settings.model || '') + ' · ' + t('mb_' + settings.mode) });
}

export function onSlider() {
    const v = readSliders();
    $('val-temp').innerText = v.temp;
    $('val-topp').innerText = v.topp;
    $('val-topk').innerText = v.topk;
    $('val-ctx').innerText = v.ctx;
    settings.params = v;
    saveSettings();
    hooks.call('schedulePreload');
    hooks.call('renderQuick');
}
export function onDefaultToggle() { setParamSrc($('use-default').checked ? 'model' : (savedParams() ? 'own' : 'mode')); }
