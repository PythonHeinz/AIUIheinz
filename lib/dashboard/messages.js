/* lib/dashboard/messages.js – Nachrichten anzeigen, kopieren, Scrollen.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, esc, parseOfflineMarkdown } from './base.js';
import { updateActs, updateChatBar } from './caps.js';
import { t } from './i18n.js';
import { ICON } from './menu.js';
import { perfColors } from './pixelbar.js';
import { toggleRead } from './speech.js';
import { state } from './state.js';

// ===== Nachrichten-Rendering =====
export const chatBox = document.getElementById('chat-container');
// Folgt der Live-Ausgabe, solange nicht nach oben gescrollt wurde; Pfeil springt zum Ende
let stuck = true;
function nearBottom() { return chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 60; }
export function stickBottom(force) {
    if (force) stuck = true;
    if (stuck) chatBox.scrollTop = chatBox.scrollHeight;
    updateJump();
}
function updateJump() { const j = document.getElementById('jump-bottom'); if (j) j.hidden = nearBottom() || chatBox.scrollHeight <= chatBox.clientHeight + 40; }
chatBox.addEventListener('scroll', function () { stuck = nearBottom(); updateJump(); }, { passive: true });
export function jumpBottom() { stuck = true; chatBox.scrollTop = chatBox.scrollHeight; updateJump(); }
export function showPlaceholder(text, isNew) {
    chatBox.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'placeholder';
    if (isNew) d.setAttribute('data-new', '1');
    d.textContent = text;
    chatBox.appendChild(d);
}
function clearPlaceholder() {
    const p = chatBox.querySelector('.placeholder');
    if (p) p.remove();
}
function attachCopy(div, raw) {
    div._raw = raw;
    if (div.classList.contains('msg-assistant')) {
        let r = div.querySelector(':scope > .msg-acts');
        if (!r) {
            r = document.createElement('div'); r.className = 'msg-acts';
            r.innerHTML = '<button type="button" class="msg-copy" title="' + esc(t('copyMsgTitle')) + '">' + ICON('copy') + '</button>' +
                (navigator.share ? '<button type="button" class="msg-share" title="' + esc(t('shareTitle')) + '">' + ICON('share') + '</button>' : '') +
                '<button type="button" class="msg-dl" title="' + esc(t('downloadTitle')) + '">' + ICON('download') + '</button>' +
                '<button type="button" class="msg-read" title="' + esc(t('readAloud')) + '">' + ICON(state.speaking ? 'stop' : 'volume') + '</button>' +
                '<button type="button" class="msg-proto" hidden title="' + esc(t('protoTitle')) + '">' + ICON('terminal') + '</button>';
        }
        div.appendChild(r);   // immer ans Ende (nach neu gerendertem Inhalt)
        const pbtn = r.querySelector('.msg-proto'); if (pbtn) pbtn.hidden = !div._proto;
        updateActs();
        return;
    }
    let b = div.querySelector(':scope > .msg-copy');
    if (!b) {
        b = document.createElement('button');
        b.type = 'button'; b.className = 'msg-copy'; b.innerHTML = ICON('copy');
        b.title = t('copyMsgTitle');
        div.appendChild(b);
    }
}
export function appendUserMessage(text, note) {
    clearPlaceholder();
    const div = document.createElement('div');
    div.className = 'msg msg-user';
    div.appendChild(document.createTextNode(text));
    if (note) {
        const n = document.createElement('span');
        n.className = 'msg-note';
        n.textContent = note;
        div.appendChild(n);
    }
    attachCopy(div, text);
    chatBox.appendChild(div);
    stickBottom(true);
    updateChatBar();
}
// Schnellmodus: reiner Text ohne Markdown-Verarbeitung (spart Rechenzeit und zeigt die Rohausgabe)
function setAssistantContent(div, content, plain) {
    div.classList.toggle('plain-text', !!plain);
    if (plain) div.textContent = content; else div.innerHTML = parseOfflineMarkdown(content);
    attachCopy(div, content);
}
function appendAssistantMessage(content, id, plain) {
    clearPlaceholder();
    const div = document.createElement('div');
    div.className = 'msg msg-assistant';
    if (id) div.id = id;
    setAssistantContent(div, content, plain);
    chatBox.appendChild(div);
    stickBottom();
    return div;
}
export function appendLoadingMessage(id) {
    clearPlaceholder();
    const div = document.createElement('div');
    div.className = 'msg msg-assistant';
    div.id = id;
    div.innerHTML = '<i>' + t('working') + ' <span class="wait-s"></span> <span class="spinner"></span></i>';
    chatBox.appendChild(div);
    stickBottom();
    return div;
}
export function showProtoBtn(div) { const b = div.querySelector(':scope > .msg-acts .msg-proto'); if (b) b.hidden = !div._proto; }
export function updateAssistantMessage(id, content, plain) {
    const div = document.getElementById(id);
    if (!div) return;
    setAssistantContent(div, content, plain);
    stickBottom();
}
export function renderChatFromHistory() {
    chatBox.innerHTML = '';
    if (!state.chatHistory.length) { showPlaceholder(t('ready')); return; }
    state.chatHistory.forEach(m => {
        if (m.role === 'user') appendUserMessage(m.content, m.note);
        else appendAssistantMessage(m.content, null, m.plain);
    });
    stickBottom(true);
    updateChatBar();
}
export function showStatsExtra(st) {
    const rt = st ? (st.reasoningTokens || 0) : 0;
    $('m-think').hidden = !(rt > 0);
    $('dash-think').textContent = (st && st.reasoningDerived ? '~' : '') + rt;
    $('dash-think').title = st && st.reasoningDerived ? t('thinkDerived') : '';
    const est = st && (st.approx || st.source === 'estimate');
    $('dash-a-tok').textContent = (est ? '~' : '') + (st ? (st.outputTokens || 0) : 0);
    $('dash-a-tok').title = est ? t('estTip') : '';
    const sp = $('dash-speed');
    sp.title = st && rt > 0 ? t('thinkTip') + ' (' + (st.tokensPerSec || 0).toFixed(1) + ' / ' + (st.tokensPerSecAll || 0).toFixed(1) + ' T/s)' : '';
}
export function resetDashboard() {
    state.lastStats = null; showStatsExtra(null);
    document.getElementById('dash-p-tok').innerText = '0';
    document.getElementById('dash-a-tok').innerText = '0';
    document.getElementById('dash-speed').innerText = '0.0';
    document.getElementById('dash-start').innerText = '0.0'; perfColors();
}
// Code-Blöcke kopieren (Event-Delegation)
export function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (resolve, reject) {
        const ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
        ta.remove();
    });
}
chatBox.addEventListener('click', function (e) {
    const mb = e.target.closest('.msg-copy');
    if (mb) {
        const raw = mb.closest('.msg')._raw || '';
        if (!raw) return;
        copyText(raw).then(function () { mb.innerHTML = ICON('check'); }).catch(function () { mb.innerHTML = ICON('x'); })
            .then(function () { setTimeout(function () { mb.innerHTML = ICON('copy'); }, 1500); });
        return;
    }
    const pb = e.target.closest('.msg-proto');
    if (pb) {
        const txt = pb.closest('.msg')._proto || '';
        if (!txt) return;
        copyText(txt).then(function () { pb.innerHTML = ICON('check'); }).catch(function () { pb.innerHTML = ICON('x'); })
            .then(function () { setTimeout(function () { pb.innerHTML = ICON('terminal'); }, 1500); });
        return;
    }
    const rb = e.target.closest('.msg-read');
    if (rb) { toggleRead(); return; }
    const sb = e.target.closest('.msg-share');
    if (sb) { const raw = sb.closest('.msg')._raw || ''; if (raw && navigator.share) navigator.share({ text: raw }).catch(function () {}); return; }
    const db = e.target.closest('.msg-dl');
    if (db) {
        const raw = db.closest('.msg')._raw || ''; if (!raw) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([raw], { type: 'text/markdown' }));
        a.download = 'heinz-answer-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.md';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        return;
    }
    const btn = e.target.closest('.code-copy');
    if (!btn) return;
    const code = btn.parentElement.querySelector('code');
    if (!code) return;
    copyText(code.textContent).then(function () {
        btn.textContent = '✓';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
    }).catch(function () {
        btn.textContent = '✕';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
    });
});
// Gesamten Chat als Text kopieren (Rohtext inkl. Code-Blöcken)
export function copyWholeChat(btn) {
    if (!state.chatHistory.length) return;
    const text = state.chatHistory.map(function (m) {
        return (m.role === 'user' ? t('roleUser') : t('roleBot')) + '\n' + m.content;
    }).join('\n\n');
    const old = btn.innerHTML;
    copyText(text).then(function () {
        btn.innerHTML = ICON('check');
    }).catch(function () {
        btn.innerHTML = ICON('x');
    }).then(function () {
        setTimeout(function () { btn.innerHTML = old; }, 1500);
    });
}
