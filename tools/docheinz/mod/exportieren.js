/* tools/docheinz/mod/exportieren.js – ein Buch in andere Formate umwandeln (Insel-Modul, keine Oberfläche, kein Netz).
 *   FORMATS                          [{ id, ext, mime, kind: 'binary'|'text'|'print' }]  epub, docx, md, txt, html, pdf (pdf = Druckdialog)
 *   bookToMarkdown(source, rec, { front, notes, labels, onProgress }) -> Promise<string>
 *       front: Titel und Autor als erste Zeilen (für Markdown, Text, HTML); notes: Markierungen und Notizen als letzter Abschnitt anhängen
 *   exportBook(source, rec, id, opts) -> Promise<{ id, ext, mime, kind, name, bytes?, text?, html? }>
 *       opts: { notes (Markierungsliste oder null), labels (mod/markierung.js), language, onProgress(i, n), date }
 * Grundlage ist der bereinigte Buchinhalt (mod/buch.js): Kapitel für Kapitel nach Markdown, Bilder bleiben als data:-URLs erhalten. */
import { htmlToMarkdown } from './html.js';
import { mdToHtml, mdToPlain } from './markdown.js';
import { markdownToEpub } from './epub-schreiben.js';
import { markdownToDocx } from './docx-schreiben.js';
import { toMarkdown } from './markierung.js';
import { escHtml, fileName, clean } from './text.js';

export const FORMATS = [
    { id: 'epub', ext: 'epub', mime: 'application/epub+zip', kind: 'binary' },
    { id: 'docx', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'binary' },
    { id: 'md', ext: 'md', mime: 'text/markdown', kind: 'text' },
    { id: 'txt', ext: 'txt', mime: 'text/plain', kind: 'text' },
    { id: 'html', ext: 'html', mime: 'text/html', kind: 'text' },
    { id: 'pdf', ext: 'pdf', mime: 'application/pdf', kind: 'print' },
];

const PAGE_CSS = 'body{font-family:Georgia,serif;line-height:1.6;max-width:42em;margin:2em auto;padding:0 1em;color:#111}h1,h2,h3,h4{font-family:system-ui,sans-serif;line-height:1.25}img{max-width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #888;padding:.3em .5em}blockquote{border-left:3px solid #999;margin:1em 0;padding:0 0 0 .8em;color:#333}pre{white-space:pre-wrap}@media print{h1{page-break-before:always}h1:first-of-type{page-break-before:avoid}}';

export async function bookToMarkdown(source, rec, { front = false, notes = null, labels = null, onProgress } = {}) {
    const n = source.chapters.length, chap = [];
    for (let i = 0; i < n; i++) {
        if (onProgress) onProgress(i, n);
        let md = htmlToMarkdown(await source.html(i)).trim();
        const title = (source.chapters[i].title || '').trim();
        if (n > 1 && title && !/^#{1,6}\s/.test(md)) md = '# ' + title.replace(/[*`~\\#]/g, '') + (md ? '\n\n' + md : '');
        if (md) chap.push(md);
    }
    const parts = [];
    if (front) {
        const bt = String(rec.title || '').replace(/[*`~\\#]/g, '').trim(), first = ((chap[0] || '').match(/^#{1,6}\s+(.*)$/m) || [])[1] || '';
        const dup = first.replace(/[*`~\\#]/g, '').trim().toLowerCase() === bt.toLowerCase();      // das Buch beginnt selbst mit dem Titel: nicht doppelt
        const au = rec.author ? '*' + String(rec.author).trim() + '*' : '';
        if (bt && !dup) parts.push('# ' + bt);
        if (au && !dup) parts.push(au);
        else if (au && chap.length) chap[0] = chap[0].replace(/^(#{1,6}\s+.*)$/m, '$1\n\n' + au.replace(/\$/g, '$$$$'));
    }
    parts.push(...chap);
    if (notes && notes.length) parts.push(toMarkdown(rec, notes, (ch) => (source.chapters[ch] && source.chapters[ch].title) || '', labels || {}, { bare: true }).trim());
    return clean(parts.join('\n\n'), { citations: false });
}

export function htmlDocument(md, { title, language }) {
    return '<!DOCTYPE html>\n<html lang="' + escHtml(language || 'en') + '">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>' + escHtml(title || '') + '</title>\n<style>' + PAGE_CSS + '</style>\n</head>\n<body>\n' + mdToHtml(md) + '\n</body>\n</html>\n';
}

export async function exportBook(source, rec, id, { notes = null, labels = null, language = '', onProgress, date } = {}) {
    const meta = FORMATS.find(f => f.id === id);
    if (!meta) throw new Error('docheinz: unbekanntes Format ' + id);
    const lang = language || (rec.language || (source.metadata && source.metadata.language) || 'en');
    const title = rec.title || (source.metadata && source.metadata.title) || '', author = rec.author || '';
    const out = { id, ext: meta.ext, mime: meta.mime, kind: meta.kind, name: fileName(title, meta.ext, 'book') };
    const flat = id === 'md' || id === 'txt' || id === 'html' || id === 'pdf';
    const md = await bookToMarkdown(source, rec, { front: flat, notes, labels, onProgress });
    if (id === 'md') out.text = md + '\n';
    else if (id === 'txt') out.text = mdToPlain(md) + '\n';
    else if (id === 'html' || id === 'pdf') out.html = htmlDocument(md, { title, language: lang });
    else if (id === 'epub') out.bytes = await markdownToEpub(md, { title, author, language: lang, date });
    else if (id === 'docx') out.bytes = await markdownToDocx(md, { title, author, language: lang, date });
    if (id === 'html') out.text = out.html;
    return out;
}
