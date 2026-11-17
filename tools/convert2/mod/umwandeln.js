/* tools/convert2/mod/umwandeln.js – Markdown in ein Zielformat umwandeln (Insel-Modul, keine Oberfläche).
 *   FORMAT_LIST   [{ id, group, ext, mime, kind: 'text'|'binary'|'print' }] in der Reihenfolge des Auswahlfelds; group: 'data' | 'office' | 'doc'
 *   convertMarkdown(md, formatId, opts?) -> Promise<{ id, text, html?, bytes?, ext, mime, kind }>
 *     opts: { title, author, language, labels, date }  (für EPUB und HTML-Dokument)
 *   text ist immer die Code-Ansicht; html die formatierte Vorschau/Rich-Fassung (XHTML-Fragment); bytes nur bei EPUB.
 *   'pdf' hat kind 'print': die Datei erzeugt der Druckdialog des Browsers, hier steht nur der Text (Klartext-Fassung) bereit. */
import { mdToHtml, mdToPlain, headings } from './markdown.js';
import { extractTables, FORMATS } from './tabellen.js';
import { markdownToEpub } from './epub-schreiben.js';
import { escHtml, clean } from './text.js';

export const FORMAT_LIST = [
    { id: 'tsv', group: 'data', ext: 'tsv', mime: 'text/tab-separated-values', kind: 'text' },
    { id: 'csv', group: 'data', ext: 'csv', mime: 'text/csv', kind: 'text' },
    { id: 'asciiBox', group: 'data', ext: 'txt', mime: 'text/plain', kind: 'text' },
    { id: 'json', group: 'data', ext: 'json', mime: 'application/json', kind: 'text' },
    { id: 'yaml', group: 'data', ext: 'yaml', mime: 'text/yaml', kind: 'text' },
    { id: 'plaintext', group: 'office', ext: 'txt', mime: 'text/plain', kind: 'text' },
    { id: 'pdf', group: 'office', ext: 'pdf', mime: 'application/pdf', kind: 'print' },
    { id: 'epub', group: 'office', ext: 'epub', mime: 'application/epub+zip', kind: 'binary' },
    { id: 'htmlRich', group: 'office', ext: 'html', mime: 'text/html', kind: 'text' },
    { id: 'htmlRaw', group: 'office', ext: 'html', mime: 'text/html', kind: 'text' },
    { id: 'bbcode', group: 'office', ext: 'txt', mime: 'text/plain', kind: 'text' },
    { id: 'markdown', group: 'doc', ext: 'md', mime: 'text/markdown', kind: 'text' },
    { id: 'latex', group: 'doc', ext: 'tex', mime: 'application/x-tex', kind: 'text' },
    { id: 'typst', group: 'doc', ext: 'typ', mime: 'text/plain', kind: 'text' },
    { id: 'asciidoc', group: 'doc', ext: 'adoc', mime: 'text/asciidoc', kind: 'text' },
    { id: 'ditaxml', group: 'doc', ext: 'xml', mime: 'application/xml', kind: 'text' },
];

const PAGE_CSS = 'body{font-family:Georgia,serif;line-height:1.6;max-width:42em;margin:2em auto;padding:0 1em;color:#111}h1,h2,h3,h4{font-family:system-ui,sans-serif;line-height:1.25}table{border-collapse:collapse;width:100%}th,td{border:1px solid #888;padding:.3em .5em;text-align:left}th{background:#eee}pre{background:#f3f3f3;padding:.6em .8em;overflow:auto}code{font-family:monospace}blockquote{border-left:3px solid #999;margin-left:0;padding-left:1em;color:#333}img{max-width:100%}';

export async function convertMarkdown(md, id, opts = {}) {
    const meta = FORMAT_LIST.find(f => f.id === id);
    if (!meta) throw new Error('convert2: unbekanntes Format ' + id);
    md = clean(md, { citations: false });
    const html = mdToHtml(md, { labels: opts.labels });
    const out = { id, ext: meta.ext, mime: meta.mime, kind: meta.kind, html, text: '' };
    if (id === 'markdown') out.text = md;
    else if (id === 'plaintext' || id === 'pdf') out.text = mdToPlain(md);
    else if (id === 'htmlRich') out.text = html;
    else if (id === 'htmlRaw') {
        const t = opts.title || (headings(md)[0] || {}).text || 'Convert2';
        out.text = '<!DOCTYPE html>\n<html lang="' + escHtml(opts.language || 'de') + '">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>' + escHtml(t) + '</title>\n<style>' + PAGE_CSS + '</style>\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
    } else if (id === 'epub') {
        out.bytes = await markdownToEpub(md, opts);
        out.text = '';
    } else {
        out.text = FORMATS[id](extractTables(md), md);
    }
    out.text = out.text.replace(/^\n+|\s+$/g, '');
    return out;
}
