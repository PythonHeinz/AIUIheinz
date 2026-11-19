/* tools/docheinz/mod/wahl.js – Hilfen für die eigene Textauswahl des Readers (Insel-Modul, reine Funktionen, kein DOM).
 *   wordBounds(text, offset) -> [start, end] | null   Wort um die Stelle (Buchstaben, Ziffern, Binnen-Apostroph/-Bindestrich)
 *   isWordChar(ch) -> boolean
 * Die native Auswahl des Browsers ist im Lesetext abgeschaltet (Chrome blendet dort eigene Menüs ein); der Reader markiert selbst. */
const WORD = /[\p{L}\p{N}\p{M}]/u;
const JOIN = /['’\-‐]/;

export const isWordChar = (ch) => !!ch && WORD.test(ch);

export function wordBounds(text, offset) {
    const s = String(text || '');
    if (!s.length) return null;
    let i = Math.max(0, Math.min(offset, s.length));
    if (!isWordChar(s[i]) && isWordChar(s[i - 1])) i -= 1;      // Stelle direkt hinter dem Wort
    if (!isWordChar(s[i])) return null;
    let a = i, b = i + 1;
    const inside = (k) => isWordChar(s[k]) || (JOIN.test(s[k] || '') && isWordChar(s[k - 1]) && isWordChar(s[k + 1]));
    while (a > 0 && inside(a - 1)) a--;
    while (b < s.length && inside(b)) b++;
    return [a, b];
}
