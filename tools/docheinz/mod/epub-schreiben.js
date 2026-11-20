/* KOPIE aus tools/convert2/mod (Entscheidung A, 17.11.2026): Pflege in beiden Werkzeugen, bei Änderungen beide Stellen abgleichen. */
/* tools/convert2/mod/epub-schreiben.js – gültiges EPUB 3 aus Markdown erzeugen, ohne Bibliothek und ohne Netz (Insel-Modul, keine Oberfläche).
 *   markdownToEpub(md, opts?) -> Promise<Uint8Array>
 *       opts: { title, author, language ('de'), identifier, date (Date), labels (Hinweisblöcke), splitLevel (1|2|0) }
 *   Aufbau: mimetype (als Erstes, unkomprimiert), META-INF/container.xml, OEBPS/content.opf, nav.xhtml (verschachteltes Inhaltsverzeichnis aus den Überschriften),
 *           toc.ncx (für alte Lesegeräte), style.css, ein Kapitel je Überschrift der Ebene 1 (sonst 2; ohne Überschriften ein Kapitel), Bilder aus data:image-URLs unter OEBPS/images/.
 *   Bilder mit https-Adresse werden nicht geladen (offline): an ihrer Stelle steht der Alternativtext. */
import { writeZip } from './zip.js';
import { mdToHtml, headings } from './markdown.js';
import { escHtml } from './text.js';

const CSS = `body { font-family: serif; line-height: 1.55; margin: 0 4%; color: #111; }
h1, h2, h3, h4, h5, h6 { font-family: sans-serif; line-height: 1.25; margin: 1.2em 0 .5em; page-break-after: avoid; }
p { margin: 0 0 .8em; }
img { max-width: 100%; height: auto; }
table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: .92em; }
th, td { border: 1px solid #777; padding: .3em .5em; text-align: left; vertical-align: top; }
th { background: #eee; }
pre { background: #f3f3f3; padding: .6em .8em; white-space: pre-wrap; font-size: .85em; }
code { font-family: monospace; font-size: .92em; }
blockquote { border-left: 3px solid #999; margin: 1em 0; padding: 0 0 0 .8em; color: #333; }
blockquote.callout-note { border-left-color: #3b82f6; }
blockquote.callout-warning { border-left-color: #f59e0b; }
blockquote.callout-tip { border-left-color: #10b981; }
hr { border: 0; border-top: 1px solid #999; margin: 1.5em 0; }
`;

const XML = '<?xml version="1.0" encoding="UTF-8"?>\n';
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const plain = h => unesc(h.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function uuid() {
    const b = new Uint8Array(16);
    (globalThis.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => { b[i] = (Math.random() * 256) | 0; });
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function b64(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
const EXT = { png: 'png', jpeg: 'jpg', jpg: 'jpg', gif: 'gif', webp: 'webp' };
const MIME = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

function pickSplit(md, want) {
    if (want === 0) return 0;
    const lv = headings(md).map(h => h.level);
    if (want) return want;
    const min = lv.length ? Math.min(...lv) : 0;
    return min === 1 || min === 2 ? min : 0;
}

function splitChapters(md, level) {
    const lines = md.replace(/\r\n?/g, '\n').split('\n');
    const res = [{ lines: [] }];
    let fence = null;
    for (const l of lines) {
        const f = l.match(/^\s{0,3}(```+|~~~+)/);
        if (f) fence = fence ? (f[1][0] === fence ? null : fence) : f[1][0];
        if (level && !fence && !f && new RegExp('^\\s{0,3}#{1,' + level + '}\\s+\\S').test(l)) res.push({ lines: [l] });
        else res[res.length - 1].lines.push(l);
    }
    return res.map(c => c.lines.join('\n')).filter(t => t.trim());
}

export async function markdownToEpub(md, opts = {}) {
    md = String(md).replace(/\r\n?/g, '\n');
    const lang = opts.language || 'de';
    const date = opts.date || new Date();
    const hs = headings(md);
    const title = (opts.title || (hs[0] && hs[0].text) || 'Convert2').trim();
    const id = 'urn:uuid:' + (opts.identifier || uuid());
    const parts = splitChapters(md, pickSplit(md, opts.splitLevel));
    if (!parts.length) parts.push('# ' + title);

    const images = [];
    const chapters = parts.map((p, n) => {
        let html = mdToHtml(p, { labels: opts.labels });
        html = html.replace(/<img src="([^"]*)" alt="([^"]*)" \/>/g, (m, src, alt) => {
            const d = src.match(/^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=]+)$/i);
            if (!d) return '<span class="alt">' + alt + '</span>';
            const ext = EXT[d[1].toLowerCase()];
            const name = 'img' + String(images.length + 1).padStart(3, '0') + '.' + ext;
            images.push({ name, data: b64(d[2]), type: MIME[ext] });
            return '<img src="images/' + name + '" alt="' + alt + '" />';
        });
        const toc = [];
        let k = 0;
        html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (m, lv, inner) => {
            const hid = 'c' + (n + 1) + '-' + (++k);
            toc.push({ level: +lv, id: hid, text: plain(inner) });
            return '<h' + lv + ' id="' + hid + '">' + inner + '</h' + lv + '>';
        });
        const file = 'chapter-' + String(n + 1).padStart(3, '0') + '.xhtml';
        return { file, html, toc, title: (toc[0] && toc[0].text) || title };
    });

    const xhtml = (t, body) => XML + '<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="' + escHtml(lang) + '" xml:lang="' + escHtml(lang) + '">\n<head>\n<meta charset="utf-8" />\n<title>' + escHtml(t) + '</title>\n<link rel="stylesheet" type="text/css" href="style.css" />\n</head>\n<body>\n' + body + '\n</body>\n</html>\n';

    // Inhaltsverzeichnis: je Kapitel der erste Eintrag, tiefere Überschriften verschachtelt
    const flat = [];
    chapters.forEach(c => { if (!c.toc.length) flat.push({ level: 1, href: c.file, text: c.title }); c.toc.forEach((t, i) => flat.push({ level: t.level, href: c.file + (i === 0 ? '' : '#' + t.id), text: t.text })); });
    const tree = [];
    const path = [{ level: 0, children: tree }];
    flat.forEach(e => {
        while (path.length > 1 && path[path.length - 1].level >= e.level) path.pop();
        const node = { ...e, children: [] };
        path[path.length - 1].children.push(node);
        path.push(node);
    });
    const ol = (nodes) => '<ol>' + nodes.map(n => '<li><a href="' + n.href + '">' + escHtml(n.text) + '</a>' + (n.children.length ? ol(n.children) : '') + '</li>').join('') + '</ol>';
    const nav = xhtml(title, '<nav epub:type="toc" id="toc"><h1>' + escHtml(opts.tocTitle || (lang.startsWith('de') ? 'Inhaltsverzeichnis' : 'Contents')) + '</h1>\n' + ol(tree) + '\n</nav>');

    let order = 0;
    const ncxPoints = (nodes) => nodes.map(n => '<navPoint id="np' + (++order) + '" playOrder="' + order + '"><navLabel><text>' + escHtml(n.text) + '</text></navLabel><content src="' + n.href + '"/>' + ncxPoints(n.children) + '</navPoint>').join('');
    const ncx = XML + '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="' + escHtml(id) + '"/></head><docTitle><text>' + escHtml(title) + '</text></docTitle><navMap>' + ncxPoints(tree) + '</navMap></ncx>';

    const modified = date.toISOString().replace(/\.\d+Z$/, 'Z');
    const opf = XML + '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="' + escHtml(lang) + '">\n<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
        '<dc:identifier id="pub-id">' + escHtml(id) + '</dc:identifier>\n<dc:title>' + escHtml(title) + '</dc:title>\n<dc:language>' + escHtml(lang) + '</dc:language>\n' +
        (opts.author ? '<dc:creator>' + escHtml(opts.author) + '</dc:creator>\n' : '') +
        '<meta property="dcterms:modified">' + modified + '</meta>\n</metadata>\n<manifest>\n' +
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n<item id="css" href="style.css" media-type="text/css"/>\n' +
        chapters.map((c, i) => '<item id="ch' + (i + 1) + '" href="' + c.file + '" media-type="application/xhtml+xml"/>').join('\n') + '\n' +
        images.map((im, i) => '<item id="im' + (i + 1) + '" href="images/' + im.name + '" media-type="' + im.type + '"/>').join('\n') + (images.length ? '\n' : '') +
        '</manifest>\n<spine toc="ncx">\n' + chapters.map((c, i) => '<itemref idref="ch' + (i + 1) + '"/>').join('\n') + '\n</spine>\n</package>\n';

    const entries = [
        { name: 'mimetype', data: 'application/epub+zip', store: true },
        { name: 'META-INF/container.xml', data: XML + '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>\n' },
        { name: 'OEBPS/content.opf', data: opf },
        { name: 'OEBPS/nav.xhtml', data: nav },
        { name: 'OEBPS/toc.ncx', data: ncx },
        { name: 'OEBPS/style.css', data: CSS },
        ...chapters.map(c => ({ name: 'OEBPS/' + c.file, data: xhtml(c.title, c.html) })),
        ...images.map(im => ({ name: 'OEBPS/images/' + im.name, data: im.data, store: true })),
    ];
    return writeZip(entries, { date });
}
