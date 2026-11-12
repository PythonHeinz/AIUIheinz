/* lib/dashboard/config.js – Konfiguration: Modellliste, Modus-Auswahl, Modell laden.
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

// ===== Konfiguration =====
const OLLAMA_URL = 'http://localhost:11434';
const PV = window.HeinzProviders;

// Definitionen liegen als Daten in lib/data (modes.json, dashboard.i18n.json, dashboard.json); sie werden vor dem Start geladen (HeinzDashboardData).
let PROMPTS = { en: {}, de: {} };

// Modus-Presets: Modell + Sampling. Bei kleinen Modellen bewusst polarisiert.
// Fallback-Liste, solange /api/tags nicht antwortet; danach gilt die echte Liste von Ollama.
const FALLBACK_MODELS = ['gemma2:2b', 'qwen2.5:3b', 'gemma:2b'];
let MODELS = FALLBACK_MODELS.slice(), modelsFor = 'ollama', modelsReal = false;   // modelsReal: the list comes from the engine, not from the fallback
// Modus = Daten: model (bevorzugt), alt (Ersatz, falls nicht installiert), stop (Stoppsequenzen).
// Modell ist in jedem Modus frei wählbar (Modus und Modell sind getrennte Angaben).
let MODE_PRESETS = {};
// bevorzugtes Modell des Modus, sonst Ersatz, sonst erstes installiertes
function resolveModel(preset) {
    const want = [preset.model].concat(preset.alt || []);
    for (let i = 0; i < want.length; i++) if (MODELS.indexOf(want[i]) >= 0) return want[i];
    return MODELS[0] || preset.model;
}
function fillModelSelect() {
    if (modelsFor !== settings.provider) { MODELS = settings.provider === 'ollama' ? FALLBACK_MODELS.slice() : []; modelsFor = settings.provider; }
    const sel = $('model-select');
    sel.innerHTML = '';
    const names = MODELS.slice();
    if (settings.provider !== 'ollama' && settings.model && names.indexOf(settings.model) < 0) names.unshift(settings.model);
    names.forEach(function (m) {
        const o = document.createElement('option');
        o.value = m; o.textContent = m;
        sel.appendChild(o);
    });
    if (!activeAdopted && (settings.provider !== 'ollama' || modelsReal)) {   // once per page load, with the real model list (the fallback list does not know e.g. heinz-fakt:latest)
        activeAdopted = true;
        const a = PV.activeModel();
        if (a && a.provider === settings.provider && (settings.provider !== 'ollama' || MODELS.indexOf(a.model) >= 0)) settings.model = a.model;
    }
    if (settings.provider === 'ollama' && MODELS.indexOf(settings.model) < 0) settings.model = resolveModel(MODE_PRESETS[settings.mode]);
    if (settings.provider !== 'ollama' && !settings.model) settings.model = names[0] || '';
    sel.value = settings.model;
    if (activeAdopted) PV.setActiveModel(settings.provider, settings.model);
    updateChip(); renderModelSheet();
    const mp = $('ml-pill'); if (mp) mp.hidden = settings.provider !== 'ollama' && MODELS.length > 0;
    $('eng-status').classList.toggle('tappable', MODELS.length > 0 && settings.provider !== 'ollama');
    renderCaps(); renderThink();
}
function setEngStatus(msg) { $('eng-status').textContent = msg || ''; }
let modelsSeq = 0, modelsAbort = null;
async function loadModels() {
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
            MODELS = names; modelsFor = prov; modelsReal = true; hs[prov] = true; checkServer();
            // Ein gewähltes Modell wird nie durch die Liste ersetzt (auch wenn eine kurze oder andere Liste es nicht enthält);
            // nur wenn für diese Engine noch nichts gewählt wurde, kommt der erste Eintrag als Vorschlag.
            if (prov !== 'ollama' && !settings.model) settings.model = settings.modelByProvider[prov] || names[0];
            const before = settings.model;
            fillModelSelect(); saveSettings(); loadThreads();
            if (settings.model !== before) { applySavedParams(); schedulePreload(); }   // model taken over from another page
            if (prov !== 'ollama') setEngStatus(PV.modelNote && PV.modelNote.engine === prov ? t('modelsNativeFail', { n: names.length, m: PV.modelNote.message }) : t('modelsDone', { n: names.length }));
        } else if (prov !== 'ollama') { MODELS = []; fillModelSelect(); setEngStatus(t('noModels')); }
    } catch (e) {
        if (e.name === 'AbortError' || seq !== modelsSeq) return;   // von einem neueren Abruf abgelöst
        if (prov === 'ollama') return;   /* Ollama nicht erreichbar: Fallback-Liste bleibt */
        MODELS = []; fillModelSelect(); hs[prov] = false; checkServer();
        if (e.code === 'ONLINE_BLOCKED') setEngStatus(t('onlineBlocked'));
        else if (e.code === 'NO_KEY') setEngStatus(t('needKey'));
        else setEngStatus(t('modelsFail', { m: e.message }));
    }
}
