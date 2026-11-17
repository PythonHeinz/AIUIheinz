/* tools/convert2/mod/epub-lesen.js – EPUB lesen (Insel-Modul, keine Oberfläche). Braucht DOMParser (Browser) und zip.js.
 *   readEpub(bytes) -> Promise<Book>
 *     Book = { metadata: { title, creator, language, identifier, date, publisher },
 *              toc: [{ title, href, level }]        Inhaltsverzeichnis (nav.xhtml, sonst toc.ncx), href relativ zum Paket ohne Anker, mit anchor
 *              chapters: [{ id, href, title }]      Lesereihenfolge (Spine)
 *              chapterHtml(i) -> Promise<string>    XHTML des Kapitels (Bilder bleiben relativ)
 *              chapterBody(i) -> Promise<string>    nur der Inhalt von <body>, Bilder als data:-URLs (lokal, offline)
 *              resource(href) -> Promise<Uint8Array>, mediaType(href) -> string, dataUrl(href) -> Promise<string> }
 *   epubToMarkdown(book, opts?) -> Promise<string>   alle Kapitel als Markdown (opts.title: Buchtitel als Überschrift voranstellen)
 * Nicht unterstützt: DRM/verschlüsselte Dateien, feste Layouts werden als Text gelesen. */
import { readZip } from './zip.js';
import { htmlToMarkdown } from './html.js';

const NS_CONTAINER = 'urn:oasis:names:tc:opendocument:xmlns:container';
const dirOf = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');

function resolve(base, href) {
    const parts = (dirOf(base) + href).split('/');
    const out = [];
    for (const p of parts) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
    return out.join('/');
}
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };
const xml = (s, type = 'application/xml') => {
    const d = new DOMParser().parseFromString(s, type);
    if (d.getElementsByTagName('parsererror').length) throw new Error('epub: XML nicht lesbar');
    return d;
};
const byName = (root, name) => Array.from(root.getElementsByTagNameNS('*', name));
const text = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

export async function readEpub(bytes) {
    const zip = await readZip(bytes);
    if (!zip.has('META-INF/container.xml')) throw new Error('epub: META-INF/container.xml fehlt (kein EPUB)');
    if (zip.has('META-INF/encryption.xml') && /EncryptedData/.test(await zip.text('META-INF/encryption.xml')) && !/IDPF|font/i.test(await zip.text('META-INF/encryption.xml'))) {
        throw new Error('epub: verschlüsselt (DRM) wird nicht unterstützt');
    }
    const container = xml(await zip.text('META-INF/container.xml'));
    const rf = byName(container, 'rootfile')[0];
    if (!rf || !rf.getAttribute('full-path')) throw new Error('epub: Paketdatei nicht angegeben');
    const opfPath = rf.getAttribute('full-path');
    const opf = xml(await zip.text(opfPath));

    const md = byName(opf, 'metadata')[0] || opf;
    const dc = n => text(byName(md, n)[0]);
    const metadata = { title: dc('title'), creator: dc('creator'), language: dc('language'), identifier: dc('identifier'), date: dc('date'), publisher: dc('publisher') };

    const manifest = new Map();
    byName(opf, 'item').forEach(it => manifest.set(it.getAttribute('id'), { href: resolve(opfPath, safeDecode(it.getAttribute('href') || '')), type: it.getAttribute('media-type') || '', props: (it.getAttribute('properties') || '').split(/\s+/) }));
    const types = new Map();
    manifest.forEach(m => types.set(m.href, m.type));

    const chapters = [];
    byName(opf, 'itemref').forEach(r => {
        const m = manifest.get(r.getAttribute('idref'));
        if (m && /xhtml|html/.test(m.type) && zip.has(m.href)) chapters.push({ id: r.getAttribute('idref'), href: m.href, title: '' });
    });

    // Inhaltsverzeichnis
    const toc = [];
    const navItem = [...manifest.values()].find(m => m.props.includes('nav'));
    if (navItem && zip.has(navItem.href)) {
        const nav = xml(await zip.text(navItem.href), 'text/html');
        const navEl = Array.from(nav.querySelectorAll('nav')).find(n => (n.getAttribute('epub:type') || n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') || '').split(/\s+/).includes('toc')) || nav.querySelector('nav');
        const walk = (ol, level) => Array.from(ol.children).forEach(li => {
            if (li.tagName.toLowerCase() !== 'li') return;
            const a = li.querySelector(':scope > a, :scope > span');
            if (a) { const h = a.getAttribute('href'); toc.push({ title: text(a), href: h ? resolve(navItem.href, safeDecode(h)) : '', level }); }
            const sub = li.querySelector(':scope > ol');
            if (sub) walk(sub, level + 1);
        });
        const top = navEl && navEl.querySelector('ol');
        if (top) walk(top, 1);
    }
    if (!toc.length) {
        const ncxId = (byName(opf, 'spine')[0] || { getAttribute: () => null }).getAttribute('toc');
        const ncxItem = manifest.get(ncxId) || [...manifest.values()].find(m => m.type === 'application/x-dtbncx+xml');
        if (ncxItem && zip.has(ncxItem.href)) {
            const ncx = xml(await zip.text(ncxItem.href));
            const walk = (parent, level) => Array.from(parent.children).forEach(np => {
                if (np.localName !== 'navPoint') return;
                const c = byName(np, 'content')[0];
                toc.push({ title: text(byName(np, 'text')[0]), href: c ? resolve(ncxItem.href, safeDecode(c.getAttribute('src') || '')) : '', level });
                walk(np, level + 1);
            });
            const nm = byName(ncx, 'navMap')[0];
            if (nm) walk(nm, 1);
        }
    }
    chapters.forEach(c => { const t = toc.find(x => x.href.split('#')[0] === c.href); c.title = t ? t.title : ''; });

    const mediaType = href => types.get(href) || ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }[(href.split('.').pop() || '').toLowerCase()] || 'application/octet-stream');
    const resource = href => zip.read(href);
    const dataUrl = async href => {
        const u = await resource(href);
        let bin = '';
        for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return 'data:' + mediaType(href) + ';base64,' + btoa(bin);
    };
    const chapterHtml = i => zip.text(chapters[i].href);
    const chapterBody = async i => {
        const doc = new DOMParser().parseFromString(await chapterHtml(i), 'text/html');
        doc.querySelectorAll('script, style, link, iframe, object, embed, form').forEach(n => n.remove());
        doc.querySelectorAll('*').forEach(n => Array.from(n.attributes).forEach(a => { if (/^on/i.test(a.name)) n.removeAttribute(a.name); }));
        for (const img of Array.from(doc.querySelectorAll('img'))) {
            const src = img.getAttribute('src') || '';
            if (/^data:image\//i.test(src)) continue;
            const href = resolve(chapters[i].href, safeDecode(src.split('#')[0]));
            if (zip.has(href) && /^image\/(png|jpeg|gif|webp)$/.test(mediaType(href))) img.setAttribute('src', await dataUrl(href));
            else img.remove();
        }
        doc.querySelectorAll('a[href]').forEach(a => { if (/^\s*javascript:/i.test(a.getAttribute('href'))) a.removeAttribute('href'); });
        return doc.body ? doc.body.innerHTML : '';
    };
    return { metadata, toc, chapters, chapterHtml, chapterBody, resource, mediaType, dataUrl };
}

export async function epubToMarkdown(book, opts = {}) {
    const out = [];
    if (opts.title && book.metadata.title) out.push('# ' + book.metadata.title.replace(/[*`~\\]/g, ''));
    for (let i = 0; i < book.chapters.length; i++) {
        const md = htmlToMarkdown(await book.chapterBody(i));
        if (md) out.push(md);
    }
    return out.join('\n\n').trim();
}
