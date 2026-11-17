/* tools/convert2/mod/tabellen.js – Tabellen- und Datenformate (Insel-Modul, reine Funktionen, keine Oberfläche).
 * Lesen:   parseDelimited(text, delimiter?)  CSV/TSV (RFC 4180: Anführungszeichen, doppelte Anführungszeichen, Zeilenumbrüche in Zellen), Trennzeichen automatisch (Tab, ; , |)
 *          detectDelimited(text)             -> { delimiter, rows } oder null (mindestens 2 Spalten in allen Zeilen)
 *          rowsToMd(rows)                    Tabelle als Markdown; jsonToMd(value)  Liste von Objekten -> Tabelle, sonst JSON-Block
 * Schreiben: extractTables(md) holt die Tabellen (Zeilen von Zellen) aus Markdown; FORMATS[name](tables, md) liefert den Text:
 *          tsv, csv, asciiBox, json, yaml, latex, typst, asciidoc, ditaxml (ohne Tabellen: Rückfall wie in der Vorlage), bbcode (arbeitet auf dem ganzen Dokument)
 * Zeilen sind Arrays von Zeichenketten; die erste Zeile jeder Tabelle ist die Kopfzeile. */
import { escHtml, escLatex, escYaml, escTypst } from './text.js';
import { isTableSeparator, splitTableRow } from './markdown.js';

// ---------- Lesen ----------
export function parseDelimited(text, delimiter) {
    const src = String(text).replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
    if (!delimiter) delimiter = (detectDelimited(src) || { delimiter: ',' }).delimiter;
    const rows = [];
    let row = [], cell = '', q = false, any = false;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (q) {
            if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
            else cell += ch;
        } else if (ch === '"' && cell === '') { q = true; any = true; }
        else if (ch === delimiter) { row.push(cell); cell = ''; any = true; }
        else if (ch === '\n') { row.push(cell); if (any || row.length > 1 || row[0] !== '') rows.push(row); row = []; cell = ''; any = false; }
        else { cell += ch; any = true; }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
}

export function detectDelimited(text) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 2 && !/\t/.test(lines[0] || '')) return null;
    for (const d of ['\t', ';', ',', '|']) {
        const rows = parseDelimited(String(text).replace(/\n+$/, ''), d);   // delimiter gesetzt: keine Rekursion
        if (rows.length < Math.min(lines.length, 2)) continue;
        const n = rows[0].length;
        if (n >= 2 && rows.every(r => r.length === n)) return { delimiter: d, rows };
    }
    return null;
}

const mdCell = c => String(c).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
export function rowsToMd(rows) {
    if (!rows.length) return '';
    const n = Math.max(...rows.map(r => r.length));
    const line = r => '| ' + Array.from({ length: n }, (_, i) => mdCell(r[i] ?? '')).join(' | ') + ' |';
    return [line(rows[0]), '| ' + Array(n).fill('---').join(' | ') + ' |', ...rows.slice(1).map(line)].join('\n');
}

export function jsonToMd(value) {
    if (Array.isArray(value) && value.length && value.every(v => v && typeof v === 'object' && !Array.isArray(v))) {
        const keys = [];
        value.forEach(o => Object.keys(o).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
        const cell = v => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
        return rowsToMd([keys, ...value.map(o => keys.map(k => cell(o[k])))]);
    }
    return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
}

// ---------- Tabellen aus Markdown ----------
export function extractTables(md) {
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const tables = [];
    let fence = null;
    for (let i = 0; i < lines.length; i++) {
        const f = lines[i].match(/^\s{0,3}(```+|~~~+)/);
        if (f) { fence = fence ? (f[1][0] === fence ? null : fence) : f[1][0]; continue; }
        if (fence) continue;
        if (lines[i].includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]) && !isTableSeparator(lines[i])) {
            const n = splitTableRow(lines[i]).length;
            const rows = [splitTableRow(lines[i])];
            for (i += 2; i < lines.length && lines[i].trim() && lines[i].includes('|'); i++) {
                const r = splitTableRow(lines[i]);
                while (r.length < n) r.push('');
                rows.push(r);
            }
            i--;
            tables.push(rows);
        }
    }
    return tables;
}

// ---------- Schreiben ----------
const one = s => String(s ?? '');
const keyYaml = k => (/^[A-Za-z_][\w-]*$/.test(k) ? k : '"' + escYaml(k) + '"');

function bbcode(md) {
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    const inl = s => s.replace(/`([^`]+)`/g, '[code]$1[/code]').replace(/\*\*([^*]+)\*\*/g, '[b]$1[/b]').replace(/\*([^*]+)\*/g, '[i]$1[/i]')
        .replace(/~~([^~]+)~~/g, '[s]$1[/s]').replace(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g, '[img]$1[/img]')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '[url=$2]$1[/url]');
    let list = null;
    const endList = () => { if (list) { out.push('[/list]'); list = null; } };
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i], t = l.trim();
        if (/^(```|~~~)/.test(t)) { endList(); const buf = []; for (i++; i < lines.length && !/^(```|~~~)/.test(lines[i].trim()); i++) buf.push(lines[i]); out.push('[code]\n' + buf.join('\n') + '\n[/code]'); continue; }
        if (l.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]) && !isTableSeparator(l)) {
            endList();
            const rows = [splitTableRow(l)];
            for (i += 2; i < lines.length && lines[i].trim() && lines[i].includes('|'); i++) rows.push(splitTableRow(lines[i]));
            i--;
            out.push('[table]\n' + rows.map((r, k) => '[tr]' + r.map(c => (k === 0 ? '[th]' : '[td]') + inl(c) + (k === 0 ? '[/th]' : '[/td]')).join('') + '[/tr]').join('\n') + '\n[/table]');
            continue;
        }
        let m;
        if ((m = t.match(/^(#{1,6})\s+(.*)$/))) { endList(); const n = Math.min(m[1].length, 3); out.push('[size=' + (7 - n * 1) + '][b]' + inl(m[2]) + '[/b][/size]'); continue; }
        if ((m = t.match(/^>\s?(.*)$/))) { endList(); out.push('[quote]' + inl(m[1]) + '[/quote]'); continue; }
        if ((m = t.match(/^([-*+]|\d+[.)])\s+(.*)$/))) {
            const kind = /\d/.test(m[1]) ? '1' : '';
            if (!list || list !== (kind || '-')) { endList(); out.push(kind ? '[list=1]' : '[list]'); list = kind || '-'; }
            out.push('[*]' + inl(m[2])); continue;
        }
        endList();
        out.push(inl(l));
    }
    endList();
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export const FORMATS = {
    tsv: (tables, md) => tables.map(t => t.map(r => r.map(c => one(c).replace(/[\t\n]+/g, ' ')).join('\t')).join('\n')).join('\n\n') || md,

    csv: (tables, md) => tables.map(t => t.map(r => r.map(c => '"' + one(c).replace(/"/g, '""') + '"').join(',')).join('\n')).join('\n\n') || md,

    asciiBox: (tables, md) => {
        if (!tables.length) return md;
        return tables.map(table => {
            const cols = Math.max(...table.map(r => r.length));
            const w = new Array(cols).fill(0);
            const len = s => [...s].length;
            table.forEach(r => r.forEach((c, i) => { if (len(c) > w[i]) w[i] = len(c); }));
            const div = (l, m, r) => l + w.map(x => '─'.repeat(x + 2)).join(m) + r + '\n';
            let o = div('┌', '┬', '┐');
            table.forEach((r, idx) => {
                o += '│' + w.map((x, i) => ' ' + one(r[i]).replace(/\n/g, ' ') + ' '.repeat(x - len(one(r[i]).replace(/\n/g, ' '))) + ' ').join('│') + '│\n';
                if (idx === 0) o += div('├', '┼', '┤');
            });
            return o + div('└', '┴', '┘').replace(/\n$/, '');
        }).join('\n\n');
    },

    json: (tables, md) => {
        if (!tables.length) return JSON.stringify({ content: md }, null, 2);
        const sets = tables.map(t => (t.length <= 1 ? t : t.slice(1).map(r => Object.fromEntries(t[0].map((h, i) => [h, r[i] ?? ''])))));
        return JSON.stringify(sets.length === 1 ? sets[0] : sets, null, 2);
    },

    yaml: (tables, md) => {
        if (!tables.length) return 'text: "' + escYaml(md.replace(/\n/g, ' ')) + '"';
        return tables.map(t => t.slice(1).map(r => '-\n' + t[0].map((h, i) => '  ' + keyYaml(h) + ': "' + escYaml(r[i] ?? '') + '"\n').join('')).join('')).join('\n---\n');
    },

    latex: (tables, md) => {
        if (!tables.length) return escLatex(md);
        return tables.map(t => {
            const cols = Math.max(...t.map(r => r.length));
            let o = '\\begin{tabular}{' + 'l'.repeat(cols) + '}\n\\hline\n';
            t.forEach((r, i) => { o += Array.from({ length: cols }, (_, k) => escLatex(r[k] ?? '')).join(' & ') + ' \\\\\n'; if (i === 0) o += '\\hline\n'; });
            return o + '\\hline\n\\end{tabular}';
        }).join('\n\n');
    },

    typst: (tables, md) => {
        if (!tables.length) return md;
        return tables.map(t => {
            const cols = Math.max(...t.map(r => r.length));
            let o = '#table(\n  columns: ' + cols + ',\n';
            t.forEach(r => Array.from({ length: cols }, (_, k) => r[k] ?? '').forEach(c => { o += '  [' + escTypst(c) + '],\n'; }));
            return o + ')';
        }).join('\n\n');
    },

    asciidoc: (tables, md) => {
        if (!tables.length) return md;
        return tables.map(t => {
            const cols = Math.max(...t.map(r => r.length));
            let o = '[cols="' + cols + '*", options="header"]\n|===\n';
            t.forEach(r => { Array.from({ length: cols }, (_, k) => r[k] ?? '').forEach(c => { o += '| ' + one(c).replace(/\|/g, '\\|') + '\n'; }); o += '\n'; });
            return o + '|===';
        }).join('\n\n');
    },

    ditaxml: (tables, md) => {
        if (!tables.length) return '<p>' + escHtml(md) + '</p>';
        return tables.map(t => {
            const cols = Math.max(...t.map(r => r.length));
            const row = r => '      <row>\n' + Array.from({ length: cols }, (_, k) => '        <entry>' + escHtml(r[k] ?? '') + '</entry>\n').join('') + '      </row>\n';
            return '<table>\n  <tgroup cols="' + cols + '">\n    <thead>\n' + row(t[0]) + '    </thead>\n    <tbody>\n' + t.slice(1).map(row).join('') + '    </tbody>\n  </tgroup>\n</table>';
        }).join('\n\n');
    },

    bbcode: (tables, md) => bbcode(md),
};
