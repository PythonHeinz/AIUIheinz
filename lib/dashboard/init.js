/* lib/dashboard/init.js – Start der Seite: Daten laden, gespeicherte Einstellungen und Unterhaltung einsetzen, Oberfläche aufbauen.
 * ES module (docs/MODULE.md): called once by main.js. Reports "ready" on window.HeinzDashboard (facade, main.js). */

import { $, Heinz, HeinzCaps, HeinzDashboardData, HeinzPersonas, HeinzStore, PV } from './base.js';
import { autosize, renderCaps, renderModelSheet, renderQuick, renderThink, updateChatBar, updateCtxCount } from './caps.js';
import { fillModelSelect, loadModels } from './config.js';
import { renderSavedList, saveCurrentToList } from './conversations.js';
import { fillProviderSelect, normalizeMode, renderEngineUI } from './engine.js';
import { hooks } from './hooks.js';
import { applyI18n, t } from './i18n.js';
import { setSheetTitle } from './menu.js';
import { chatBox, renderChatFromHistory } from './messages.js';
import { applySavedParams, startOnHeinz } from './params.js';
import { renderStoreNote, showStoreProblem } from './persist.js';
import { applyModeStyling, onModelChange, renderMarks, schedulePreload, updateLangBtn } from './preload.js';
import { pickEngine } from './quick.js';
import { askGemma } from './send.js';
import { srGate, srPlan, srRestore } from './series.js';
import { loadThreads, renderPrompts } from './settings.js';
import { setSliders } from './sliders.js';
import { renderSpeedTest } from './speedtest.js';
import { settings, state } from './state.js';
import { checkServer } from './status.js';
import { showVersion } from './update.js';

// ===== Rückrufe für die unteren Dateien (hooks.js): vor dem ersten Aufruf registriert =====
hooks.on('applyUIFromSettings', applyUIFromSettings);
hooks.on('askGemma', askGemma);
hooks.on('onModelChange', onModelChange);
hooks.on('pickEngine', pickEngine);
hooks.on('renderMarks', renderMarks);
hooks.on('renderModelSheet', renderModelSheet);
hooks.on('renderPrompts', renderPrompts);
hooks.on('renderQuick', renderQuick);
hooks.on('renderSavedList', renderSavedList);
hooks.on('repaintLang', function () {
    const ph = chatBox.querySelector('.placeholder');
    if (ph && !state.chatHistory.length) ph.textContent = ph.getAttribute('data-new') ? t('readyNew') : t('ready');
    applyModeStyling();
    renderSavedList();
    renderEngineUI();
    setSheetTitle(); updateCtxCount();
    renderStoreNote();
});
hooks.on('schedulePreload', schedulePreload);
hooks.on('srGate', srGate);
hooks.on('srPlan', srPlan);
hooks.on('updateChatBar', updateChatBar);

// ===== Start =====
export function applyUIFromSettings() {
    settings.mode = normalizeMode(settings.mode);
    fillModelSelect();
    loadThreads();
    $('mode-select').value = settings.mode;
    fillProviderSelect();
    renderEngineUI();
    updateLangBtn();
    applyI18n();
}
// Daten aus lib/data einsetzen (Texte, Modi, Prüfsätze); Persona-Werte kommen aus lib/personas.js.
function applyDashboardData(D) {
    state.I18N = D.i18n;
    state.PROMPTS = {};
    ['en', 'de'].forEach(function (l) {
        state.PROMPTS[l] = Object.assign({}, D.modes.prompts[l]);
        state.PROMPTS[l].wilson = HeinzPersonas.get('wilson').system;   // personas live outside the models: lib/personas.js
        state.PROMPTS[l].heinz = HeinzPersonas.get('heinz').system;
    });
    state.MODE_PRESETS = {};
    Object.keys(D.modes.presets).forEach(function (m) {
        const d = D.modes.presets[m], p = d.persona ? HeinzPersonas.get(d.persona) : null, o = {};
        if (p) { o.temp = p.options.temperature; o.top_p = p.options.top_p; o.top_k = p.options.top_k; o.model = p.model; o.alt = p.alt; o.stop = p.stop; }
        Object.keys(d).forEach(function (k) { if (k !== 'persona') o[k] = d[k]; });
        state.MODE_PRESETS[m] = o;
    });
    state.ST_SHORT = D.bench.speedtest.short;
    state.ST_LONG = D.bench.speedtest.longIntro + D.bench.speedtest.longFill.repeat(D.bench.speedtest.longRepeat);
    state.SR_AXES = D.bench.seriesAxes;
}
export async function initDashboard() {
    await HeinzStore.open();
    HeinzStore.onProblem(showStoreProblem);
    applyDashboardData(await HeinzDashboardData.load());
    const s = HeinzStore.get('heinz_settings', {});
    if (s.model) settings.model = s.model;
    const prevMode = normalizeMode(s.mode || 'heinz');   // die App startet immer auf Heinz; die letzte Person liefert nur die Startwerte der Regler
    if (s.lang === 'de' || s.lang === 'en') settings.lang = s.lang;
    settings.theme = Heinz.theme;
    // Die frühere Quellenwahl (Modell/Modus/Eigene, „Nur Modus-Vorgaben“) gibt es nicht mehr. Ihre Schlüssel werden nicht gelöscht
    // (Rückfall), aber weder gelesen noch benutzt: sie bleiben nur beim Speichern erhalten.
    ['sysSrc', 'paramSrcBy', 'modesOnly', 'ownSystem', 'useDefault', 'personasExternal'].forEach(function (k) { if (k in s) settings[k] = s[k]; });
    settings.ownPrompt = typeof s.ownPrompt === 'string' ? s.ownPrompt : '';
    settings.ownOn = !!s.ownOn; settings.toneOn = !!s.toneOn;
    settings.preload = s.preload !== false;
    settings.fast = !!s.fast;
    if (s.backend === 'gpu') settings.backend = 'gpu';
    if (s.modelByProvider && typeof s.modelByProvider === 'object') settings.modelByProvider = s.modelByProvider;
    if (s.provider && PV.get(s.provider) && (PV.get(s.provider).local || PV.onlineAllowed())) settings.provider = s.provider;
    if (s.fastN > 0) settings.fastN = parseInt(s.fastN, 10);
    if (s.threads && typeof s.threads === 'object') settings.threads = s.threads;
    if (s.params && isFinite(s.params.temp)) settings.params = s.params;
    if (s.modelParams && typeof s.modelParams === 'object') settings.modelParams = s.modelParams;
    if (s.lastStand && typeof s.lastStand === 'object') settings.lastStand = s.lastStand;
    if (s.thinkBy && typeof s.thinkBy === 'object') settings.thinkBy = s.thinkBy;

    const cur = HeinzStore.get('heinz_current', null);
    if (cur && Array.isArray(cur.messages) && cur.messages.length) {
        if (cur.provider && PV.get(cur.provider) && (PV.get(cur.provider).local || PV.onlineAllowed())) settings.provider = cur.provider;
        settings.model = cur.model || settings.model;
        state.chatHistory = cur.messages;
        state.currentSavedId = cur.savedId || null; state.currentName = cur.name || '';
        $('context').value = cur.context || '';
        if (normalizeMode(cur.mode || 'heinz') !== 'heinz') {
            // Die App startet auf Heinz: die offene Unterhaltung einer anderen Person geht unter ihrer Person in die Liste (nichts geht verloren).
            settings.mode = normalizeMode(cur.mode);
            saveCurrentToList();
            state.chatHistory = []; state.currentSavedId = null; state.currentName = ''; $('context').value = '';
            HeinzStore.remove('heinz_current');
        }
    }

    // Engine und Modell kommen immer als Paar: Wurde die gespeicherte Engine abgelehnt (zum Beispiel Online aus),
    // gehört das gespeicherte Modell zu einer anderen Engine und wird nicht übernommen.
    const modelOwner = (cur && Array.isArray(cur.messages) && cur.messages.length && cur.provider) ? cur.provider : (s.provider || 'ollama');
    if (settings.provider !== modelOwner) settings.model = (settings.modelByProvider && settings.modelByProvider[settings.provider]) || '';

    // Regler: gespeicherte Werte, sonst Vorgabe der letzten Person; danach Start auf Heinz auf seiner Vorgabe
    const pr = state.MODE_PRESETS[prevMode] || state.MODE_PRESETS.heinz;
    const pm = settings.params || { temp: pr.temp || 0.7, topp: pr.top_p || 0.9, topk: pr.top_k || 40, ctx: 8192 };
    setSliders(pm.temp, pm.topp, pm.topk, pm.ctx || 8192);
    settings.params = { temp: pm.temp, topp: pm.topp, topk: pm.topk, ctx: pm.ctx || 8192 };
    startOnHeinz(prevMode);

    applyUIFromSettings(); applySavedParams();
    renderChatFromHistory();
    renderSavedList();
    autosize(); updateCtxCount();
    checkServer();
    if (HeinzCaps) HeinzCaps.load().then(function () { renderQuick(); renderCaps(); renderThink(); });
    loadModels().then(schedulePreload);
    setInterval(function () { if (!document.hidden) checkServer(); }, 10000);   // Ampel folgt dem echten Zustand (z. B. Modell geht nach keep_alive schlafen)
    showVersion();
    const lastSt = HeinzStore.get('heinz_speedtest', null);
    if (lastSt && Array.isArray(lastSt.rows)) { state.stRows = lastSt.rows; state.stMeta = lastSt.meta; renderSpeedTest(); }
    srRestore();
    window.HeinzDashboard.ready = true;
}
