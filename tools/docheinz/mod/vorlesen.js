/* tools/docheinz/mod/vorlesen.js – Vorlesen: Text in Sätze teilen, Stimme wählen (Insel-Modul, reine Funktionen, kein DOM, kein Netz).
 *   splitSentences(text, lang?) -> [{ start, len }]   Zeilenumbruch (\\n) trennt immer; sonst nach . ! ? … (mit schließenden Anführungszeichen); Abkürzungen und
 *       Initialen trennen nicht; zu lange Sätze werden bei Komma/Strichpunkt/Leerzeichen auf höchstens MAX_LEN Zeichen gekürzt (die Sprachausgabe bricht sonst ab)
 *   pickVoice(voices, lang, savedUri?) -> Stimme | null   gespeicherte Stimme, sonst passende Sprache, lokale (offline) vor Online-Stimmen, Standardstimme zuerst
 *   RATES                               wählbare Geschwindigkeiten */
export const MAX_LEN = 220;
export const RATES = [0.7, 0.85, 1, 1.2, 1.4, 1.7];
const ABBR = {
    de: ['z', 'b', 'bzw', 'usw', 'ca', 'dr', 'prof', 'nr', 'str', 'vgl', 'ggf', 'evtl', 'inkl', 'sog', 'u', 'a', 'd', 'h', 'ff', 'etc', 'abb', 'bd', 'hr', 'fr', 'geb', 'ev', 'hl', 'st', 'tel'],
    en: ['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'vs', 'etc', 'e', 'g', 'i', 'no', 'fig', 'vol', 'ch', 'jr', 'sr', 'inc', 'ltd', 'co', 'approx', 'ca', 'cf']
};
const END = /[.!?…]+["'»«“”„’)\]]*$/;
const isAbbr = (word, lang) => {
    const w = word.replace(/[^\p{L}\p{N}.]/gu, '').replace(/\.+$/, '').toLowerCase();
    if (/^\p{L}$/u.test(w)) return true;                                    // Initial oder Einzelbuchstabe („J. R. R.“)
    return (ABBR[lang] || ABBR.en).includes(w) || (lang === 'de' && /^\d{1,2}$/.test(w));   // „am 3. Mai“
};
function cut(text, a, b, out) {                                            // zu langen Satz kürzen
    while (b - a > MAX_LEN) {
        const win = text.slice(a, a + MAX_LEN);
        let k = Math.max(win.lastIndexOf(', '), win.lastIndexOf('; '), win.lastIndexOf(': '), win.lastIndexOf(' – '));
        if (k < MAX_LEN / 3) k = win.lastIndexOf(' ');
        if (k < 20) k = MAX_LEN - 1;
        out.push({ start: a, len: k + 1 }); a += k + 1;
        while (a < b && /\s/.test(text[a])) a++;
    }
    if (b > a) out.push({ start: a, len: b - a });
}
export function splitSentences(text, lang = 'en') {
    const t = String(text == null ? '' : text), l = String(lang).slice(0, 2).toLowerCase(), out = [];
    let lineStart = 0;
    const lines = t.split('\n');
    for (const line of lines) {
        const base = lineStart; lineStart += line.length + 1;
        if (!line.trim()) continue;
        let a = 0;
        const re = /[.!?…]+["'»«“”„’)\]]*\s+/g;
        let m;
        while ((m = re.exec(line))) {
            const mark = m[0].trimEnd(), end = m.index + mark.length, after = m.index + m[0].length;
            const lastWord = line.slice(a, end).split(/\s+/).pop(), dotOnly = /^\.["'»«“”„’)\]]*$/.test(mark);
            if (dotOnly && isAbbr(lastWord, l)) continue;                    // Abkürzung oder Initial
            if ((dotOnly || /["'»«“”„’]/.test(mark)) && /\p{Ll}/u.test(line.slice(after, after + 1))) continue;   // danach klein: kein Satzende („…?“ fragte sie)
            push(line, base, a, end, out);
            a = after;
        }
        push(line, base, a, line.length, out);
    }
    return out;
}
function push(line, base, a, b, out) {
    while (a < b && /\s/.test(line[a])) a++;
    while (b > a && /\s/.test(line[b - 1])) b--;
    if (b <= a) return;
    const sub = []; cut(line, a, b, sub);
    for (const s of sub) out.push({ start: base + s.start, len: s.len });
}
export function pickVoice(voices, lang, savedUri) {
    const v = Array.isArray(voices) ? voices : [];
    if (!v.length) return null;
    const hit = savedUri && v.find(x => x.voiceURI === savedUri);
    if (hit) return hit;
    const l = String(lang || '').slice(0, 2).toLowerCase();
    const fit = v.filter(x => String(x.lang || '').slice(0, 2).toLowerCase() === l);
    const pool = fit.length ? fit : [];
    if (!pool.length) return null;
    return pool.find(x => x.localService && x.default) || pool.find(x => x.localService) || pool.find(x => x.default) || pool[0];
}
