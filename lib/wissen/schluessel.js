/* lib/wissen/schluessel.js – Suchschlüssel und Wörter einer Frage (rein, ohne Oberfläche, ohne Netz).
 *   keyOf(text)    -> Suchschlüssel: klein, ß = ss, Akzente und Umlaute gefaltet (ä = a, é = e; „Köln“ findet man mit „koln“), Interpunktion am Rand und doppelte Leerzeichen weg
 *   woerter(frage) -> Suchwörter einer Frage ohne Füllwörter (Rückfall, wenn das Modell nichts liefert), höchstens 8 */
const EDGE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
export const keyOf = (t) => String(t || '').normalize('NFD').replace(/\p{M}+/gu, '').replace(/[_\s]+/g, ' ').replace(EDGE, '').toLowerCase().replace(/ß/g, 'ss').replace(/[’‘`´]/g, "'");

const STOP = new Set(('der die das den dem des ein eine einen einem einer eines und oder aber ist sind war waren wird werden wurde wurden hat haben hatte ' +
    'was wer wie wo wann warum wieso weshalb welche welcher welches wem wen wessen gibt es man mir mich dir uns ich du er sie wir ihr in im am an auf aus bei mit nach von vom zu zum zur ' +
    'über unter für gegen durch um ob wenn dass daß als auch noch nur sehr bitte kannst kann könnte erkläre erklär mal ' +
    'weißt wisst weiß wissen kennst kenne sagst sag sage nenn nenne erzähl erzähle zeig zeige gib gibst beschreibe beschreib bedeutet heißt liegt gibt dein deine meine mein ' +
    'ja nein falsch richtig stimmt danke okay ok genau also dann doch ' +
    'the a an and or but is are was were be been what who whom whose how where when why which does do did has have had of in on at to from by for with about into as it this that these those tell me please explain')
    .split(' ').map(w => keyOf(w)));   // Stoppwörter in Schlüsselform (ü = u, ß = ss), sonst träfen „über“ und „weißt“ nie

export function woerter(frage) {
    const out = [];
    for (const w of String(frage || '').normalize('NFC').split(/[^\p{L}\p{N}'-]+/u)) {
        const k = keyOf(w);
        if (!k || k.length < 2 || STOP.has(k) || out.includes(k)) continue;
        out.push(k);
        if (out.length >= 8) break;
    }
    return out;
}
