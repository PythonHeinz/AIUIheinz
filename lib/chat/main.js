/* lib/chat/main.js – Einstiegsmodul des Heinz Chat (chat.html lädt nur dieses Modul).
 * Opens the store, takes over the saved state, wires the page and starts it; reports data-heinz-chat=ready on <html> when built (tests wait for it).
 * ES module (docs/MODULE.md). */

import './actions.js';
import { $, Heinz, HeinzStore, PV, onCodeCopy } from './base.js';
import { chatAct, newChat, openChat, persist, renderHist, save } from './conversations.js';
import { t } from './i18n.js';
import { loadModels, pickEngine, pickModel, renderSheet, sysNote } from './model.js';
import { autosize, send } from './send.js';
import { state } from './state.js';
import { checkStatus, pv } from './status.js';
import { head, renderLog } from './view.js';

function initState() {
    state.S = Heinz.lsGet('heinz_slim', null);
    if (!state.S) { var gs = Heinz.lsGet('heinz_settings', {}) || {}; state.S = { provider: gs.provider || 'ollama', model: '', chat: 0 }; }
    (function () { var a = PV.activeModel(); if (a && a.provider === state.S.provider) state.S.model = a.model; })();   // model chosen on another page (dashboard)
    state.chats = HeinzStore.get('heinz_slim_chats', []);
    if (!Array.isArray(state.chats)) state.chats = [];
    state.cur = state.chats.filter(function (c) { return c.id === state.S.chat; })[0] || null;
    state.msgs = state.cur ? state.cur.messages.slice() : [];
}
function heinzChatMain() {
    initState();
    Heinz.ringLogo($('ring-logo'));
    setInterval(function () { if (!document.hidden && !state.gen) checkStatus(); }, 5000);

    // ---- wiring ----
    $('send').onclick = send; $('q').addEventListener('input', autosize);
    $('mod').onclick = function () { Heinz.sheetOpen('sh-model'); renderSheet(); loadModels(); };
    $('hist').onclick = function () { persist(); renderHist(); Heinz.sheetOpen('sh-hist'); };
    $('new').onclick = newChat;
    $('eng').addEventListener('click', function (e) { var b = e.target.closest('[data-eng]'); if (b) pickEngine(b.getAttribute('data-eng')); });
    $('models').addEventListener('click', function (e) { var b = e.target.closest('[data-model]'); if (b) pickModel(b.getAttribute('data-model')); });
    $('sys').addEventListener('change', function () { if (state.S.model) PV.setChatSystem(state.S.model, $('sys').value); });
    $('smp-reset').addEventListener('click', function () { if (state.S.model) { PV.setChatSampling(state.S.model, null); sysNote(); } });
    $('sys-reset').addEventListener('click', function () { if (state.S.model) { PV.setChatSystem(state.S.model, null); sysNote(); } });
    $('free').addEventListener('change', function () { state.S.model = $('free').value.trim(); save(); head(); renderLog(state.gen); });
    $('onl').addEventListener('change', function () { PV.setOnlineAllowed($('onl').checked); if (!$('onl').checked && !pv().local) { state.S.provider = 'ollama'; state.S.model = ''; save(); head(); } renderSheet(); loadModels(); });
    $('sortseg').addEventListener('click', function (e) { var b = e.target.closest('[data-sort]'); if (b) { Heinz.lsSet('heinz_chat_sort', b.getAttribute('data-sort')); renderHist(); } });
    $('chats').addEventListener('click', function (e) {
        var m = e.target.closest('[data-more]'); if (m) { var r = m.closest('.saved-item'); r.classList.toggle('open'); return; }
        var a = e.target.closest('[data-act]'); if (a) { chatAct(a.getAttribute('data-act'), +a.getAttribute('data-id'), a); return; }
        var o = e.target.closest('[data-open]'); if (o) openChat(+o.getAttribute('data-open'));
    });
    $('log').addEventListener('click', function (e) { if (onCodeCopy(e, Heinz.copy)) return; var b = e.target.closest('[data-cp]'); if (b) Heinz.copy(state.msgs[+b.getAttribute('data-cp')].content).then(function () { b.innerHTML = '<svg class="i sm"><use href="/lib/icons.svg#i-check"/></svg>'; }); });
    Heinz.onLang(function () { head(); renderLog(state.gen); renderSheet(); });
    function fit() { if (window.visualViewport) document.documentElement.style.setProperty('--appH', Math.round(visualViewport.height * visualViewport.scale) + 'px'); }
    if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); } fit();
    head(); renderLog(); autosize(); loadModels();
    // storage problems (IndexedDB missing, full, copy failed) stay visible, not silent
    var storeMsgs = [];
    function storeNote() { var el = $('store-note'); el.hidden = !storeMsgs.length; el.textContent = storeMsgs.map(function (c) { return t('st_' + c); }).join(' '); }
    HeinzStore.onProblem(function (p) { if (storeMsgs.indexOf(p.code) < 0) storeMsgs.push(p.code); storeNote(); });
    Heinz.onLang(storeNote);
    document.documentElement.setAttribute('data-heinz-chat', 'ready');
}
HeinzStore.open().then(heinzChatMain, heinzChatMain);
