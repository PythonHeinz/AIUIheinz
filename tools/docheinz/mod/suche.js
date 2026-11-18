/* tools/docheinz/mod/suche.js – Suche im Buchtext (Insel-Modul, reine Funktionen, kein DOM).
 *   normalizeQuery(s) -> getrimmt, Leerraum zu einem Leerzeichen
 *   findAll(text, query, { max, ctx, offset }) -> [{ start, len, before, hit, after }]   Treffer ohne Rücksicht auf Groß-/Kleinschreibung, nicht überlappend,
 *       start = Zeichenposition im Text (plus offset), before/after = Umgebung (ctx Zeichen, Leerraum zusammengefasst)
 * Begrenzung: höchstens max Treffer (Standard 60). */
export const normalizeQuery = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const squash = s => s.replace(/\s+/g, ' ');

export function findAll(text, query, { max = 60, ctx = 40, offset = 0 } = {}) {
    const q = normalizeQuery(query).toLowerCase();
    const out = [];
    if (!q) return out;
    const low = String(text).toLowerCase();
    if (low.length !== String(text).length) return out;      // seltene Schreibungen, deren Kleinschreibung die Länge ändert: keine falschen Positionen
    let i = 0;
    while (out.length < max) {
        const k = low.indexOf(q, i);
        if (k < 0) break;
        let b = text.slice(Math.max(0, k - ctx), k), a = text.slice(k + q.length, k + q.length + ctx);
        out.push({ start: k + offset, len: q.length, before: (k - ctx > 0 ? '… ' : '') + squash(b).replace(/^ /, ''), hit: text.slice(k, k + q.length), after: squash(a).replace(/ $/, '') + (k + q.length + ctx < text.length ? ' …' : '') });
        i = k + q.length;
    }
    return out;
}
