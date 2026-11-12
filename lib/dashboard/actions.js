/* lib/dashboard/actions.js – Zuordnung der Bedienelemente zu den Funktionen der Seite (ersetzt die Inline-Handler).
 * Part of the dashboard (dashboard.html). Plain script, loaded last: the table only names functions of the other files, resolved when the user acts.
 * Markup: data-click="name" / data-input="name" / data-change="name", optional data-arg="text". Every name must be in ACTIONS (a test checks it).
 * Replaces onclick/oninput/onchange attributes (docs/DASHBOARD_INVENTUR.md step 6). Planned: ES modules; this table then imports the functions. */

// A handler gets (arg, el, event): arg = data-arg (text or undefined), el = the element that carries the data attribute.
function reload() { location.reload(); }
function pickBackupFile() { $('bk-file').click(); }
function openModelsFromPanelIfAny() { if (MODELS.length) openModelsFromPanel(); }
function toggleFastCard(el) { const c = $('fastn-card'); c.hidden = !c.hidden; el.classList.toggle('open', !c.hidden); }
function onContextInput(el) { persistCurrent(); el.classList.remove('req-warn'); updateCtxCount(); }

const ACTIONS = {
    // Kopfzeile, Menü, Seiten, Ansicht (menu.js, preload.js, update.js)
    openMenu: () => openMenu(), openDrawer: () => openDrawer(), openModels: () => openModels(), closeAll: () => closeAll(),
    showPage: (a) => showPage(a), setTheme: (a) => setTheme(a), toggleLang: () => toggleLang(), doUpdate: () => doUpdate(),
    exportBackup: () => exportBackup(), importBackup: (a, el) => importBackup(el), pickBackupFile: () => pickBackupFile(),
    reload: () => reload(),
    // Chat, Eingabe, Unterhaltungen (send.js, messages.js, conversations.js, speech.js)
    askGemma: () => askGemma(), abortGeneration: () => abortGeneration(), startListening: () => startListening(),
    newChat: (a) => newChat(a === 'true'), copyWholeChat: (a, el) => copyWholeChat(el), jumpBottom: () => jumpBottom(),
    renameCurrent: () => renameCurrent(), renderSavedList: () => renderSavedList(), toggleChatScope: () => toggleChatScope(),
    toggleChatSort: () => toggleChatSort(), selDelete: () => selDelete(), selEnd: () => selEnd(),
    onContextInput: (a, el) => onContextInput(el), toggleFull: (a) => toggleFull(a),
    // Modell, Modus, Regler, Prompt (preload.js, caps.js, quick.js, settings.js)
    onModelChange: () => onModelChange(), updateModeUI: () => updateModeUI(), loadModels: () => loadModels(), renderModelSheet: () => renderModelSheet(),
    openModelsFromPanel: () => openModelsFromPanel(), openModelsFromPanelIfAny: () => openModelsFromPanelIfAny(),
    setThink: (a) => setThink(a), pwTab: (a) => pwTab(a), setSysSrc: (a) => setSysSrc(a), setParamSrc: (a) => setParamSrc(a),
    onOwnPromptInput: () => onOwnPromptInput(), copySysPrompt: () => copySysPrompt(), seedOwnPrompt: () => seedOwnPrompt(),
    onDefaultToggle: () => onDefaultToggle(), onSlider: () => onSlider(), resetParams: () => resetParams(), saveModelDefault: () => saveModelDefault(),
    copyParams: () => copyParams(), onThreads: () => onThreads(), onModesOnly: () => onModesOnly(), onFast: () => onFast(),
    toggleFastCard: (a, el) => toggleFastCard(el), applyToChat: () => applyToChat(), onPreloadToggle: () => onPreloadToggle(),
    // Engines und Online (engine.js, quick.js)
    onOnlineToggle: () => onOnlineToggle(), unlockOnline: () => unlockOnline(), addEngine: () => addEngine(), onEngineName: () => onEngineName(),
    onProvider: () => onProvider(), onBackend: () => onBackend(), onProviderUrl: () => onProviderUrl(), onProviderKey: () => onProviderKey(),
    onModelFree: () => onModelFree(), removeEngineTap: () => removeEngineTap(),
    // Testreihen, Tempo-Test (series.js, speedtest.js)
    srPlan: () => srPlan(), srStart: (a) => srStart(a === 'true' ? true : undefined), srStop: () => srStop(),
    startSpeedTest: () => startSpeedTest(), stopSpeedTest: () => stopSpeedTest(), applyBestThreads: () => applyBestThreads(), copySpeedTest: () => copySpeedTest()
};

// One listener per event kind for the whole page; goes up from the target like a bubbling inline handler would.
['click', 'input', 'change'].forEach(function (type) {
    const attr = 'data-' + type;
    document.addEventListener(type, function (e) {
        for (let el = e.target instanceof Element ? e.target : null; el; el = el.parentElement) {
            const name = el.getAttribute(attr);
            if (name === null) continue;
            const fn = ACTIONS[name];
            if (!fn) { console.error('Unknown action: ' + name); continue; }
            fn(el.getAttribute('data-arg') === null ? undefined : el.getAttribute('data-arg'), el, e);
        }
    });
});
