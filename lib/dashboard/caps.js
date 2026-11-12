/* lib/dashboard/caps.js – Schnittstellenwissen: Regler nach Zustand, Denken.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, HeinzCaps, PV, esc } from './base.js';
import { getSaved } from './conversations.js';
import { t } from './i18n.js';
import { ICON, closeAll, stGate } from './menu.js';
import { saveSettings } from './persist.js';
import { chipWake, initChip } from './pixelbar.js';
import { onModelChange } from './preload.js';
import { nativeKey, nativeParams, paramSrc, paramsDirty, pickEngine, savedParams, setParamSrc } from './quick.js';
import { askGemma } from './send.js';
import { srGate } from './series.js';
import { onSlider, renderPrompts } from './settings.js';
import { settings, state } from './state.js';

// ===== Schnittstellenwissen: Regler nach Zustand, Denken (HeinzCaps, lib/capabilities.json) =====
// Zustände: on = regelbar; unknown = regelbar, gesendet, als „ungeklärt“ gekennzeichnet; off/error/fixed/config = ausgegraut, nicht gesendet.
const CAP_BLOCKED = ['off', 'error', 'fixed', 'config'];
const CAP_CARDS = ['sc-temp', 'sc-topp', 'sc-topk', 'sc-ctx', 'sc-threads', 'fastn-card'];
let capOpen = {};
export function capCtx() {
    const pv = PV.get(settings.provider) || PV.get('ollama');
    return { id: pv.id, url: pv.baseUrl, model: $('model-select').value || settings.model || '' };
}
function capCell(key) { const c = capCtx(); return HeinzCaps ? HeinzCaps.cell(c.id, c.url, c.model, key) : { state: 'on' }; }
function capBlocked(cell) { return CAP_BLOCKED.indexOf(cell.state) >= 0; }
export function capSendable(key) { return !capBlocked(capCell(key)); }
function capHint(cell) { return cell.hint ? (cell.hint[settings.lang] || cell.hint.en) : ''; }
function capInfo(cell) {
    let txt = capHint(cell);
    if (!txt && cell.state !== 'on') txt = t('capSt_' + cell.state);
    if (cell.status) txt += (txt ? ' ' : '') + t('capSrc') + ': ' + t('capSrc_' + cell.status) + '.';
    return txt;
}
// Obergrenze der Temperatur: Wert aus der Modellliste (Google: maxTemperature), sonst 2 bei Online-/OpenAI-Wegen, 1 bei lokalen Engines
function tempRange() {
    const inp = $('param-temp'); if (!inp) return;
    const c = capCtx(), pv = PV.get(settings.provider) || PV.get('ollama');
    const mm = PV.modelMeta ? PV.modelMeta(c.model) : null;
    let mx = 1;
    if (mm && typeof mm.maxTemperature === 'number' && mm.maxTemperature > 0) mx = mm.maxTemperature;
    else if (!pv.local) mx = 2;
    if (parseFloat(inp.max) !== mx) { inp.max = String(mx); if (parseFloat(inp.value) > mx) { inp.value = mx; onSlider(); } }
}
export function renderCaps() {
    if (!HeinzCaps || !HeinzCaps.ready()) return;
    const src = paramSrc();
    tempRange(); srGate();
    CAP_CARDS.forEach(function (id) {
        const card = $(id); if (!card) return;
        const cell = capCell(card.getAttribute('data-cap-card'));
        const blocked = capBlocked(cell), unk = cell.state === 'unknown', hint = capHint(cell);
        card.classList.toggle('cap-blocked', blocked);
        card.setAttribute('data-cap-state', cell.state);
        const inp = card.querySelector('input');
        if (inp) {
            inp.classList.toggle('cap-lock', blocked);
            if (id === 'sc-threads') inp.disabled = blocked || settings.provider !== 'ollama';
            else if (id === 'fastn-card') inp.disabled = blocked;
            else inp.disabled = blocked || src !== 'own';
        }
        let row = card.querySelector('.cap-row');
        const rec = typeof cell.recommended === 'number' && id === 'sc-temp' ? cell.recommended : null;
        const hasTag = blocked || unk || hint;
        if (!hasTag && rec === null) { if (row) row.remove(); return; }
        if (!row) { row = document.createElement('div'); row.className = 'cap-row'; card.appendChild(row); }
        const open = !!capOpen[id];
        const tag = blocked ? t('capLocked') : unk ? t('capUnk') : t('capNote');
        let html = hasTag ? '<button type="button" class="cap-tag' + (unk ? ' unk' : '') + '" data-cap-toggle="' + id + '">' + esc(tag) + '</button>' : '';
        if (hasTag && open) html += '<div class="cap-text">' + esc(capInfo(cell)) + '</div>';
        if (rec !== null) {
            const cur = parseFloat($('param-temp').value);
            html += '<div class="cap-text">' + esc(hint ? hint : '') + (hint ? ' ' : '') + '<b>' + esc(t('capRec', { v: rec })) + '</b>' +
                (cur !== rec && !settings.modesOnly ? '<br><button type="button" class="pill" data-cap-apply="' + rec + '">' + esc(t('capApply')) + '</button>' : '') + '</div>';
        }
        row.innerHTML = html;
    });
}
document.addEventListener('click', function (e) {
    const ap = e.target.closest && e.target.closest('[data-cap-apply]');
    if (ap) { applyRecommended(parseFloat(ap.getAttribute('data-cap-apply'))); return; }
    const card = e.target.closest && e.target.closest('[data-cap-card]');
    if (!card || !card.id) return;
    if (card.classList.contains('cap-blocked') || e.target.closest('[data-cap-toggle]')) { capOpen[card.id] = !capOpen[card.id]; renderCaps(); }
});
function applyRecommended(v) {
    if (paramSrc() !== 'own') setParamSrc('own');   // der Wert wird zu „Meine“; die Modusvorgaben bleiben unberührt
    $('param-temp').value = v; onSlider();
}
// Denken als ein Schalter Schnell | Tief (nur bei Modellen, deren Regel ein thinking-Objekt hat)
export function thinkRule() { const c = capCtx(); return HeinzCaps && HeinzCaps.ready() ? HeinzCaps.thinking(c.id, c.url, c.model) : null; }
function thinkKey() { const c = capCtx(); return c.id + '|' + c.model; }
export function thinkStage() { const v = (settings.thinkBy || {})[thinkKey()]; return v === 'fast' || v === 'deep' ? v : ''; }
// reasoning_effort = Name der Stufe aus der Regel (Schlüssel von effortMap); nie zusammen mit thinking_level oder thinking_budget
export function thinkEffortFor(st) {
    const r = thinkRule();
    if (!r || !st) return '';
    const e = r[st];
    return e && r.effortMap && Object.prototype.hasOwnProperty.call(r.effortMap, e) ? e : '';
}
export function thinkEffort() { return thinkEffortFor(thinkStage()); }
// Native route (Google): the same rule gives the level or the token budget, sent as thinkingConfig; null = send nothing
export function thinkSendFor(st) {
    const r = thinkRule(), e = thinkEffortFor(st);
    if (!r || !e) return null;
    return { kind: r.kind, value: r.effortMap[e] };
}
export function thinkSend() { return thinkSendFor(thinkStage()); }
// Name des gesendeten Feldes je Weg: nativ thinkingLevel/thinkingBudget, sonst reasoning_effort
export function thinkWire(sd) {
    if (settings.provider === 'google') return (sd.kind === 'budget' ? 'thinkingBudget ' : 'thinkingLevel ') + sd.value;
    return 'reasoning_effort ' + thinkEffort();
}
export function setThink(st) {
    if (!thinkRule()) return;
    if (!settings.thinkBy) settings.thinkBy = {};
    const k = thinkKey();
    if (settings.thinkBy[k] === st) delete settings.thinkBy[k]; else settings.thinkBy[k] = st;   // zweites Tippen = zurück auf Modellstandard
    saveSettings(); renderThink();
}
export function renderThink() {
    const row = $('think-row'); if (!row) return;
    const r = thinkRule();
    row.hidden = !r;
    if (!r) return;
    const st = thinkStage(), e = thinkEffort();
    $('think-fast').classList.toggle('on', st === 'fast'); $('think-deep').classList.toggle('on', st === 'deep');
    $('think-note').textContent = e ? (settings.provider === 'google' ? t('thinkSentNative', { w: thinkWire(thinkSend()) }) : t('thinkSent', { e: e })) : t('thinkDefault');
}
export function renderQuick() {
    if (!$('q-engine-val')) return;
    const pv = PV.get(settings.provider) || PV.get('ollama');
    const online = !pv.local && !pv.custom;
    const noKey = pv.needsKey && !PV.getKey(pv.id);
    $('q-engine-val').textContent = pv.name + (online ? ' · ' + t('chipOnline') : '') + (noKey ? ' · ' + t('qNoKey') : '');
    $('q-model-val').textContent = $('model-select').value || settings.model || '–';
    const list = $('q-eng-list');
    list.innerHTML = PV.list().map(function (p) {
        const on = !p.local && !p.custom, locked = on && !PV.onlineAllowed();
        return '<button type="button" class="row eng' + (locked ? ' locked' : '') + (p.id === settings.provider ? ' sel-on' : '') + '" data-eng="' + p.id + '">' +
            '<span class="tx"><b>' + esc(p.name) + (on ? ' · ' + t('chipOnline') : '') + '</b><small>' + esc(locked ? t('qLockedSub') : (p.local ? t('qLocalSub') : t('qOnlineSub') + (PV.getKey(p.id) ? ' · ' + t('qKeyHave') : ''))) + '</small></span>' +
            (locked ? ICON('lock') : ICON('check', 'sm ck')) + '</button>';
    }).join('');
    list.querySelectorAll('[data-eng]').forEach(function (b) { b.onclick = function () { pickEngine(b.getAttribute('data-eng')); }; });
    $('q-lock').hidden = !state.qLockEng;
    if (state.qLockEng) $('q-lock-txt').textContent = t('qLocked', { n: (PV.get(state.qLockEng) || {}).name || '' });
    stGate(); renderPrompts();
    $('thr-title').textContent = t('thrTitle') + ' · ' + ($('model-select').value || settings.model || ''); $('thr-note').textContent = t('thrNote');
    const src = paramSrc(), d = paramsDirty(), sp = savedParams(), tgt = ($('model-select').value || settings.model || '') + ' · ' + t('mb_' + settings.mode);
    ['model', 'mode', 'own'].forEach(function (k) { $('seg-' + k).classList.toggle('on', src === k); });
    $('q-btn-row').hidden = src !== 'own';
    $('q-reset').disabled = !d; $('q-reset').classList.toggle('act', d);
    $('q-save').disabled = !(d || (!sp && src === 'own')); $('q-save').classList.toggle('act', !$('q-save').disabled);
    if (settings.modesOnly) $('q-note').textContent = t('noteLocked');
    else if (src === 'model') $('q-note').textContent = nativeParams[nativeKey()] ? t('qNoteModel', { m: tgt.split(' · ')[0] }) : t('qNoteModelNone');
    else if (src === 'mode') $('q-note').textContent = t('qNoteMode', { m: t('mb_' + settings.mode) });
    else $('q-note').textContent = sp ? (d ? t('qNoteOwnDirty', { m: tgt }) : t('qNoteOwn', { m: tgt })) : t('qNoteOwnNew', { m: tgt });
    renderCaps(); renderThink();
}
export function updateChip() {
    const p = PV.get(settings.provider) || PV.get('ollama');
    const online = !p.local && !p.custom;
    const e = $('chip-engine');
    e.textContent = p.name + (online ? ' · ' + t('chipOnline') : '');
    e.classList.toggle('online', online);
    $('chip-model').textContent = settings.model || '–';
    initChip(); chipWake(); renderQuick();
}
export function updateActs() {

}
export function updateChatBar() {
    updateActs();
    const first = state.chatHistory.find(function (m) { return m.role === 'user'; });
    $('chat-title').textContent = state.currentName || (first ? first.content.replace(/\s+/g, ' ').slice(0, 40) : t('chatNew'));
    const n = getSaved().filter(function (c) { return (c.mode || 'wilson') === settings.mode; }).length;
    $('chats-count').textContent = n ? String(n) : '';
    if ($('scope-all')) $('scope-all').textContent = t('scopeAllS') + ' · ' + getSaved().length;
}
export function updateCtxCount() { const n = $('context').value.length; $('ctx-count').textContent = n ? n + ' ' + t('chars') : ''; }
function fmtK(n) { return n >= 1000000 ? (Math.round(n / 100000) / 10) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n); }
export function renderModelSheet() {
    const p = PV.get(settings.provider) || PV.get('ollama');
    $('ms-title').textContent = p.name;
    const all = Array.prototype.map.call($('model-select').options, function (o) { return o.value; });
    $('model-search').hidden = all.length <= 8;
    const q = $('model-search').value.trim().toLowerCase();
    const list = q ? all.filter(function (n) { return n.toLowerCase().indexOf(q) >= 0; }) : all;
    const box = $('model-list');
    box.innerHTML = '';
    list.forEach(function (n) {
        const i = n.indexOf(':');
        const name = i < 0 ? n : n.slice(0, i), tag = i < 0 ? '' : n.slice(i + 1);
        const loaded = settings.provider === 'ollama' && state.loadedNames.some(function (x) { return x === n || x.indexOf(n) === 0; });
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mrow' + (n === settings.model ? ' on' : '');
        b.setAttribute('data-model', n);
        const mm = PV.modelMeta ? PV.modelMeta(n) : null;
        const info = mm ? [mm.inputTokenLimit ? t('metaIn') + ' ' + fmtK(mm.inputTokenLimit) : '', mm.outputTokenLimit ? t('metaOut') + ' ' + fmtK(mm.outputTokenLimit) : '', mm.thinking ? t('metaThink') : ''].filter(Boolean).join(' · ') : '';
        b.innerHTML = '<span class="mt"><b>' + esc(name) + '</b><small>' + esc(tag + (loaded ? (tag ? ' · ' : '') + t('modelLoaded') : '') + (info ? (tag || loaded ? ' · ' : '') + info : '')) + '</small></span>' +
            (loaded ? '<span class="ld"></span>' : '') + (n === settings.model ? ICON('check', 'ck') : '');
        b.onclick = function () { pickModel(n); };
        box.appendChild(b);
    });
    $('model-empty').textContent = list.length ? '' : t(all.length ? 'nothingFound' : 'noModels');
}
function pickModel(n) {
    $('model-select').value = n; onModelChange();
    if (state.modelFromPanel) { state.modelFromPanel = false; $('model-sheet').classList.remove('open'); } else closeAll();
}
export function setQuery(v) { $('query').value = v; autosize(); }
export function autosize() {
    const ta = $('query');
    if (ta.closest('.full')) return;
    const box = ta.closest('.prompt'), was = box.classList.contains('multi'), v = ta.value;
    ta.style.height = 'auto';
    const cs = getComputedStyle(ta), lh = parseFloat(cs.lineHeight) || 24, pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const wraps = ta.scrollHeight - pad > lh * 1.4;      // zweite Zeile
    const multi = !!v && (v.indexOf('\n') >= 0 || wraps || (was && v.length > 22));
    box.classList.toggle('multi', multi);
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, window.innerHeight * 0.4) + 'px';
}
export function exitFull() {
    document.querySelectorAll('.full').forEach(function (el) {
        el.classList.remove('full');
        const u = el.querySelector('button[data-click="toggleFull"] use'); if (u) u.setAttribute('href', 'lib/icons.svg#i-expand');
    });
    autosize();
}
export function toggleFull(id) {
    const el = $(id), on = !el.classList.contains('full');
    exitFull();
    if (!on) return;
    el.classList.add('full');
    const u = el.querySelector('button[data-click="toggleFull"] use'); if (u) u.setAttribute('href', 'lib/icons.svg#i-shrink');
    el.querySelector('textarea').focus();
}
$('query').addEventListener('input', autosize);
// Handy: Enter = neue Zeile (Senden mit dem Pfeil); Tastatur am Rechner: Enter sendet, Umschalt+Enter = neue Zeile
$('query').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !window.matchMedia('(pointer: coarse)').matches) { e.preventDefault(); askGemma(); }
});
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.full')) exitFull(); else closeAll();
});
// Tastatur oder Splitscreen: ist wenig Platz, geben Modusleiste, Zaehler, Aktionen und Kontext ihn an den Chat ab
function setKbd() {
    const a = document.activeElement;
    const small = (window.visualViewport ? window.visualViewport.height : window.innerHeight) < 560;
    document.body.classList.toggle('kbd', small && a === $('query'));
    document.body.classList.toggle('kbd-ctx', small && a === $('context'));
}
['focusin', 'focusout'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(setKbd, 0); }); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', setKbd);
