/* lib/dashboard/conversations.js – Unterhaltungen: umbenennen, anpinnen, exportieren, speichern, laden, Liste.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, HeinzStore, PV, esc, savedRow, bindLongPress, openOrClose } from './base.js';
import { updateChatBar } from './caps.js';
import { copyText } from './clipboard.js';
import { resolveModel } from './config.js';
import { hooks } from './hooks.js';
import { t } from './i18n.js';
import { ICON, closeAll, updateMenuInfo } from './menu.js';
import { renderChatFromHistory, resetDashboard, showPlaceholder } from './messages.js';
import { getSaved, persistCurrent, saveSettings } from './persist.js';
import { selIds, settings, state } from './state.js';

// ===== Chats umbenennen, anpinnen, exportieren =====
function inlineEdit(host, initial, commit) {
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = initial; inp.className = 'inline-edit'; inp.maxLength = 60;
    inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocapitalize', 'sentences');
    const old = host.innerHTML;
    host.innerHTML = ''; host.appendChild(inp);
    let done = false;
    function finish(ok) { if (done) return; done = true; if (ok) commit(inp.value.trim()); else host.innerHTML = old; }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } else if (e.key === 'Escape') { finish(false); } });
    inp.addEventListener('blur', function () { finish(true); });
    inp.addEventListener('click', function (e) { e.stopPropagation(); });
    inp.focus(); inp.select();
}
function setChatName(id, name) {
    const list = getSaved(), c = list.find(x => x.id === id);
    if (c) {
        const first = (c.messages || []).find(m => m.role === 'user');
        c.name = name || undefined;
        c.title = name || (first ? first.content : 'Chat').replace(/\s+/g, ' ').slice(0, 40);
        HeinzStore.set('heinz_chats', list);
    }
    if (id === state.currentSavedId) { state.currentName = name; persistCurrent(); }
}
export function renameCurrent() {
    const host = $('chat-title');
    if (host.querySelector('input')) return;
    inlineEdit(host, state.currentName || host.textContent, function (v) {
        state.currentName = v; host.textContent = '';
        if (state.currentSavedId) setChatName(state.currentSavedId, v); else persistCurrent();
        updateChatBar(); renderSavedList();
    });
}
export function togglePin(id) {
    const list = getSaved(), c = list.find(x => x.id === id);
    if (!c) return;
    if (!c.pinned && list.filter(x => x.pinned).length >= 5) { alert(t('pinMax')); return; }
    c.pinned = !c.pinned;
    HeinzStore.set('heinz_chats', list); renderSavedList();
}
function exportChat(id) {
    const c = getSaved().find(x => x.id === id); if (!c) return;
    const md = '# ' + c.title + '\n\n' + (c.messages || []).map(function (m) { return '**' + (m.role === 'user' ? t('roleUser') : t('roleBot')) + '**\n\n' + m.content; }).join('\n\n---\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = 'heinz-chat-' + String(c.title).replace(/[^\w\-]+/g, '_').slice(0, 30) + '.md';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}

export function saveCurrentToList() {
    if (!state.chatHistory.length) return;
    const list = getSaved();
    const first = state.chatHistory.find(m => m.role === 'user');
    const entry = {
        id: state.currentSavedId || Date.now(),
        title: state.currentName || (first ? first.content : 'Chat').replace(/\s+/g, ' ').slice(0, 40),
        name: state.currentName || undefined,
        pinned: !!((list.find(c => c.id === state.currentSavedId) || {}).pinned),
        ts: new Date().toLocaleString(t('locale')),
        model: settings.model,
        provider: settings.provider,
        mode: settings.mode,
        messages: state.chatHistory.slice(),
        context: document.getElementById('context').value
    };
    const idx = list.findIndex(c => c.id === entry.id);
    if (idx >= 0) list.splice(idx, 1);
    list.unshift(entry);
    HeinzStore.set('heinz_chats', list);
    state.currentSavedId = entry.id;
    renderSavedList();
}
export function saveChatNow() {
    if (!state.chatHistory.length) return alert(t('noChatToSave'));
    saveCurrentToList();
    persistCurrent();
}
export function newChat(save) {
    if (state.generating && state.currentAbortController) state.currentAbortController.abort();
    if (save && state.chatHistory.length) saveCurrentToList();
    state.chatHistory = [];
    state.currentSavedId = null; state.currentName = '';
    HeinzStore.remove('heinz_current');
    showPlaceholder(t('readyNew'), true);
    resetDashboard();
    updateChatBar();
}
function discardChat() {
    if (!state.chatHistory.length) return;
    if (!confirm(t('confirmDiscard'))) return;
    if (state.currentSavedId) {
        HeinzStore.set('heinz_chats', getSaved().filter(c => c.id !== state.currentSavedId));
    }
    newChat(false);
    renderSavedList();
}
function loadChat(id) {
    const c = getSaved().find(x => x.id === id);
    if (!c) return;
    if (state.generating && state.currentAbortController) state.currentAbortController.abort();
    if (state.chatHistory.length && state.currentSavedId !== id) saveCurrentToList();
    const want = c.provider || 'ollama';
    const wp = PV.get(want);
    if (wp && (wp.local || PV.onlineAllowed())) settings.provider = want; else settings.provider = 'ollama';   // Online-Chat ohne „Online erlauben“: lokal öffnen
    if (settings.provider === want) settings.model = c.model || settings.model;
    else settings.model = resolveModel(state.MODE_PRESETS[c.mode || settings.mode] || state.MODE_PRESETS.wilson);
    settings.mode = c.mode || settings.mode;
    saveSettings();
    hooks.call('applyUIFromSettings');
    state.chatHistory = c.messages.slice();
    state.currentSavedId = c.id; state.currentName = c.name || '';
    document.getElementById('context').value = c.context || '';
    renderChatFromHistory();
    persistCurrent();
    renderSavedList();
    closeAll();
}
function deleteChat(id) {
    HeinzStore.set('heinz_chats', getSaved().filter(c => c.id !== id));
    if (state.currentSavedId === id) { state.currentSavedId = null; persistCurrent(); }
    renderSavedList();
}
let chatScopeAll = false;
// Sortierung der Unterhaltungslisten: 'time' (neueste zuerst) oder 'az' (nach Titel, ohne Gross-/Kleinschreibung, Zahlen natuerlich). Gemeinsamer Schluessel mit dem Heinz Chat. Angepinnte stehen immer oben.
function chatSort() { return Heinz.lsGet('heinz_chat_sort', 'time') === 'az' ? 'az' : 'time'; }
export function toggleChatSort() { Heinz.lsSet('heinz_chat_sort', chatSort() === 'az' ? 'time' : 'az'); renderSavedList(); }
function sortByTitle(list, lang) { return list.slice().sort(function (a, b) { return String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''), lang, { numeric: true, sensitivity: 'base' }); }); }
export function toggleChatScope() { chatScopeAll = !chatScopeAll; renderSavedList(); }
function revealRow(row) {
    let p = row.parentNode;
    while (p && p !== document.body && !(p.scrollHeight > p.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentNode;
    if (!p || p === document.body) return;
    const over = row.getBoundingClientRect().bottom - p.getBoundingClientRect().bottom + 44;
    if (over > 0) p.scrollBy({ top: over, behavior: 'smooth' });
}

function selUpdateBar() {
    const bar = $('sel-bar'); if (!bar) return;
    bar.hidden = !state.selMode;
    $('sel-count').textContent = t('selCount', { n: selIds.size });
    const d = $('sel-del'); d.disabled = !selIds.size;
    d.innerHTML = ICON('trash') + '<span>' + esc(t('selDelete')) + '</span>';
    $('sel-x').title = t('selCancel');
}
function selStart(id) { state.selMode = true; selIds.clear(); selIds.add(id); renderSavedList(); if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { } } }
function selToggle(id) { if (selIds.has(id)) selIds.delete(id); else selIds.add(id); if (!selIds.size) state.selMode = false; renderSavedList(); }
export function selEnd() { state.selMode = false; selIds.clear(); renderSavedList(); }
export function selDelete() {
    if (!selIds.size || !confirm(t('confirmDelSel', { n: selIds.size }))) return;
    const gone = new Set(selIds);
    HeinzStore.set('heinz_chats', getSaved().filter(c => !gone.has(c.id)));
    if (gone.has(state.currentSavedId)) { state.currentSavedId = null; persistCurrent(); }
    state.selMode = false; selIds.clear(); renderSavedList();
}
export function renderSavedList() {
    const box = $('saved-list');
    box.innerHTML = '';
    const all = getSaved();
    box.style.paddingBottom = state.selMode ? 'calc(190px + env(safe-area-inset-bottom))' : '';
    const q = (($('chat-search') || {}).value || '').trim().toLowerCase();
    // Chats werden je Modus gefuehrt; "Alle" zeigt die ganze Liste (Laden springt dann in den Modus des Chats)
    let list = chatScopeAll ? all : all.filter(c => (c.mode || 'wilson') === settings.mode);
    if (q) list = list.filter(c => (c.title || '').toLowerCase().indexOf(q) >= 0);
    if (chatSort() === 'az') list = sortByTitle(list, settings.lang);
    list = list.filter(c => c.pinned).concat(list.filter(c => !c.pinned));
    document.querySelectorAll('#chats-sort span').forEach(function (sp) { sp.classList.toggle('active', sp.getAttribute('data-s') === chatSort()); });
    document.querySelectorAll('#chats-scope span').forEach(function (s) { s.classList.toggle('active', (s.getAttribute('data-s') === 'all') === chatScopeAll); });
    updateChatBar(); updateMenuInfo();
    if (state.selMode) { const ids = new Set(all.map(c => c.id)); Array.from(selIds).forEach(i => { if (!ids.has(i)) selIds.delete(i); }); if (!selIds.size) state.selMode = false; }
    selUpdateBar();
    if (!list.length) {
        const s = document.createElement('small');
        s.textContent = q ? t('nothingFound') : t(all.length ? 'nothingInMode' : 'nothingSaved');
        box.appendChild(s);
        return;
    }
    const lastPin = list.reduce(function (a, c, i) { return c.pinned ? i : a; }, -1);
    list.forEach((c, ci) => {
        const row = savedRow({
            id: c.id, title: c.title, pinned: !!c.pinned, selected: state.selMode && selIds.has(c.id), showMore: !state.selMode,
            sub: (c.provider && c.provider !== 'ollama' ? c.provider + ' · ' : '') + c.model + ' · ' + c.ts,
            mode: c.mode || 'wilson', modeColor: (state.MODE_PRESETS[c.mode] || state.MODE_PRESETS.wilson).color,
            labels: { ren: t('renameChat'), pin: t(c.pinned ? 'unpinChat' : 'pinChat'), cp: t('copyChatList'), exp: t('exportChat'), del: t('delChat') }
        });
        const ttl = row.querySelector('.ttl-in');
        bindLongPress(row.querySelector('.load'), c.id, { isSel: () => state.selMode, start: selStart, toggle: selToggle, open: openOrClose(row, loadChat) });
        const more = row.querySelector('.more');
        if (more) more.onclick = () => { row.classList.toggle('open'); setTimeout(function () { revealRow(row); }, 30); setTimeout(function () { revealRow(row); }, 260); };
        row.querySelector('[data-act=del]').onclick = () => deleteChat(c.id);
        row.querySelector('[data-act=ren]').onclick = function () {
            row.classList.remove('open');
            inlineEdit(ttl, c.name || c.title, function (v) { setChatName(c.id, v); updateChatBar(); renderSavedList(); });
        };
        row.querySelector('[data-act=pin]').onclick = function () { togglePin(c.id); };
        row.querySelector('[data-act=exp]').onclick = function () { exportChat(c.id); };
        const cp = row.querySelector('[data-act=cp]');
        cp.onclick = function () {
            const txt = (c.messages || []).map(function (m) { return (m.role === 'user' ? t('roleUser') : t('roleBot')) + '\n' + m.content; }).join('\n\n');
            copyText(txt).then(function () { cp.classList.add('okc'); }).catch(function () { }).then(function () { setTimeout(function () { cp.classList.remove('okc'); }, 1500); });
        };
        box.appendChild(row);
        if (ci === lastPin && lastPin < list.length - 1) { const sp = document.createElement('div'); sp.className = 'pin-sep'; box.appendChild(sp); }
    });
}
