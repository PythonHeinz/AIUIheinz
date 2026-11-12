/* lib/dashboard/init.js – Start der Seite: Daten laden, gespeicherte Einstellungen und Unterhaltung einsetzen, Oberfläche aufbauen.
 * ES module (docs/MODULE.md): called once by main.js. Reports "ready" on window.HeinzDashboard (facade, main.js). */

import { $, Heinz, HeinzCaps, HeinzDashboardData, HeinzPersonas, HeinzStore, PV } from './base.js';
import { autosize, renderCaps, renderQuick, renderThink, updateCtxCount } from './caps.js';
import { fillModelSelect, loadModels } from './config.js';
import { renderSavedList } from './conversations.js';
import { fillProviderSelect, normalizeMode, renderEngineUI } from './engine.js';
import { applyI18n } from './i18n.js';
import { renderChatFromHistory } from './messages.js';
import { showStoreProblem } from './persist.js';
import { schedulePreload, updateLangBtn } from './preload.js';
import { applySavedParams } from './quick.js';
import { srRestore } from './series.js';
import { loadThreads, setSliders } from './settings.js';
import { renderSpeedTest } from './speedtest.js';
import { settings, state } from './state.js';
import { checkServer } from './status.js';
import { showVersion } from './update.js';

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
    if (s.mode) settings.mode = normalizeMode(s.mode);
    if (s.lang === 'de' || s.lang === 'en') settings.lang = s.lang;
    settings.theme = Heinz.theme;
    settings.useDefault = !!s.useDefault;
    settings.modesOnly = !!s.modesOnly;
    settings.sysSrc = s.sysSrc === 'own' || s.sysSrc === 'model' ? s.sysSrc : (s.ownSystem ? 'model' : 'mode');
    // Einmalig: Die Persona steckt nicht mehr im Modell (Regel 9). Ein früher gesetztes „Modell-Systemprompt“ würde Wilson/Heinz stumm schalten.
    if (!s.personasExternal) { if (settings.sysSrc === 'model') settings.sysSrc = 'mode'; settings.personasExternal = true; }
    settings.ownSystem = settings.sysSrc === 'model'; settings.ownPrompt = typeof s.ownPrompt === 'string' ? s.ownPrompt : '';
    settings.preload = s.preload !== false;
    settings.fast = !!s.fast;
    if (s.backend === 'gpu') settings.backend = 'gpu';
    if (s.modelByProvider && typeof s.modelByProvider === 'object') settings.modelByProvider = s.modelByProvider;
    if (s.provider && PV.get(s.provider) && (PV.get(s.provider).local || PV.onlineAllowed())) settings.provider = s.provider;
    if (s.fastN > 0) settings.fastN = parseInt(s.fastN, 10);
    if (s.threads && typeof s.threads === 'object') settings.threads = s.threads;
    if (s.params && isFinite(s.params.temp)) settings.params = s.params;
    if (s.modelParams && typeof s.modelParams === 'object') settings.modelParams = s.modelParams;
    if (s.paramSrcBy && typeof s.paramSrcBy === 'object') settings.paramSrcBy = s.paramSrcBy;
    if (s.thinkBy && typeof s.thinkBy === 'object') settings.thinkBy = s.thinkBy;

    const cur = HeinzStore.get('heinz_current', null);
    if (cur && Array.isArray(cur.messages) && cur.messages.length) {
        if (cur.provider && PV.get(cur.provider) && (PV.get(cur.provider).local || PV.onlineAllowed())) settings.provider = cur.provider;
        settings.model = cur.model || settings.model;
        settings.mode = normalizeMode(cur.mode || settings.mode);
        state.chatHistory = cur.messages;
        state.currentSavedId = cur.savedId || null; state.currentName = cur.name || '';
        $('context').value = cur.context || '';
    }

    // Engine und Modell kommen immer als Paar: Wurde die gespeicherte Engine abgelehnt (zum Beispiel Online aus),
    // gehört das gespeicherte Modell zu einer anderen Engine und wird nicht übernommen.
    const modelOwner = (cur && Array.isArray(cur.messages) && cur.messages.length && cur.provider) ? cur.provider : (s.provider || 'ollama');
    if (settings.provider !== modelOwner) settings.model = (settings.modelByProvider && settings.modelByProvider[settings.provider]) || '';

    // Regler: gespeicherte Werte, sonst Preset des Modus
    settings.mode = normalizeMode(settings.mode);
    const pr = state.MODE_PRESETS[settings.mode];
    const pm = settings.params || { temp: pr.temp, topp: pr.top_p, topk: pr.top_k, ctx: 8192 };
    setSliders(pm.temp, pm.topp, pm.topk, pm.ctx || 8192);

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
