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
    en: 'You help a reader understand a passage. Work only with the passage given. Never say which book or author it is from and do not repeat the passage. Answer briefly and plainly in English. Do not invent facts.',
    de: 'Du hilfst einer Leserin oder einem Leser, eine Textstelle zu verstehen. Arbeite nur mit der gegebenen Textstelle. Nenne nie, aus welchem Buch oder von welchem Autor sie stammt, und wiederhole sie nicht. Antworte kurz und klar auf Deutsch. Erfinde nichts.',
};
const TASK = {
    en: { explain: 'Explain in simple words what this passage means. If it is a single word or term, give its meaning in this context.', summary: 'Summarize what this passage says in two or three sentences.' },
    de: { explain: 'Erkläre in einfachen Worten, was diese Textstelle bedeutet. Ist es ein einzelnes Wort oder ein Begriff, nenne seine Bedeutung in diesem Zusammenhang.', summary: 'Fasse in zwei bis drei Sätzen zusammen, was diese Textstelle sagt.' },
};

// question: freie Frage des Lesers zur Textstelle (ersetzt den Standardauftrag, leer = Standardauftrag)
// system: eigener Systemprompt (z. B. aus einer Dashboard-Konfiguration); leer = eingebauter. {title} und {author} werden darin ersetzt.
// Titel und Autor gehen sonst nicht mit: kleine Modelle reden dann nur über „das Buch von …“.
export function buildRequest(kind, passage, { lang = 'en', title = '', author = '', page = '', system = '', question = '' } = {}) {
    if (!KINDS.includes(kind)) throw new Error('ki: unbekannte Art ' + kind);
    const l = lang === 'de' ? 'de' : 'en';
    const c = clip(passage);
    const pg = clip(page, MAX_PAGE).text;
    const ctx = pg ? (l === 'de' ? 'Seitentext zum Zusammenhang:\n' : 'Page text for context:\n') + pg + '\n\n' : '';
    const sys = String(system || '').trim() ? String(system).replace(/\{title\}/g, title).replace(/\{author\}/g, author) : SYSTEM[l];
    const q = clip(question, 500).text;
    const task = q ? (l === 'de' ? 'Frage dazu: ' : 'Question about it: ') + q : TASK[l][kind];
    const content = ctx + (l === 'de' ? 'Textstelle:\n"""\n' : 'Passage:\n"""\n') + c.text + '\n"""\n\n' + task;
    return { system: sys, messages: [{ role: 'user', content }], clipped: c.clipped };
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
