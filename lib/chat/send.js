/* lib/chat/send.js – Senden, Abbruch und Anfrage an die Engine.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, HeinzWissen, PV } from './base.js';
import { persist } from './conversations.js';
import { t } from './i18n.js';
import { renderSheet } from './model.js';
import { state } from './state.js';
import { ring } from './status.js';
import { notice, renderLog, setBusy } from './view.js';

// ---- Wissen: optionales Feld `wissen` der Konfiguration des Heinz Chat (kein eigener Schalter im Chat) ----
// Nur Engines auf diesem Gerät: Auszüge gehen nie an eine Online-Engine. Der Baustein ruft kein Modell selbst auf; `senden` kommt von hier.
function wissenCfg() {
    var c = PV.chatConfig(), w = c && c.model === state.S.model ? c.wissen : null;
    if (!w || !w.an) return null;
    var p = PV.get(state.S.provider);
    if (!p || !p.local) { notice('warn', t('wissenLocal')); return null; }
    return w;
}
// Kurze Nachfragen („Das ist falsch“) haben kein Thema: lief die vorige Antwort mit Quellen, geht die vorige Frage in die Suche ein.
function frageFuerWissen(q) {
    var n = state.msgs.length, prevA = state.msgs[n - 3], prevU = state.msgs[n - 4];
    return prevA && prevA.role === 'assistant' && prevA.quellen && prevA.quellen.length && prevU && prevU.role === 'user' && q.split(/\s+/).length <= 4 ? prevU.content + ' ' + q : q;
}
function holeWissen(q, w, rt, signal) {
    var senden = function (a) {
        return PV.chat(state.S.provider, { model: state.S.model, system: a.system, messages: [{ role: 'user', content: a.user }], format: a.format, signal: signal, options: Object.assign({}, rt.options || {}, { temperature: 0, num_predict: 80 }), keepAlive: rt.keepAlive }).then(function (r) { return r.text; });
    };
    state.phase = 'suche'; ring();
    return HeinzWissen.kontext(frageFuerWissen(q), { senden: senden, quellen: w.quellen && w.quellen.length ? w.quellen : undefined, begriffeVom: w.begriffe === 'modell' ? 'modell' : 'app', signal: signal,
        onStatus: function (s) { state.phase = s; ring(); renderLog(true); } })
        .then(function (k) {
            var m = state.msgs[state.msgs.length - 1];
            if (k && k.verwendet && k.verwendet.length) m.quellen = k.verwendet.map(function (v) { return { nr: v.nr, titel: v.titel, link: v.link || '', lizenz: v.lizenz || '', angabe: v.angabe || '' }; });
            return k;
        }, function (e) { if (e && e.name === 'AbortError') throw e; state.phase = ''; notice('warn', t('wissenErr')); return null; });
}
// Systemtext der Konfiguration plus nummerierter Zusatz mit den Auszügen. Ohne passenden Auszug steht ein Hinweis; das Modell kennzeichnet dann eigenes Wissen als Einschätzung.
function systemMit(k) {
    var base = PV.chatSystemFor(state.S.model) || '';
    if (!k) return base;
    var add = k.text && k.verwendet && k.verwendet.length
        ? 'Knowledge excerpts follow, numbered. Use them to answer and cite the number like [1] right after the statement an excerpt supports. If no excerpt fits the question, say so; answer only if you are sure and mark it as your own assessment.\n\n' + k.text
        : 'No knowledge excerpt was found for this question. Say so; answer only if you are sure and mark it as your own assessment.';
    return base ? base + '\n\n' + add : add;
}
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
    var rt = PV.chatRuntime(state.S.provider, state.S.model);   // Threads, Kontext (aus der Konfiguration des Heinz Chat), Haltezeit
    var sig = state.abort.signal, w = wissenCfg();
    var pre = w ? holeWissen(q, w, rt, sig) : Promise.resolve(null);
    pre.then(function (k) { return PV.prepare(state.S.provider, state.S.model).then(function () { return k; }); }).then(function (k) { state.phase = ''; ring(); return PV.chat(state.S.provider, { model: state.S.model, system: systemMit(k), messages: hist, options: Object.assign({}, state.S.provider === 'ollama' ? PV.chatSamplingFor(state.S.model) : {}, rt.options), keepAlive: rt.keepAlive, stream: true, signal: state.abort.signal, onDelta: function (d) { if (!state.gotTok) { state.gotTok = true; ring(); } state.msgs[state.msgs.length - 1].content += d; renderLog(true); } }) })
        .then(function () { }, function (e) {
            if (e && e.name === 'AbortError') { state.msgs[state.msgs.length - 1].content += (state.msgs[state.msgs.length - 1].content ? ' ' : '') + t('stopped'); return; }
            var code = e && e.code, m = code === 'ONLINE_BLOCKED' ? t('blocked') : code === 'NO_KEY' ? t('noKey') : t('err', { m: (e && e.message) || '' });
            if (!state.msgs[state.msgs.length - 1].content) state.msgs.pop();
            if (state.msgs.length && state.msgs[state.msgs.length - 1].role === 'user') { $('q').value = state.msgs.pop().content; autosize(); }
            notice('err', m);
        }).then(function () { state.phase = ''; setBusy(false); state.abort = null; persist(); renderLog(false); });
}
export function autosize() { var q = $('q'); q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, innerHeight * .34) + 'px'; }
