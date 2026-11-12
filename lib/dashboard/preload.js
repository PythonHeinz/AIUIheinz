/* lib/dashboard/preload.js – Modell vorladen, Modusleiste und Modus-Stil, Sprachknopf.
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

// ===== Modell vorladen: Modell und Systemprompt im Hintergrund warm machen =====
const KEEP_ALIVE = PV.KEEP_ALIVE;   // gemeinsam mit allen Tools (lib/providers.js)
let preloadAbort = null, preloadTimer = null, preloadKey = '', preloadHideTimer = null;
function preloadKeyNow() {
    return [settings.provider, $('model-select').value, settings.mode, sysSrc() + (sysSrc() === 'own' ? settings.ownPrompt.length : ''), settings.lang, !!settings.fast,
        !!settings.useDefault, parseInt($('param-ctx').value, 10), parseInt($('param-threads').value, 10)].join('|');
}
let preloadReady = false;
function setPreloadStatus(kind) {
    clearTimeout(preloadHideTimer);
    preloadReady = kind === 'ready';
    if (preloadReady) preloadHideTimer = setTimeout(function () { preloadReady = false; renderRing(); }, 4000);
    renderRing();
}
function abortPreload() {
    clearTimeout(preloadTimer);
    if (preloadAbort) { preloadAbort.abort(); preloadAbort = null; }
    setPreloadStatus('');
}
function schedulePreload() {
    clearTimeout(preloadTimer);
    if (!settings.preload || settings.provider !== 'ollama') return;
    preloadTimer = setTimeout(preloadModel, 1200);
}
// Es bleibt nur das gewählte Modell im Arbeitsspeicher: sonst halten mehrere Modelle (mit 30 min keep_alive)
// und große Kontexte den Speicher, und Android beendet Termux (Absturz am Handy 10.11.2026).
async function unloadOthers(model) { await PV.prepare('ollama', model); }
function alreadyLoaded(model, opts) { return PV.loadedWith('ollama', model, opts); }
async function preloadModel() {
    if (!settings.preload || generating || speedTesting || settings.provider !== 'ollama') return;
    const model = $('model-select').value;
    const key = preloadKeyNow();
    if (!model || key === preloadKey) return;
    if (preloadAbort) preloadAbort.abort();
    const ac = new AbortController();
    preloadAbort = ac;
    setPreloadStatus('loading');
    try {
        await unloadOthers(model);
        if (ac.signal.aborted) return;
        const opts = buildOptions(MODE_PRESETS[settings.mode]);
        delete opts.stop; delete opts.num_predict;
        opts.num_predict = 1;
        // Model already in memory and the last request (any page) used the same load options: nothing would be loaded, and the
        // preload would only make Ollama read the mode prompt again (seconds on the phone). Skip it.
        if (await alreadyLoaded(model, opts)) {
            preloadKey = key;
            if (preloadAbort === ac) setPreloadStatus('ready');
            checkServer();
            return;
        }
        await PV.chat('ollama', { model: model, stream: false, keepAlive: KEEP_ALIVE, options: opts, signal: ac.signal,
            messages: buildMessages(false, '', [{ role: 'user', content: '.' }]) });
        preloadKey = key;
        if (preloadAbort === ac) setPreloadStatus('ready');
        checkServer();
    } catch (e) {
        if (e.name !== 'AbortError' && preloadAbort === ac) setPreloadStatus('');
    } finally {
        if (preloadAbort === ac) preloadAbort = null;
        renderRing();
    }
}

// Modusleiste: wird aus MODE_PRESETS gebaut (neue Modi erscheinen von selbst)
function renderModeBar() {
    const bar = $('mode-bar');
    bar.setAttribute('aria-label', t('chooseMode'));
    bar.querySelectorAll('.mode-pill').forEach(function (b) { b.remove(); });
    Object.keys(MODE_PRESETS).forEach(function (m) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mode-pill' + (m === settings.mode ? ' active' : '');
        b.setAttribute('data-mode', m);
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', m === settings.mode ? 'true' : 'false');
        b.title = t('m_' + m);
        b.style.setProperty('--mc', MODE_PRESETS[m].color);
        b.style.setProperty('--mo', MODE_PRESETS[m].on || '#fff');
        b.innerHTML = '<span class="mi">' + ICON('m-' + m, '') + '</span><span class="mn">' + esc(t('mb_' + m)) + '</span>';
        b.onclick = function () { pickMode(m); };
        bar.appendChild(b);
    });
}
function pickMode(m) {
    if (m === settings.mode || generating || speedTesting) return;
    $('mode-select').value = m;
    updateModeUI();
}

function applyModeStyling() {
    renderModeBar();
    renderSavedList();
    const preset = MODE_PRESETS[settings.mode];
    const ctxBox = $('context');
    const modelSel = $('model-select');
    $('context-wrapper').hidden = preset.ctx === 'none';
    const rs = document.documentElement.style;
    rs.setProperty('--acc', preset.color); rs.setProperty('--onacc', preset.on || '#fff');   // one accent per mode
    ctxBox.classList.remove('req-warn');
    $('context-wrapper').classList.toggle('req', preset.ctx === 'required');
    ctxBox.placeholder = t(preset.ctx === 'required' ? 'ctxRequired' : 'ctxOptional');
    $('ctx-label').textContent = t(preset.ctx === 'required' ? 'ctxLabelReq' : 'ctxLabelOpt');
    updateCtxCount(); updateChatBar(); updateMenuInfo();
    $('use-default').checked = !!settings.useDefault;
    $('fast-mode').checked = !!settings.fast;
    $('param-fastn').value = settings.fastN; $('fastn-val').textContent = settings.fastN;
    $('preload-on').checked = settings.preload; $('modes-only').checked = !!settings.modesOnly;
    document.querySelectorAll('.slider-group').forEach(function (g) {
        g.classList.toggle('off', paramSrc() !== 'own');
        g.querySelector('input').disabled = paramSrc() !== 'own';
    });
}

// Nutzer wechselt den Modus: Preset-Modell + Preset-Regler (außer bei Standardwerten)
function updateModeUI() {
    // Zuerst den alten Chat unter seinem Modus und Modell speichern, danach erst umstellen
    if (chatHistory.length) saveCurrentToList();
    settings.mode = normalizeMode($('mode-select').value);
    const preset = MODE_PRESETS[settings.mode];
    // Mode = prompt + sampling only. The chosen model stays (the bench tests any model with any mode, and the model choice is shared
    // with the other pages, so a mode click must not unload it). The preset model is only a suggestion when nothing usable is chosen.
    if (settings.provider === 'ollama' && MODELS.indexOf(settings.model) < 0) settings.model = resolveModel(preset);
    $('model-select').value = settings.model;
    loadThreads();
    schedulePreload();
    applySavedParams();
    saveSettings();
    applyModeStyling();
    newChat(false);  // Moduswechsel = neuer Chat (der alte ist oben schon gespeichert)
    checkServer();
}

function onModelChange() {
    settings.model = $('model-select').value;
    updateChip();
    settings.modelByProvider[settings.provider] = settings.model;
    $('model-free').value = settings.provider === 'ollama' ? '' : settings.model;
    loadThreads();
    applySavedParams();
    schedulePreload();
    saveSettings();
    persistCurrent();
    checkServer();
    renderQuick();
}

function updateLangBtn() {
    document.querySelectorAll('#lang-btn span').forEach(function (s) {
        s.classList.toggle('active', s.getAttribute('data-l') === settings.lang);
    });
}

function toggleLang() {
    settings.lang = settings.lang === 'en' ? 'de' : 'en';
    saveSettings();
    updateLangBtn();
    applyI18n();
    window.speechSynthesis.cancel(); updateReadBtn(false);
    schedulePreload();
}
