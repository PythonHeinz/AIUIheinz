/* lib/chat/view.js – Kopfzeile, Nachrichtenliste, Hinweisband und Sendeknopf.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, esc, md } from './base.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { checkStatus, preload, pv, ring } from './status.js';

export function head() {
    var p = pv();
    $('mod-t').textContent = (state.S.model || t('model')) + (p.local ? '' : ' · ' + t('cloud'));
    $('q').placeholder = t('ph');
    document.title = t('title');
    checkStatus(); preload();
}
export function renderLog(streaming) {
    var box = $('log');
    if (!state.msgs.length && !state.S.model) { box.innerHTML = '<div class="empty"><b>' + t('hello') + '</b><span>' + esc(t('setupSentence')) + '</span><button type="button" class="pill" data-setup>' + esc(t('setupBtn')) + '</button></div>'; return; }   // first start: the default configuration has no model yet
    if (!state.msgs.length) { box.innerHTML = '<div class="empty"><b>' + t('hello') + '</b><span>' + esc(t('sub', { m: state.S.model || '–' })) + '</span></div>'; return; }
    box.innerHTML = state.msgs.map(function (m, i) {
        if (m.role === 'user') return '<div class="msg u"><div>' + esc(m.content) + '</div></div>';
        var last = streaming && i === state.msgs.length - 1;
        var wait = last && !m.content && state.phase ? '<i class="ph">' + esc(t('ph_' + state.phase)) + '</i>' : '';
        return '<div class="msg a">' + wait + md(m.content) + (last ? '<span class="cur"></span>' : '') + quellenChips(m) + (last ? '' : '<br><button class="ibtn cp" type="button" data-cp="' + i + '" aria-label="' + t('copy') + '"><svg class="i sm"><use href="/lib/icons.svg#i-copy"/></svg></button>') + '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
}
// Quellenchips unter der Antwort (Titel, Link, Lizenz); nur http(s)-Links werden zu Links. Gespeichert mit der Unterhaltung (m.quellen).
function quellenChips(m) {
    if (!m.quellen || !m.quellen.length) return '';
    var cited = {}; String(m.content || '').replace(/\[(\d+)\]/g, function (x, n) { cited[n] = 1; return x; });
    var shown = m.quellen.filter(function (q) { return cited[q.nr]; }), all = !shown.length;   // the model named sources: only those; otherwise all excerpts it was given, labelled as such
    if (all) shown = m.quellen;
    return '<div class="src">' + (all ? '<span class="srcl">' + esc(t('excerpts')) + '</span>' : '') + shown.map(function (q) {
        var txt = '[' + q.nr + '] ' + esc(q.titel) + (q.lizenz ? ' · ' + esc(q.lizenz) : '');
        return /^https?:\/\//.test(q.link || '') ? '<a class="chip" href="' + esc(q.link) + '" target="_blank" rel="noopener noreferrer" title="' + esc(q.angabe || '') + '">' + txt + '</a>' : '<span class="chip" title="' + esc(q.angabe || '') + '">' + txt + '</span>';
    }).join('') + '</div>';
}
export function notice(kind, text) { var n = $('note'); if (!text) { n.hidden = true; return; } n.hidden = false; n.className = 'notice ' + kind; n.textContent = text; }
export function setBusy(b) {
    state.gen = b; if (b) { state.gotTok = false; if (state.preAbort) { state.preAbort = null; } } ring(); if (!b) checkStatus();
    $('send').innerHTML = '<svg class="i"><use href="/lib/icons.svg#i-' + (b ? 'stop' : 'send') + '"/></svg>';
    $('send').setAttribute('aria-label', b ? 'Stop' : 'Send');
}
