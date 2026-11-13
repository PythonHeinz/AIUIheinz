/* lib/dashboard/series.js – Testreihe: Läufer (Matrix und Export liegen in lib/testreihe.js).
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, HeinzSeries, HeinzStore, PV, esc } from './base.js';
import { capSendable, thinkEffortFor, thinkRule, thinkSendFor } from './caps.js';
import { copyText } from './clipboard.js';
import { t } from './i18n.js';
import { KEEP_ALIVE, unloadOthers } from './preload.js';
import { capsStates, exBodyText } from './protocol.js';
import { errText } from './send.js';
import { settings, state } from './state.js';

// ===== Testreihe (docs/KONZEPT.md 21, Schritt 1: Läufer mit Matrix und Export; Logik in lib/testreihe.js) =====
let srAbort = null, srConfirmed = false;
function srSpec() {
    const axes = {};
    const pp = HeinzSeries.parsePrompts($('sr-prompt').value);
    if (pp.prompts.length) axes.prompt = pp.prompts.map(function (q) { return q.id; });
    state.SR_AXES.forEach(function (a) {
        if (!capSendable(a[0]) || (a[0] === 'num_thread' && settings.provider !== 'ollama')) return;
        const list = HeinzSeries.parseList($(a[1]).value, a[2]);
        if (list.length) axes[a[0]] = list;
    });
    if (thinkRule()) {
        const th = Array.prototype.slice.call(document.querySelectorAll('#sr-think input:checked')).map(function (i) { return i.value; });
        if (th.length) axes.think = ['default', 'fast', 'deep'].filter(function (k) { return th.indexOf(k) >= 0; });
    }
    return { axes: axes, reps: Math.max(1, parseInt($('sr-reps').value, 10) || 1) };
}
export function srGate() {
    state.SR_AXES.forEach(function (a) {
        const lab = document.querySelector('[data-sr="' + a[0] + '"]'); if (!lab) return;
        const blocked = !capSendable(a[0]) || (a[0] === 'num_thread' && settings.provider !== 'ollama');
        lab.classList.toggle('sr-off', blocked); $(a[1]).disabled = blocked;
        if (blocked && a[0] !== 'num_thread') $(a[1]).placeholder = t('srLocked');
    });
    $('sr-thr-box').hidden = settings.provider !== 'ollama';
    $('sr-think-box').hidden = !thinkRule();
    srResumeBtn();
}
// Werte außerhalb des erlaubten Bereichs würden die Engine mit HTTP 400 ablehnen: vor dem Start melden
function srPromptError() {
    const pp = HeinzSeries.parsePrompts($('sr-prompt').value), i = pp.errorInfo;
    if (!i) return '';
    return t({ unknown: 'srErrUnknown', value: 'srErrValue', regex: 'srErrRegex', number: 'srErrNumber' }[i.code], { a: i.a, n: i.n });
}
function srRangeError(spec) {
    const lim = { temperature: [0, parseFloat($('param-temp').max) || 1, 'T°'], top_p: [0, 1, 'Top-p'], top_k: [1, Infinity, 'Top-k'], num_thread: [1, Infinity, t('srThreads')] };
    for (const k of Object.keys(lim)) {
        const list = spec.axes[k] || [];
        for (const v of list) if (v < lim[k][0] || v > lim[k][1]) return t('srRange', { p: lim[k][2], v: v, a: lim[k][0], b: lim[k][1] === Infinity ? '∞' : lim[k][1] });
    }
    return '';
}
export function srPlan() {
    srConfirmed = false; srGate();
    const n = HeinzSeries.count(srSpec()), box = $('sr-plan'), start = $('sr-start');
    let m = '';
    const spc = srSpec(), pvx = PV.get(settings.provider) || PV.get('ollama');
    const hist = state.srMeta && state.srMeta.providerId === settings.provider && state.srMeta.model === ($('model-select').value || settings.model) ? state.srRuns : [];
    const est = HeinzSeries.estimateSec(HeinzSeries.expand(spc).slice(0, HeinzSeries.MAX_RUNS), hist, { local: !!pvx.local, cloud: !pvx.local });
    m = t(est.fromHistory ? 'srPlanTimeH' : 'srPlanTime', { m: Math.max(1, Math.ceil(est.sec / 60)) });
    const mt = parseInt($('sr-max').value, 10) || 0;
    if (!pvx.local && mt > 0) m += t('srPlanTok', { t: (n * mt).toLocaleString(settings.lang === 'de' ? 'de-DE' : 'en-US') });
    const bad = srPromptError() || srRangeError(srSpec());
    box.textContent = bad ? bad : n > HeinzSeries.MAX_RUNS ? t('srTooMany', { n: n, max: HeinzSeries.MAX_RUNS }) : t('srPlan', { n: n, max: HeinzSeries.MAX_RUNS }) + m;
    start.disabled = !!bad || n > HeinzSeries.MAX_RUNS;
    $('sr-start').querySelector('span').textContent = t('stStart');
}
// fixed = Werte, die bei Start gesichert wurden (meta.fixed): so setzt „Fortsetzen“ mit denselben Werten fort, auch wenn die Regler inzwischen anders stehen
function srOptions(params, maxTok, fixed) {
    const o = {}, f = fixed || {};
    const num = function (v, k, d) { return v !== undefined ? v : (f[k] !== undefined && f[k] !== null ? f[k] : d); };
    if (capSendable('temperature')) o.temperature = num(params.temperature, 'temperature', parseFloat($('param-temp').value));
    if (capSendable('top_p')) o.top_p = num(params.top_p, 'top_p', parseFloat($('param-topp').value));
    if (capSendable('top_k')) o.top_k = num(params.top_k, 'top_k', parseInt($('param-topk').value, 10));
    if (capSendable('num_ctx')) o.num_ctx = num(undefined, 'num_ctx', parseInt($('param-ctx').value, 10));
    if (settings.provider === 'ollama' && capSendable('num_thread')) {
        const th = num(params.num_thread, 'num_thread', parseInt($('param-threads').value, 10));
        if (th > 0) o.num_thread = th;
    }
    if (maxTok > 0 && capSendable('max_tokens')) o.num_predict = maxTok;
    return o;
}
export function srRender() {
    const prog = $('sr-prog-i'); const planned = state.srMeta ? state.srMeta.planned : 0;
    if (prog) prog.style.width = !planned ? '0' : state.seriesRunning ? Math.round(state.srRuns.length / planned * 100) + '%' : (state.srRuns.length >= planned && !state.srMeta.stopped ? '100%' : '0');   // nur während eines Laufs: ein gespeicherter Rest darf nicht wie ein laufender Test aussehen
    if (!state.srRuns.length) { $('sr-table').innerHTML = ''; $('sr-copies').innerHTML = ''; return; }
    let h = '<table class="st-table"><tr><th>#</th><th>' + esc(t('srCol')) + '</th><th>Out</th><th>Think</th><th>s</th><th>ok</th></tr>';
    state.srRuns.forEach(function (r) {
        const st = r.stats || {};
        h += '<tr><td>' + r.n + '</td><td style="text-align:left">' + esc((r.prompt && state.srMeta && state.srMeta.prompts && state.srMeta.prompts.length > 1 ? r.prompt + ' ' : '') + (Object.keys(r.params).map(function (k) { return k + ' ' + r.params[k]; }).join(', ') || '–')) + '</td><td>' + (st.outputTokens || 0) +
            '</td><td>' + (st.reasoningTokens || 0) + '</td><td>' + ((r.totalMs || 0) / 1000).toFixed(1) + '</td><td>' + (r.error ? '✕' : r.aborted ? '–' : r.checks && r.checks.some(function (c) { return !c.ok; }) ? 'fail' : st.finishReason === 'length' ? '!' : '✓') + '</td></tr>';
    });
    $('sr-table').innerHTML = h + '</table>';
    const parts = srExportParts();
    $('sr-copies').innerHTML = parts.map(function (txt, i) {
        return '<button class="pill" type="button" data-sr-copy="' + i + '"><svg class="i sm"><use href="lib/icons.svg#i-copy"/></svg><span>' + esc(parts.length > 1 ? t('srCopyPart', { i: i + 1, n: parts.length }) : t('srCopy')) + '</span></button>';
    }).join('');
}
export function srExportParts() {
    if (!state.srMeta) return [];
    return HeinzSeries.exportParts(state.srMeta, state.srRuns, { answers: $('sr-answers').checked, answerMax: 600, maxChars: 12000 });
}
document.addEventListener('click', function (e) {
    const b = e.target.closest && e.target.closest('[data-sr-copy]'); if (!b) return;
    const sp = b.querySelector('span'), old = sp.textContent, parts = srExportParts();
    copyText(parts[parseInt(b.getAttribute('data-sr-copy'), 10)] || '').then(function () { sp.textContent = '✓'; }).catch(function () { sp.textContent = '✕'; })
        .then(function () { setTimeout(function () { sp.textContent = old; }, 1500); });
});
export function srStop() { if (srAbort) srAbort.abort(); }
// Fortsetzen ist möglich, wenn dieselbe Engine und dasselbe Modell gewählt sind und noch Läufe fehlen.
// Fehlgeschlagene und abgebrochene Läufe zählen als fehlend und werden wiederholt.
function srPending() {
    if (!state.srMeta || !state.srMeta.spec || state.seriesRunning) return null;
    if (state.srMeta.providerId !== settings.provider || state.srMeta.model !== ($('model-select').value || settings.model)) return null;
    const kept = {}; state.srRuns.forEach(function (r) { if (!r.error && !r.aborted) kept[r.n] = true; });
    const todo = HeinzSeries.expand(state.srMeta.spec).filter(function (r) { return !kept[r.n]; });
    return todo.length ? todo : null;
}
export function srResumeBtn() {
    const b = $('sr-resume'); if (!b) return;
    const todo = srPending();
    b.style.display = todo && !state.seriesRunning ? 'inline-flex' : 'none';
    if (todo) b.querySelector('span').textContent = t('srResumeN', { n: todo.length });
}
export async function srStart(resume) {
    if (state.seriesRunning) return;
    if (state.generating || state.speedTesting) { $('sr-status').textContent = t('srBusy'); return; }
    let pp, model, spec, rows, maxTok, todo;
    if (resume) {
        todo = srPending(); if (!todo) return;
        pp = { prompts: state.srMeta.prompts }; model = state.srMeta.model; spec = state.srMeta.spec; maxTok = state.srMeta.maxTok || 0;
    } else {
        pp = HeinzSeries.parsePrompts($('sr-prompt').value); model = $('model-select').value || settings.model;
        if (!pp.prompts.length) { $('sr-status').textContent = t('srNoPrompt'); return; }
        if (pp.error) { $('sr-status').textContent = srPromptError(); return; }
        if (!model) { $('sr-status').textContent = t('srNoModel'); return; }
        spec = srSpec(); rows = HeinzSeries.expand(spec);
        if (rows.length > HeinzSeries.MAX_RUNS || srRangeError(spec)) return;
        maxTok = parseInt($('sr-max').value, 10) || 0; todo = rows;
    }
    const byId = {}; pp.prompts.forEach(function (q) { byId[q.id] = q; });
    const prov = settings.provider, pv = PV.get(prov) || PV.get('ollama');
    if (!pv.local && !pv.custom && !PV.onlineAllowed()) { $('sr-status').textContent = t('srOnlineOff'); return; }
    if (!pv.local && !srConfirmed) {   // Cloud: Anzahl nennen, zweites Tippen bestätigt
        srConfirmed = true;
        $('sr-status').textContent = t('srCloud', { n: todo.length, e: pv.name });
        $(resume ? 'sr-resume' : 'sr-start').querySelector('span').textContent = t('srConfirm');
        return;
    }
    srConfirmed = false; $('sr-start').querySelector('span').textContent = t('stStart');
    if (resume) {
        state.srRuns = state.srRuns.filter(function (r) { return !r.error && !r.aborted; });   // die zu wiederholenden Läufe ersetzen die alten
        state.srMeta.stopped = ''; state.srMeta.resumed = (state.srMeta.resumed || 0) + 1;
    } else {
        let app = '?';
        try { app = (await (await fetch('VERSION.txt', { cache: 'no-store' })).text()).trim().split('\n')[0]; } catch (e) { /* offline: Version unbekannt */ }
        state.srRuns = [];
        state.srMeta = { name: '', date: new Date().toISOString().slice(0, 16).replace('T', ' '), app: app, device: (navigator.platform || '?') + ' ' + innerWidth + 'x' + innerHeight,
            engine: pv.name + ' (' + pv.id + ')', providerId: prov, model: model, prompt: pp.prompts[0].text, prompts: pp.prompts, axes: spec.axes, spec: spec, maxTok: maxTok, reps: spec.reps, planned: todo.length,
            fixed: { num_predict: maxTok || null, num_ctx: capSendable('num_ctx') ? parseInt($('param-ctx').value, 10) : null }, seed: 'not sent', caps: capsStates().trim(), stopped: '' };
        const sl = { temperature: parseFloat($('param-temp').value), top_p: parseFloat($('param-topp').value), top_k: parseInt($('param-topk').value, 10) };
        ['temperature', 'top_p', 'top_k'].forEach(function (k) { if (!spec.axes[k] && capSendable(k)) state.srMeta.fixed[k] = sl[k]; });
        const thr = parseInt($('param-threads').value, 10);
        if (prov === 'ollama' && !spec.axes.num_thread && thr > 0) state.srMeta.fixed.num_thread = thr;
    }
    state.seriesRunning = true; srAbort = new AbortController();
    $('sr-start').style.display = 'none'; $('sr-resume').style.display = 'none'; $('sr-stop').style.display = 'inline-flex';
    let wake = null;   // nicht abwarten: ein hängendes Wake-Lock darf den Start und den Stopp nie blockieren
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; if (!state.seriesRunning) { try { w.release(); } catch (e) { /* frei */ } } }, function () { wake = null; }); } catch (e) { wake = null; }
    let status = '', errRow = 0;
    try {
        if (prov === 'ollama') await unloadOthers(model);
        for (let i = 0; i < todo.length; i++) {
            if (srAbort.signal.aborted) { const ab = new Error('abort'); ab.name = 'AbortError'; throw ab; }   // Stopp zwischen zwei Läufen greift sofort
            const row = todo[i];
            $('sr-status').textContent = t('srRunning', { i: state.srRuns.length + 1, n: state.srMeta.planned }); srRender();
            const pr = byId[row.params.prompt] || pp.prompts[0];
            const params = Object.assign({}, row.params); delete params.prompt;
            const opts = srOptions(params, maxTok, state.srMeta.fixed);
            const th = row.params.think;
            const eff = th ? thinkEffortFor(th === 'default' ? '' : th) : '', snd = th ? thinkSendFor(th === 'default' ? '' : th) : null;
            const run = { n: row.n, row: row.row, rep: row.rep, prompt: pr.id, params: params, answer: '', sent: { options: opts, reasoningEffort: eff || undefined, thinking: snd || undefined }, at: new Date().toISOString() };
            const t0 = performance.now(); let first = null, buf = '';
            try {
                const result = await PV.chat(prov, {
                    model: model, messages: [{ role: 'user', content: pr.text }], options: opts, keepAlive: KEEP_ALIVE, backend: settings.backend,
                    reasoningEffort: eff, thinking: snd, signal: srAbort.signal,
                    onDelta: function (d) { if (first === null) first = performance.now() - t0; buf += d; }
                });
                run.stats = result.stats; errRow = 0;
                const ex = PV.lastExchange && PV.lastExchange.provider === prov ? PV.lastExchange : null;
                if (ex) { run.usage = ex.usage; if (!state.srMeta.fixed.request) state.srMeta.fixed.request = exBodyText(ex.body); }
            } catch (err) {
                if (err.name === 'AbortError') { run.answer = buf; run.aborted = true; run.totalMs = Math.round(performance.now() - t0); state.srRuns.push(run); throw err; }
                run.error = errText(err, prov); errRow++;
            }
            run.answer = buf; run.firstMs = first === null ? null : Math.round(first); run.totalMs = Math.round(performance.now() - t0);
            if (!run.error && pr.rules.length) run.checks = HeinzSeries.check(pr.rules, { answer: buf, finish: run.stats && run.stats.finishReason });
            state.srRuns.push(run); state.srRuns.sort(function (a, b) { return a.n - b.n; }); srRender(); srSave(true);   // jeder Lauf wird sofort gesichert: ein Neuladen oder Schließen verliert nichts
            if (errRow >= 3) { status = t('srErrors', { m: run.error }); state.srMeta.stopped = 'three errors in a row'; break; }
            if (!pv.local && i < todo.length - 1) await new Promise(function (r) { const tm = setTimeout(r, 1200); srAbort.signal.addEventListener('abort', function () { clearTimeout(tm); r(); }); });   // Gratisstufen haben Anfragegrenzen
        }
        if (!status) {
            status = t('srDone', { n: state.srRuns.length });
            const ck = state.srRuns.filter(function (r) { return r.checks && r.checks.length; });
            if (ck.length) status += ' ' + t('srChecks', { p: ck.filter(function (r) { return r.checks.every(function (c) { return c.ok; }); }).length, n: ck.length });
        }
    } catch (e) {
        if (e.name === 'AbortError') { status = t('srStopped', { n: state.srRuns.length }); state.srMeta.stopped = 'by user'; }
        else status = e.message;
    } finally {
        state.seriesRunning = false; srAbort = null;
        try { if (wake) wake.release(); } catch (e) { /* schon frei */ }
        $('sr-start').style.display = 'inline-flex'; $('sr-stop').style.display = 'none';
        $('sr-status').textContent = status; srRender(); srResumeBtn();
        srSave(false);
    }
}
function srSave(unfinished) {
    HeinzStore.set('heinz_series', { unfinished: !!unfinished, meta: state.srMeta, runs: state.srRuns.map(function (r) { return Object.assign({}, r, { answer: String(r.answer || '').slice(0, 2000) }); }) });
}
export function srRestore() {
    const d = HeinzStore.get('heinz_series', null);
    if (d && d.meta && d.runs && d.runs.length) {
        state.srMeta = d.meta; state.srRuns = d.runs;
        if (d.unfinished) state.srMeta.stopped = 'app closed or page reloaded during the series';
        $('sr-status').textContent = t('srLast', { n: d.runs.length, m: d.meta.planned || d.runs.length, x: d.unfinished ? t('srLastCut') : '' });
        srRender(); srResumeBtn();
    }
}
