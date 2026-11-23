/* tools/docheinz/mod/cloud-ocr.js – Seiten per Cloud-Modell (Google Gemini) lesen lassen. Reine Funktionen, ohne Netz.
 *   SYSTEM                  Anweisung an das Modell (nur abschreiben, nichts erklären)
 *   buildMessages(b64)      -> Nachrichten für HeinzProviders.chat (Bild am Nutzer-Beitrag)
 *   cleanText(text)         -> bereinigter Seitentext (Zaun-Zeichen, Anführungsrahmen, Vor- und Nachsatz des Modells)
 *   pickModel(names, active) -> Modellname für die Auswahl vorbelegen (aktives Google-Modell, sonst ein „flash“-Modell)
 * Es geht nur das Foto der einen Seite an den Anbieter, nie die Bibliothek (Regel der Anbieterschicht: Online nur mit „Online erlauben“). */
export const SYSTEM = [
    'You are a precise OCR engine for photographed book pages. Transcribe the running text of the page exactly as printed.',
    'Rules: keep the original language, spelling and punctuation; never translate, summarize, correct or comment.',
    'If two pages are visible, transcribe the left page first, then the right page.',
    'Join words that are hyphenated at the end of a line. Separate paragraphs with one blank line. Put headings on their own line.',
    'Leave out page numbers, running headers, text of neighbouring pages that shows through the paper or is cut off at the edge, and decorations.',
    'Output plain text only, no Markdown, no code fence, no introduction. If nothing is readable, output nothing.'
].join('\n');

export function buildMessages(b64, mime = 'image/jpeg') {
    return [{ role: 'user', content: 'Transcribe this page.', images: [{ mime, data: b64 }] }];
}

export function cleanText(text) {
    let s = String(text || '').replace(/\r\n?/g, '\n').trim();
    s = s.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
    s = s.replace(/^(here is|here's|the (transcription|text)|transcription)[^\n]*:\s*\n+/i, '');
    return s.trim();
}

export function pickModel(names, active) {
    const list = (names || []).filter(n => /gemini/i.test(n) && !/embed|tts|image|live|aqa/i.test(n));
    if (active && list.includes(active)) return active;
    const flash = list.filter(n => /flash/i.test(n) && !/lite/i.test(n));
    return flash[0] || list[0] || active || '';
}
