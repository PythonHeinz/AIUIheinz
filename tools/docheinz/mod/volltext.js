/* tools/docheinz/mod/volltext.js – Volltextsuche über mehrere Bücher (Insel-Modul, reine Funktionen, kein DOM, kein Netz).
 *   cacheKey(rec)                       -> Schlüssel, an dem man erkennt, ob der gespeicherte Text noch zum Buch passt (Signatur + Zahl erkannter OCR-Seiten)
 *   searchBook(book, query, opts?)      -> { count, hits[] } | null    book = { chapters: [Text je Kapitel] }; hits wie findAll (ch, start, len, before, hit, after)
 *   rankBooks(list)                     -> nach Trefferzahl absteigend, dann Titel
 * Die Positionen (ch, start) sind Zeichenpositionen im Kapiteltext – dieselbe Zählung wie die Suche im Leser, damit der Sprung zur Stelle trifft. */
import { findAll, normalizeQuery } from './suche.js';

export const MIN_QUERY = 2;
export const cacheKey = rec => String(rec && rec.sig || '') + ':' + String(rec && rec.ocr ? rec.ocr.length : 0);

export function searchBook(book, query, { perBook = 5, ctx = 45 } = {}) {
    const q = normalizeQuery(query);
    if (q.length < MIN_QUERY || !book || !Array.isArray(book.chapters)) return null;
    let count = 0; const hits = [];
    book.chapters.forEach((text, ch) => {
        const all = findAll(String(text || ''), q, { max: 5000, ctx });
        count += all.length;
        for (const h of all) { if (hits.length >= perBook) break; hits.push({ ch, start: h.start, len: h.len, before: h.before, hit: h.hit, after: h.after }); }
    });
    return count ? { count, hits } : null;
}
export const rankBooks = list => list.slice().sort((a, b) => b.count - a.count || String(a.title).localeCompare(String(b.title)));
