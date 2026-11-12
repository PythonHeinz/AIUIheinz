/* lib/dashboard/conversations.js – Unterhaltungen: umbenennen, anpinnen, exportieren, speichern, laden, Liste.
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

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
    if (id === currentSavedId) { currentName = name; persistCurrent(); }
}
function renameCurrent() {
    const host = $('chat-title');
    if (host.querySelector('input')) return;
    inlineEdit(host, currentName || host.textContent, function (v) {
        currentName = v; host.textContent = '';
        if (currentSavedId) setChatName(currentSavedId, v); else persistCurrent();
        updateChatBar(); renderSavedList();
    });
}
function togglePin(id) {
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

// ===== Chats speichern / laden =====
function getSaved() { return HeinzStore.get('heinz_chats', []); }

function saveCurrentToList() {
    if (!chatHistory.length) return;
    const list = getSaved();
    const first = chatHistory.find(m => m.role === 'user');
    const entry = {
        id: currentSavedId || Date.now(),
        title: currentName || (first ? first.content : 'Chat').replace(/\s+/g, ' ').slice(0, 40),
        name: currentName || undefined,
        pinned: !!((list.find(c => c.id === currentSavedId) || {}).pinned),
        ts: new Date().toLocaleString(t('locale')),
        model: settings.model,
        provider: settings.provider,
        mode: settings.mode,
        messages: chatHistory.slice(),
        context: document.getElementById('context').value
    };
    const idx = list.findIndex(c => c.id === entry.id);
    if (idx >= 0) list.splice(idx, 1);
    list.unshift(entry);
    HeinzStore.set('heinz_chats', list);
    currentSavedId = entry.id;
    renderSavedList();
}

function saveChatNow() {
    if (!chatHistory.length) return alert(t('noChatToSave'));
    saveCurrentToList();
    persistCurrent();
}

function newChat(save) {
    if (generating && currentAbortController) currentAbortController.abort();
    if (save && chatHistory.length) saveCurrentToList();
    chatHistory = [];
    currentSavedId = null; currentName = '';
    HeinzStore.remove('heinz_current');
    showPlaceholder(t('readyNew'), true);
    resetDashboard();
    updateChatBar();
}

function discardChat() {
    if (!chatHistory.length) return;
    if (!confirm(t('confirmDiscard'))) return;
    if (currentSavedId) {
        HeinzStore.set('heinz_chats', getSaved().filter(c => c.id !== currentSavedId));
    }
    newChat(false);
    renderSavedList();
}

function loadChat(id) {
    const c = getSaved().find(x => x.id === id);
    if (!c) return;
    if (generating && currentAbortController) currentAbortController.abort();
    if (chatHistory.length && currentSavedId !== id) saveCurrentToList();
    const want = c.provider || 'ollama';
    const wp = PV.get(want);
    if (wp && (wp.local || PV.onlineAllowed())) settings.provider = want; else settings.provider = 'ollama';   // Online-Chat ohne „Online erlauben“: lokal öffnen
    if (settings.provider === want) settings.model = c.model || settings.model;
    else settings.model = resolveModel(MODE_PRESETS[c.mode || settings.mode] || MODE_PRESETS.wilson);
    settings.mode = c.mode || settings.mode;
    saveSettings();
    applyUIFromSettings();
    chatHistory = c.messages.slice();
    currentSavedId = c.id; currentName = c.name || '';
    document.getElementById('context').value = c.context || '';
    renderChatFromHistory();
    persistCurrent();
    renderSavedList();
    closeAll();
}

function deleteChat(id) {
    HeinzStore.set('heinz_chats', getSaved().filter(c => c.id !== id));
    if (currentSavedId === id) { currentSavedId = null; persistCurrent(); }
    renderSavedList();
}

let chatScopeAll = false;
function toggleChatScope() { chatScopeAll = !chatScopeAll; renderSavedList(); }

function revealRow(row) {
    let p = row.parentNode;
    while (p && p !== document.body && !(p.scrollHeight > p.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentNode;
    if (!p || p === document.body) return;
    const over = row.getBoundingClientRect().bottom - p.getBoundingClientRect().bottom + 44;
    if (over > 0) p.scrollBy({ top: over, behavior: 'smooth' });
}
// Mehrfachauswahl: langes Druecken auf eine Zeile startet sie, danach waehlt ein Tipp ab oder an. Kein "Alle waehlen" (Beschluss des Entwicklers, 12.11.2026).
let selMode = false; const selIds = new Set();
function selUpdateBar() {
    const bar = $('sel-bar'); if (!bar) return;
    bar.hidden = !selMode;
    $('sel-count').textContent = t('selCount', { n: selIds.size });
    const d = $('sel-del'); d.disabled = !selIds.size;
    d.innerHTML = ICON('trash') + '<span>' + esc(t('selDelete')) + '</span>';
    $('sel-x').title = t('selCancel');
}
function selStart(id) { selMode = true; selIds.clear(); selIds.add(id); renderSavedList(); if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { } } }
function selToggle(id) { if (selIds.has(id)) selIds.delete(id); else selIds.add(id); if (!selIds.size) selMode = false; renderSavedList(); }
function selEnd() { selMode = false; selIds.clear(); renderSavedList(); }
function selDelete() {
    if (!selIds.size || !confirm(t('confirmDelSel', { n: selIds.size }))) return;
    const gone = new Set(selIds);
    HeinzStore.set('heinz_chats', getSaved().filter(c => !gone.has(c.id)));
    if (gone.has(currentSavedId)) { currentSavedId = null; persistCurrent(); }
    selMode = false; selIds.clear(); renderSavedList();
}
function bindLongPress(btn, id, openFn) {
    let timer = null, fired = false, x0 = 0, y0 = 0;
    const clear = function () { if (timer) { clearTimeout(timer); timer = null; } };
    btn.addEventListener('pointerdown', function (e) { fired = false; x0 = e.clientX; y0 = e.clientY; clear(); if (selMode) return; timer = setTimeout(function () { timer = null; fired = true; selStart(id); }, 500); });
    btn.addEventListener('pointermove', function (e) { if (timer && (Math.abs(e.clientX - x0) > 8 || Math.abs(e.clientY - y0) > 8)) clear(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { btn.addEventListener(ev, clear); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function (e) { if (fired) { fired = false; e.preventDefault(); return; } if (selMode) selToggle(id); else openFn(); });
}
function renderSavedList() {
    const box = $('saved-list');
    box.innerHTML = '';
    const all = getSaved();
    box.style.paddingBottom = selMode ? 'calc(190px + env(safe-area-inset-bottom))' : '';
    const q = (($('chat-search') || {}).value || '').trim().toLowerCase();
    // Chats werden je Modus gefuehrt; "Alle" zeigt die ganze Liste (Laden springt dann in den Modus des Chats)
    let list = chatScopeAll ? all : all.filter(c => (c.mode || 'wilson') === settings.mode);
    if (q) list = list.filter(c => (c.title || '').toLowerCase().indexOf(q) >= 0);
    list = list.filter(c => c.pinned).concat(list.filter(c => !c.pinned));
    document.querySelectorAll('#chats-scope span').forEach(function (s) { s.classList.toggle('active', (s.getAttribute('data-s') === 'all') === chatScopeAll); });
    updateChatBar(); updateMenuInfo();
    if (selMode) { const ids = new Set(all.map(c => c.id)); Array.from(selIds).forEach(i => { if (!ids.has(i)) selIds.delete(i); }); if (!selIds.size) selMode = false; }
    selUpdateBar();
    if (!list.length) {
        const s = document.createElement('small');
        s.textContent = q ? t('nothingFound') : t(all.length ? 'nothingInMode' : 'nothingSaved');
        box.appendChild(s);
        return;
    }
    const lastPin = list.reduce(function (a, c, i) { return c.pinned ? i : a; }, -1);
    list.forEach((c, ci) => {
        const row = document.createElement('div');
        row.className = 'saved-item' + (selMode && selIds.has(c.id) ? ' sel' : '');
        row.setAttribute('data-mode', c.mode || 'wilson');
        row.style.setProperty('--mc', (MODE_PRESETS[c.mode] || MODE_PRESETS.wilson).color);
        const sr = document.createElement('div');
        sr.className = 'sr';
        const load = document.createElement('button');
        load.className = 'load';
        const ttl = document.createElement('span'); ttl.className = 'ttl-in';
        ttl.appendChild(document.createTextNode(c.title));
        load.appendChild(ttl);
        const sm = document.createElement('small');
        sm.textContent = (c.provider && c.provider !== 'ollama' ? c.provider + ' · ' : '') + c.model + ' · ' + c.ts;
        load.appendChild(sm);
        bindLongPress(load, c.id, () => loadChat(c.id));
        const more = document.createElement('button');
        more.className = 'ibtn more';
        more.type = 'button';
        more.innerHTML = ICON('dots');
        more.onclick = () => { row.classList.toggle('open'); setTimeout(function () { revealRow(row); }, 30); setTimeout(function () { revealRow(row); }, 260); };
        const acts = document.createElement('div');
        acts.className = 'acts2';
        const del = document.createElement('button');
        del.className = 'pill danger del';
        del.type = 'button';
        del.innerHTML = ICON('trash') + '<span>' + esc(t('delChat')) + '</span>';
        del.onclick = () => deleteChat(c.id);
        const ren = document.createElement('button');
        ren.className = 'pill'; ren.type = 'button';
        ren.innerHTML = ICON('pencil') + '<span>' + esc(t('renameChat')) + '</span>';
        ren.onclick = function () {
            row.classList.remove('open');
            inlineEdit(ttl, c.name || c.title, function (v) { setChatName(c.id, v); updateChatBar(); renderSavedList(); });
        };
        const pin = document.createElement('button');
        pin.className = 'pill'; pin.type = 'button';
        pin.innerHTML = ICON('pin') + '<span>' + esc(t(c.pinned ? 'unpinChat' : 'pinChat')) + '</span>';
        pin.onclick = function () { togglePin(c.id); };
        const exp = document.createElement('button');
        exp.className = 'pill'; exp.type = 'button';
        exp.innerHTML = ICON('download') + '<span>' + esc(t('exportChat')) + '</span>';
        exp.onclick = function () { exportChat(c.id); };
        const cp = document.createElement('button');
        cp.className = 'pill'; cp.type = 'button';
        cp.innerHTML = ICON('copy') + '<span>' + esc(t('copyChatList')) + '</span>';
        cp.onclick = function () {
            const txt = (c.messages || []).map(function (m) { return (m.role === 'user' ? t('roleUser') : t('roleBot')) + '\n' + m.content; }).join('\n\n');
            const sp = cp.querySelector('span'), old = sp.textContent;
            copyText(txt).then(function () { cp.classList.add('okc'); }).catch(function () { }).then(function () { setTimeout(function () { cp.classList.remove('okc'); }, 1500); });
        };
        [ren, pin, cp, exp, del].forEach(function (b) { b.title = b.querySelector('span').textContent; });
        acts.appendChild(ren); acts.appendChild(pin); acts.appendChild(cp); acts.appendChild(exp);
        acts.appendChild(del);
        if (c.pinned) sr.insertAdjacentHTML('afterbegin', ICON('pin', 'sm pinned'));
        sr.appendChild(load); if (!selMode) sr.appendChild(more);
        row.appendChild(sr); row.appendChild(acts);
        box.appendChild(row);
        if (ci === lastPin && lastPin < list.length - 1) { const sp = document.createElement('div'); sp.className = 'pin-sep'; box.appendChild(sp); }
    });
}
