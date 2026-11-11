/* lib/testreihe.js – test series (docs/KONZEPT.md section 21), pure logic without DOM: matrix, rows, export for agents.
 * Plain script, no build. Global: HeinzSeries.
 *   HeinzSeries.MAX_RUNS                                    upper limit of rows x repetitions (30)
 *   HeinzSeries.parseList(text, kind)                       "0, 0.5, 1" -> [0, 0.5, 1]; kind 'float' | 'int'; invalid entries dropped, no duplicates
 *   HeinzSeries.expand(spec)                                spec = { axes: { num_thread:[..], top_k:[..], top_p:[..], temperature:[..], think:[..] }, reps }
 *                                                           -> [{ n, row, rep, params:{..} }], cross product, slowest-changing axis first (threads), repetitions innermost
 *   HeinzSeries.count(spec)                                 number of runs without building them
 *   HeinzSeries.exportParts(meta, runs, opts)               -> [string], Markdown head + one JSON line per run, split so that each part fits into a chat
 * The runner itself lives in chat.html (it needs the provider layer and the page's capability data). Never put a key into meta or runs. */
(function () {
    'use strict';
    var S = window.HeinzSeries = {};
    S.MAX_RUNS = 30;
    // Axis order = nesting order, outermost first: a model reload (threads) costs the most time, so it changes least often.
    S.AXES = ['num_thread', 'think', 'top_k', 'top_p', 'temperature'];

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
            run: r.n, row: r.row, rep: r.rep, params: r.params,
            ok: !r.error, finish: st.finishReason || r.finish || null, error: r.error || undefined,
            tokens: r.error ? undefined : { prompt: st.promptTokens || 0, out: st.outputTokens || 0, think: st.reasoningTokens || 0, visible: st.visibleTokens || 0, total: st.totalTokens || 0, source: st.source || null, thinkDerived: st.reasoningDerived ? true : undefined },
            tps: st.tokensPerSec ? Math.round(st.tokensPerSec * 10) / 10 : undefined,
            firstMs: r.firstMs != null ? r.firstMs : undefined, totalMs: r.totalMs != null ? r.totalMs : undefined,
            sent: r.sent, usage: r.usage, at: r.at
        };
        if (o.answers) line.answer = cut(r.answer, o.answerMax);
        return JSON.stringify(line);
    }

    S.exportParts = function (meta, runs, opts) {
        opts = opts || {};
        var o = { answers: opts.answers !== false, answerMax: opts.answerMax || 600, maxChars: opts.maxChars || 12000 };
        var head = ['# Heinz UI test series' + (meta.name ? ': ' + meta.name : ''),
            'date ' + (meta.date || '') + ' | app ' + (meta.app || '?') + ' | device ' + (meta.device || '?'),
            'engine ' + (meta.engine || '?') + ' | model ' + (meta.model || '?'),
            'prompt: ' + cut(meta.prompt, 400),
            'axes: ' + JSON.stringify(meta.axes || {}) + ' | repetitions ' + (meta.reps || 1) + ' | runs ' + runs.length + ' of ' + (meta.planned || runs.length) + (meta.stopped ? ' (stopped: ' + meta.stopped + ')' : ''),
            'fixed: ' + JSON.stringify(meta.fixed || {}) + ' | seed ' + (meta.seed || 'not sent') + ' | system prompt: none | chat history: none',
            'tokens: out = answer tokens as the engine reports them; think = thinking tokens; thinkDerived = total minus prompt minus out'
        ];
        if (meta.caps) head.push('', 'Capabilities:', meta.caps);
        head.push('', 'One JSON line per run:');
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
})();
