/* lib/chat/conversations.js – Gespeicherte Unterhaltungen: sichern, neu, öffnen, Liste, Umbenennen, Anpinnen, Exportieren.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, HeinzStore, PV, esc } from './base.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { head, notice, renderLog } from './view.js';

export function save() { PV.setActiveModel(state.S.provider, state.S.model); Heinz.lsSet('heinz_slim', state.S); HeinzStore.set('heinz_slim_chats', state.chats.slice(0, 100)); }
// ---- chats ----
export function persist() {
    if (!state.msgs.length) return;
    var first = state.msgs.filter(function (m) { return m.role === 'user'; })[0];
    if (!state.cur) { state.cur = { id: Date.now(), title: '', messages: [], ts: Date.now() }; state.chats.unshift(state.cur); state.S.chat = state.cur.id; }
    state.cur.messages = state.msgs.slice(); state.cur.title = state.cur.name || (first ? first.content.replace(/\s+/g, ' ').slice(0, 44) : t('untitled'));
    state.cur.provider = state.S.provider; state.cur.model = state.S.model; state.cur.ts = Date.now();
    save();
}
export function newChat() { if (state.gen && state.abort) state.abort.abort(); persist(); state.cur = null; state.msgs = []; state.S.chat = 0; save(); notice('', ''); renderLog(); $('q').focus(); }
export function openChat(id) {
    var c = state.chats.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    if (state.gen && state.abort) state.abort.abort(); persist();
    state.cur = c; state.msgs = c.messages.slice(); state.S.chat = c.id; if (c.provider && PV.get(c.provider)) { state.S.provider = c.provider; } if (c.model) state.S.model = c.model;
    save(); head(); renderLog(); Heinz.sheetClose();
}
function ic(n, c) { return '<svg class="i ' + (c || 'sm') + '"><use href="/lib/icons.svg#i-' + n + '"/></svg>'; }
export function renderHist() {
    $('sh-h').textContent = t('chats');
    var list = state.chats.slice().sort(function (a, b) { return b.ts - a.ts; });
    var az = Heinz.lsGet('heinz_chat_sort', 'time') === 'az';
    if (az) list = list.sort(function (a, b) { return String(a.title || '').localeCompare(String(b.title || ''), Heinz.lang, { numeric: true, sensitivity: 'base' }); });
    [].forEach.call(document.querySelectorAll('#sortseg button'), function (b) { b.classList.toggle('on', (b.getAttribute('data-sort') === 'az') === az); b.textContent = t(b.getAttribute('data-sort') === 'az' ? 'sortAz' : 'sortTime'); });
    list = list.filter(function (c) { return c.pinned; }).concat(list.filter(function (c) { return !c.pinned; }));
    $('chats').innerHTML = list.length ? list.map(function (c) {
        var pb = function (act, icon, key, cls) { return '<button type="button" class="pill' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" data-id="' + c.id + '" title="' + esc(t(key)) + '" aria-label="' + esc(t(key)) + '">' + ic(icon) + '</button>'; };
        return '<div class="saved-item' + (c.id === state.S.chat ? ' cur' : '') + '" data-row="' + c.id + '"><div class="sr">' + (c.pinned ? ic('pin', 'sm pinned') : '') +
            '<button type="button" class="load" data-open="' + c.id + '"><span class="ttl-in">' + esc(c.title || t('untitled')) + '</span><small>' + esc((c.model || '') + ' · ' + new Date(c.ts).toLocaleString(Heinz.lang === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })) + '</small></button>' +
            '<button type="button" class="ibtn more" data-more="' + c.id + '" aria-label="' + esc(t('more')) + '">' + ic('dots', '') + '</button></div>' +
            '<div class="acts2">' + pb('ren', 'pencil', 'ren') + pb('pin', 'pin', c.pinned ? 'unpin' : 'pin') + pb('cp', 'copy', 'copy') + pb('exp', 'download', 'exp') + pb('del', 'trash', 'del', 'danger') + '</div></div>';
    }).join('') : '<p class="hint">' + t('none') + '</p>';
}
function chatById(id) { return state.chats.filter(function (c) { return c.id === id; })[0]; }
function chatText(c) { return (c.messages || []).map(function (m) { return (m.role === 'user' ? 'You' : 'Heinz') + '\n' + m.content; }).join('\n\n'); }
export function chatAct(act, id, btn) {
    var c = chatById(id); if (!c) return;
    if (act === 'del') { state.chats = state.chats.filter(function (x) { return x.id !== id; }); if (state.S.chat === id) { state.cur = null; state.msgs = []; state.S.chat = 0; renderLog(); } save(); renderHist(); return; }
    if (act === 'pin') { if (!c.pinned && state.chats.filter(function (x) { return x.pinned; }).length >= 5) { notice('warn', t('pinMax')); return; } c.pinned = !c.pinned; save(); renderHist(); return; }
    if (act === 'cp') { Heinz.copy(chatText(c)).then(function () { btn.classList.add('okc'); setTimeout(function () { btn.classList.remove('okc'); }, 1500); }, function () { }); return; }
    if (act === 'exp') {
        var md = '# ' + (c.title || t('untitled')) + '\n\n' + (c.messages || []).map(function (m) { return '**' + (m.role === 'user' ? 'You' : 'Heinz') + '**\n\n' + m.content; }).join('\n\n---\n\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
        a.download = 'heinz-chat-' + String(c.title || 'chat').replace(/[^\w\-]+/g, '_').slice(0, 30) + '.md';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); return;
    }
    if (act === 'ren') {
        var row = document.querySelector('[data-row="' + id + '"]'), host = row.querySelector('.ttl-in'), inp = document.createElement('input'), done = false;
        row.classList.remove('open'); inp.type = 'text'; inp.className = 'inline-edit'; inp.maxLength = 60; inp.value = c.name || c.title || ''; host.innerHTML = ''; host.appendChild(inp);
        var fin = function (ok) { if (done) return; done = true; if (ok) { var v = inp.value.trim(); c.name = v || undefined; var f = (c.messages || []).filter(function (m) { return m.role === 'user'; })[0]; c.title = v || (f ? f.content.replace(/\s+/g, ' ').slice(0, 44) : t('untitled')); if (state.S.chat === id) state.cur = c; save(); } renderHist(); };
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } else if (e.key === 'Escape') fin(false); });
        inp.addEventListener('blur', function () { fin(true); }); inp.addEventListener('click', function (e) { e.stopPropagation(); }); inp.focus(); inp.select();
    }
}
