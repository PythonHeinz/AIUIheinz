/* KOPIE aus tools/convert2/mod (Entscheidung A, 17.11.2026): Pflege in beiden Werkzeugen, bei Änderungen beide Stellen abgleichen. */
/* tools/convert2/mod/markdown.js – Markdown → wohlgeformtes HTML/XHTML und Klartext (Insel-Modul, reine Funktionen).
 * Eigener Parser, keine Verweise auf lib/ oder die Oberfläche. Die Ausgabe ist als XHTML gültig (leere Elemente mit " />"), also für EPUB und Browser geeignet.
 *   mdToHtml(md, opts?)      opts.labels = { NOTE, WARNING, TIP } (Beschriftung der Hinweisblöcke)
 *   mdToPlain(md)            Klartext ohne Markup, Links als "Text (URL)"
 *   sections(md, level=1)    teilt an Überschriften der Ebene; [{ title, md }]; Text vor der ersten Überschrift hat title ''
 *   headings(md)             [{ level, text }] ohne Code-Blöcke
 *   isTableSeparator(line)   splitTableRow(line)   (auch vom Tabellenmodul benutzt)
 * Unterstützt: Überschriften 1–6, Absätze (harte Umbrüche), Listen (verschachtelt, Aufgaben), Zitate und [!NOTE]/[!WARNING]/[!TIP],
 * Code-Blöcke (``` und ~~~), Tabellen mit Ausrichtung, Linien, Bilder (https, data:image), Links (https, mailto), **fett**, *kursiv*, ~~durchgestrichen~~, `code`. */
import { escHtml } from './text.js';

const SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
export function isTableSeparator(line) { return line.includes('|') && SEP.test(line); }

export function splitTableRow(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    return s.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
}

const ESCAPABLE = /\\([\\`*~\[\]|#>+\-.!_(){}<])/g;

function safeUrl(u, image) {
    const x = u.replace(/&amp;/g, '&').trim();
    if (/^(https?:\/\/|mailto:)/i.test(x) && !(image && x.toLowerCase().startsWith('mailto:'))) return true;
    if (image && /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(x)) return true;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(x) && !x.startsWith('//')) return /^[#\w./%-]/.test(x);   // relativ oder Anker
    return false;
}

export function inline(text) {
    const stash = [];
    const hold = (html) => '\u0003' + (stash.push(html) - 1) + '\u0003';
    let t = text.replace(ESCAPABLE, (m, c) => hold(escHtml(c)));
    t = t.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (m, q, c) => hold('<code>' + escHtml(c.trim()) + '</code>'));
    t = escHtml(t);
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*?&quot;)?\)/g, (m, alt, src) =>
        safeUrl(src, true) ? hold('<img src="' + src + '" alt="' + alt + '" />') : m);
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^)]*?&quot;)?\)/g, (m, label, href) =>
        safeUrl(href, false) ? hold('<a href="' + href + '">' + emphasis(label, hold) + '</a>') : m);
    t = emphasis(t, hold);
    t = t.replace(/\u0003(\d+)\u0003/g, (m, i) => stash[i]);
    return t.replace(/\u0003(\d+)\u0003/g, (m, i) => stash[i]);   // zweiter Durchgang für Verschachteltes
}

function emphasis(t, hold) {
    t = t.replace(/\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(?<![\w])__(?=\S)([\s\S]+?)(?<=\S)__(?![\w])/g, '<strong>$1</strong>');
    t = t.replace(/\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*/g, '<em>$1</em>');
    t = t.replace(/(?<![\w])_(?=[^\s_])([^_]+?)(?<=[^\s_])_(?![\w])/g, '<em>$1</em>');
    t = t.replace(/~~(?=\S)([\s\S]+?)(?<=\S)~~/g, '<del>$1</del>');
    return t;
}

const FENCE = /^\s{0,3}(```+|~~~+)\s*([\w+#.-]*)[^\n]*$/;
const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;

export function mdToHtml(md, opts = {}) {
    const labels = Object.assign({ NOTE: 'Note', WARNING: 'Warning', TIP: 'Tip' }, opts.labels || {});
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let para = [];
    let stack = [];      // offene Listen: { tag, indent }
    let item = null;     // Text des offenen Listenpunkts

    const flushPara = () => {
        if (!para.length) return;
        const html = para.map((l, i) => {
            const hard = / {2,}$/.test(l) || /\\$/.test(l);
            const body = inline(l.replace(/\\$/, '').trim());
            return body + (hard && i < para.length - 1 ? '<br />' : (i < para.length - 1 ? '\n' : ''));
        }).join('');
        out.push('<p>' + html + '</p>');
        para = [];
    };
    const closeItem = () => { if (item !== null) { out.push(item + '</li>'); item = null; } };
    const flushAll = () => { flushPara(); closeItem(); while (stack.length) { out.push('</' + stack.pop().tag + '>'); if (stack.length) { /* Elternpunkt schließen */ out.push('</li>'); } } item = null; };

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const line = raw.replace(/\t/g, '    ');
        const f = line.match(FENCE);
        if (f) {
            flushAll();
            const mark = f[1][0], len = f[1].length, buf = [];
            for (i++; i < lines.length; i++) {
                const m = lines[i].match(/^\s{0,3}(```+|~~~+)\s*$/);
                if (m && m[1][0] === mark && m[1].length >= len) break;
                buf.push(lines[i]);
            }
            out.push('<pre><code' + (f[2] ? ' class="language-' + escHtml(f[2]) + '"' : '') + '>' + escHtml(buf.join('\n')) + '</code></pre>');
            continue;
        }
        if (!line.trim()) { flushPara(); continue; }

        const h = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
        if (h) { flushAll(); out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); continue; }
        if (HR.test(line) && !LIST.test(line)) { flushAll(); out.push('<hr />'); continue; }
        if (HR.test(line) && !/^\s*[-*+]\s+\S/.test(line)) { flushAll(); out.push('<hr />'); continue; }

        if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]) && !isTableSeparator(line)) {
            flushAll();
            const head = splitTableRow(line);
            const aligns = splitTableRow(lines[i + 1]).map(c => (/^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : /^:-/.test(c) ? 'left' : ''));
            const rows = [];
            for (i += 2; i < lines.length && lines[i].trim() && lines[i].includes('|'); i++) rows.push(splitTableRow(lines[i]));
            i--;
            const cell = (tag, c, k) => '<' + tag + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + inline(c || '') + '</' + tag + '>';
            let t = '<table><thead><tr>' + head.map((c, k) => cell('th', c, k)).join('') + '</tr></thead>';
            if (rows.length) t += '<tbody>' + rows.map(r => '<tr>' + head.map((_, k) => cell('td', r[k], k)).join('') + '</tr>').join('') + '</tbody>';
            out.push(t + '</table>');
            continue;
        }

        if (/^\s{0,3}>/.test(line)) {
            flushAll();
            const q = [];
            for (; i < lines.length && /^\s{0,3}>/.test(lines[i]); i++) q.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
            i--;
            const m = q[0].match(/^\[!(NOTE|WARNING|TIP)\]\s*(.*)$/i);
            if (m) {
                const kind = m[1].toUpperCase();
                q[0] = m[2];
                out.push('<blockquote class="callout-' + kind.toLowerCase() + '"><p><strong>' + escHtml(labels[kind]) + ':</strong> ' + inline(q.join(' ').trim()) + '</p></blockquote>');
            } else {
                out.push('<blockquote>' + mdToHtml(q.join('\n'), opts) + '</blockquote>');
            }
            continue;
        }

        const li = line.match(LIST);
        if (li) {
            flushPara();
            const indent = li[1].length, tag = /\d/.test(li[2]) ? 'ol' : 'ul';
            const top = stack[stack.length - 1];
            if (!top || indent > top.indent + 1) {
                if (top) { out.push(item); item = null; }   // Elternpunkt bleibt offen, Text ist ausgegeben
                out.push('<' + tag + '>');
                stack.push({ tag, indent });
            } else {
                closeItemKeep();
                while (stack.length && stack[stack.length - 1].indent > indent) { out.push('</' + stack.pop().tag + '></li>'); }
                const t2 = stack[stack.length - 1];
                if (t2 && t2.tag !== tag) { out.push('</' + stack.pop().tag + '>'); out.push('<' + tag + '>'); stack.push({ tag, indent }); }
                else if (!t2) { out.push('<' + tag + '>'); stack.push({ tag, indent }); }
            }
            let text = li[3];
            let box = '';
            const task = text.match(/^\[([ xX])\]\s+(.*)$/);
            if (task) { box = task[1] === ' ' ? '\u2610 ' : '\u2611 '; text = task[2]; }
            item = '<li>' + box + inline(text);
            continue;
        }
        function closeItemKeep() { if (item !== null) { out.push(item + '</li>'); item = null; } }

        if (stack.length && item !== null && /^\s+\S/.test(line) && !para.length) { item += ' ' + inline(line.trim()); continue; }

        flushAll();
        para.push(line);
        // weitere Zeilen desselben Absatzes
        while (i + 1 < lines.length) {
            const nx = lines[i + 1];
            if (!nx.trim() || FENCE.test(nx) || /^\s{0,3}#{1,6}\s/.test(nx) || /^\s{0,3}>/.test(nx) || LIST.test(nx) || HR.test(nx)) break;
            if (nx.includes('|') && i + 2 < lines.length && isTableSeparator(lines[i + 2])) break;
            para.push(nx); i++;
        }
        flushPara();
    }
    flushAll();
    return out.join('\n');
}

export function mdToPlain(md) {
    const lit = [];
    const plain = s => {
        let x = s.replace(ESCAPABLE, (m, c) => { lit.push(c); return '\u0001' + (lit.length - 1) + '\u0001'; });
        x = x.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, '$1 ($2)')
            .replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/~~([^~]+)~~/g, '$1');
        return x.replace(/\u0001(\d+)\u0001/g, (m, i) => lit[i]);
    };
    const out = [];
    let fence = null;
    String(md).replace(/\r\n?/g, '\n').split('\n').forEach(rawLine => {
        const line = rawLine.trim();
        const f = line.match(/^(```+|~~~+)/);
        if (f) { fence = fence ? null : f[1][0]; return; }
        if (fence) { out.push(rawLine); return; }
        if (!line) { out.push(''); return; }
        if (HR.test(line)) { out.push('────────────'); return; }
        if (line.includes('|') && isTableSeparator(line)) return;
        if (line.startsWith('|') && line.endsWith('|')) { out.push(splitTableRow(line).map(plain).join('  |  ')); return; }
        let m;
        if ((m = line.match(/^#{1,6}\s+(.*)$/))) { out.push('', plain(m[1].replace(/\s*#+$/, '')), ''); return; }
        if ((m = line.match(/^>\s?(.*)$/))) { out.push('  ' + plain(m[1].replace(/^\[!NOTE\]\s*/i, 'Note: ').replace(/^\[!WARNING\]\s*/i, 'Warning: ').replace(/^\[!TIP\]\s*/i, 'Tip: '))); return; }
        if ((m = rawLine.match(/^(\s*)[-*+]\s+(.*)$/))) { out.push(m[1].replace(/\t/g, '    ') + '\u2022 ' + plain(m[2])); return; }
        if ((m = rawLine.match(/^(\s*)(\d+)[.)]\s+(.*)$/))) { out.push(m[1] + m[2] + '. ' + plain(m[3])); return; }
        out.push(plain(line));
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function headings(md) {
    const res = [];
    let fence = null;
    for (const l of String(md).replace(/\r\n?/g, '\n').split('\n')) {
        const f = l.match(/^\s{0,3}(```+|~~~+)/);
        if (f) { fence = fence ? (f[1][0] === fence ? null : fence) : f[1][0]; continue; }
        if (fence) continue;
        const h = l.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
        if (h) res.push({ level: h[1].length, text: h[2].replace(/[*`~\\]/g, '') });
    }
    return res;
}

export function sections(md, level = 1) {
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const res = [{ title: '', lines: [] }];
    let fence = null;
    for (const l of lines) {
        const f = l.match(/^\s{0,3}(```+|~~~+)/);
        if (f) fence = fence ? (f[1][0] === fence ? null : fence) : f[1][0];
        const h = !fence && !f && l.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
        if (h && h[1].length <= level) res.push({ title: h[2].replace(/[*`~\\]/g, ''), lines: [l] });
        else res[res.length - 1].lines.push(l);
    }
    return res.filter(s => s.title || s.lines.some(x => x.trim())).map(s => ({ title: s.title, md: s.lines.join('\n') }));
}
