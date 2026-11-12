/* lib/chat/markdown.js – Kleines Markdown für Antworten (zuerst maskiert, dann formatiert).
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { esc } from './base.js';

// ---- minimal markdown for answers (escaped first) ----
export function md(src) {
    var s = esc(src), blocks = [];
    s = s.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, function (m, c) { blocks.push('<pre><code>' + c.replace(/\n$/, '') + '</code></pre>'); return '\u0000' + (blocks.length - 1) + '\u0000'; });
    var out = [], lines = s.split('\n'), list = null, para = [];
    function flushP() { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } }
    function flushL() { if (list) { out.push('</' + list + '>'); list = null; } }
    lines.forEach(function (ln) {
        var ul = /^\s*[-*]\s+(.*)/.exec(ln), ol = /^\s*\d+[.)]\s+(.*)/.exec(ln);
        if (ul || ol) { flushP(); var k = ul ? 'ul' : 'ol'; if (list !== k) { flushL(); out.push('<' + k + '>'); list = k; } out.push('<li>' + (ul || ol)[1] + '</li>'); }
        else if (!ln.trim()) { flushP(); flushL(); }
        else { flushL(); para.push(ln); }
    });
    flushP(); flushL();
    var h = out.join('').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    return h.replace(/\u0000(\d+)\u0000/g, function (m, i) { return blocks[+i]; });
}
