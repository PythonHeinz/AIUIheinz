/* tools/convert2/mod/erkennen.js – Eingabe erkennen und zu Markdown normalisieren (Insel-Modul, keine Oberfläche).
 *   detect(input, opts?) -> { type, md, failed? }
 *     type: 'empty' | 'json' | 'html' | 'tsv' | 'csv' | 'markdown-table' | 'markdown' | 'text'
 *     opts.clean (Standard true): vorher text.clean() anwenden
 *   Reihenfolge: JSON → HTML (auch im Code-Zaun) → Markdown-Tabelle → TSV/CSV (Tab, Semikolon, Komma) → Markdown → Fließtext.
 *   failed = true: HTML erkannt, aber ohne darstellbaren Text. Die Oberfläche macht aus type die Anzeige („Erkannt: …“). */
import { clean } from './text.js';
import { looksLikeHtml, htmlToMarkdown } from './html.js';
import { isTableSeparator } from './markdown.js';
import { detectDelimited, rowsToMd, jsonToMd } from './tabellen.js';

export function detect(input, opts = {}) {
    let raw = String(input ?? '');
    if (opts.clean !== false) raw = clean(raw);
    raw = raw.replace(/^(\s*\n)+/, '').replace(/\n\s*$/, '');   // nur Leerzeilen am Rand; Tabulatoren am Zeilenende bleiben (leere letzte TSV-Zelle)
    if (!raw.trim()) return { type: 'empty', md: '' };
    const trimmed = raw.trim();

    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { return { type: 'json', md: jsonToMd(JSON.parse(trimmed)) }; } catch { /* kein JSON */ }
    }

    const unfenced = trimmed.replace(/^```[\w-]*[ \t]*\n([\s\S]*?)\n?```\s*$/, '$1').trim();
    if (looksLikeHtml(unfenced)) {
        let md = '';
        try { md = htmlToMarkdown(unfenced); } catch { md = ''; }
        return { type: 'html', md, failed: !md };
    }

    const lines = raw.split('\n');
    const hasMdTable = lines.some(isTableSeparator);
    if (hasMdTable) return { type: 'markdown-table', md: raw };

    const d = detectDelimited(raw);
    if (d) {
        const prose = lines.filter(l => /[.!?:]\s*$/.test(l.trim())).length > lines.length / 2;
        const plausible = d.delimiter === '\t' || d.delimiter === ';' || (d.delimiter === ',' && !prose);
        if (plausible) return { type: d.delimiter === '\t' ? 'tsv' : 'csv', md: rowsToMd(d.rows) };
    }

    if (/^#{1,6}\s/m.test(raw) || /^\s*([-*+]|\d+[.)])\s+\S/m.test(raw) || /\*\*[^*]+\*\*|^>\s/m.test(raw) || /^```/m.test(raw)) return { type: 'markdown', md: raw };
    return { type: 'text', md: raw };
}
