/* tools/docheinz/mod/sauber.js – Buchinhalt bereinigen (Insel-Modul, keine Oberfläche). Braucht DOMParser (Browser).
 * Buchinhalt ist fremd: nur eine Positivliste von Elementen und Attributen kommt durch. Keine Skripte, kein eigenes Buch-CSS (class und style fallen weg),
 * keine externen Ressourcen (Bilder nur als data:image), keine Links nach außen (nur Text), innere Verweise werden zu data-go.
 *   sauber(html, { base }) -> string   bereinigtes HTML (Inhalt von <body>); base = Pfad des Kapitels im Buch, löst relative Verweise auf
 *   plain(html) -> string              reiner Text (für Länge und Suche)
 *   resolvePath(base, href) -> string  Pfad relativ zu base ohne ../ */
const TAGS = new Set(('a abbr article aside b blockquote br caption cite code col colgroup dd del details dfn div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img ins kbd li mark nav ol p pre q rp rt ruby s samp section small span strong sub summary sup table tbody td tfoot th thead tr u ul var wbr').split(' '));
const DROP = new Set('script style link iframe object embed form input button select textarea svg math audio video source track canvas base meta head title noscript template applet frame frameset'.split(' '));
const KEEP = ['id', 'title', 'lang', 'dir', 'colspan', 'rowspan', 'alt'];
const IMG_OK = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;

export function resolvePath(base, href) {
    const dir = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '';
    const out = [];
    for (const p of (dir + href).split('/')) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
    return out.join('/');
}
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };

export function sauber(html, opts = {}) {
    const base = opts.base || '';
    const src = new DOMParser().parseFromString(String(html), 'text/html');
    const dst = new DOMParser().parseFromString('<!DOCTYPE html><body></body>', 'text/html');
    walk(src.body || src.documentElement, dst.body, dst, base);
    return dst.body.innerHTML;
}

function walk(from, to, doc, base) {
    for (const n of Array.from(from.childNodes)) {
        if (n.nodeType === 3) { to.appendChild(doc.createTextNode(n.nodeValue)); continue; }
        if (n.nodeType !== 1) continue;
        const tag = n.localName.toLowerCase();
        if (DROP.has(tag)) continue;
        if (!TAGS.has(tag)) { walk(n, to, doc, base); continue; }
        if (tag === 'img') {
            const s = (n.getAttribute('src') || '').trim();
            if (IMG_OK.test(s)) { const e = doc.createElement('img'); e.setAttribute('src', s.replace(/\s+/g, '')); if (n.getAttribute('alt')) e.setAttribute('alt', n.getAttribute('alt')); to.appendChild(e); }
            else if (n.getAttribute('alt')) to.appendChild(doc.createTextNode(n.getAttribute('alt')));
            continue;
        }
        if (tag === 'a') {
            const h = (n.getAttribute('href') || '').trim();
            let go = '';
            if (h.startsWith('#')) go = base + '#' + safeDecode(h.slice(1));
            else if (h && !/^[a-z][a-z0-9+.-]*:/i.test(h)) { const [p, a] = h.split('#'); go = (p ? resolvePath(base, safeDecode(p)) : base) + (a ? '#' + safeDecode(a) : ''); }
            if (!go) { walk(n, to, doc, base); continue; }       // Link nach außen: nur der Text bleibt
            const e = doc.createElement('a');
            e.setAttribute('data-go', go); e.setAttribute('role', 'link'); e.setAttribute('tabindex', '0');
            if (n.getAttribute('id')) e.setAttribute('id', n.getAttribute('id'));
            const et = n.getAttribute('epub:type'); if (et) e.setAttribute('data-etype', et.replace(/[^\w -]/g, ''));
            walk(n, e, doc, base);
            to.appendChild(e);
            continue;
        }
        const e = doc.createElement(tag);
        for (const a of KEEP) if (n.hasAttribute(a) && !(a === 'alt')) e.setAttribute(a, n.getAttribute(a));
        const et = n.getAttribute('epub:type'); if (et) e.setAttribute('data-etype', et.replace(/[^\w -]/g, ''));
        walk(n, e, doc, base);
        to.appendChild(e);
    }
}

export function plain(html) {
    const d = new DOMParser().parseFromString(String(html), 'text/html');
    d.querySelectorAll('script, style').forEach(n => n.remove());
    return (d.body ? d.body.textContent : '').replace(/\s+/g, ' ').trim();
}
