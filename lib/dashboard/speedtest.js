/* lib/dashboard/speedtest.js – Tempo-Test.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, HeinzStore } from './base.js';
import { OLLAMA_URL } from './config.js';
import { t } from './i18n.js';
import { copyText } from './messages.js';
import { saveSettings } from './persist.js';
import { loadThreads } from './settings.js';
import { settings, state } from './state.js';

// ===== Tempo-Test =====
let stAbort = null;
function stFmt(v, d) { return (isFinite(v) ? v : 0).toFixed(d); }
async function stRun(model, n, promptKey, ctx, signal) {
    // Zufallsmarke am Anfang: verhindert, dass Ollama den Prompt aus dem Zwischenspeicher nimmt
    const tag = 'Test ' + Math.floor(Math.random() * 1e6) + '. ';
    const body = {
        model: model, stream: false, keep_alive: '10m',
        messages: [{ role: 'user', content: tag + (promptKey === 'long' ? state.ST_LONG : state.ST_SHORT) }],
        options: { temperature: 0, seed: 1, num_predict: 32, num_ctx: ctx, num_thread: n }
    };
    const t0 = performance.now();
    const res = await fetch(OLLAMA_URL + '/api/chat', { method: 'POST', signal: signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    if (j.error) throw new Error(j.error);
    return {
        load: (j.load_duration || 0) / 1e9,
        pTok: j.prompt_eval_count || 0,
        pS: (j.prompt_eval_duration || 0) / 1e9,
        pTps: j.prompt_eval_duration ? (j.prompt_eval_count || 0) / (j.prompt_eval_duration / 1e9) : 0,
        gTps: j.eval_duration ? (j.eval_count || 0) / (j.eval_duration / 1e9) : 0,
        total: (performance.now() - t0) / 1000
    };
}
// Beste Threads: höchste Erzeugungsgeschwindigkeit (warmer Lauf 2, sonst Lauf 1)
function stBest() {
    const byN = {};
    state.stRows.forEach(function (r) { if (!byN[r.n] || r.run >= byN[r.n].run) byN[r.n] = r; });
    let best = null;
    Object.keys(byN).forEach(function (k) {
        const r = byN[k];
        if (!best || r.gTps > best.v) best = { n: r.n, v: r.gTps };
    });
    return best;
}
export function applyBestThreads() {
    const best = stBest();
    if (!best || !state.stMeta) return;
    if (!settings.threads) settings.threads = {};
    settings.threads[state.stMeta.model] = best.n;
    saveSettings();
    if ($('model-select').value === state.stMeta.model) loadThreads();
    $('st-status').textContent = t('stApplied', { n: best.n, m: state.stMeta.model });
}
// Live bars of the speed test: one card per planned thread count, two bar slots (run 1, run 2). Slots wait, run (moving bar + seconds) or fill with the result.
let stPlan = [], stActive = null;
function renderStBars(ordN) {
    const box = $('st-bars'), ns = stPlan.length ? stPlan : ordN;
    if (!ns.length) { box.innerHTML = ''; return; }
    const key = ns.join(',');
    if (box.dataset.key !== key) {
        let h = '<div class="st-prog"><i id="st-prog-i"></i></div>';
        ns.forEach(function (n, k) {
            h += '<div class="st-card stc' + (k % 4) + '" data-n="' + n + '"><h4><span>' + n + ' Threads</span><small class="tt">…</small></h4>';
            for (let run = 1; run <= 2; run++) h += '<div class="st-bar wait" data-run="' + run + '"><span class="l">' + t('stRun') + ' ' + run + '</span><span class="tr"><i></i></span><span class="v">–</span></div>';
            h += '</div>';
        });
        box.className = 'st-bars'; box.innerHTML = h; box.dataset.key = key;
    }
    const maxG = Math.max.apply(null, state.stRows.map(function (r) { return r.gTps || 0; }).concat([0.001]));
    const best = stBest();
    box.querySelectorAll('.st-card').forEach(function (card) {
        const n = parseInt(card.dataset.n, 10), rows = state.stRows.filter(function (r) { return r.n === n; });
        card.classList.toggle('best', !!best && best.n === n && !state.speedTesting);
        const tt = card.querySelector('.tt'); const last = rows[rows.length - 1];
        tt.textContent = rows.length === 2 ? stFmt(last.total, 1) + ' s' : (stActive && stActive.n === n ? '…' : '');
        card.querySelectorAll('.st-bar').forEach(function (bar) {
            const run = parseInt(bar.dataset.run, 10), r = rows.filter(function (x) { return x.run === run; })[0];
            const fill = bar.querySelector('i'), v = bar.querySelector('.v');
            if (r) { bar.className = 'st-bar done'; fill.style.width = Math.max(2, Math.round((r.gTps || 0) / maxG * 100)) + '%'; v.textContent = stFmt(r.gTps, 1); }
            else if (stActive && stActive.n === n && stActive.run === run) { bar.className = 'st-bar act'; fill.style.width = ''; v.textContent = Math.round((Date.now() - stActive.t0) / 1000) + ' s'; }
            else { bar.className = 'st-bar wait'; fill.style.width = '0'; v.textContent = '–'; }
        });
    });
    const total = ns.length * 2, done = state.stRows.length, pi = $('st-prog-i');
    if (pi) pi.style.width = Math.round(done / total * 100) + '%';
}
export function renderSpeedTest() {
    const box = $('st-table');
    if (!state.stRows.length) { box.innerHTML = ''; if (stPlan.length) renderStBars([]); else $('st-bars').innerHTML = ''; $('st-copy').style.display = 'none'; return; }
    let h = '<table class="st-table"><tr><th>Thr</th><th>Run</th><th>Load</th><th>P-Tok</th><th>P s</th><th>P t/s</th><th>Gen</th><th>Tot</th></tr>';
    const ordN = []; state.stRows.forEach(function (r) { if (ordN.indexOf(r.n) < 0) ordN.push(r.n); });
    state.stRows.forEach(function (r) {
        h += '<tr class="stc' + (ordN.indexOf(r.n) % 4) + '"><td>' + r.n + '</td><td>' + r.run + '</td><td>' + stFmt(r.load, 1) + '</td><td>' + r.pTok + '</td><td>' + (r.pS == null ? '–' : stFmt(r.pS, 1)) +
            '</td><td>' + (r.run === 1 ? stFmt(r.pTps, 1) : '–') + '</td><td>' + stFmt(r.gTps, 1) + '</td><td>' + stFmt(r.total, 1) + '</td></tr>';
    });
    box.innerHTML = h + '</table>';
    renderStBars(ordN);
    const best = stBest();
    $('st-best').textContent = best ? t('stBest', { n: best.n, v: stFmt(best.v, 1) }) : '';
    $('st-apply').style.display = best ? 'inline-flex' : 'none';
    if (best) $('st-apply').textContent = t('stApply', { n: best.n });
    $('st-copy').style.display = 'inline-flex';
}
function speedTestText() {
    const m = state.stMeta || {};
    const head = 'Heinz UI speed test | ' + (m.date || '') + ' | model ' + (m.model || '') + ' | ctx ' + (m.ctx || '') + ' | prompt ' + (m.prompt || '') +
        ' | Termux ' + (m.termux || '') + ' | cold start ' + (m.cold ? 'yes' : 'no') + ' | temp 0, 32 tokens, stream off';
    const lines = ['Thr | Run | Load s | P-Tok | P s | P t/s | Gen t/s | Total s'];
    state.stRows.forEach(function (r) {
        lines.push([r.n, r.run, stFmt(r.load, 1), r.pTok, r.pS == null ? '-' : stFmt(r.pS, 1), r.run === 1 ? stFmt(r.pTps, 1) : '-', stFmt(r.gTps, 1), stFmt(r.total, 1)].join(' | '));
    });
    const best = stBest();
    const notes = ['P-Tok = whole prompt incl. the model\'s system prompt; P t/s only for run 1 (run 2 reuses the cached prefix, so its speed would be too high).'];
    if (best) notes.push('Best: ' + best.n + ' threads (' + stFmt(best.v, 1) + ' tokens/s)');
    return head + '\n' + lines.join('\n') + '\n' + notes.join('\n');
}
export function copySpeedTest() {
    const s = $('st-copy').querySelector('span'); const old = s.textContent;
    copyText(speedTestText()).then(function () { s.textContent = '✓'; }).catch(function () { s.textContent = '✕'; })
        .then(function () { setTimeout(function () { s.textContent = old; }, 1500); });
}
export function stopSpeedTest() { if (stAbort) stAbort.abort(); }
export async function startSpeedTest() {
    if (state.speedTesting) return;
    if (state.generating) { $('st-status').textContent = t('stBusy'); return; }
    if (settings.provider !== 'ollama') { $('st-status').textContent = t('stOnlyOllama'); return; }
    const list = Array.prototype.slice.call(document.querySelectorAll('#st-threads input:checked')).map(function (i) { return parseInt(i.value, 10); });
    if (!list.length) { $('st-status').textContent = t('stNone'); return; }
    const model = $('model-select').value;
    const ctx = parseInt($('param-ctx').value, 10);
    const promptKey = $('st-prompt').value;
    const cold = $('st-cold').checked;
    state.stRows = []; stPlan = list.slice(); stActive = null; $('st-bars').dataset.key = ''; renderSpeedTest();
    state.stMeta = { date: new Date().toISOString().slice(0, 16).replace('T', ' '), model: model, ctx: ctx, prompt: promptKey, termux: $('st-termux').checked ? 'visible' : 'hidden', cold: cold };
    state.speedTesting = true; stAbort = new AbortController();
    $('st-start').style.display = 'none'; $('st-stop').style.display = 'inline-flex';
    let status = '', timer = null, t0 = 0;
    const setStatus = function (n, r) {
        t0 = Date.now(); stActive = { n: n, run: r, t0: t0 };
        if (timer) clearInterval(timer);
        const upd = function () { $('st-status').textContent = t('stRunning', { n: n, r: r, s: Math.round((Date.now() - t0) / 1000) }); renderStBars([]); };
        upd(); timer = setInterval(upd, 1000);
    };
    try {
        for (let i = 0; i < list.length; i++) {
            const n = list[i];
            if (cold) {
                await fetch(OLLAMA_URL + '/api/generate', { method: 'POST', signal: stAbort.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: model, keep_alive: 0 }) });
                await new Promise(function (r) { setTimeout(r, 800); });
            }
            for (let run = 1; run <= 2; run++) {
                setStatus(n, run);
                const r = await stRun(model, n, promptKey, ctx, stAbort.signal);
                r.n = n; r.run = run;
                state.stRows.push(r); renderSpeedTest();
            }
        }
        status = t('stDone');
    } catch (e) {
        status = (e.name === 'AbortError') ? t('stStopped') : t('stErr', { m: e.message });
    } finally {
        if (timer) clearInterval(timer);
        state.speedTesting = false; stAbort = null; stActive = null; renderSpeedTest(); renderStBars([]);
        $('st-start').style.display = 'inline-flex'; $('st-stop').style.display = 'none';
        $('st-status').textContent = status;
        if (state.stRows.length) HeinzStore.set('heinz_speedtest', { rows: state.stRows, meta: state.stMeta });
    }
}
