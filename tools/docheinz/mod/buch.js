/* tools/docheinz/mod/buch.js – Bücher lesen: TXT, Markdown, HTML, EPUB hinter einer Schnittstelle (Insel-Modul, keine Oberfläche).
 *   formatOf(name, type) -> 'epub' | 'md' | 'txt' | 'html' | 'pdf' | 'other'
 *   openSource(bytes, format, name, opts?) -> Promise<Source>   opts.ocr = Texte je Seite bei gescannten PDFs;   wirft BuchFehler (code: 'drm' | 'unreadable' | 'empty' | 'scanned' | 'unsupported')
 *     Source = { format, metadata: { title, creator, language }, toc: [{ title, href, level }],
 *                chapters: [{ href, title }], html(i) -> Promise<string> (bereinigt), resolve(go) -> { index, anchor } | null }
 *   describe(source) -> Promise<{ lens: number[] }>      Textlänge je Kapitel (Fortschritt in Prozent)
 * Kapiteltext als sauberer Text: plain(await source.html(i)) (Grundlage für späteres Gespräch mit dem Buch). */
import { readEpub } from './epub-lesen.js';
import { mdToHtml, sections } from './markdown.js';
import { escHtml } from './text.js';
import { sauber, plain } from './sauber.js';

export class BuchFehler extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; this.detail = detail || ''; } }

const EXT = { epub: 'epub', md: 'md', markdown: 'md', txt: 'txt', text: 'txt', html: 'html', htm: 'html', xhtml: 'html', pdf: 'pdf' };
export function formatOf(name, type) {
    const ext = (String(name).split('.').pop() || '').toLowerCase();
    if (EXT[ext]) return EXT[ext];
    if (/epub/.test(type || '')) return 'epub';
    if (/pdf/.test(type || '')) return 'pdf';
    if (/html/.test(type || '')) return 'html';
    if (/markdown/.test(type || '')) return 'md';
    if (/^text\//.test(type || '')) return 'txt';
    return 'other';
}

export function decodeText(bytes) {
    let u = bytes;
    if (u[0] === 0xEF && u[1] === 0xBB && u[2] === 0xBF) u = u.subarray(3);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(u); }
    catch { return new TextDecoder('windows-1252').decode(u); }
}
const stem = name => String(name).replace(/\.[^.]*$/, '').replace(/[_]+/g, ' ').trim();
const hasText = html => plain(html).length > 0;

function simple(format, meta, parts) {
    // parts: [{ title, html }]
    const chapters = parts.map((p, i) => ({ href: 'k' + (i + 1), title: p.title }));
    const toc = parts.filter(p => p.title).map((p, i) => ({ title: p.title, href: 'k' + (parts.indexOf(p) + 1), level: 1 }));
    return {
        format, metadata: meta, toc, chapters,
        html: async i => parts[i].html,
        resolve: go => { const [p, a] = String(go).split('#'); const index = chapters.findIndex(c => c.href === p); return index < 0 ? null : { index, anchor: a || '' }; },
    };
}

export async function openSource(bytes, format, name = '', opts = {}) {
    if (format === 'pdf') { const { openPdf } = await import('./pdf-lesen.js'); return openPdf(bytes, name, BuchFehler, opts); }
    if (format !== 'epub' && format !== 'md' && format !== 'txt' && format !== 'html') throw new BuchFehler('unsupported', (name.split('.').pop() || '').toLowerCase());
    if (format === 'epub') {
        let book;
        try { book = await readEpub(bytes); } catch (e) { throw new BuchFehler(/DRM/.test(e.message) ? 'drm' : 'unreadable', e.message); }
        if (!book.chapters.length) throw new BuchFehler('empty');
        const m = book.metadata;
        return {
            format, metadata: { title: m.title || stem(name), creator: m.creator || '', language: m.language || '' },
            toc: book.toc, chapters: book.chapters.map(c => ({ href: c.href, title: c.title })),
            html: async i => sauber(await book.chapterBody(i), { base: book.chapters[i].href }),
            resolve: go => { const [p, a] = String(go).split('#'); const index = book.chapters.findIndex(c => c.href === p); return index < 0 ? null : { index, anchor: a || '' }; },
            textLength: async i => plain(await book.chapterHtml(i)).length,
            book,
        };
    }
    const text = decodeText(bytes);
    if (!text.trim()) throw new BuchFehler('empty');
    if (format === 'txt') {
        const html = text.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).map(p => '<p>' + escHtml(p.trim()).replace(/\n/g, ' ') + '</p>').join('\n');
        return simple('txt', { title: stem(name), creator: '', language: '' }, [{ title: '', html }]);
    }
    if (format === 'md') {
        const secs = sections(text, 1);
        const parts = secs.map(s => ({ title: s.title, html: sauber(mdToHtml(s.md)) })).filter(p => hasText(p.html));
        if (!parts.length) throw new BuchFehler('empty');
        const h1 = secs.filter(s => s.title);
        return simple('md', { title: h1.length === 1 ? h1[0].title : stem(name), creator: '', language: '' }, parts);
    }
    // html
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const title = (doc.title || '').trim() || (doc.querySelector('h1') && doc.querySelector('h1').textContent.trim()) || stem(name);
    const html = sauber(text);
    if (!hasText(html)) throw new BuchFehler('empty');
    const lang = (doc.documentElement.getAttribute('lang') || '').trim();
    return simple('html', { title, creator: '', language: lang }, [{ title: '', html }]);
}

export async function describe(source, onProgress) {
    const lens = [];
    for (let i = 0; i < source.chapters.length; i++) { if (onProgress) onProgress(i, source.chapters.length); lens.push(source.textLength ? await source.textLength(i) : plain(await source.html(i)).length); }
    return { lens };
}
