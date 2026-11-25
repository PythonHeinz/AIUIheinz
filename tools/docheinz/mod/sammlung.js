/* tools/docheinz/mod/sammlung.js – Markierungen und Notizen über alle Bücher auswerten (Insel-Modul, reine Funktionen, kein DOM).
 *   collect(books) -> [{ book: { id, title, author }, mark }] (Bücher mit Markierungen, je Buch nach Stelle sortiert; Bücher nach Titel)
 *   markTags(items) -> [{ tag, count }] (häufigste zuerst)
 *   filterItems(items, { q, color, tag, notesOnly, book }) -> neue Liste (color: 'y'|'g'|'b'|'p'|'' = alle; tag ohne Beachtung der Groß/Kleinschreibung)
 *   groupItems(items, by) -> [{ key, title, items }]; by: 'book' | 'tag' | 'color' (bei 'tag' erscheint eine Markierung unter jedem ihrer Schlagwörter, ohne Schlagwort unter '')
 *   toMarkdownAll(items, by, L, now) -> Text; L = { title, color: [4 Namen], note, ai, pageNote, untagged, count, by }
 *   countBy(items) -> { marks, notes, books, tags } */
import { COLORS, sortMarks } from './markierung.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFKC');
const squash = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

export function collect(books) {
    const items = [];
    const bs = (books || []).filter(b => Array.isArray(b.marks) && b.marks.length).slice().sort((a, b) => norm(a.title).localeCompare(norm(b.title), 'de'));
    for (const b of bs) for (const mark of sortMarks(b.marks)) items.push({ book: { id: b.id, title: b.title || '', author: b.author || '' }, mark });
    return items;
}
export function markTags(items) {
    const m = new Map();
    for (const { mark } of items) for (const t of mark.tags || []) { const k = norm(t), e = m.get(k); if (e) e.count++; else m.set(k, { tag: t, count: 1 }); }
    return [...m.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'de'));
}
export function filterItems(items, { q = '', color = '', tag = '', notesOnly = false, book = '' } = {}) {
    const s = norm(squash(q)), tg = norm(tag), ci = COLORS.indexOf(color);
    return items.filter(({ book: b, mark: m }) => {
        if (book && b.id !== book) return false;
        if (ci >= 0 && !m.pn && m.color !== ci) return false;
        if (ci >= 0 && m.pn) return false;
        if (notesOnly && !m.note) return false;
        if (tg && !(m.tags || []).some(x => norm(x) === tg)) return false;
        if (s && !(norm(m.text).includes(s) || norm(m.note).includes(s) || norm(b.title).includes(s) || (m.tags || []).some(x => norm(x).includes(s)))) return false;
        return true;
    });
}
export function groupItems(items, by = 'book') {
    const groups = new Map();
    const put = (key, title, it) => { if (!groups.has(key)) groups.set(key, { key, title, items: [] }); groups.get(key).items.push(it); };
    for (const it of items) {
        if (by === 'tag') { const tg = it.mark.tags || []; if (!tg.length) put('', '', it); else tg.forEach(t => put(norm(t), t, it)); }
        else if (by === 'color') put(it.mark.pn ? 'pn' : COLORS[it.mark.color], '', it);
        else put(it.book.id, it.book.title, it);
    }
    const out = [...groups.values()];
    if (by === 'tag') out.sort((a, b) => (a.key === '') - (b.key === '') || b.items.length - a.items.length || a.title.localeCompare(b.title, 'de'));
    if (by === 'color') out.sort((a, b) => ['y', 'g', 'b', 'p', 'pn'].indexOf(a.key) - ['y', 'g', 'b', 'p', 'pn'].indexOf(b.key));
    return out;
}
export function countBy(items) {
    return { marks: items.length, notes: items.filter(i => i.mark.note).length, books: new Set(items.map(i => i.book.id)).size, tags: markTags(items).length };
}
export function toMarkdownAll(items, by = 'book', L = {}, now = Date.now()) {
    const out = ['# ' + squash(L.title || 'Marks and notes')];
    const c = countBy(items);
    out.push('', (L.count || '{n} entries from {b} books').replace('{n}', c.marks).replace('{b}', c.books));
    for (const g of groupItems(items, by)) {
        const head = by === 'book' ? g.title : by === 'tag' ? (g.key === '' ? (L.untagged || 'Without keyword') : '#' + g.title) : g.key === 'pn' ? (L.pageNote || 'Page note') : ((L.color || [])[COLORS.indexOf(g.key)] || g.key);
        out.push('', '## ' + squash(head));
        for (const { book, mark: m } of g.items) {
            const src = [by === 'book' ? '' : squash(book.title), (L.chapter && L.chapter(book, m)) || ''].filter(Boolean).join(', ');
            const col = (L.color || [])[m.color], meta = [by === 'color' ? '' : m.pn ? '' : col, by === 'tag' ? '' : (m.tags || []).map(t => '#' + t).join(' ')].filter(Boolean).join(' ');
            if (m.pn) { if (m.text) out.push('', '> ' + squash(m.text) + ' …'); out.push('', '**' + (L.pageNote || 'Page note') + ':** ' + m.note.trim() + (src ? ' *(' + src + ')*' : '')); continue; }
            out.push('', m.text.split(/\n+/).map(s => '> ' + squash(s)).filter(s => s !== '> ').join('\n'));
            const tail = [src, meta].filter(Boolean).join(' · ');
            if (tail) out.push('', '— *' + tail + '*');
            if (m.note) out.push('', (m.ai ? '**' + (L.ai || 'AI') + (m.model ? ' (' + m.model + ')' : '') + ':** ' : '**' + (L.note || 'Note') + ':** ') + m.note.trim().replace(/\n{3,}/g, '\n\n'));
        }
    }
    return out.join('\n') + '\n';
}
