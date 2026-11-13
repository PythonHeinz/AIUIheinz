/* lib/dashboard/main.js – Einstiegsmodul des Dashboards (dashboard.html lädt nur dieses Modul).
 * Imports everything, sets up the facade window.HeinzDashboard for tests and tools, starts the page. Wiring and start live only here (docs/MODULE.md). */

import './actions.js';
import { HeinzStore } from './base.js';
import { buildOptions } from './build.js';
import { renderCaps, renderModelSheet, renderThink, thinkEffort, thinkRule, thinkStage, updateChatBar } from './caps.js';
import { loadModels } from './config.js';
import { newChat, saveChatNow, togglePin } from './conversations.js';
import { onModelFree, switchProvider } from './engine.js';
import { t } from './i18n.js';
import { initDashboard } from './init.js';
import { closeAll, exportBackup, openMenu, showPage } from './menu.js';
import { chatBox, copyWholeChat, jumpBottom, stickBottom } from './messages.js';
import { isChanged, markState, modelKey, onSlider, promptChanged, resetToPerson, toneChanged } from './params.js';
import { getSaved, saveSettings } from './persist.js';
import { perfColors, pulse, stLog } from './pixelbar.js';
import { onModelChange, toggleLang } from './preload.js';
import { capsStates, paramsText } from './protocol.js';
import { pickEngine } from './quick.js';
import { setGenerating } from './send.js';
import { srExportParts, srRender, srResumeBtn, srStart } from './series.js';
import { applyToChat, onThreads } from './settings.js';
import { updateReadBtn } from './speech.js';
import { settings, state } from './state.js';
import { checkServer, renderRing } from './status.js';

// ===== Zugriff für Tests: HeinzDashboard (Fassade) =====
// Tests und Werkzeuge greifen nur hierüber auf den Zustand der Seite zu, nie über freie Globalnamen.
// Die Seite besteht aus ES-Modulen (docs/MODULE.md); die Fassade bleibt der feste Zugriffsweg für Tests und Konsole.
window.HeinzDashboard = (function () {
    const B = {};
    [['t', t], ['onSlider', onSlider], ['renderRing', renderRing], ['resetToPerson', resetToPerson], ['isChanged', isChanged], ['toneChanged', toneChanged], ['promptChanged', promptChanged], ['markState', markState], ['switchProvider', switchProvider], ['newChat', newChat], ['loadModels', loadModels], ['renderCaps', renderCaps], ['closeAll', closeAll], ['srStart', srStart], ['renderThink', renderThink], ['buildOptions', buildOptions], ['pickEngine', pickEngine], ['onModelChange', onModelChange], ['onThreads', onThreads], ['copyWholeChat', copyWholeChat], ['srExportParts', srExportParts], ['exportBackup', exportBackup], ['thinkRule', thinkRule], ['capsStates', capsStates], ['showPage', showPage], ['onModelFree', onModelFree], ['openMenu', openMenu], ['saveChatNow', saveChatNow], ['togglePin', togglePin], ['updateReadBtn', updateReadBtn], ['getSaved', getSaved], ['perfColors', perfColors], ['setGenerating', setGenerating], ['renderModelSheet', renderModelSheet], ['updateChatBar', updateChatBar], ['thinkEffort', thinkEffort], ['jumpBottom', jumpBottom], ['modelKey', modelKey], ['srRender', srRender], ['srResumeBtn', srResumeBtn], ['paramsText', paramsText], ['saveSettings', saveSettings], ['applyToChat', applyToChat], ['stickBottom', stickBottom], ['thinkStage', thinkStage], ['checkServer', checkServer], ['chatBox', chatBox], ['stLog', stLog], ['pulse', pulse], ['toggleLang', toggleLang]].forEach(function (p) { B[p[0]] = p[1]; });
    function live(name, get, set) { Object.defineProperty(B, name, { get: get, set: set, enumerable: true }); }
    Object.defineProperty(B, 'settings', { get: function () { return settings; }, enumerable: true });   // read-only: settings is never replaced, only changed
    live('chatHistory', function () { return state.chatHistory; }, function (v) { state.chatHistory = v; });
    live('generating', function () { return state.generating; }, function (v) { state.generating = v; });
    live('preloadAbort', function () { return state.preloadAbort; }, function (v) { state.preloadAbort = v; });
    live('gotToken', function () { return state.gotToken; }, function (v) { state.gotToken = v; });
    live('seriesRunning', function () { return state.seriesRunning; }, function (v) { state.seriesRunning = v; });
    live('chipPx', function () { return state.chipPx; }, function (v) { state.chipPx = v; });
    live('MODE_PRESETS', function () { return state.MODE_PRESETS; }, function (v) { state.MODE_PRESETS = v; });
    live('MODELS', function () { return state.MODELS; }, function (v) { state.MODELS = v; });
    live('updState', function () { return state.updState; }, function (v) { state.updState = v; });
    live('srRuns', function () { return state.srRuns; }, function (v) { state.srRuns = v; });
    live('srMeta', function () { return state.srMeta; }, function (v) { state.srMeta = v; });
    B.lsSet = function (k, v) { return HeinzStore.set(k, v); };
    B.ready = false;   // true, sobald Daten geladen sind und die Seite aufgebaut ist
    return B;
})();

// ===== Start =====
// Fehler beim Start zeigt lib/dashboard/failsafe.js (klassisches Skript, unabhängig von den Modulen): rejected Promise oder kein "ready" nach 6 s.
initDashboard();
