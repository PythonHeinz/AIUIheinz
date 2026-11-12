/* lib/chat/send.js – Senden, Abbruch und Anfrage an die Engine.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, PV } from './base.js';
import { persist } from './conversations.js';
import { t } from './i18n.js';
import { renderSheet } from './model.js';
import { state } from './state.js';
import { ring } from './status.js';
import { notice, renderLog, setBusy } from './view.js';

// ---- sending ----
export function send() {
    if (state.gen) { if (state.abort) state.abort.abort(); return; }
    var q = $('q').value.trim(); if (!q) return;
    if (!state.S.model) { notice('warn', t('noModel')); Heinz.sheetOpen('sh-model'); renderSheet(); return; }
    notice('', '');
    state.msgs.push({ role: 'user', content: q }); state.msgs.push({ role: 'assistant', content: '' });
    $('q').value = ''; autosize(); setBusy(true); renderLog(true);
    state.abort = new AbortController();
    var hist = state.msgs.slice(0, -1).map(function (m) { return { role: m.role, content: m.content }; });
    var rt = PV.runtime(state.S.provider, state.S.model);   // Threads, Kontext, Haltezeit: gemeinsame Regel in lib/providers.js
    PV.prepare(state.S.provider, state.S.model).then(function () { return PV.chat(state.S.provider, { model: state.S.model, system: PV.chatSystemFor(state.S.model), messages: hist, options: Object.assign({}, state.S.provider === 'ollama' ? PV.chatSamplingFor(state.S.model) : {}, rt.options), keepAlive: rt.keepAlive, stream: true, signal: state.abort.signal, onDelta: function (d) { if (!state.gotTok) { state.gotTok = true; ring(); } state.msgs[state.msgs.length - 1].content += d; renderLog(true); } }) })
        .then(function () { }, function (e) {
            if (e && e.name === 'AbortError') { state.msgs[state.msgs.length - 1].content += (state.msgs[state.msgs.length - 1].content ? ' ' : '') + t('stopped'); return; }
            var code = e && e.code, m = code === 'ONLINE_BLOCKED' ? t('blocked') : code === 'NO_KEY' ? t('noKey') : t('err', { m: (e && e.message) || '' });
            if (!state.msgs[state.msgs.length - 1].content) state.msgs.pop();
            if (state.msgs.length && state.msgs[state.msgs.length - 1].role === 'user') { $('q').value = state.msgs.pop().content; autosize(); }
            notice('err', m);
        }).then(function () { setBusy(false); state.abort = null; persist(); renderLog(false); });
}
export function autosize() { var q = $('q'); q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, innerHeight * .34) + 'px'; }
