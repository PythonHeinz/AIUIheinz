/* lib/dashboard/engine.js – Engine-Menü: Anbieter, eigene Engines, Online-Haken.
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

// ===== Engine (Anbieterschicht lib/providers.js) =====
function fillProviderSelect() {
    const sel = $('provider-select');
    sel.innerHTML = '';
    PV.list().forEach(function (p) {
        if (!p.local && !p.custom && !PV.onlineAllowed()) return;   // Online-Engines erscheinen erst mit „Online erlauben“
        const o = document.createElement('option');
        o.value = p.id; o.textContent = p.name + (p.custom || p.local ? '' : ' · online');
        sel.appendChild(o);
    });
    if (!sel.querySelector('option[value="' + settings.provider + '"]')) settings.provider = 'ollama';
    sel.value = settings.provider;
}
function renderEngineUI() {
    const p = PV.get(settings.provider) || PV.get('ollama');
    const isOllama = settings.provider === 'ollama';
    $('online-on').checked = PV.onlineAllowed();
    $('eng-backend').hidden = !p.backends;
    $('backend-select').value = settings.backend;
    $('eng-url').hidden = !p.custom;
    $('prov-url').value = p.custom ? PV.getCustomUrl(p.id) : '';
    $('eng-name').hidden = !p.user; $('eng-del-row').hidden = !p.user; $('prov-name').value = p.user ? p.name : '';
    $('eng-conn-name').textContent = ' · ' + p.name; engDelArmed = false; $('eng-del').querySelector('span').textContent = t('engDel');
    $('eng-key').hidden = !(p.needsKey || (p.custom && !p.local));
    $('prov-key').value = PV.getKey(p.id);
    const link = $('prov-keylink'); link.style.display = p.keyUrl ? 'inline' : 'none'; if (p.keyUrl) link.href = p.keyUrl;
    $('eng-model').hidden = isOllama;
    $('model-free').value = isOllama ? '' : (settings.model || '');
    $('eng-note').textContent = p.note ? (p.note[settings.lang] || p.note.en) : t('engLocalNote');
    // Threads, Eigener Systemprompt und Vorladen gibt es nur bei Ollama
    [$('param-threads'), $('modes-only'), $('preload-on')].forEach(function (el) {
        const g = el.closest('.param-group'); if (g) g.classList.toggle('off', !isOllama); el.disabled = !isOllama;
    });
    updateChip(); updateMenuInfo();
}
function switchProvider(id) {
    if (settings.model) settings.modelByProvider[settings.provider] = settings.model;
    settings.provider = id;
    settings.model = settings.modelByProvider[id] || (id === 'ollama' ? resolveModel(MODE_PRESETS[settings.mode]) : '');
    MODELS = id === 'ollama' ? FALLBACK_MODELS.slice() : []; modelsFor = id;
    fillProviderSelect(); renderEngineUI(); fillModelSelect(); saveSettings(); loadThreads(); applySavedParams();
    persistCurrent();   // Engine und Modell gehören zusammen: auch im laufenden Chat festhalten, sonst springt die Engine nach dem Neuladen zurück
    loadModels(); checkServer(); schedulePreload();
}
function onProvider() { switchProvider($('provider-select').value); }
function onBackend() { settings.backend = $('backend-select').value; saveSettings(); }
function onProviderUrl() { PV.setCustomUrl($('prov-url').value, settings.provider); renderEngineUI(); loadModels(); checkServer(); }
let engDelArmed = false;
function addEngine() {
    const id = PV.addEngine(t('engNewName') + ' ' + (PV.userEngines().length + 1), '');
    fillProviderSelect(); switchProvider(id);
}
function onEngineName() { PV.updateEngine(settings.provider, { name: $('prov-name').value }); fillProviderSelect(); renderEngineUI(); }
function removeEngineTap() {
    if (!engDelArmed) { engDelArmed = true; $('eng-del').querySelector('span').textContent = t('engDelSure'); return; }
    const id = settings.provider; PV.removeEngine(id); delete settings.modelByProvider[id];
    switchProvider('ollama');
}
function onProviderKey() { PV.setKey(settings.provider, $('prov-key').value.trim()); loadModels(); }
function onModelFree() {
    const v = $('model-free').value.trim();
    if (!v) return;
    settings.model = v; settings.modelByProvider[settings.provider] = v;
    fillModelSelect(); saveSettings(); persistCurrent();
}
function onOnlineToggle() {
    PV.setOnlineAllowed($('online-on').checked);
    const p = PV.get(settings.provider);
    if (!PV.onlineAllowed() && p && !p.local) { switchProvider('ollama'); return; }
    fillProviderSelect(); renderEngineUI(); loadModels();
}
function normalizeMode(m) {
    if (m === 'werkzeug') return 'code';
    return MODE_PRESETS[m] ? m : 'wilson';
}
const SPEECH_LANG = { en: 'en-US', de: 'de-DE' };
