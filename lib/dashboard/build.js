/* lib/dashboard/build.js – Anfrage zusammenbauen: Systemprompt, Nachrichten, Optionen.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV } from './base.js';
import { capSendable } from './caps.js';
import { isNative, promptChanged, toneSent } from './params.js';
import { settings, state } from './state.js';

// Der Systemprompt bleibt gleich (nur Person, Sprache, Schnellmodus): so bleibt er im Zwischenspeicher
// von Ollama und das Vorladen greift. Der Kontext steht vorn in der letzten Nutzernachricht.
// Vorgabe der Person: Prompt + Antwortsprache. Eigener Prompt (geändert): genau der Text des Benutzers; leer heißt „kein Prompt“.
// Nativ ohne eigenen Prompt: kein Systemprompt (das Modell bringt seine eigene Persona mit).
export function buildSystemPrompt(mode, plainMode) {
    const P = state.PROMPTS[settings.lang];
    if (!plainMode && promptChanged()) return settings.ownPrompt + (settings.fast ? ' ' + P.plain : '');
    if (isNative(mode)) return '';
    return P[mode] + ' ' + P.respond + (settings.fast ? ' ' + P.plain : '');
}
export function buildMessages(useCtx, contextText, history) {
    const P = state.PROMPTS[settings.lang];
    const msgs = history.map(m => ({ role: m.role, content: m.content }));
    const last = msgs[msgs.length - 1];
    last.content = (useCtx ? P.ctxLabel + '\n' + contextText + '\n\n' : '') + last.content;
    if (!promptChanged() && isNative(settings.mode)) {
        // Nativ: keine System-Nachricht (das Modell behält seine eigene Persona, z. B. aus dem Modelfile);
        // Antwortsprache (und Schnellmodus) gehen in die letzte Nutzernachricht.
        last.content += '\n\n' + P.respond + (settings.fast ? ' ' + P.plain : '');
        return msgs;
    }
    // Modi mit Pflicht-Kontext (Audit): Kontext wie bisher in der Systemnachricht (Handytest 10.11.2026: im Nutzertext
    // antwortete qwen2.5:3b „Information not in context.“); der feste Anfang bleibt trotzdem im Zwischenspeicher.
    let sys = buildSystemPrompt(settings.mode);
    if (!promptChanged() && useCtx && state.MODE_PRESETS[settings.mode].ctxInSystem) {
        sys += '\n\n' + P.ctxLabel + '\n' + contextText;
        last.content = last.content.slice((P.ctxLabel + '\n' + contextText + '\n\n').length);
    }
    if (!sys.trim()) return msgs;   // eigener Prompt leer: kein Prompt
    return [{ role: 'system', content: sys }].concat(msgs);
}
export function buildOptions(preset) {
    const o = {};
    // Gesperrte Regler (Zustand off, error, fixed, config in lib/capabilities.json) werden nicht gesendet
    if (toneSent()) {
        if (capSendable('temperature')) o.temperature = parseFloat($('param-temp').value);
        if (capSendable('top_p')) o.top_p = parseFloat($('param-topp').value);
        if (capSendable('top_k')) o.top_k = parseInt($('param-topk').value, 10);
        if (preset.stop && preset.stop.length && capSendable('stop')) o.stop = preset.stop.slice();
    }
    // Threads und Kontext sind Laufzeit, nicht Sampling: Regel gemeinsam mit allen Tools (PV.runtime), damit Ollama beim Seitenwechsel nicht neu lädt
    const rt = PV.runtime(settings.provider, $('model-select').value || settings.model, settings);
    if (rt.options.num_ctx && capSendable('num_ctx')) o.num_ctx = rt.options.num_ctx;
    if (rt.options.num_thread && capSendable('num_thread')) o.num_thread = rt.options.num_thread;
    if (settings.fast && capSendable('max_tokens')) o.num_predict = settings.fastN;
    return o;
}
