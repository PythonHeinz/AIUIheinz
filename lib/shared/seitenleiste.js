/* lib/shared/seitenleiste.js – Kragen am linken Rand mit senkrechter Leiste voller runder Knöpfe (Heinz Chat und Dashboard).
 * ES module (docs/MODULE.md). Leaf: importiert nichts. Form nach tools/design/modus.html (Halbkreis-Kragen, Tippen öffnet die Leiste); die Modusleiste des Dashboards bleibt davon unberührt.
 *   baueSeitenleiste({ label }) -> { punkt(o), host(), oeffne(), schliesse(), offen(), markiere(an) }
 *   punkt({ id, icon, titel, unter, klick }) -> { el, setze(titel, unter), an(bool) }   Zeile mit rundem Symbol, Titel und grauer Zeile für den Zustand; Tippen ruft klick().
 *   punkt({ id }).el bleibt leer, wenn der Aufrufer die Zeile selbst baut (z. B. der Wissensschalter): `host()` der Zeile = element.
 * Die Leiste schließt bei Tipp daneben und Escape; sie ruft nichts auf, was die Seiten nicht hereinreichen. */

const NS = 'http://www.w3.org/2000/svg';
function symbol(id, cls) {
    const svg = document.createElementNS(NS, 'svg'), use = document.createElementNS(NS, 'use');
    svg.setAttribute('class', cls || 'i'); use.setAttribute('href', '/lib/icons.svg#' + id); svg.appendChild(use); return svg;
}
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }

export function baueSeitenleiste(o) {
    o = o || {};
    const kragen = el('button', 'sl-kragen'); kragen.type = 'button'; kragen.setAttribute('aria-label', o.label || 'Tools'); kragen.setAttribute('aria-expanded', 'false');
    kragen.appendChild(symbol('i-chev-r', 'i sm'));
    const scrim = el('div', 'sl-scrim');
    const leiste = el('div', 'sl-leiste'); leiste.setAttribute('role', 'toolbar'); leiste.setAttribute('aria-label', o.label || 'Tools');
    document.body.append(kragen, scrim, leiste);
    const offen = () => leiste.classList.contains('open');
    function oeffne(b) {
        b = b !== false; leiste.classList.toggle('open', b); scrim.classList.toggle('open', b); kragen.setAttribute('aria-expanded', b ? 'true' : 'false'); kragen.classList.toggle('open', b);
    }
    kragen.addEventListener('click', () => oeffne(!offen()));
    scrim.addEventListener('click', () => oeffne(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && offen() && !document.querySelector('.wsw-panel:not([hidden])')) oeffne(false); });
    return {
        host: () => leiste, oeffne, schliesse: () => oeffne(false), offen,
        markiere(an) { kragen.classList.toggle('on', !!an); },
        punkt(p) {
            const zeile = el('div', 'sl-punkt'); zeile.dataset.id = p.id || '';
            if (p.icon) {
                const b = el('button', 'sl-zeile'); b.type = 'button';
                const tile = el('span', 'sl-tile'); tile.appendChild(symbol(p.icon));
                const tx = el('span', 'sl-tx'), t1 = el('b', '', p.titel || ''), t2 = el('small', '', p.unter || ''); tx.append(t1, t2);
                b.append(tile, tx); zeile.appendChild(b);
                b.addEventListener('click', () => { if (p.klick) p.klick(); });
                leiste.appendChild(zeile);
                return { el: zeile, setze(titel, unter) { t1.textContent = titel; t2.textContent = unter || ''; }, an(x) { zeile.classList.toggle('on', !!x); } };
            }
            leiste.appendChild(zeile);
            return { el: zeile, setze() {}, an(x) { zeile.classList.toggle('on', !!x); } };
        }
    };
}
