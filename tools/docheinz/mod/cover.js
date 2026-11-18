/* tools/docheinz/mod/cover.js – Titelbild eines EPUB finden (Insel-Modul, keine Oberfläche, kein Netz). Braucht DOMParser (Browser) und zip.js.
 *   findCover(bytes) -> Promise<{ bytes: Uint8Array, type } | null>   das Bild laut Paketdatei (cover-image, meta „cover“, guide „cover“, sonst Dateiname mit „cover“)
 *   COVER_TYPES: erlaubte Bildarten (png, jpeg, gif, webp; kein SVG)
 * Fehler und fehlende Bilder ergeben null, nie eine Ausnahme. */
import { readZip } from './zip.js';

export const COVER_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const TYPE_BY_EXT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const dirOf = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };
function resolve(base, href) {
    const out = [];
    for (const p of (dirOf(base) + href).split('/')) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
    return out.join('/');
}
const byName = (root, name) => Array.from(root.getElementsByTagNameNS('*', name));
const extType = href => TYPE_BY_EXT[(href.split('.').pop() || '').toLowerCase()] || '';

export async function findCover(bytes) {
    try {
        const zip = await readZip(bytes);
        if (!zip.has('META-INF/container.xml')) return null;
        const xml = s => { const d = new DOMParser().parseFromString(s, 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error('xml'); return d; };
        const rf = byName(xml(await zip.text('META-INF/container.xml')), 'rootfile')[0];
        if (!rf) return null;
        const opfPath = rf.getAttribute('full-path');
        const opf = xml(await zip.text(opfPath));
        const items = byName(opf, 'item').map(it => ({
            id: it.getAttribute('id') || '', href: resolve(opfPath, safeDecode(it.getAttribute('href') || '')),
            type: it.getAttribute('media-type') || '', props: (it.getAttribute('properties') || '').split(/\s+/),
        }));
        const isImg = it => it && (COVER_TYPES.includes(it.type) || (!it.type && extType(it.href)));
        const cands = [];
        cands.push(items.find(it => it.props.includes('cover-image')));
        const meta = byName(opf, 'meta').find(m => m.getAttribute('name') === 'cover');
        if (meta) cands.push(items.find(it => it.id === meta.getAttribute('content')));
        byName(opf, 'reference').filter(r => (r.getAttribute('type') || '') === 'cover').forEach(r => {
            const href = resolve(opfPath, safeDecode((r.getAttribute('href') || '').split('#')[0]));
            cands.push({ href, type: extType(href) || '', page: true });
        });
        cands.push(items.find(it => isImg(it) && /cover|titel|title/i.test(it.id + ' ' + it.href)));
        for (const c of cands) {
            if (!c || !zip.has(c.href)) continue;
            let href = c.href, type = c.type;
            if (c.page || /xhtml|html/.test(type) || !type) {
                if (extType(href)) type = extType(href);
                else {          // Titelseite: erstes Bild darin
                    const doc = new DOMParser().parseFromString(await zip.text(href), 'text/html');
                    const el = doc.querySelector('img[src], image');
                    const src = el && (el.getAttribute('src') || el.getAttribute('xlink:href') || el.getAttribute('href'));
                    if (!src || /^data:/i.test(src)) continue;
                    href = resolve(href, safeDecode(src.split('#')[0]));
                    type = (items.find(it => it.href === href) || {}).type || extType(href);
                }
            }
            if (!zip.has(href) || !COVER_TYPES.includes(type || extType(href))) continue;
            const data = await zip.read(href);
            if (data && data.length > 100) return { bytes: data, type: type || extType(href) };
        }
        return null;
    } catch { return null; }
}
