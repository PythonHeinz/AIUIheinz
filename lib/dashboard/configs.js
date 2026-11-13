/* lib/dashboard/configs.js – Konfigurationen im Dashboard: aktuellen Stand benannt speichern und eine gespeicherte laden.
 * ES module (docs/MODULE.md). Die Ablage liegt in lib/providers.js (PV.configs …), die Verwaltung (umbenennen, löschen, exportieren,
 * dem Heinz Chat zuweisen) auf der Hub-Seite „Konfigurationen“ (tools/configs). Eine Konfiguration = Engine, Modell, Person, Prompt, Ton
 * und ein Abbild der Laufzeit. Kein Höchstwert für die Anzahl.
 * Laden: Engine, Modell, Person, Prompt, Ton und Laufzeit werden gesetzt; gehört die Konfiguration zu einer anderen Engine, wechselt das Dashboard dorthin
 * (Online-Engines nur mit „Online erlauben“; ist das Modell nicht installiert, steht ein Hinweis).
 * Zuordnung Modell → Konfiguration (PV.setModelConfig): Wird ein Modell geladen (App-Start, Modellwechsel), lädt seine zugeordnete Konfiguration
 * automatisch mit (applyModelConfig). Der Heinz Chat ist davon getrennt (Knopf „Im Heinz Chat verwenden“, eigene Zuweisung).
 * Kontext und Threads sind Teil der Konfiguration: das Dashboard setzt sie nur für seine eigene Arbeit (der Heinz Chat liest sie aus seiner Konfiguration). */

import { $, PV } from './base.js';
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
    return {
        provider: settings.provider, model: $('model-select').value || settings.model || '', person: mode, prompt: prompt,
        tone: Object.keys(tone).length ? tone : null, stop: o.stop ? o.stop.slice() : [],
        runtime: { ctx: parseInt($('param-ctx').value, 10), threads: parseInt($('param-threads').value, 10) }
    };
}
export function renderConfigs() {
    const sel = $('cfg-load'); if (!sel) return;
    const keep = sel.value, cur = $('model-select').value || settings.model || '';
    const list = PV.configs().slice().sort(function (a, b) {
        const ac = a.model === cur && a.provider === settings.provider ? 0 : 1, bc = b.model === cur && b.provider === settings.provider ? 0 : 1;
        return ac - bc || a.name.localeCompare(b.name);
    });
    sel.innerHTML = list.map(function (c) { return '<option value="' + c.id + '">' + c.name.replace(/[<>&"]/g, '') + ' · ' + c.model.replace(/[<>&"]/g, '') + '</option>'; }).join('');
    if (list.some(function (c) { return c.id === keep; })) sel.value = keep;
    $('cfg-load-btn').disabled = !list.length;
    const use = $('cfg-use'), assigned = PV.chatConfigId();
    if (use) { use.disabled = !list.length; use.classList.toggle('on', !!assigned && sel.value === assigned); $('cfg-use-t').textContent = t(assigned && sel.value === assigned ? 'cfgUseOn' : 'cfgUse'); }
    const mb = $('cfg-model'), sc = PV.configById(sel.value), mOn = !!sc && PV.modelConfigId(sc.provider, sc.model) === sc.id;
    if (mb) { mb.disabled = !list.length; mb.classList.toggle('on', mOn); $('cfg-model-t').textContent = t(mOn ? 'cfgModelOn' : 'cfgModel'); }
    $('cfg-empty').hidden = !!list.length;
}
export function saveConfig() {
    const name = $('cfg-name').value.trim();
    if (!name) { note(t('cfgNameFirst')); return; }
    if (!($('model-select').value || settings.model)) { note(t('cfgNoModel')); return; }
    const c = currentConfig(); c.name = name;
    const stored = PV.saveConfig(c);
    $('cfg-name').value = '';
    renderConfigs();
    if (stored) $('cfg-load').value = stored.id;
    note(t('cfgSaved', { n: name }));
}
// Zuordnung Modell → Konfiguration: die gewählte Konfiguration gehört zu ihrem Modell und lädt künftig mit ihm. Zweiter Tipp löst die Zuordnung.
export function assignModelConfig() {
    const id = $('cfg-load').value, c = PV.configById(id);
    if (!c) return;
    const on = PV.modelConfigId(c.provider, c.model) === id;
    PV.setModelConfig(c.provider, c.model, on ? '' : id);
    renderConfigs();
    note(t(on ? 'cfgModelUnassigned' : 'cfgModelAssigned', { n: c.name, m: c.model }));
}
export function useConfigInChat() {
    const id = $('cfg-load').value, c = PV.configById(id);
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
export function loadConfig() {
    const c = cfgById($('cfg-load').value);
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
