/* tools/docheinz/mod/bibliothek.js – Logik der Bibliothek ohne Oberfläche (Insel-Modul, reine Funktionen, Node-testbar).
 *   newId() -> string; signature(name, size) -> string (erkennt dieselbe Datei)
 *   makeRecord(source, { name, size, lens, now }) -> Datensatz für db.put
 *   percent(rec, ch, frac) -> 0..100 (nach Textlänge der Kapitel gewichtet); position(rec) -> { ch, frac }
 *   filterSort(list, query, sort) -> neue Liste; sort: 'recent' | 'title' | 'author' | 'added' | 'progress'
 *   initial(title) -> Buchstabe fürs Platzhalter-Cover; hue(title) -> 0..359 */
export function newId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
export const signature = (name, size) => String(name).toLowerCase() + '|' + size;

export function makeRecord(source, { name, size, lens, now }) {
    const m = source.metadata;
    return {
        id: newId(), title: (m.title || name || '').trim() || name, author: (m.creator || '').trim(), language: (m.language || '').trim(),
        format: source.format, name, size, sig: signature(name, size), added: now || Date.now(), lastRead: 0,
        chapters: source.chapters.length, lens: lens || [], toc: source.toc.map(t => ({ title: t.title, href: t.href, level: t.level })),
        ch: 0, frac: 0, done: false,
    };
}

export function percent(rec, ch, frac) {
    const lens = rec.lens || [];
    const n = rec.chapters || lens.length || 1;
    ch = Math.max(0, Math.min(n - 1, ch | 0));
    frac = Math.max(0, Math.min(1, +frac || 0));
    const total = lens.reduce((a, b) => a + b, 0);
    if (!total) return Math.round(((ch + frac) / n) * 100);
    let before = 0;
    for (let i = 0; i < ch; i++) before += lens[i] || 0;
    return Math.max(0, Math.min(100, Math.round(((before + frac * (lens[ch] || 0)) / total) * 100)));
}
export const position = rec => ({ ch: rec.ch | 0, frac: +rec.frac || 0 });

const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
export function filterSort(list, query = '', sort = 'recent') {
    const q = norm(query).trim();
    let out = list.filter(b => !q || norm(b.title).includes(q) || norm(b.author).includes(q));
    const cmpText = (a, b, k) => norm(a[k]).localeCompare(norm(b[k]), 'de') || a.added - b.added;
    out = out.slice().sort((a, b) => {
        if (sort === 'title') return cmpText(a, b, 'title');
        if (sort === 'author') return cmpText(a, b, 'author') || cmpText(a, b, 'title');
        if (sort === 'added') return b.added - a.added;
        if (sort === 'progress') return percent(b, b.ch, b.frac) - percent(a, a.ch, a.frac) || b.added - a.added;
        return (b.lastRead || 0) - (a.lastRead || 0) || b.added - a.added;   // recent: zuletzt gelesen, dann zuletzt hinzugefügt
    });
    return out;
}
export const initial = title => { const m = String(title || '').trim().match(/\p{L}|\p{N}/u); return m ? m[0].toUpperCase() : '·'; };
export function hue(title) { let h = 0; for (const c of String(title)) h = (h * 31 + c.codePointAt(0)) % 360; return h; }
