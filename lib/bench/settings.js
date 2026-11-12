/* lib/bench/settings.js – Einstellungsfelder: Regler, Threads, Systemprompt, „In den Chat übernehmen“, Vorladen-Haken.
 * Part of the test bench (chat.html). Plain script: all bench files share one global scope and load in this order (see chat.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/PRUEFSTAND_INVENTUR.md). */

// ===== UI Setup =====

const $ = id => document.getElementById(id);

function setSliders(t, p, k, c) {
    $('param-temp').value = t; $('val-temp').innerText = t;
    $('param-topp').value = p; $('val-topp').innerText = p;
    $('param-topk').value = k; $('val-topk').innerText = k;
    $('param-ctx').value = c; $('val-ctx').innerText = c;
}

function readSliders() {
    return {
        temp: parseFloat($('param-temp').value),
        topp: parseFloat($('param-topp').value),
        topk: parseInt($('param-topk').value, 10),
        ctx: parseInt($('param-ctx').value, 10)
    };
}

function onSlider() {
    const v = readSliders();
    $('val-temp').innerText = v.temp;
    $('val-topp').innerText = v.topp;
    $('val-topk').innerText = v.topk;
    $('val-ctx').innerText = v.ctx;
    settings.params = v;
    saveSettings();
    schedulePreload();
    renderQuick();
}

function pwTab(id) {
    document.querySelectorAll('.pw-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pw') === id); });
    $('pw-params').hidden = id !== 'params'; $('pw-prompts').hidden = id !== 'prompts';
}
function onDefaultToggle() { setParamSrc($('use-default').checked ? 'model' : (savedParams() ? 'own' : 'mode')); }

function threadsFor(model) {
    return PV.threadsFor(model, settings);   // eine Regel für alle Tools: lib/providers.js
}
function loadThreads() {
    const n = threadsFor($('model-select').value || settings.model);
    $('param-threads').value = n; $('val-threads').innerText = n;
}
function onThreads() {
    const n = parseInt($('param-threads').value, 10);
    $('val-threads').innerText = n;
    if (!settings.threads) settings.threads = {};
    settings.threads[$('model-select').value] = n;
    saveSettings();
    schedulePreload();
}
function sysSrc() { if (settings.modesOnly) return 'mode'; const v = settings.sysSrc; if (v === 'own' && !(settings.ownPrompt || '').trim()) return 'mode'; return v === 'model' || v === 'own' ? v : 'mode'; }
function setSysSrc(v) {
    settings.sysSrc = v; settings.ownSystem = v === 'model';
    saveSettings(); schedulePreload(); renderPrompts();
    if (v === 'own') setTimeout(function () { const e = $('ps-text'); if (e && !(settings.ownPrompt || '').trim()) e.focus(); }, 0);
}
function onModesOnly() {
    settings.modesOnly = $('modes-only').checked; saveSettings();
    applyParamSrc(); renderPrompts(); schedulePreload();
}
function onOwnPromptInput() {
    if (sysSrc() === 'model' || settings.sysSrc === 'mode') return;
    settings.ownPrompt = $('ps-text').value; saveSettings(); schedulePreload(); renderPrompts(true);
}
function seedOwnPrompt() { settings.ownPrompt = buildSystemPrompt(settings.mode, true); setSysSrc('own'); }
// Übergibt dem Heinz Chat, was der Prüfstand für dieses Modell sendet: Prompt (ohne Antwortsprache-Satz, der Chat antwortet in der Sprache des Nutzers)
// und Sampling-Werte. Threads und Kontext teilen beide Seiten ohnehin (PV.runtime).
function applyToChat() {
    const model = $('model-select').value || settings.model, sub = $('to-chat-sub');
    if (settings.provider !== 'ollama' || !model) { sub.textContent = t('toChatOnly'); return; }
    const P = PROMPTS[settings.lang];
    const src = sysSrc();
    const sys = src === 'model' ? '' : src === 'own' ? settings.ownPrompt : P[settings.mode];
    const o = buildOptions(MODE_PRESETS[settings.mode]);
    PV.setChatSystem(model, sys);
    PV.setChatSampling(model, o);
    const parts = [];
    if (o.temperature !== undefined) parts.push('T ' + o.temperature);
    if (o.top_p !== undefined) parts.push('Top-P ' + o.top_p);
    if (o.top_k !== undefined) parts.push('Top-K ' + o.top_k);
    if (o.stop && o.stop.length) parts.push('Stop ' + o.stop.length);
    sub.textContent = t('toChatDone', { m: model, n: sys.length, v: parts.length ? parts.join(', ') : t('toChatNoVals') });
}
function copySysPrompt() {
    const v = settings.sysSrc === 'own' ? settings.ownPrompt : buildSystemPrompt(settings.mode, true);
    const sp = $('ps-copy').querySelector('span'), old = sp.textContent;
    copyText(v || '').then(function () { sp.textContent = '✓'; }).catch(function () { sp.textContent = '✕'; })
        .then(function () { setTimeout(function () { sp.textContent = old; }, 1500); });
}
function renderPrompts(typing) {
    if (!$('ps-text')) return;
    const src = settings.sysSrc === 'model' || settings.sysSrc === 'own' ? settings.sysSrc : 'mode';
    ['mode', 'model', 'own'].forEach(function (k) { $('ps-' + k).classList.toggle('on', src === k); });
    const ta = $('ps-text'), empty = !(settings.ownPrompt || '').trim();
    ta.readOnly = src !== 'own';
    if (!typing) ta.value = src === 'own' ? (settings.ownPrompt || '') : (src === 'mode' ? buildSystemPrompt(settings.mode, true) : '');
    ta.placeholder = src === 'model' ? t('psNothing') : t('psPh');
    $('ps-count').textContent = ta.value.length ? ta.value.length + ' ' + t('chars') : '';
    $('ps-copy').disabled = src === 'model' || (src === 'own' && empty);
    $('ps-seed').hidden = src !== 'mode';
    $('ps-note').textContent = src === 'mode' ? t('psNoteMode', { m: t('mb_' + settings.mode) }) : src === 'model' ? t('psNoteModel') : (empty ? t('psNoteOwnEmpty') : t('psNoteOwn'));
    ['mode', 'model', 'own'].forEach(function (k) { $('ps-' + k).disabled = !!settings.modesOnly; });
    if (settings.modesOnly) $('ps-note').textContent = t('noteLocked');
}
function onFast() {
    settings.fast = $('fast-mode').checked;
    const n = parseInt($('param-fastn').value, 10);
    if (n > 0) settings.fastN = Math.min(1024, Math.max(16, n));
    $('param-fastn').value = settings.fastN; $('fastn-val').textContent = settings.fastN;
    saveSettings();
    schedulePreload();
}
function onPreloadToggle() {
    settings.preload = $('preload-on').checked;
    saveSettings();
    if (settings.preload) schedulePreload(); else abortPreload();
}
