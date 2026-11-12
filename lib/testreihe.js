/* lib/testreihe.js – test series (docs/KONZEPT.md section 21), pure logic without DOM: matrix, rows, export for agents.
 * Plain script, no build. Global: HeinzSeries.
 *   HeinzSeries.MAX_RUNS                                    upper limit of rows x repetitions (30)
 *   HeinzSeries.parseList(text, kind)                       "0, 0.5, 1" -> [0, 0.5, 1]; kind 'float' | 'int'; invalid entries dropped, no duplicates
 *   HeinzSeries.expand(spec)                                spec = { axes: { num_thread:[..], top_k:[..], top_p:[..], temperature:[..], think:[..] }, reps }
 *                                                           -> [{ n, row, rep, params:{..} }], cross product, slowest-changing axis first (threads), repetitions innermost
 *   HeinzSeries.parsePrompts(text)                          one prompt per line, optional checks after '=>' separated by '|': contains:x not:x regex:p number:n json max:n min:n stop
 *                                                           -> { prompts:[{id,text,rules}], error:'' }
 *   HeinzSeries.check(rules, { answer, finish })            -> [{ rule, ok, why }] (code only, no second model)
 *   HeinzSeries.estimateSec(rows, history, opts)            -> { sec, fromHistory }: mean of earlier runs of the same thinking stage, else rough defaults
 *   HeinzSeries.count(spec)                                 number of runs without building them
 *   HeinzSeries.exportParts(meta, runs, opts)               -> [string], Markdown head + one JSON line per run, split so that each part fits into a chat
 * The runner itself lives in dashboard.html (it needs the provider layer and the page's capability data). Never put a key into meta or runs. */
export const HeinzSeries = (function () {
    'use strict';
    var S = window.HeinzSeries = {};
    S.MAX_RUNS = 30;
    // Axis order = nesting order, outermost first: a model reload (threads) costs the most time, so it changes least often.
    S.AXES = ['num_thread', 'think', 'top_k', 'top_p', 'temperature', 'prompt'];

    S.parseList = function (text, kind) {
        var out = [];
        String(text == null ? '' : text).split(/[\s,;]+/).forEach(function (s) {
            if (s === '') return;
            var v = kind === 'int' ? parseInt(s, 10) : parseFloat(s.replace(',', '.'));
            if (isFinite(v) && out.indexOf(v) < 0) out.push(v);
        });
        return out;
    };

    function axesOf(spec) {
        var ax = [];
        S.AXES.forEach(function (k) {
            var list = spec.axes && spec.axes[k];
            if (list && list.length) ax.push({ key: k, list: list });
        });
        return ax;
    }

    // ---------- prompts and checks (KONZEPT 21.2 no. 1 and 4) ----------
    var RULES = { contains: 1, not: 1, regex: 1, number: 1, json: 0, max: 1, min: 1, stop: 0 };
    S.parsePrompts = function (text) {
        var prompts = [], error = '', info = null;
        function bad(code, a, n, msg) { if (!error) { error = msg; info = { code: code, a: a, n: n }; } }
        String(text == null ? '' : text).split('\n').forEach(function (line) {
            line = line.trim(); if (!line) return;
            var cut = line.indexOf('=>'), body = cut < 0 ? line : line.slice(0, cut).trim(), rules = [];
            if (cut >= 0) line.slice(cut + 2).split('|').forEach(function (r) {
                r = r.trim(); if (!r) return;
                var c = r.indexOf(':'), name = (c < 0 ? r : r.slice(0, c)).trim().toLowerCase(), arg = c < 0 ? '' : r.slice(c + 1).trim();
                if (!Object.prototype.hasOwnProperty.call(RULES, name)) { bad('unknown', name, prompts.length + 1, 'Unknown check "' + name + '" in prompt ' + (prompts.length + 1)); return; }
                if (RULES[name] && arg === '') { bad('value', name, prompts.length + 1, 'Check "' + name + '" needs a value (prompt ' + (prompts.length + 1) + ')'); return; }
                if (name === 'regex') { try { new RegExp(arg, 'i'); } catch (e) { bad('regex', arg, prompts.length + 1, 'Bad regular expression in prompt ' + (prompts.length + 1)); return; } }
                if ((name === 'max' || name === 'min') && !(parseInt(arg, 10) >= 0)) { bad('number', name, prompts.length + 1, 'Check "' + name + '" needs a number (prompt ' + (prompts.length + 1) + ')'); return; }
                rules.push({ type: name, arg: arg });
            });
            if (body) prompts.push({ id: 'p' + (prompts.length + 1), text: body, rules: rules });
        });
        return { prompts: prompts, error: error, errorInfo: info };
    };

    S.check = function (rules, run) {
        var a = String(run.answer == null ? '' : run.answer), low = a.toLowerCase();
        return (rules || []).map(function (r) {
            var ok = false, why = '';
            if (r.type === 'contains') { ok = low.indexOf(r.arg.toLowerCase()) >= 0; why = ok ? '' : 'text not found'; }
            else if (r.type === 'not') { ok = low.indexOf(r.arg.toLowerCase()) < 0; why = ok ? '' : 'forbidden text found'; }
            else if (r.type === 'regex') { try { ok = new RegExp(r.arg, 'i').test(a); } catch (e) { ok = false; } why = ok ? '' : 'pattern does not match'; }
            else if (r.type === 'number') {
                var n = r.arg.replace(/[.\-+*?^${}()|[\]\\]/g, '\\$&');
                ok = new RegExp('(^|[^0-9.,])' + n + '($|[^0-9]|[.,](?![0-9]))').test(a); why = ok ? '' : 'number ' + r.arg + ' not found';
            }
            else if (r.type === 'json') {
                var j = a.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
                try { JSON.parse(j); ok = true; } catch (e) { ok = false; why = 'not valid JSON'; }
            }
            else if (r.type === 'max') { ok = a.length <= parseInt(r.arg, 10); why = ok ? '' : 'longer than ' + r.arg + ' characters (' + a.length + ')'; }
            else if (r.type === 'min') { ok = a.length >= parseInt(r.arg, 10); why = ok ? '' : 'shorter than ' + r.arg + ' characters (' + a.length + ')'; }
            else if (r.type === 'stop') { ok = run.finish === 'stop'; why = ok ? '' : 'finish reason is ' + (run.finish || 'unknown'); }
            return { rule: r.type + (r.arg !== '' ? ':' + r.arg : ''), ok: ok, why: why || undefined };
        });
    };

    // Time estimate in seconds: mean of finished runs of the same kind (same thinking stage) when a history exists, otherwise rough defaults.
    // opts = { local: bool, cloud: bool }; returns { sec, fromHistory }.
    S.estimateSec = function (rows, history, opts) {
        opts = opts || {};
        var sum = {}, cnt = {}, total = 0, known = 0;
        (history || []).forEach(function (r) {
            if (r.error || r.aborted || !r.totalMs) return;
            var k = (r.params && r.params.think) || '-';
            sum[k] = (sum[k] || 0) + r.totalMs; cnt[k] = (cnt[k] || 0) + 1;
        });
        var base = opts.local ? 8 : 4, def = { '-': base, 'default': base, fast: 4, deep: 12 };
        rows.forEach(function (r) {
            var k = (r.params && r.params.think) || '-', sec;
            if (cnt[k]) { sec = sum[k] / cnt[k] / 1000; known++; } else sec = def[k] != null ? def[k] : 6;
            total += sec + (opts.cloud ? 1.2 : 0);
        });
        return { sec: total, fromHistory: known > 0 };
    };

    S.count = function (spec) {
        var n = Math.max(1, parseInt(spec.reps, 10) || 1);
        axesOf(spec).forEach(function (a) { n *= a.list.length; });
        return n;
    };

    S.expand = function (spec) {
        var ax = axesOf(spec), reps = Math.max(1, parseInt(spec.reps, 10) || 1), rows = [], idx = ax.map(function () { return 0; });
        var rowNo = 0;
        for (;;) {
            var params = {};
            ax.forEach(function (a, i) { params[a.key] = a.list[idx[i]]; });
            rowNo++;
            for (var rep = 1; rep <= reps; rep++) rows.push({ n: rows.length + 1, row: rowNo, rep: rep, params: params });
            var k = ax.length - 1;
            while (k >= 0) { idx[k]++; if (idx[k] < ax[k].list.length) break; idx[k] = 0; k--; }
            if (k < 0) break;
        }
        return rows;
    };

    function cut(s, max) {
        s = String(s == null ? '' : s);
        return s.length > max ? s.slice(0, max) + ' [… +' + (s.length - max) + ' chars cut]' : s;
    }

    // One run as a compact JSON line (no raw body: the body of the whole series is described once in the head).
    function runLine(r, o) {
        var st = r.stats || {};
        var line = {
            run: r.n, row: r.row, rep: r.rep, prompt: r.prompt || undefined, params: r.params,
            ok: !r.error && !r.aborted, aborted: r.aborted || undefined, finish: st.finishReason || r.finish || null, error: r.error || undefined,
            tokens: r.error ? undefined : { prompt: st.promptTokens || 0, out: st.outputTokens || 0, think: st.reasoningTokens || 0, visible: st.visibleTokens || 0, total: st.totalTokens || 0, source: st.source || null, thinkDerived: st.reasoningDerived ? true : undefined },
            tps: st.tokensPerSec ? Math.round(st.tokensPerSec * 10) / 10 : undefined,
            firstMs: r.firstMs != null ? r.firstMs : undefined, totalMs: r.totalMs != null ? r.totalMs : undefined,
            sent: r.sent, usage: r.usage, at: r.at
        };
        if (r.checks && r.checks.length) { line.checks = r.checks; line.pass = r.checks.every(function (c) { return c.ok; }); }
        if (o.answers) line.answer = cut(r.answer, o.answerMax);
        return JSON.stringify(line);
    }

    S.exportParts = function (meta, runs, opts) {
        opts = opts || {};
        var o = { answers: opts.answers !== false, answerMax: opts.answerMax || 600, maxChars: opts.maxChars || 12000 };
        var head = ['# Heinz UI test series' + (meta.name ? ': ' + meta.name : ''),
            'date ' + (meta.date || '') + ' | app ' + (meta.app || '?') + ' | device ' + (meta.device || '?'),
            'engine ' + (meta.engine || '?') + ' | model ' + (meta.model || '?'),
            (meta.prompts && meta.prompts.length ? meta.prompts.map(function (p) { return p.id + ': ' + cut(p.text, 300) + (p.rules && p.rules.length ? ' => ' + p.rules.map(function (r) { return r.type + (r.arg !== '' ? ':' + r.arg : ''); }).join(' | ') : ''); }).join('\n') : 'prompt: ' + cut(meta.prompt, 400)),
            'axes: ' + JSON.stringify(meta.axes || {}) + ' | repetitions ' + (meta.reps || 1) + ' | runs ' + runs.length + ' of ' + (meta.planned || runs.length) + (meta.stopped ? ' (stopped: ' + meta.stopped + ')' : ''),
            'fixed: ' + JSON.stringify(meta.fixed || {}) + ' | seed ' + (meta.seed || 'not sent') + ' | system prompt: none | chat history: none',
            'tokens: out = answer tokens as the engine reports them; think = thinking tokens; thinkDerived = total minus prompt minus out'
        ];
        if (meta.caps) head.push('', 'Capabilities:', meta.caps);
        head.push('', 'One JSON line per run:');
        var checked = runs.filter(function (r) { return r.checks && r.checks.length; }), passed = checked.filter(function (r) { return r.checks.every(function (c) { return c.ok; }); }).length;
        if (checked.length) head.splice(head.length - 2, 0, 'checks: ' + passed + ' of ' + checked.length + ' runs passed all checks');
        var lines = runs.map(function (r) { return runLine(r, o); });
        var headText = head.join('\n');
        var parts = [], cur = [], size = headText.length;
        lines.forEach(function (l) {
            if (cur.length && size + l.length + 1 > o.maxChars) { parts.push(cur); cur = []; size = 200; }
            cur.push(l); size += l.length + 1;
        });
        parts.push(cur);
        var total = parts.length;
        return parts.map(function (p, i) {
            var title = total > 1 ? '[Part ' + (i + 1) + ' of ' + total + ']\n' : '';
            return (i === 0 ? headText : '# Heinz UI test series' + (meta.name ? ': ' + meta.name : '') + ' (continued, model ' + (meta.model || '?') + ')') + (total > 1 ? '\n' + title.trim() : '') + '\n```\n' + p.join('\n') + '\n```';
        });
    };
    return S;
})();
