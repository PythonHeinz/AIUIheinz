/* tools/docheinz/mod/ki.js – Aufträge an das Sprachmodell zu einem markierten Abschnitt (Insel-Modul, reine Funktionen, kein Netz).
 *   KINDS = ['explain', 'summary']
 *   clip(text, max?) -> { text, clipped }      Leerraum zusammenfassen, auf max Zeichen kürzen (Standard 6000)
 *   buildRequest(kind, passage, { lang, title, author }) -> { system, messages, clipped }
 * Es geht nur der Abschnitt (und Buchtitel/Autor) an das Modell, nie das Buch, die Bibliothek oder andere Daten. Der Systemprompt ist kurz und stabil (docs/LOKALE_MODELLE.md, Regel 10). */
export const KINDS = ['explain', 'summary'];
export const MAX_CHARS = 6000;
export const MAX_PAGE = 3000;
export const MAX_HISTORY = 8000;

export function clip(text, max = MAX_CHARS) {
    const t = String(text == null ? '' : text).replace(/[ \t\r\f\v]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return t.length > max ? { text: t.slice(0, max), clipped: true } : { text: t, clipped: false };
}

const SYSTEM = {
    en: 'You help a reader with passages from a book. Use only the passage and, if given, the page text. Answer briefly and plainly in English. Do not invent facts.',
    de: 'Du hilfst einer Leserin oder einem Leser bei Textstellen aus einem Buch. Nutze nur die Textstelle und, falls angegeben, den Seitentext. Antworte kurz und klar auf Deutsch. Erfinde nichts.',
};
const TASK = {
    en: { explain: 'Explain this passage in simple words. If it is a single word or term, give its meaning in this context.', summary: 'Summarize this passage in a few sentences.' },
    de: { explain: 'Erkläre diese Textstelle in einfachen Worten. Ist es ein einzelnes Wort oder ein Begriff, nenne seine Bedeutung in diesem Zusammenhang.', summary: 'Fasse diese Textstelle in wenigen Sätzen zusammen.' },
};

export function buildRequest(kind, passage, { lang = 'en', title = '', author = '', page = '' } = {}) {
    if (!KINDS.includes(kind)) throw new Error('ki: unbekannte Art ' + kind);
    const l = lang === 'de' ? 'de' : 'en';
    const c = clip(passage);
    const book = [title, author].filter(Boolean).join(l === 'de' ? ' von ' : ' by ');
    const head = book ? (l === 'de' ? 'Buch: ' : 'Book: ') + book + '\n' : '';
    const pg = clip(page, MAX_PAGE).text;
    const ctx = pg ? (l === 'de' ? 'Seitentext zum Zusammenhang:\n' : 'Page text for context:\n') + pg + '\n\n' : '';
    return { system: SYSTEM[l], messages: [{ role: 'user', content: head + ctx + TASK[l][kind] + '\n\n' + c.text }], clipped: c.clipped };
}

// Verlauf für Nachfragen: erste Nachricht bleibt, dazu die jüngsten Nachrichten, zusammen höchstens max Zeichen (ältere Paare fallen zuerst weg)
export function trimHistory(msgs, max = MAX_HISTORY) {
    if (!msgs.length) return [];
    const first = msgs[0], rest = msgs.slice(1);
    let total = first.content.length;
    const keep = [];
    for (let i = rest.length - 1; i >= 0; i--) {
        total += rest[i].content.length;
        if (total > max && keep.length) break;
        keep.unshift(rest[i]);
    }
    while (keep.length && keep[0].role !== 'assistant') keep.shift();        // beginnt nach der ersten Nachricht mit der Antwort
    return [first].concat(keep);
}
