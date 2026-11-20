/* tools/docheinz/mod/markierung.js – Markierungen und Notizen eines Buchs (Insel-Modul, reine Funktionen, kein DOM).
 * Eine Markierung hängt am Kapitel (ch) und an Zeichenpositionen im Kapiteltext (start, len; derselbe Text wie in mod/suche.js und beim Anspringen),
 * dazu das Zitat (text). Passt der Text an der Stelle nicht mehr (anderes Kapitelbild), wird das Zitat im Kapitel neu gesucht.
 *   COLORS                       ['y','g','b','p'] (gelb, grün, blau, rosa)
 *   makeMark({ ch, start, len, text, color, note, ai, model, now, id }) -> Markierung
 *   cleanMarks(list) -> geprüfte Liste (kaputte Einträge entfallen)
 *   addMark(list, m) -> neue Liste;  updateMark(list, id, patch);  removeMark(list, id)
 *   markAt(list, ch, offset) -> Markierung | null   (bei Überlappung die kürzeste)
 *   relocate(chapterText, mark) -> Startposition | -1
 *   sortMarks(list, order?) -> nach Kapitel und Stelle;  toMarkdown(rec, list, chTitle, L) -> Text */
export const COLORS = ['y', 'g', 'b', 'p'];
export const MAX_QUOTE = 2000, MAX_NOTE = 4000, MAX_MARKS = 2000;
const squash = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const int = (v, d = 0) => (Number.isFinite(+v) ? Math.max(0, Math.floor(+v)) : d);

let seq = 0;
const newId = (now) => 'm' + (now || Date.now()).toString(36) + (seq++ % 1296).toString(36);

export function makeMark({ ch, start, len, text, color = 0, note = '', ai = false, model = '', now = Date.now(), id = '' } = {}) {
    const q = String(text == null ? '' : text);
    const m = { id: id || newId(now), ch: int(ch), start: int(start), len: Math.min(int(len, q.length), MAX_QUOTE), text: q.slice(0, MAX_QUOTE), color: COLORS[color] ? color : 0, note: String(note || '').slice(0, MAX_NOTE), t: now };
    if (ai) { m.ai = true; if (model) m.model = String(model).slice(0, 120); }
    return m;
}
export function cleanMarks(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set(), out = [];
    for (const x of list) {
        if (!x || typeof x !== 'object' || typeof x.text !== 'string' || !x.text) continue;
        const m = makeMark({ ...x, now: Number.isFinite(+x.t) ? +x.t : Date.now() });
        if (!m.len || seen.has(m.id)) continue;
        seen.add(m.id); out.push(m);
        if (out.length >= MAX_MARKS) break;
    }
    return out;
}
export const addMark = (list, m) => list.concat([m]);
export const updateMark = (list, id, patch) => list.map(m => (m.id === id ? makeMark({ ...m, ...patch, id: m.id, now: m.t, ai: patch.ai != null ? patch.ai : m.ai }) : m));
export const removeMark = (list, id) => list.filter(m => m.id !== id);

export function markAt(list, ch, offset) {
    let best = null;
    for (const m of list) if (m.ch === ch && offset >= m.start && offset < m.start + m.len && (!best || m.len < best.len)) best = m;
    return best;
}
export function relocate(chapterText, mark) {
    const t = String(chapterText || '');
    if (t.slice(mark.start, mark.start + mark.len) === mark.text) return mark.start;
    let best = -1, i = -1;
    while ((i = t.indexOf(mark.text, i + 1)) >= 0) { if (best < 0 || Math.abs(i - mark.start) < Math.abs(best - mark.start)) best = i; if (i > mark.start) break; }
    return best;
}
export const sortMarks = (list) => list.slice().sort((a, b) => a.ch - b.ch || a.start - b.start || a.t - b.t);

// Markdown für Notiz-Programme: Titel, Autor, je Kapitel Zitate (Blockzitat) mit Notiz; L = { color: [4 Namen], note, ai, by, count }
export function toMarkdown(rec, list, chTitle, L) {
    const out = [];
    out.push('# ' + squash(rec && rec.title || ''));
    if (rec && rec.author) out.push('', '*' + squash(rec.author) + '*');
    const ms = sortMarks(list);
    if (L && L.count) out.push('', L.count.replace('{n}', ms.length));
    let cur = -1;
    for (const m of ms) {
        if (m.ch !== cur) { cur = m.ch; const t = squash(chTitle ? chTitle(m.ch) : ''); out.push('', '## ' + (t || (L && L.part ? L.part.replace('{n}', m.ch + 1) : String(m.ch + 1)))); }
        const col = L && L.color ? L.color[m.color] : '';
        out.push('', m.text.split(/\n+/).map(s => '> ' + squash(s)).filter(s => s !== '> ').join('\n') + (col ? ' *(' + col + ')*' : ''));
        if (m.note) out.push('', (m.ai ? '**' + ((L && L.ai) || 'AI') + (m.model ? ' (' + m.model + ')' : '') + ':** ' : '**' + ((L && L.note) || 'Note') + ':** ') + m.note.trim().replace(/\n{3,}/g, '\n\n'));
    }
    return out.join('\n') + '\n';
}
