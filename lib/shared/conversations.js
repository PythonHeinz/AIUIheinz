/* lib/shared/conversations.js – one row of the saved-conversation list, used by the Dashboard and the Heinz Chat (docs/MODULE.md).
 * ES module, no dependencies, builds DOM only; the page decides texts, sub line, handlers and what happens on tap.
 * Row: dot/pin, title, sub line, "more" button, and five pills (rename, pin, copy, export, delete) with symbol and text.
 * Hooks for the page: data-open, data-more, data-act (ren|pin|cp|exp|del) and data-id on the elements; classes saved-item, sr, load, ttl-in, more, acts2 (lib/core.css). */

const ICONS = '/lib/icons.svg';

function icon(name, cls) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'i' + (cls === undefined ? ' sm' : (cls ? ' ' + cls : '')));
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', ICONS + '#i-' + name);
    svg.appendChild(use);
    return svg;
}

function el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
}

// o = { id, title, sub, pinned, current, selected, showMore, moreLabel, mode, modeColor, labels: { ren, pin, cp, exp, del } }
export function savedRow(o) {
    const row = el('div', 'saved-item' + (o.current ? ' cur' : '') + (o.selected ? ' sel' : ''), { 'data-row': o.id });
    if (o.mode) { row.setAttribute('data-mode', o.mode); if (o.modeColor) row.style.setProperty('--mc', o.modeColor); }
    const sr = el('div', 'sr');
    if (o.pinned) sr.appendChild(icon('pin', 'sm pinned'));
    const load = el('button', 'load', { type: 'button', 'data-open': o.id });
    const ttl = el('span', 'ttl-in'); ttl.textContent = o.title;
    const sub = el('small'); sub.textContent = o.sub;
    load.appendChild(ttl); load.appendChild(sub);
    sr.appendChild(load);
    if (o.showMore !== false) {
        const more = el('button', 'ibtn more', { type: 'button', 'data-more': o.id });
        if (o.moreLabel) more.setAttribute('aria-label', o.moreLabel);
        more.appendChild(icon('dots'));
        sr.appendChild(more);
    }
    const acts = el('div', 'acts2');
    [['ren', 'pencil'], ['pin', 'pin'], ['cp', 'copy'], ['exp', 'download'], ['del', 'trash']].forEach(function (a) {
        const del = a[0] === 'del', text = o.labels[a[0]];
        const b = el('button', 'pill' + (del ? ' danger del' : ''), { type: 'button', 'data-act': a[0], 'data-id': o.id, title: text });
        b.appendChild(icon(a[1]));
        const sp = el('span'); sp.textContent = text; b.appendChild(sp);
        acts.appendChild(b);
    });
    row.appendChild(sr); row.appendChild(acts);
    return row;
}
