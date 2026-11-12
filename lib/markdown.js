/* lib/markdown.js – offline Markdown and syntax highlighting for answers (no library, no DOM, pure functions).
 * Plain script, no build. Global: HeinzMarkdown.
 *   HeinzMarkdown.esc(s)                 HTML escape
 *   HeinzMarkdown.highlightCode(code, lang)
 *   HeinzMarkdown.parse(text)            Markdown -> HTML string (headings, lists, tables, code blocks, inline) */
export const HeinzMarkdown = (function () {
    'use strict';
    // Escape für alles, was in HTML landet
    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // --- Syntax-Highlighting (offline, ohne Bibliothek) ---
    const HL_KW = ['and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield','True','False','None',
        'const','let','var','function','new','this','typeof','instanceof','switch','case','default','throw','catch','null','undefined','true','false','export','extends','static','do','fi','then','done','esac',
        'void','char','double','long','short','unsigned','signed','struct','enum','union','typedef','sizeof','public','private','protected','interface','implements','package','namespace','using','final','abstract','override','virtual','extern','inline','goto','volatile','template',
        'fn','mut','pub','impl','trait','match','use','func','defer','chan','end','begin','local','nil','elseif','repeat','until'];
    const HL_SQL = ['SELECT','FROM','WHERE','INSERT','INTO','VALUES','UPDATE','DELETE','CREATE','TABLE','JOIN','ON','GROUP','BY','ORDER','LIMIT','AND','OR','NOT','NULL','AS','SET','ALTER','DROP','INDEX','PRIMARY','KEY','LEFT','RIGHT','INNER','OUTER','HAVING','DISTINCT','UNION','LIKE','IN','IS','CASE','WHEN','THEN','ELSE','END'];
    const HL_BI = ['print','len','range','int','str','float','list','dict','set','tuple','bool','open','input','type','isinstance','enumerate','zip','map','filter','sorted','sum','min','max','abs','round','super','self','cls','echo','cd','ls','cat','grep','console','require'];

    const HL_HASH = new Set(['python','py','bash','sh','shell','zsh','yaml','yml','toml','ruby','rb','perl','pl','r','makefile','make','dockerfile','ini','conf','powershell','ps1','nginx','cmake']);
    const HL_SLASH = new Set(['js','javascript','jsx','ts','typescript','tsx','c','h','cpp','c++','cc','hpp','java','go','golang','rust','rs','swift','kotlin','kt','cs','csharp','c#','dart','scala','groovy','css','scss','less','json','jsonc','json5','objc','glsl','solidity']);
    const HL_DASH = new Set(['sql','lua','haskell','hs','ada','plsql','mysql','postgresql','sqlite']);
    const HL_MARKUP = new Set(['html','htm','xml','svg','xhtml','vue']);

    const HL_SRC = {
        pre:   /#(?:include|define|undef|ifdef|ifndef|if|elif|else|endif|pragma|import|using|region|endregion)\b[^\n]*/.source,
        cHash: /#[^\n]*/.source,
        cSlash:/\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/.source,
        cBoth: /#[^\n]*|\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/.source,
        cDash: /--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/.source,
        cHtml: /<!--[\s\S]*?(?:-->|$)/.source,
        str:   /(?:\b[rRbBfFuU]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|`(?:\\.|[^`\\])*`/.source,
        strPlain: /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/.source,
        mStr:  /(?<==)"[^"\n]*"|(?<==)'[^'\n]*'/.source,
        decor: /@[A-Za-z_][\w.]*/.source,
        num:   /\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/.source,
        call:  /\b[A-Za-z_]\w*(?=\()/.source,
        tag:   /<\/?[A-Za-z][\w:-]*|\/?>/.source,
        attr:  /\b[A-Za-z_:][\w:.-]*(?==)/.source
    };
    const HL_KW_SRC = '\\b(?:' + HL_KW.join('|') + ')\\b';
    const HL_KWSQL_SRC = '\\b(?:' + HL_SQL.concat(HL_KW).join('|') + ')\\b';
    const HL_BI_SRC = '\\b(?:' + HL_BI.join('|') + ')\\b';

    const HL_FAMILIES = {
        generic: { flags: 'g',  e: [['d',HL_SRC.pre],['c',HL_SRC.cBoth],['s',HL_SRC.str],['d',HL_SRC.decor],['n',HL_SRC.num],['k',HL_KW_SRC],['b',HL_BI_SRC],['f',HL_SRC.call]] },
        hash:    { flags: 'g',  e: [['c',HL_SRC.cHash],['s',HL_SRC.str],['d',HL_SRC.decor],['n',HL_SRC.num],['k',HL_KW_SRC],['b',HL_BI_SRC],['f',HL_SRC.call]] },
        slash:   { flags: 'g',  e: [['d',HL_SRC.pre],['c',HL_SRC.cSlash],['s',HL_SRC.strPlain],['d',HL_SRC.decor],['n',HL_SRC.num],['k',HL_KW_SRC],['b',HL_BI_SRC],['f',HL_SRC.call]] },
        dash:    { flags: 'gi', e: [['c',HL_SRC.cDash],['s',HL_SRC.strPlain],['n',HL_SRC.num],['k',HL_KWSQL_SRC],['b',HL_BI_SRC],['f',HL_SRC.call]] },
        markup:  { flags: 'g',  e: [['c',HL_SRC.cHtml],['s',HL_SRC.mStr],['k',HL_SRC.tag],['b',HL_SRC.attr]] }
    };
    for (const k in HL_FAMILIES) {
        const f = HL_FAMILIES[k];
        f.re = new RegExp(f.e.map(x => '(' + x[1] + ')').join('|'), f.flags);
    }

    function hlFamily(lang) {
        if (HL_MARKUP.has(lang)) return 'markup';
        if (HL_HASH.has(lang)) return 'hash';
        if (HL_SLASH.has(lang)) return 'slash';
        if (HL_DASH.has(lang)) return 'dash';
        return 'generic';
    }

    function highlightCode(code, lang) {
        const fam = HL_FAMILIES[hlFamily(lang)];
        const re = fam.re;
        let out = '', last = 0, m;
        re.lastIndex = 0;
        while ((m = re.exec(code)) !== null) {
            if (m[0] === '') { re.lastIndex++; continue; }
            let idx = 1;
            while (idx < m.length && m[idx] === undefined) idx++;
            const cls = fam.e[idx - 1][0];
            out += esc(code.slice(last, m.index)) + '<span class="tok-' + cls + '">' + esc(m[0]) + '</span>';
            last = re.lastIndex;
        }
        return out + esc(code.slice(last));
    }

    // --- Markdown-Parser ---
    function inlineFmt(s) {
        s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?![*\w])/g, '$1<em>$2</em>');
        return s;
    }

    function parseOfflineMarkdown(text) {
        if (!text) return '';
        const PH0 = '', PH1 = '';
        const blocks = [];
        const inlines = [];

        // 1) Code-Blöcke herauslösen (auch unvollständige beim Streamen)
        let src = text.replace(/```([^\n`]*)\n([\s\S]*?)(?:```|$)/g, function (m, lang, code) {
            blocks.push({ lang: lang.trim().split(/\s+/)[0] || '', code: code.replace(/\n$/, '') });
            return '\n' + PH0 + 'B' + (blocks.length - 1) + PH1 + '\n';
        });

        // 2) Alles übrige escapen (XSS-Schutz), Inline-Code schützen
        src = esc(src);
        src = src.replace(/`([^`\n]+)`/g, function (m, c) {
            inlines.push(c);
            return PH0 + 'I' + (inlines.length - 1) + PH1;
        });

        const renderBlock = function (idx) {
            const b = blocks[idx];
            const lang = (b.lang || '').toLowerCase().replace(/[^\w+#.-]/g, '');
            return '<div class="code-wrap"><span class="code-lang">' + lang + '</span><button type="button" class="code-copy">Copy</button><pre><code>' + highlightCode(b.code, lang) + '</code></pre></div>';
        };

        const cellsOf = function (r) {
            let t = r.trim();
            if (t.startsWith('|')) t = t.slice(1);
            if (t.endsWith('|')) t = t.slice(0, -1);
            return t.split('|');
        };
        const SEP = /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?$/;

        const out = [];
        let mode = '';
        let buf = [];

        const flush = function () {
            if (!mode || !buf.length) { mode = ''; buf = []; return; }
            if (mode === 'p') {
                out.push('<p>' + buf.map(inlineFmt).join('<br>') + '</p>');
            } else if (mode === 'quote') {
                out.push('<blockquote>' + buf.map(inlineFmt).join('<br>') + '</blockquote>');
            } else if (mode === 'ul' || mode === 'ol') {
                out.push('<' + mode + '>' + buf.map(function (x) { return '<li>' + inlineFmt(x) + '</li>'; }).join('') + '</' + mode + '>');
            } else if (mode === 'table') {
                let html = '<table class="md-table">';
                let rows = buf.slice();
                if (rows.length > 1 && SEP.test(rows[1].trim())) {
                    html += '<thead><tr>' + cellsOf(rows[0]).map(function (c) { return '<th>' + inlineFmt(c.trim()) + '</th>'; }).join('') + '</tr></thead>';
                    rows = rows.slice(2);
                }
                html += '<tbody>';
                rows.forEach(function (r) {
                    if (SEP.test(r.trim())) return;
                    html += '<tr>' + cellsOf(r).map(function (c) { return '<td>' + inlineFmt(c.trim()) + '</td>'; }).join('') + '</tr>';
                });
                out.push(html + '</tbody></table>');
            }
            mode = ''; buf = [];
        };
        const setMode = function (m) { if (mode !== m) { flush(); mode = m; } };

        const lines = src.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();
            let m;
            if (t === '') { flush(); continue; }
            if ((m = t.match(/^B(\d+)$/))) { flush(); out.push(renderBlock(parseInt(m[1], 10))); continue; }
            if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { flush(); out.push('<h' + m[1].length + '>' + inlineFmt(m[2]) + '</h' + m[1].length + '>'); continue; }
            if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); out.push('<hr>'); continue; }
            if (t.startsWith('|') && t.length > 1) { setMode('table'); buf.push(t); continue; }
            if ((m = t.match(/^&gt;\s?(.*)$/))) { setMode('quote'); buf.push(m[1]); continue; }
            if ((m = t.match(/^[-*+]\s+(.*)$/))) { setMode('ul'); buf.push(m[1]); continue; }
            if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { setMode('ol'); buf.push(m[1]); continue; }
            setMode('p'); buf.push(t);
        }
        flush();

        return out.join('\n').replace(/I(\d+)/g, function (m, i) { return '<code>' + inlines[parseInt(i, 10)] + '</code>'; });
    }

    window.HeinzMarkdown = { esc: esc, highlightCode: highlightCode, parse: parseOfflineMarkdown };
    return window.HeinzMarkdown;
})();
