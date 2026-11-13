/* lib/dashboard/config.js – Konfiguration: Modellliste, Modus-Auswahl, Modell laden.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV } from './base.js';
import { renderCaps, renderModelSheet, renderThink, updateChip } from './caps.js';
import { hooks } from './hooks.js';
import { t } from './i18n.js';
import { applySavedParams } from './params.js';
import { saveSettings } from './persist.js';
import { loadThreads } from './settings.js';
import { FALLBACK_MODELS, settings, state } from './state.js';
import { checkServer, hs } from './status.js';

// ===== Konfiguration =====
export const OLLAMA_URL = 'http://localhost:11434';
let modelsReal = false;   // modelsReal: the list comes from the engine, not from the fallback
// bevorzugtes Modell des Modus, sonst Ersatz, sonst erstes installiertes
export function resolveModel(preset) {
    const want = [preset.model].concat(preset.alt || []);
    for (let i = 0; i < want.length; i++) if (state.MODELS.indexOf(want[i]) >= 0) return want[i];
    return state.MODELS[0] || preset.model;
}
export function fillModelSelect() {
    if (state.modelsFor !== settings.provider) { state.MODELS = settings.provider === 'ollama' ? FALLBACK_MODELS.slice() : []; state.modelsFor = settings.provider; }
    const sel = $('model-select');
    sel.innerHTML = '';
    const names = state.MODELS.slice();
    if (settings.provider !== 'ollama' && settings.model && names.indexOf(settings.model) < 0) names.unshift(settings.model);
    names.forEach(function (m) {
        const o = document.createElement('option');
        o.value = m; o.textContent = m;
        sel.appendChild(o);
    });
    if (!state.activeAdopted && (settings.provider !== 'ollama' || modelsReal)) {   // once per page load, with the real model list (the fallback list does not know e.g. heinz-fakt:latest)
        state.activeAdopted = true;
        const a = PV.activeModel();
        if (a && a.provider === settings.provider && (settings.provider !== 'ollama' || state.MODELS.indexOf(a.model) >= 0)) settings.model = a.model;
    }
    if (settings.provider === 'ollama' && state.MODELS.indexOf(settings.model) < 0) settings.model = resolveModel(state.MODE_PRESETS[settings.mode]);
    if (settings.provider !== 'ollama' && !settings.model) settings.model = names[0] || '';
    sel.value = settings.model;
    if (state.activeAdopted) PV.setActiveModel(settings.provider, settings.model);
    updateChip(); renderModelSheet();
    const mp = $('ml-pill'); if (mp) mp.hidden = settings.provider !== 'ollama' && state.MODELS.length > 0;
    $('eng-status').classList.toggle('tappable', state.MODELS.length > 0 && settings.provider !== 'ollama');
    renderCaps(); renderThink();
}
function setEngStatus(msg) { $('eng-status').textContent = msg || ''; }
let modelsSeq = 0, modelsAbort = null;
export async function loadModels() {
    const prov = settings.provider;
    const p = PV.get(prov);
    // Nur der jüngste Abruf zählt: ein älterer, langsamerer Abruf darf die Liste nicht überschreiben
    const seq = ++modelsSeq;
    if (modelsAbort) modelsAbort.abort();
    modelsAbort = new AbortController();
    setEngStatus(prov === 'ollama' ? '' : t('modelsLoading'));
    try {
        const names = await PV.models(prov, modelsAbort.signal);
        if (seq !== modelsSeq) return;
        if (prov !== settings.provider) return;   // Engine wurde inzwischen gewechselt
        if (names.length) {
            state.MODELS = names; state.modelsFor = prov; modelsReal = true; hs[prov] = true; checkServer();
            // Ein gewähltes Modell wird nie durch die Liste ersetzt (auch wenn eine kurze oder andere Liste es nicht enthält);
            // nur wenn für diese Engine noch nichts gewählt wurde, kommt der erste Eintrag als Vorschlag.
            if (prov !== 'ollama' && !settings.model) settings.model = settings.modelByProvider[prov] || names[0];
            const before = settings.model;
            fillModelSelect(); saveSettings(); loadThreads();
            if (settings.model !== before) { applySavedParams(); hooks.call('schedulePreload'); }   // model taken over from another page
            if (prov !== 'ollama') setEngStatus(PV.modelNote && PV.modelNote.engine === prov ? t('modelsNativeFail', { n: names.length, m: PV.modelNote.message }) : t('modelsDone', { n: names.length }));
        } else if (prov !== 'ollama') { state.MODELS = []; fillModelSelect(); setEngStatus(t('noModels')); }
    } catch (e) {
        if (e.name === 'AbortError' || seq !== modelsSeq) return;   // von einem neueren Abruf abgelöst
        if (prov === 'ollama') return;   /* Ollama nicht erreichbar: Fallback-Liste bleibt */
        state.MODELS = []; fillModelSelect(); hs[prov] = false; checkServer();
        if (e.code === 'ONLINE_BLOCKED') setEngStatus(t('onlineBlocked'));
        else if (e.code === 'NO_KEY') setEngStatus(t('needKey'));
        else setEngStatus(t('modelsFail', { m: e.message }));
    }
}
