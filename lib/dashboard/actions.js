/* lib/dashboard/actions.js – Zuordnung der Bedienelemente zu den Funktionen der Seite (ersetzt die Inline-Handler).
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $ } from './base.js';
import { renderModelSheet, setThink, toggleFull, updateCtxCount } from './caps.js';
import { loadModels } from './config.js';
import { newChat, renameCurrent, renderSavedList, selDelete, selEnd, toggleChatScope, toggleChatSort } from './conversations.js';
import { addEngine, onBackend, onEngineName, onModelFree, onOnlineToggle, onProvider, onProviderKey, onProviderUrl, removeEngineTap } from './engine.js';
import { closeAll, exportBackup, importBackup, openDrawer, openMenu, openModels, setTheme, showPage } from './menu.js';
import { copyWholeChat, jumpBottom } from './messages.js';
import { onSlider, resetParams, restoreOwn } from './params.js';
import { persistCurrent } from './persist.js';
import { onModelChange, onPreloadToggle, toggleLang, updateModeUI } from './preload.js';
import { copyParams } from './protocol.js';
import { openModelsFromPanel, unlockOnline } from './quick.js';
import { abortGeneration, askGemma } from './send.js';
import { srPlan, srStart, srStop } from './series.js';
import { applyToChat, copySysPrompt, onFast, onOwnPromptInput, onThreads, pwTab } from './settings.js';
import { startListening } from './speech.js';
import { applyBestThreads, copySpeedTest, startSpeedTest, stopSpeedTest } from './speedtest.js';
import { state } from './state.js';
import { doUpdate } from './update.js';

// A handler gets (arg, el, event): arg = data-arg (text or undefined), el = the element that carries the data attribute.
function reload() { location.reload(); }
function pickBackupFile() { $('bk-file').click(); }
function openModelsFromPanelIfAny() { if (state.MODELS.length) openModelsFromPanel(); }
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
    // Modell, Person, Regler, Prompt (preload.js, caps.js, quick.js, settings.js)
    onModelChange: () => onModelChange(), updateModeUI: () => updateModeUI(), loadModels: () => loadModels(), renderModelSheet: () => renderModelSheet(),
    openModelsFromPanel: () => openModelsFromPanel(), openModelsFromPanelIfAny: () => openModelsFromPanelIfAny(),
    setThink: (a) => setThink(a), pwTab: (a) => pwTab(a),
    onOwnPromptInput: () => onOwnPromptInput(), copySysPrompt: () => copySysPrompt(),
    onSlider: () => onSlider(), resetParams: () => resetParams(), restoreOwn: () => restoreOwn(),
    copyParams: () => copyParams(), onThreads: () => onThreads(), onFast: () => onFast(),
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
