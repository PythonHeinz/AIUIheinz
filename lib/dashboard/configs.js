/* lib/dashboard/configs.js – Konfigurationen im Dashboard: aktuellen Stand benannt speichern und eine gespeicherte laden.
 * ES module (docs/MODULE.md). Die Ablage liegt in lib/providers.js (PV.configs …), die Verwaltung (umbenennen, löschen, exportieren,
 * dem Heinz Chat zuweisen) auf der Hub-Seite „Konfigurationen“ (tools/configs). Eine Konfiguration = Engine, Modell, Person, Prompt, Ton
 * und ein Abbild der Laufzeit. Kein Höchstwert für die Anzahl.
 * Laden: Engine, Modell, Person, Prompt, Ton und Laufzeit werden gesetzt; gehört die Konfiguration zu einer anderen Engine, wechselt das Dashboard dorthin
 * (Online-Engines nur mit „Online erlauben“; ist das Modell nicht installiert, steht ein Hinweis).
 * Zuordnung Modell → Konfiguration (PV.setModelConfig): Wird ein Modell geladen (App-Start, Modellwechsel), lädt seine zugeordnete Konfiguration
 * automatisch mit (applyModelConfig). Der Heinz Chat ist davon getrennt (Knopf „Im Heinz Chat verwenden“, eigene Zuweisung).
 * Die Wissensabfrage hat einen eigenen Schalter über dem Eingabefeld (lib/dashboard/wissen.js); die Konfiguration trägt nur ihre Voreinstellung (Feld `wissen`).
 * Kontext und Threads sind Teil der Konfiguration: das Dashboard setzt sie nur für seine eigene Arbeit (der Heinz Chat liest sie aus seiner Konfiguration). */

import { $, PV, setzeWissen, wissenZustand } from './base.js';
import { buildOptions } from './build.js';
import { hooks } from './hooks.js';
import { t } from './i18n.js';
import { isNative, promptChanged, showTone, syncSliders } from './params.js';
import { saveSettings } from './persist.js';
import { readSliders, setSliders } from './sliders.js';
import { loadThreads } from './settings.js';
import { settings, state } from './state.js';

function note(msg) { const n = $('cfg-note'); if (n) n.textContent = msg || ''; }

// Der aktuelle Stand als Konfiguration (ohne Namen)
export function currentConfig() {
    const mode = settings.mode, preset = state.MODE_PRESETS[mode];
    const P = state.PROMPTS[settings.lang];
    const prompt = promptChanged() ? (settings.ownPrompt || '') : isNative() ? '' : P[mode];
    const o = buildOptions(preset);
    const tone = {};
    ['temperature', 'top_p', 'top_k'].forEach(function (k) { if (o[k] !== undefined) tone[k] = o[k]; });
    const w = wissenZustand(); w.quellen = w.quellen.slice();   // Wissensabfrage: nur der Zustand des Schalters; aus = Feld fehlt
    return Object.assign({
        provider: settings.provider, model: $('model-select').value || settings.model || '', person: mode, prompt: prompt,
        tone: Object.keys(tone).length ? tone : null, stop: o.stop ? o.stop.slice() : [],
        runtime: { ctx: parseInt($('param-ctx').value, 10), threads: parseInt($('param-threads').value, 10) }
    }, w.an ? { wissen: w } : {});
}
let selId = '';   // die zuletzt bediente Konfiguration der Liste (Aktionen ohne Zeile, z. B. aus Tests, nehmen sie)
const esc = function (x) { return String(x).replace(/[<>&"]/g, ''); };
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
function icon(n) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); s.setAttribute('class', 'i sm'); u.setAttribute('href', 'lib/icons.svg#i-' + n); s.appendChild(u); return s; }
let openMenuId = '';
export function renderConfigs() {
    const box = $('cfg-list'); if (!box) return;
    const cur = $('model-select').value || settings.model || '';
    const list = PV.configs().slice().sort(function (a, b) {
        const ac = a.model === cur && a.provider === settings.provider ? 0 : 1, bc = b.model === cur && b.provider === settings.provider ? 0 : 1;
        return ac - bc || a.name.localeCompare(b.name);
    });
    if (!list.some(function (c) { return c.id === selId; })) selId = list.length ? list[0].id : '';
    const chatId = PV.chatConfigId();
    box.textContent = '';
    list.forEach(function (c) {
        const mOn = PV.modelConfigId(c.provider, c.model) === c.id, cOn = chatId === c.id, shut = openMenuId !== c.id;
        const row = el('div', 'cfg-row'); row.dataset.id = c.id;
        const top = el('div', 'cfg-top'), tx = el('span', 'tx');
        const badges = [mOn ? t('cfgBadgeModel') : '', cOn ? t('cfgBadgeChat') : ''].filter(Boolean).join(' · ');
        tx.append(el('b', 'cfg-name', esc(c.name)), el('small', '', esc(c.model) + ' · ' + (state.MODE_PRESETS[c.person] ? t('mb_' + c.person) : esc(c.person || '')) + (badges ? ' · ' + badges : '')));
        const load = el('button', 'pill cfg-do-load', t('cfgLoad')); load.type = 'button';
        const more = el('button', 'round cfg-more' + (shut ? '' : ' open')); more.type = 'button'; more.setAttribute('aria-label', t('cfgMore')); more.title = t('cfgMore'); more.appendChild(icon('dots'));
        top.append(tx, load, more);
        const menu = el('div', 'cfg-menu'); menu.hidden = shut;
        const b1 = el('button', 'pill cfg-do-model' + (mOn ? ' on' : ''), t(mOn ? 'cfgModelOn' : 'cfgModel')), b2 = el('button', 'pill cfg-do-chat' + (cOn ? ' on' : ''), t(cOn ? 'cfgUseOn' : 'cfgUse'));
        const b3 = el('button', 'pill cfg-do-rename', t('cfgRename')), b4 = el('button', 'pill danger cfg-do-del', t('cfgDelete'));
        [b1, b2, b3, b4].forEach(function (b) { b.type = 'button'; });
        menu.append(b1, b2, b3, b4); row.append(top, menu); box.appendChild(row);
        load.onclick = function () { selId = c.id; loadConfig(c.id); };
        more.onclick = function () { openMenuId = openMenuId === c.id ? '' : c.id; renderConfigs(); };
        b1.onclick = function () { selId = c.id; assignModelConfig(c.id); };
        b2.onclick = function () { selId = c.id; useConfigInChat(c.id); };
        b3.onclick = function () { renameStart(row, c); };
        let sure = 0;
        b4.onclick = function () {
            if (!sure) { sure = setTimeout(function () { sure = 0; b4.classList.remove('sure'); b4.textContent = t('cfgDelete'); }, 3000); b4.classList.add('sure'); b4.textContent = t('cfgDeleteSure'); return; }
            clearTimeout(sure); PV.deleteConfig(c.id); openMenuId = ''; renderConfigs(); note(t('cfgDeleted', { n: c.name }));
        };
    });
    $('cfg-empty').hidden = !!list.length;
    const mi = $('mz-cfgs'); if (mi) mi.textContent = t('mzCfgN', { n: list.length });
}
function renameStart(row, c) {
    const nm = row.querySelector('.cfg-name'), inp = el('input', 'inp'); inp.type = 'text'; inp.maxLength = 80; inp.value = c.name; inp.setAttribute('aria-label', t('cfgRename'));
    nm.replaceWith(inp); inp.focus(); inp.select();
    let done = false;
    const fin = function (ok) {
        if (done) return; done = true;
        if (ok && inp.value.trim() && PV.renameConfig(c.id, inp.value)) note(t('cfgRenamed', { n: inp.value.trim() }));
        renderConfigs();
    };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fin(true); } else if (e.key === 'Escape') fin(false); });
    inp.addEventListener('blur', function () { fin(true); });
}
export function saveConfig() {
    const name = $('cfg-name').value.trim();
    if (!name) { note(t('cfgNameFirst')); return; }
    if (!($('model-select').value || settings.model)) { note(t('cfgNoModel')); return; }
    const c = currentConfig(); c.name = name;
    const stored = PV.saveConfig(c);
    $('cfg-name').value = '';
    if (stored) selId = stored.id;
    renderConfigs();
    note(t('cfgSaved', { n: name }));
}
// Zuordnung Modell → Konfiguration: die gewählte Konfiguration gehört zu ihrem Modell und lädt künftig mit ihm. Zweiter Tipp löst die Zuordnung.
export function assignModelConfig(id) {
    id = id || selId; const c = PV.configById(id);
    if (!c) return;
    const on = PV.modelConfigId(c.provider, c.model) === id;
    PV.setModelConfig(c.provider, c.model, on ? '' : id);
    renderConfigs();
    note(t(on ? 'cfgModelUnassigned' : 'cfgModelAssigned', { n: c.name, m: c.model }));
}
export function useConfigInChat(id) {
    id = id || selId; const c = PV.configById(id);
    if (!c) return;
    const on = PV.chatConfigId() === id;
    PV.setChatConfig(on ? '' : id);
    renderConfigs();
    note(t(on ? 'cfgUnassigned' : 'cfgAssigned', { n: c.name }));
}
// Aufruf aus dem Hub („Jetzt parametrieren“): /dashboard.html?config=<Id> (oder „default“ für die Standardkonfiguration des Heinz Chat). Die Konfiguration
// lädt, sobald die Modellliste da ist (applyModelConfig); danach verschwindet der Parameter aus der Adresse.
state.openConfig = new URLSearchParams(location.search).get('config') || '';
function cfgById(id) { return id === PV.DEFAULT_CONFIG_ID ? PV.defaultChatConfig() : PV.configById(id); }
export function loadConfig(id) {
    const c = cfgById(id || selId);
    if (c) applyConfig(c, false);
}
// auto = true: die dem Modell zugeordnete Konfiguration lädt mit dem Modell (Modell und Engine stimmen schon); Hinweis erscheint als Band.
function applyConfig(c, auto) {
    if (c.builtin) c = Object.assign({}, c, { name: t('cfgDefaultName'), person: c.person || 'native' });
    const parts = [];
    // 1. Engine und Modell: die Konfiguration gehört zu ihrer Engine, also wechselt das Dashboard dorthin (Online-Engines nur mit „Online erlauben“)
    const eng = PV.get(c.provider);
    if (c.model) state.cfgKey = c.provider + '|' + c.model;   // ausdrücklich geladen: die Zuordnung des Modells überschreibt sie nicht
    if (c.provider !== settings.provider) {
        if (!eng) parts.push(t('cfgNoEngine', { e: c.provider }));
        else if (!eng.local && !PV.onlineAllowed()) parts.push(t('cfgEngineLocked', { e: eng.name }));
        else {
            settings.modelByProvider[c.provider] = c.model || settings.modelByProvider[c.provider];
            hooks.call('pickEngine', c.provider); parts.push(t('cfgOtherEngine', { e: eng.name }));
        }
    }
    const cur = $('model-select').value || settings.model || '';
    if (c.provider === settings.provider && c.model && c.model !== cur) {
        const has = Array.prototype.some.call($('model-select').options, function (o) { return o.value === c.model; });
        if (has) { $('model-select').value = c.model; hooks.call('onModelChange'); }
        else parts.push(t('cfgNoSuchModel', { m: c.model }));
    }
    // 2. Person (setzt Vorgaben für Prompt und Ton)
    if (state.MODE_PRESETS[c.person] && c.person !== settings.mode) hooks.call('pickPerson', c.person);
    // 3. Prompt: gleicht er der Vorgabe der Person, bleibt die Vorgabe; sonst ist er der eigene Text
    const P = state.PROMPTS[settings.lang];
    const base = isNative() ? '' : P[settings.mode];
    if (c.prompt === base) settings.ownOn = false; else { settings.ownOn = true; settings.ownPrompt = c.prompt; }
    // 3b. Wissen: Voreinstellung der Konfiguration setzt den Schalter (fehlt das Feld, bleibt er wie er ist)
    if (c.wissen) setzeWissen(c.wissen);
    // 4. Ton und Laufzeit
    const rt = c.runtime || {}, ctx = rt.ctx > 0 ? rt.ctx : readSliders().ctx;
    if (c.tone && c.tone.temperature !== undefined) {
        setSliders(c.tone.temperature, c.tone.top_p !== undefined ? c.tone.top_p : readSliders().topp, c.tone.top_k !== undefined ? c.tone.top_k : readSliders().topk, ctx);
        if (isNative()) settings.toneOn = true;
    } else { const v = readSliders(); setSliders(v.temp, v.topp, v.topk, ctx); }
    settings.params = readSliders();
    if (typeof rt.threads === 'number') { if (!settings.threads) settings.threads = {}; settings.threads[$('model-select').value || settings.model] = rt.threads; loadThreads(); }
    saveSettings(); hooks.call('schedulePreload'); hooks.call('renderPrompts'); showTone();
    // sichtbarer Hinweis: das Laden schreibt still die geteilte Laufzeit (gilt für Dashboard und Heinz Chat)
    const rtNote = t('cfgRuntimeSet', { c: readSliders().ctx, t: $('param-threads').value });
    const msg = (parts.length ? t('cfgLoadedPart', { n: c.name, h: parts.join(' ') }) : t(auto ? 'cfgAutoLoaded' : 'cfgLoaded', { n: c.name, m: c.model })) + ' ' + rtNote;
    note(msg); showAuto(msg);
}
let autoTimer = 0;
function showAuto(msg) {
    const el = $('cfg-auto'); if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(autoTimer); autoTimer = setTimeout(function () { el.hidden = true; }, 12000);
}
// Das Modell wurde geladen (App-Start, Modellwechsel): seine zugeordnete Konfiguration lädt mit. Pro Modell nur einmal je Wechsel,
// damit Laden der Modellliste oder Neuzeichnen die Änderungen des Nutzers nicht überschreibt. Modell ohne Zuordnung: Standard;
// kam das Kontextfenster von der Konfiguration des vorigen Modells, geht es auf den Standard zurück (Laufzeit gehört zum Modell).
export function applyModelConfig() {
    if (state.openConfig) {
        const id = state.openConfig, want = cfgById(id);
        state.openConfig = '';
        try { history.replaceState(null, '', location.pathname); } catch (e) { /* the parameter just stays in the address */ }
        if (want) { state.cfgAuto = false; applyConfig(want, false); return; }
        note(t('cfgGone')); showAuto(t('cfgGone'));
    }
    const model = $('model-select').value || settings.model || '', key = settings.provider + '|' + model;
    if (!model || state.cfgKey === key) return;
    const prevAuto = state.cfgAuto;
    state.cfgKey = key; state.cfgAuto = false;
    const c = PV.modelConfig(settings.provider, model);
    if (c) { state.cfgAuto = true; applyConfig(c, true); return; }
    if (prevAuto) { $('param-ctx').value = PV.DEFAULT_CTX; loadThreads(); syncSliders(); }
}
