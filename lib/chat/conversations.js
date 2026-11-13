/* lib/chat/conversations.js – Gespeicherte Unterhaltungen: sichern, neu, öffnen, Liste, Umbenennen, Anpinnen, Exportieren.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, HeinzStore, PV, bindLongPress, openOrClose, savedRow } from './base.js';
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
export function renderHist() {
    $('sh-h').textContent = t('chats');
    var list = state.chats.slice().sort(function (a, b) { return b.ts - a.ts; });
    var az = Heinz.lsGet('heinz_chat_sort', 'time') === 'az';
    if (az) list = list.sort(function (a, b) { return String(a.title || '').localeCompare(String(b.title || ''), Heinz.lang, { numeric: true, sensitivity: 'base' }); });
    [].forEach.call(document.querySelectorAll('#sortseg button'), function (b) { b.classList.toggle('on', (b.getAttribute('data-sort') === 'az') === az); b.textContent = t(b.getAttribute('data-sort') === 'az' ? 'sortAz' : 'sortTime'); });
    list = list.filter(function (c) { return c.pinned; }).concat(list.filter(function (c) { return !c.pinned; }));
    var box = $('chats'); box.innerHTML = '';
    var ids = new Set(state.chats.map(function (c) { return c.id; }));
    state.selIds.forEach(function (i) { if (!ids.has(i)) state.selIds.delete(i); });
    if (state.selMode && !state.selIds.size) state.selMode = false;
    selUpdateBar();
    if (!list.length) { box.innerHTML = '<p class="hint">' + t('none') + '</p>'; return; }
    list.forEach(function (c) {
        var row = savedRow({
            id: c.id, title: c.title || t('untitled'), pinned: !!c.pinned, current: c.id === state.S.chat, moreLabel: t('more'),
            selected: state.selMode && state.selIds.has(c.id), showMore: !state.selMode,
            sub: (c.model || '') + ' · ' + new Date(c.ts).toLocaleString(Heinz.lang === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }),
            labels: { ren: t('ren'), pin: t(c.pinned ? 'unpin' : 'pin'), cp: t('copy'), exp: t('exp'), del: t('del') }
        });
        bindLongPress(row.querySelector('.load'), c.id, { isSel: function () { return state.selMode; }, start: selStart, toggle: selToggle, open: openOrClose(row, openChat) });
        box.appendChild(row);
    });
}
// ---- Mehrfachauswahl (wie im Dashboard) ----
function selUpdateBar() {
    var bar = $('sel-bar'); if (!bar) return;
    bar.hidden = !state.selMode;
    $('chats').style.paddingBottom = state.selMode ? 'calc(70px + env(safe-area-inset-bottom))' : '';
    $('sel-count').textContent = t('selCount', { n: state.selIds.size });
    $('sel-del').disabled = !state.selIds.size;
    $('sel-del-t').textContent = t('selDelete');
    $('sel-x').title = t('selCancel');
}
function selStart(id) { state.selMode = true; state.selIds.clear(); state.selIds.add(id); renderHist(); if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { } } }
function selToggle(id) { if (state.selIds.has(id)) state.selIds.delete(id); else state.selIds.add(id); if (!state.selIds.size) state.selMode = false; renderHist(); }
export function selEnd() { state.selMode = false; state.selIds.clear(); renderHist(); }
export function selDelete() {
    if (!state.selIds.size || !confirm(t('confirmDelSel', { n: state.selIds.size }))) return;
    var gone = new Set(state.selIds);
    state.chats = state.chats.filter(function (c) { return !gone.has(c.id); });
    if (gone.has(state.S.chat)) { state.cur = null; state.msgs = []; state.S.chat = 0; renderLog(); }
    save(); state.selMode = false; state.selIds.clear(); renderHist();
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
