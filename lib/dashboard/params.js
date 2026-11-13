/* lib/dashboard/params.js – Person, Ton und eigener Stand: Vorgabe, „geändert“, gemerkter Stand, Regler-Ereignis.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use.
 *
 * Begriffe (docs/agent/BEGRIFFE.md): Person = früherer Modus (Code: settings.mode), dazu Nativ (`native`: keine Person, Herstellerwerte).
 * Ton = Temperatur, Top-P, Top-K (die Regler); Kontextfenster und Threads sind Laufzeit und werden von Person, Nativ und Rücksprung nie angefasst.
 *
 * Zustand (alles in heinz_settings, keine Quellenwahl mehr):
 *   settings.params   aktuelle Reglerwerte {temp, topp, topk, ctx}
 *   settings.toneOn   nur bei Nativ: Ton wurde vom Benutzer gesetzt (sonst Herstellerwerte, nichts wird gesendet)
 *   settings.ownOn    eigener Prompt ist aktiv (Text in settings.ownPrompt, einmal insgesamt)
 * „Geändert“ wird abgeleitet und ist zwei getrennte Angaben: Ton geändert (toneChanged) und Prompt geändert (promptChanged); beide leuchten als LED.
 * Es gibt keinen gemerkten Stand: Zurücksetzen und Personenwechsel holen die Vorgabe, eigene Werte sind dann weg.
 * (settings.modelParams ist veraltet und wird nur unverändert aufbewahrt.) */

import { $, PV } from './base.js';
import { hooks } from './hooks.js';
import { saveSettings } from './persist.js';
import { readSliders, setSliders } from './sliders.js';
import { settings, state } from './state.js';

export const NATIVE = 'native';
export function isNative(mode) { return (mode || settings.mode) === NATIVE; }
export function modelKey(mode) { return settings.provider + '|' + ($('model-select').value || settings.model || '') + '|' + (mode || settings.mode); }
export const nativeParams = {};
export function nativeKey() { return settings.provider + '|' + ($('model-select').value || settings.model || ''); }
async function loadNative() {
    const k = nativeKey();
    if (nativeParams[k] !== undefined || settings.provider !== 'ollama') return;
    try { nativeParams[k] = await PV.show('ollama', $('model-select').value || settings.model); } catch (e) { nativeParams[k] = null; }
    if (nativeKey() === k) showTone();
}

// ===== Vorgabe der Person =====
let snap = null;   // Vorgabe, wie sie auf den Reglern landet (Schrittweite der Regler kann einen Wert leicht verschieben)
export function presetTone(mode) {
    const m = mode || settings.mode;
    if (isNative(m)) return null;
    if (snap && snap.mode === m) return { temp: snap.temp, topp: snap.topp, topk: snap.topk };
    const p = state.MODE_PRESETS[m] || state.MODE_PRESETS.heinz;
    return { temp: p.temp, topp: p.top_p, topk: p.top_k };
}
export function basePromptText(mode) {
    const m = mode || settings.mode;
    if (isNative(m) || !state.PROMPTS[settings.lang] || state.PROMPTS[settings.lang][m] === undefined) return '';
    const P = state.PROMPTS[settings.lang];
    return P[m] + ' ' + P.respond + (settings.fast ? ' ' + P.plain : '');
}
function sameTone(a, b) { return !!a && !!b && a.temp === b.temp && a.topp === b.topp && a.topk === b.topk; }

// ===== „geändert“ (abgeleitet) =====
export function toneChanged(mode) {
    const m = mode || settings.mode;
    if (isNative(m)) return !!settings.toneOn;
    return !sameTone(settings.params, presetTone(m));
}
export function promptChanged() { return !!settings.ownOn && (settings.ownPrompt || '') !== basePromptText(); }
export function isChanged() { return toneChanged() || promptChanged(); }
// Ton, der gesendet wird: Nativ sendet erst nach der ersten eigenen Änderung etwas
export function toneSent() { return !isNative() || !!settings.toneOn; }
// 'on' = Ton oder Prompt weicht von der Vorgabe ab (LED am Personenknopf), '' = Vorgabe
export function markState() { return isChanged() ? 'on' : ''; }

// ===== Zurücksetzen ===== und zurücksetzen =====
let at = { key: '', mode: '' };   // unter diesem Schlüssel und dieser Person stehen die Werte auf den Reglern
function currentCtx() { const c = parseInt($('param-ctx').value, 10); return c > 0 ? c : 8192; }
function loadVorgabe() {
    const ctx = currentCtx(), p = presetTone();
    settings.toneOn = false;
    snap = null;
    if (p) { const fresh = presetTone(); setSliders(fresh.temp, fresh.topp, fresh.topk, ctx); }
    settings.params = readSliders();
    if (p) snap = { mode: settings.mode, temp: settings.params.temp, topp: settings.params.topp, topk: settings.params.topk };
}
export function showDash(on) { ['temp', 'topp', 'topk'].forEach(function (n) { if (on) $('val-' + n).innerText = '–'; }); }
// Zeichnet die Regler nach dem Zustand: Nativ ohne eigenen Ton zeigt die Herstellerwerte (oder „–“), nichts wird gesendet
export function showTone() {
    if (isNative() && !settings.toneOn) {
        const v = nativeParams[nativeKey()] || null;
        if (v) { setSliders(v.temp, v.topp, v.topk, currentCtx()); settings.params = readSliders(); } else showDash(true);
    }
    hooks.call('renderQuick');
}
// Nach Wechsel von Person oder Modell: der neue Schlüssel startet auf der Vorgabe der Person (eigene Änderungen entfallen).
export function applySavedParams() {
    const k = modelKey();
    if (at.key !== k) {
        if (at.mode !== settings.mode) settings.ownOn = false;   // Personenwechsel: Prompt zurück auf die Vorgabe
        loadVorgabe();
        at = { key: k, mode: settings.mode };
        saveSettings(); hooks.call('schedulePreload');
    }
    showTone(); loadNative();
}
// Start der App: immer Heinz auf seiner Vorgabe.
// Voraussetzung: settings.params ist gesetzt und die Regler stehen darauf (init.js).
export function startOnHeinz() {
    settings.mode = 'heinz'; settings.ownOn = false;
    loadVorgabe();
    at = { key: modelKey(), mode: 'heinz' };
    saveSettings();
}
// Rücksprung (Tipp auf die aktive Person): Ton und Prompt dieser Person auf ihre Vorgabe, bei Nativ auf die Herstellerwerte
export function resetToPerson() {
    settings.ownOn = false;
    loadVorgabe();
    saveSettings(); hooks.call('schedulePreload'); hooks.call('renderPrompts'); showTone();
}
// „Reset“ im Fenster Ton: nur der Ton zurück auf die Vorgabe
export function resetParams() {
    if (!toneChanged()) return;
    loadVorgabe();
    saveSettings(); hooks.call('schedulePreload'); showTone();
}
// „Reset“ im Fenster Prompt: nur der Prompt zurück auf die Vorgabe (bei Nativ: kein Prompt)
export function resetPrompt() {
    if (!promptChanged()) return;
    settings.ownOn = false;
    saveSettings(); hooks.call('schedulePreload'); hooks.call('renderPrompts'); hooks.call('renderMarks');
}

// ===== Regler =====
// Benutzer bewegt einen Regler: bei Nativ wird daraus „Nativ*“. Programmatische Änderungen (Obergrenze, Empfehlung) gehen über syncSliders.
export function onSlider() {
    if (isNative()) settings.toneOn = true;
    syncSliders();
}
export function syncSliders() {
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
