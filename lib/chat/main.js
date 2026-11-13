/* lib/chat/main.js – Einstiegsmodul des Heinz Chat (chat.html lädt nur dieses Modul).
 * Opens the store, takes over the saved state, wires the page and starts it; reports data-heinz-chat=ready on <html> when built (tests wait for it).
 * ES module (docs/MODULE.md). */

import './actions.js';
import { $, Heinz, HeinzStore, PV, onCodeCopy } from './base.js';
import { chatAct, newChat, persist, renderHist, save, selDelete, selEnd } from './conversations.js';
import { t } from './i18n.js';
import { applyChatConfig, loadModels, pickEngine, pickModel, renderSheet } from './model.js';
import { autosize, send } from './send.js';
import { state } from './state.js';
import { checkStatus, pv } from './status.js';
import { head, renderLog } from './view.js';

// Engine and model come only from the configuration of the Heinz Chat (assigned one or built-in default); nothing is taken over from the dashboard.
// heinz_slim keeps only the id of the open conversation (older provider/model entries there are not read).
function initState() {
    var saved = Heinz.lsGet('heinz_slim', null);
    state.S = { provider: 'ollama', model: '', chat: saved && +saved.chat ? +saved.chat : 0 };
    applyChatConfig();
    state.chats = HeinzStore.get('heinz_slim_chats', []);
    if (!Array.isArray(state.chats)) state.chats = [];
    state.cur = state.chats.filter(function (c) { return c.id === state.S.chat; })[0] || null;
    state.msgs = state.cur ? state.cur.messages.slice() : [];
}
function openModelSheet() { Heinz.sheetOpen('sh-model'); renderSheet(); loadModels(); }
function heinzChatMain() {
    initState();
    Heinz.ringLogo($('ring-logo'));
    setInterval(function () { if (!document.hidden && !state.gen) checkStatus(); }, 5000);

    // ---- wiring ----
    $('send').onclick = send; $('q').addEventListener('input', autosize);
    $('mod').onclick = openModelSheet;
    $('hist').onclick = function () { persist(); renderHist(); Heinz.sheetOpen('sh-hist'); };
    $('new').onclick = newChat;
    $('eng').addEventListener('click', function (e) { var b = e.target.closest('[data-eng]'); if (b) pickEngine(b.getAttribute('data-eng')); });
    $('models').addEventListener('click', function (e) { var b = e.target.closest('[data-model]'); if (b) pickModel(b.getAttribute('data-model')); });
    $('free').addEventListener('change', function () { var v = $('free').value.trim(); if (v) pickModel(v); });
    $('chats').addEventListener('click', function (e) {
        var a = e.target.closest('[data-act]'); if (a) { chatAct(a.getAttribute('data-act'), +a.getAttribute('data-id'), a); return; }
    });
    $('sel-del').addEventListener('click', selDelete); $('sel-x').addEventListener('click', selEnd);
    $('log').addEventListener('click', function (e) { if (e.target.closest('[data-setup]')) { openModelSheet(); return; } if (onCodeCopy(e, Heinz.copy)) return; var b = e.target.closest('[data-cp]'); if (b) Heinz.copy(state.msgs[+b.getAttribute('data-cp')].content).then(function () { b.innerHTML = '<svg class="i sm"><use href="/lib/icons.svg#i-check"/></svg>'; }); });
    Heinz.onLang(function () { head(); renderLog(state.gen); renderSheet(); });
    function fit() { if (window.visualViewport) document.documentElement.style.setProperty('--appH', Math.round(visualViewport.height * visualViewport.scale) + 'px'); }
    if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); } fit();
    head(); renderLog(); autosize();
    // storage problems (IndexedDB missing, full, copy failed) stay visible, not silent
    var storeMsgs = [];
    function storeNote() { var el = $('store-note'); el.hidden = !storeMsgs.length; el.textContent = storeMsgs.map(function (c) { return t('st_' + c); }).join(' '); }
    HeinzStore.onProblem(function (p) { if (storeMsgs.indexOf(p.code) < 0) storeMsgs.push(p.code); storeNote(); });
    Heinz.onLang(storeNote);
    document.documentElement.setAttribute('data-heinz-chat', 'ready');
}
HeinzStore.open().then(heinzChatMain, heinzChatMain);
