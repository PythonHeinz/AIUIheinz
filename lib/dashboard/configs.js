/* lib/dashboard/configs.js – Konfigurationen im Dashboard: aktuellen Stand benannt speichern und eine gespeicherte laden.
 * ES module (docs/MODULE.md). Die Ablage liegt in lib/providers.js (PV.configs …), die Verwaltung (umbenennen, löschen, exportieren,
 * dem Heinz Chat zuweisen) auf der Hub-Seite „Konfigurationen“ (tools/configs). Eine Konfiguration = Engine, Modell, Person, Prompt, Ton
 * und ein Abbild der Laufzeit. Kein Höchstwert für die Anzahl.
 * Laden: Person, Prompt, Ton und Laufzeit werden gesetzt; Modell und Engine nur, wenn die Konfiguration zur aktuellen Engine gehört
 * (sonst steht ein Hinweis mit dem Modell, das gewählt werden soll). */

import { $, PV } from './base.js';
import { buildOptions } from './build.js';
import { hooks } from './hooks.js';
import { t } from './i18n.js';
import { isNative, promptChanged, showTone } from './params.js';
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
export function useConfigInChat() {
    const id = $('cfg-load').value, c = PV.configById(id);
    if (!c) return;
    const on = PV.chatConfigId() === id;
    PV.setChatConfig(on ? '' : id);
    renderConfigs();
    note(t(on ? 'cfgUnassigned' : 'cfgAssigned', { n: c.name }));
}
export function loadConfig() {
    const c = PV.configById($('cfg-load').value);
    if (!c) return;
    const parts = [];
    // 1. Engine und Modell (nur innerhalb der aktuellen Engine; sonst Hinweis)
    const cur = $('model-select').value || settings.model || '';
    if (c.provider !== settings.provider) parts.push(t('cfgOtherEngine', { m: c.model, e: (PV.get(c.provider) || {}).name || c.provider }));
    else if (c.model && c.model !== cur) {
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
    note(parts.length ? t('cfgLoadedPart', { n: c.name, h: parts.join(' ') }) : t('cfgLoaded', { n: c.name }));
}
