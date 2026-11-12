/* lib/dashboard/send.js – Senden und Abbrechen: Systemprompt, Nachrichten, Optionen, Anfrage.
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

// ===== Senden / Abbrechen =====
function setGenerating(on) {
    generating = on; gotToken = false;
    const sb = $('send-btn');
    sb.classList.toggle('stopping', on);
    document.body.classList.toggle('gen', on);
    sb.setAttribute('onclick', on ? 'abortGeneration()' : 'askGemma()');
    sb.querySelector('use').setAttribute('href', 'lib/icons.svg#i-' + (on ? 'stop' : 'send'));
    sb.title = t(on ? 'stopGen' : 'send');
    renderRing();
}

function abortGeneration() {
    if (currentAbortController) currentAbortController.abort();
}

// Der Systemprompt bleibt gleich (nur Modus, Sprache, Schnellmodus): so bleibt er im Zwischenspeicher
// von Ollama und das Vorladen greift. Der Kontext steht vorn in der letzten Nutzernachricht.
function buildSystemPrompt(mode, plainMode) {
    const P = PROMPTS[settings.lang];
    if (!plainMode && sysSrc() === 'own') return settings.ownPrompt + (settings.fast ? ' ' + P.plain : '');
    return P[mode] + ' ' + P.respond + (settings.fast ? ' ' + P.plain : '');
}
function buildMessages(useCtx, contextText, history) {
    const P = PROMPTS[settings.lang];
    const msgs = history.map(m => ({ role: m.role, content: m.content }));
    const last = msgs[msgs.length - 1];
    last.content = (useCtx ? P.ctxLabel + '\n' + contextText + '\n\n' : '') + last.content;
    if (sysSrc() === 'model' && settings.provider === 'ollama') {
        // Eigener Systemprompt des Modells (Modelfile) bleibt: keine System-Nachricht,
        // Antwortsprache (und Schnellmodus) gehen in die letzte Nutzernachricht.
        last.content += '\n\n' + P.respond + (settings.fast ? ' ' + P.plain : '');
        return msgs;
    }
    // Modi mit Pflicht-Kontext (Audit): Kontext wie bisher in der Systemnachricht (Handytest 10.11.2026: im Nutzertext
    // antwortete qwen2.5:3b „Information not in context.“); der feste Anfang bleibt trotzdem im Zwischenspeicher.
    let sys = buildSystemPrompt(settings.mode);
    if (sysSrc() !== 'own' && useCtx && MODE_PRESETS[settings.mode].ctxInSystem) {
        sys += '\n\n' + P.ctxLabel + '\n' + contextText;
        last.content = last.content.slice((P.ctxLabel + '\n' + contextText + '\n\n').length);
    }
    return [{ role: 'system', content: sys }].concat(msgs);
}
function buildOptions(preset) {
    const o = {};
    // Gesperrte Regler (Zustand off, error, fixed, config in lib/capabilities.json) werden nicht gesendet
    if (!settings.useDefault) {
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

function errText(err, prov) {
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

async function askGemma() {
    if (generating || speedTesting || seriesRunning) return;
    const contextText = document.getElementById('context').value.trim();
    const queryInput = document.getElementById('query');
    const queryText = queryInput.value.trim();
    const mode = settings.mode;
    const selectedModel = document.getElementById('model-select').value;

    if (!queryText) return;
    window.speechSynthesis.cancel();

    const preset = MODE_PRESETS[mode];
    if (preset.ctx === 'required' && !contextText) {
        const box = $('context');
        box.classList.add('req-warn');
        box.placeholder = t('ctxRequiredWarn');
        box.focus();
        return;
    }

    const useCtx = !!contextText && preset.ctx !== 'none';
    const note = useCtx ? t('ctxNote', { n: contextText.length }) : null;

    chatHistory.push({ role: 'user', content: queryText, note: note });
    appendUserMessage(queryText, note);
    setQuery(''); exitFull(); queryInput.blur();

    abortPreload();
    const warmKey = preloadKeyNow();
    const fastUsed = !!settings.fast;
    const apiMessages = buildMessages(useCtx, contextText, chatHistory);

    const msgId = 'msg-' + Date.now();
    appendLoadingMessage(msgId);
    const waitStart = Date.now();
    const waitTimer = setInterval(function () {
        const w = document.querySelector('#' + msgId + ' .wait-s');
        if (w) w.textContent = Math.round((Date.now() - waitStart) / 1000) + ' s';
    }, 1000);

    currentAbortController = new AbortController();
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
            signal: currentAbortController.signal,
            onDelta: function (d) { outputBuffer += d; scheduleRender(); pulse.e = Math.min(1, pulse.e + 0.3); if (!gotToken) { gotToken = true; renderRing(); } if (eqPx) eqPx.wake(); }
        });
        finalStats = result.stats;
    } catch (err) {
        if (err.name === 'AbortError') aborted = true;
        else errorMsg = errText(err, prov);
    } finally {
        if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
        clearInterval(waitTimer);
        currentAbortController = null;
        setGenerating(false);
    }

    if (outputBuffer) {
        let shown = outputBuffer;
        if (aborted) shown += fastUsed ? '\n\n' + t('aborted') : '\n\n*' + t('aborted') + '*';
        if (errorMsg) shown += fastUsed ? '\n\n' + t('error') + ' ' + errorMsg : '\n\n**' + t('error') + '** ' + errorMsg;
        if (finalStats && finalStats.finishReason === 'length' && !aborted) shown += fastUsed ? '\n\n' + t('cutLength') : '\n\n*' + t('cutLength') + '*';
        updateAssistantMessage(msgId, shown, fastUsed);
        chatHistory.push(fastUsed ? { role: 'assistant', content: outputBuffer, plain: true } : { role: 'assistant', content: outputBuffer });
        if (finalStats && !aborted && !errorMsg) preloadKey = warmKey;
        checkServer();
    } else {
        chatHistory.pop();  // keine Antwort: Frage nicht im Verlauf behalten
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
        lastStats = finalStats; showStatsExtra(finalStats);
        perfColors();
    }

    persistCurrent();
}
