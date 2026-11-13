/* lib/dashboard/protocol.js – Texte für „Parameter kopieren“ und das Testprotokoll einer Antwort.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, HeinzCaps, PV } from './base.js';
import { capCtx, thinkRule, thinkSend, thinkStage, thinkWire } from './caps.js';
import { copyText } from './clipboard.js';
import { readSliders } from './sliders.js';
import { settings } from './state.js';

export function paramsText() {
    const v = readSliders(), th = parseInt($('param-threads').value, 10), m = $('model-select').value || settings.model || '';
    const pv = PV.get(settings.provider) || PV.get('ollama');
    let o = 'Heinz UI | ' + m + ' (' + pv.name + ')\ntemperature ' + v.temp + '\ntop_p ' + v.topp + '\ntop_k ' + v.topk + '\nnum_ctx ' + v.ctx;
    if (th > 0) o += '\nnum_thread ' + th;
    o += '\n\nModelfile:\nPARAMETER temperature ' + v.temp + '\nPARAMETER top_p ' + v.topp + '\nPARAMETER top_k ' + v.topk + '\nPARAMETER num_ctx ' + v.ctx;
    if (th > 0) o += '\nPARAMETER num_thread ' + th;
    return o;
}
// Testprotokoll einer Antwort (Knopf unter der Antwort): Zustand je Regler, Denkstufe, gesendete Anfrage, rohes usage, Zeiten. Nie Schlüssel, nie Nachrichtentext.
export function capsStates() {
    if (!HeinzCaps || !HeinzCaps.ready()) return '';
    const c = capCtx(), d = HeinzCaps.data();
    let o = '\n\nCapabilities (' + c.id + ' / ' + c.model + '):';
    Object.keys(d.parameters || {}).forEach(function (k) {
        const cell = HeinzCaps.cell(c.id, c.url, c.model, k);
        o += '\n' + k + ': ' + cell.state + (cell.status ? ' [' + cell.status + ']' : '') + (typeof cell.recommended === 'number' ? ' recommended ' + cell.recommended : '');
    });
    const mm = PV.modelMeta ? PV.modelMeta(c.model) : null;
    if (mm) o += '\nmodel list (native): inputTokenLimit ' + mm.inputTokenLimit + ', outputTokenLimit ' + mm.outputTokenLimit + ', thinking ' + mm.thinking + ', topK ' + mm.topK + ', maxTemperature ' + mm.maxTemperature;
    const r = thinkRule();
    if (r) { const sd = thinkSend(); o += '\nthinking: ' + (thinkStage() || 'model default') + (sd ? ' -> ' + thinkWire(sd) : ' (nothing sent)'); }
    return o;
}
// the sent body without any message text (neither the chat nor the system prompt)
export function exBodyText(b) {
    const c = Object.assign({}, b);
    ['messages', 'contents'].forEach(function (k) { if (Array.isArray(c[k])) c[k] = '[' + c[k].length + ' ' + k + ']'; });
    if (c.systemInstruction) c.systemInstruction = '[system]';
    return JSON.stringify(c);
}
export function exchangeText(st, ex, err) {
    let o = '';
    const d = HeinzCaps && HeinzCaps.ready() ? HeinzCaps.data() : {};
    if (st) {
        o += '\n\nLast answer: promptTokens ' + (st.promptTokens || 0) + ', outputTokens ' + (st.outputTokens || 0) + ', reasoningTokens ' + (st.reasoningTokens || 0) + (st.reasoningDerived ? ' (derived: total_tokens minus prompt and output)' : '') +
            ', visibleTokens ' + (st.visibleTokens || 0) + ', totalTokens ' + (st.totalTokens || 0) + ', source ' + (st.source || '?') + (st.approx ? ' (estimate)' : '') +
            ', finish ' + (st.finishReason || '?') + ', tokensPerSec ' + (st.tokensPerSec || 0).toFixed(1) + ', tokensPerSecAll ' + (st.tokensPerSecAll || 0).toFixed(1);
        const oir = d.stats && d.stats.outputIncludesReasoning;
        if (st.reasoningDerived) o += '\nNote: outputTokens exclude the thinking tokens (total_tokens is larger than prompt + output; no reasoning_tokens field reported).';
        else if ((st.reasoningTokens || 0) > 0 && (!oir || oir === 'unknown')) o += '\nNote: outputIncludesReasoning unknown, values not comparable.';
    }
    if (ex) {
        o += '\n\nLast request (' + ex.provider + ', HTTP ' + ex.status + '): ' + exBodyText(ex.body) +
            '\nLast response: usage ' + JSON.stringify(ex.usage) + ', finish ' + (ex.finish || '?') + ', chunks ' + ex.chunks + ', first content after ' + ex.firstMs + ' ms, total ' + ex.totalMs + ' ms';
    }
    if (err) o += '\n\nError: ' + err;
    return o;
}
export function copyParams() {
    const sp = $('q-copy').querySelector('span'), old = sp.textContent;
    copyText(paramsText()).then(function () { sp.textContent = '✓'; }).catch(function () { sp.textContent = '✕'; })
        .then(function () { setTimeout(function () { sp.textContent = old; }, 1500); });
}
