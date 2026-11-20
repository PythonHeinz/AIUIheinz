/* tools/filter/mod/ausgabe.js – Ausgabe: Tabelle aus den Ergebnissen, Export CSV/TSV/JSON/Markdown (Insel-Modul, rein).
 * tabelle(ergebnisse, { headers, mitGrund, mitKontrolle, unklar }) -> { head: string[], rows: string[][] }
 *     Quelltabelle: alle Spalten + label (+ reason) (+ control, match); Textmodus: entry, label (+ reason)
 * zuCSV(tab, { bom }), zuTSV(tab) (Zellen mit Tab, Zeilenumbruch oder Anführungszeichen werden gequotet, damit Tabellen in Sheets ankommen),
 * zuMarkdown(tab), zuJSON(ergebnisse, opts), exportiere(format, ergebnisse, opts) -> { name, mime, text } */

export function tabelle(ergebnisse, o) {
    const op = o || {}, h = op.headers, unklar = op.unklar || '(unclear)';
    const tabellarisch = !!(h && ergebnisse.length && ergebnisse[0].row);
    const head = tabellarisch ? h.slice() : ['entry'];
    head.push('label'); if (op.mitGrund) head.push('reason'); if (op.mitKontrolle) head.push('control', 'match');
    const rows = ergebnisse.map(e => {
        const r = tabellarisch ? h.map((_, i) => (e.row[i] == null ? '' : String(e.row[i]))) : [e.text];
        r.push(e.label == null ? unklar : e.label);
        if (op.mitGrund) r.push(e.grund || '');
        if (op.mitKontrolle) r.push(e.erwartet || '', e.treffer === null || e.treffer === undefined ? '' : e.treffer ? 'yes' : 'no');
        return r;
    });
    return { head, rows };
}

const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
export function zuCSV(tab, o) { return ((o && o.bom) ? '﻿' : '') + [tab.head].concat(tab.rows).map(r => r.map(q).join(',')).join('\n') + '\n'; }
export function zuTSV(tab) {
    const c = v => { const s = String(v == null ? '' : v); return /[\t\r\n"]/.test(s) ? q(s) : s; };
    return [tab.head].concat(tab.rows).map(r => r.map(c).join('\t')).join('\n') + '\n';
}
export function zuMarkdown(tab) {
    const c = v => String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    const line = r => '| ' + r.map(c).join(' | ') + ' |';
    return [line(tab.head), '|' + tab.head.map(() => '---').join('|') + '|'].concat(tab.rows.map(line)).join('\n') + '\n';
}
export function zuJSON(ergebnisse, o) {
    const op = o || {}, h = op.headers;
    return JSON.stringify(ergebnisse.map(e => {
        const x = { entry: e.text, label: e.label == null ? null : e.label };
        if (e.grund) x.reason = e.grund;
        if (e.erwartet) { x.control = e.erwartet; x.match = e.treffer; }
        if (h && e.row) { x.row = {}; h.forEach((k, i) => { x.row[k] = e.row[i] || ''; }); }
        return x;
    }), null, 2) + '\n';
}
export function exportiere(format, ergebnisse, o) {
    const tab = tabelle(ergebnisse, o);
    if (format === 'csv') return { name: 'heinz-filter.csv', mime: 'text/csv', text: zuCSV(tab, { bom: true }) };
    if (format === 'tsv') return { name: 'heinz-filter.tsv', mime: 'text/tab-separated-values', text: zuTSV(tab) };
    if (format === 'json') return { name: 'heinz-filter.json', mime: 'application/json', text: zuJSON(ergebnisse, o) };
    if (format === 'md') return { name: 'heinz-filter.md', mime: 'text/markdown', text: zuMarkdown(tab) };
    throw new Error('Unknown format: ' + format);
}
