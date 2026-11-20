/* tools/filter/mod/einlesen.js – Einlesen von Listen und Texten (Insel-Modul, reine Funktionen, läuft in Node und im Browser).
 * einlesen(text, name?, opts?)  -> { kind: 'table'|'text', format, headers: string[]|null, rows: string[][] }
 *     Formate: CSV/TSV (Anführungszeichen, Trennerkennung), JSON (Liste von Objekten oder Texten, Feldliste = alle Schlüssel),
 *     XML/RSS/Atom (ein Eintrag je item/entry, Spalten title, summary, link), Klartext (eine Zeile oder ein Absatz je Eintrag; opts.absatz).
 *     Im Textmodus ist headers null und jede Zeile hat genau eine Zelle.
 * eintraege(data, cols, opts?)  -> [{ index, text, row }]   Eintrag je Zeile, gewählte Spalten zusammengefasst (opts.sep, Standard " · ")
 * Das Modell sieht nur den Text; row bleibt für Kontrollspalte und Export erhalten. Nichts wird geraten: was nicht lesbar ist, ergibt leere Zeilen. */

export function detectDelim(line) {
    const c = { ',': 0, ';': 0, '\t': 0, '|': 0 };
    let q = false;
    for (const ch of String(line)) { if (ch === '"') q = !q; else if (!q && c[ch] !== undefined) c[ch]++; }
    const best = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
    return c[best] > 0 ? best : ',';
}

export function parseCSV(text, delimiter) {
    const src = String(text).replace(/^﻿/, '');
    const d = delimiter || detectDelim(src.split(/\r?\n/)[0] || '');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (q) {
            if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
            else cell += ch;
        } else if (ch === '"' && cell === '') q = true;
        else if (ch === d) { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && src[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            if (row.some(c => c.trim() !== '')) rows.push(row);
            row = [];
        } else cell += ch;
    }
    row.push(cell);
    if (row.some(c => c.trim() !== '')) rows.push(row);
    return rows;
}

export function looksLikeTable(text) {
    const lines = String(text).split(/\r?\n/).filter(l => l.trim()).slice(0, 5);
    if (lines.length < 2) return false;
    const d = detectDelim(lines[0]);
    const n = parseCSV(lines[0], d)[0].length;
    const kopf = parseCSV(lines[0], d)[0];
    // Kopfzeile einer Tabelle: kurze Zellen ohne Satzzeichen am Ende (sonst ist es Fließtext mit Kommas)
    return n > 1 && lines.every(l => parseCSV(l, d)[0].length === n) && kopf.every(c => c.trim().length <= 40 && !/[.!?]$/.test(c.trim()));
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
        if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
        return ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m;
    });
}
function xmlText(block, tag) {
    const m = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'i').exec(block);
    if (!m) return '';
    let v = m[1];
    const cd = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(v);
    v = cd ? cd[1] : decode(v);
    return v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function xmlLink(block) {
    const t = xmlText(block, 'link');
    if (t) return t;
    const m = /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(block);
    return m ? decode(m[1]) : '';
}
export function parseFeed(text) {
    const blocks = String(text).match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
    return blocks.map(b => [xmlText(b, 'title'), xmlText(b, 'summary') || xmlText(b, 'description') || xmlText(b, 'content'), xmlLink(b)]).filter(r => r[0] || r[1]);
}

function cell(v) { return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); }

export function einlesen(text, name, opts) {
    const o = opts || {}, lower = String(name || '').toLowerCase(), t = String(text == null ? '' : text).replace(/^﻿/, '').trim();
    const textMode = (lines, format) => ({ kind: 'text', format, headers: null, rows: lines.map(l => [l]) });
    if (!t) return textMode([], 'text');
    try {
        if (/\.(xml|rss|atom)$/.test(lower) || /^(<\?xml|<rss|<feed|<rdf)/i.test(t)) {
            return { kind: 'table', format: 'feed', headers: ['title', 'summary', 'link'], rows: parseFeed(t) };
        }
        if (/\.json$/.test(lower) || /^[\[{]/.test(t)) {
            const data = JSON.parse(t);
            const arr = Array.isArray(data) ? data : (data && (data.items || data.entries || data.data)) || [];
            if (!Array.isArray(arr)) return textMode([], 'json');
            if (arr.some(x => x && typeof x === 'object' && !Array.isArray(x))) {
                const headers = [];
                arr.forEach(x => { if (x && typeof x === 'object') Object.keys(x).forEach(k => { if (headers.indexOf(k) < 0) headers.push(k); }); });
                return { kind: 'table', format: 'json', headers, rows: arr.map(x => headers.map(h => (x && typeof x === 'object' ? cell(x[h]) : h === headers[0] ? cell(x) : ''))) };
            }
            return textMode(arr.map(cell).filter(s => s.trim()), 'json');
        }
        if (/\.(csv|tsv)$/.test(lower) || looksLikeTable(t)) {
            const rows = parseCSV(t, /\.tsv$/.test(lower) ? '\t' : undefined);
            const n = Math.max(...rows.map(r => r.length));
            const headers = rows[0].map((h, i) => h.trim() || 'col ' + (i + 1));
            while (headers.length < n) headers.push('col ' + (headers.length + 1));
            return { kind: 'table', format: 'csv', headers, rows: rows.slice(1).map(r => { const c = r.slice(); while (c.length < n) c.push(''); return c; }) };
        }
    } catch (e) { return { kind: 'text', format: 'error', headers: null, rows: [], error: String(e && e.message || e) }; }
    const parts = o.absatz ? t.split(/\r?\n\s*\r?\n/).map(s => s.replace(/\s*\r?\n\s*/g, ' ').trim()) : t.split(/\r?\n/).map(s => s.trim());
    return textMode(parts.filter(Boolean), 'text');
}

export function eintraege(data, cols, opts) {
    const sep = (opts && opts.sep) || ' · ';
    const pick = data.kind === 'table' && cols && cols.length ? cols : [0];
    return data.rows.map((row, index) => ({ index, text: pick.map(c => (row[c] || '').trim()).filter(Boolean).join(sep), row })).filter(e => e.text);
}
