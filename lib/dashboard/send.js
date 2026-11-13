/* lib/dashboard/send.js – Senden und Abbrechen: Systemprompt, Nachrichten, Optionen, Anfrage.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV } from './base.js';
import { buildMessages, buildOptions } from './build.js';
import { exitFull, setQuery, thinkEffort, thinkSend } from './caps.js';
import { t } from './i18n.js';
import { appendLoadingMessage, appendUserMessage, showProtoBtn, showStatsExtra, updateAssistantMessage } from './messages.js';
import { persistCurrent } from './persist.js';
import { perfColors, pulse } from './pixelbar.js';
import { KEEP_ALIVE, abortPreload, preloadKeyNow, unloadOthers } from './preload.js';
import { capsStates, exchangeText, paramsText } from './protocol.js';
import { settings, state } from './state.js';
import { checkServer, renderRing } from './status.js';

// ===== Senden / Abbrechen =====
export function setGenerating(on) {
    state.generating = on; state.gotToken = false;
    const sb = $('send-btn');
    sb.classList.toggle('stopping', on);
    document.body.classList.toggle('gen', on);
    sb.setAttribute('data-click', on ? 'abortGeneration' : 'askGemma');
    sb.querySelector('use').setAttribute('href', 'lib/icons.svg#i-' + (on ? 'stop' : 'send'));
    sb.title = t(on ? 'stopGen' : 'send');
    renderRing();
}
export function abortGeneration() {
    if (state.currentAbortController) state.currentAbortController.abort();
}

export function errText(err, prov) {
    if (err.code === 'ONLINE_BLOCKED') return t('onlineBlocked');
    if (err.code === 'NO_KEY') return t('needKey');
    if (err.http) {
        if (prov === 'ollama') return err.message + (err.http === 404 ? t('hint404') : t('hintCors'));
        return err.message + (err.http === 401 || err.http === 403 ? t('hintKey') : err.http === 429 ? t('hintLimit') : err.http === 404 ? t('hintNoModel') : '');
    }
    if (err instanceof TypeError) {
        return prov === 'ollama' ? t('connFail', { m: err.message }) : t('connFailGeneric', { n: (PV.get(prov) || {}).name || prov, m: err.message });
    }
    return err.message;
}
export async function askGemma() {
    if (state.generating || state.speedTesting || state.seriesRunning) return;
    const contextText = document.getElementById('context').value.trim();
    const queryInput = document.getElementById('query');
    const queryText = queryInput.value.trim();
    const mode = settings.mode;
    const selectedModel = document.getElementById('model-select').value;

    if (!queryText) return;
    window.speechSynthesis.cancel();

    const preset = state.MODE_PRESETS[mode];
    if (preset.ctx === 'required' && !contextText) {
        const box = $('context');
        box.classList.add('req-warn');
        box.placeholder = t('ctxRequiredWarn');
        box.focus();
        return;
    }

    const useCtx = !!contextText && preset.ctx !== 'none';
    const note = useCtx ? t('ctxNote', { n: contextText.length }) : null;

    state.chatHistory.push({ role: 'user', content: queryText, note: note });
    appendUserMessage(queryText, note);
    setQuery(''); exitFull(); queryInput.blur();

    abortPreload();
    const warmKey = preloadKeyNow();
    const fastUsed = !!settings.fast;
    const apiMessages = buildMessages(useCtx, contextText, state.chatHistory);

    const msgId = 'msg-' + Date.now();
    appendLoadingMessage(msgId);
    const waitStart = Date.now();
    const waitTimer = setInterval(function () {
        const w = document.querySelector('#' + msgId + ' .wait-s');
        if (w) w.textContent = Math.round((Date.now() - waitStart) / 1000) + ' s';
    }, 1000);

    state.currentAbortController = new AbortController();
    setGenerating(true);

    let outputBuffer = '';
    let finalStats = null;
    let aborted = false;
    let errorMsg = null;
    let renderTimer = null;

    const scheduleRender = function () {
        if (renderTimer) return;
        renderTimer = setTimeout(function () {
            renderTimer = null;
            updateAssistantMessage(msgId, outputBuffer, fastUsed);
        }, 60);
    };

    const prov = settings.provider;
    const opts = buildOptions(preset);
    const protoHead = paramsText() + capsStates();   // Momentaufnahme zum Sendezeitpunkt

    try {
        if (prov === 'ollama') await unloadOthers(selectedModel);
        const result = await PV.chat(prov, {
            model: selectedModel, messages: apiMessages, options: opts, keepAlive: KEEP_ALIVE, backend: settings.backend,
            reasoningEffort: thinkEffort(), thinking: thinkSend(),
            signal: state.currentAbortController.signal,
            onDelta: function (d) { outputBuffer += d; scheduleRender(); pulse.e = Math.min(1, pulse.e + 0.3); if (!state.gotToken) { state.gotToken = true; renderRing(); } if (state.eqPx) state.eqPx.wake(); }
        });
        finalStats = result.stats;
    } catch (err) {
        if (err.name === 'AbortError') aborted = true;
        else errorMsg = errText(err, prov);
    } finally {
        if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
        clearInterval(waitTimer);
        state.currentAbortController = null;
        setGenerating(false);
    }

    if (outputBuffer) {
        let shown = outputBuffer;
        if (aborted) shown += fastUsed ? '\n\n' + t('aborted') : '\n\n*' + t('aborted') + '*';
        if (errorMsg) shown += fastUsed ? '\n\n' + t('error') + ' ' + errorMsg : '\n\n**' + t('error') + '** ' + errorMsg;
        if (finalStats && finalStats.finishReason === 'length' && !aborted) shown += fastUsed ? '\n\n' + t('cutLength') : '\n\n*' + t('cutLength') + '*';
        updateAssistantMessage(msgId, shown, fastUsed);
        state.chatHistory.push(fastUsed ? { role: 'assistant', content: outputBuffer, plain: true } : { role: 'assistant', content: outputBuffer });
        if (finalStats && !aborted && !errorMsg) state.preloadKey = warmKey;
        checkServer();
    } else {
        state.chatHistory.pop();  // keine Antwort: Frage nicht im Verlauf behalten
        updateAssistantMessage(msgId, aborted
            ? '*' + t('aborted') + '*'
            : '**' + t('error') + '** ' + (errorMsg || (finalStats && finalStats.finishReason === 'length' ? t('cutLength') : t('noAnswer'))));
    }

    const protoText = protoHead + exchangeText(finalStats, PV.lastExchange && PV.lastExchange.provider === prov ? PV.lastExchange : null, errorMsg);
    const asDiv = document.getElementById(msgId);
    if (asDiv) { asDiv._proto = protoText; showProtoBtn(asDiv); }
    if (finalStats) {
        document.getElementById('dash-p-tok').innerText = finalStats.promptTokens || 0;
        document.getElementById('dash-a-tok').innerText = finalStats.outputTokens || 0;
        document.getElementById('dash-start').innerText = (((finalStats.loadMs || 0) + (finalStats.promptMs || 0)) / 1000).toFixed(1);
        document.getElementById('dash-speed').innerText = finalStats.tokensPerSec ? finalStats.tokensPerSec.toFixed(1) : '–';
        state.lastStats = finalStats; showStatsExtra(finalStats);
        perfColors();
    }

    persistCurrent();
}
