/* tools/docheinz/mod/ocr.js – Texterkennung (OCR) für gescannte PDF-Seiten, lokal mit tesseract.js (vendor/ocr/, keine Anfrage nach außen).
 *   LANGS = ['deu', 'eng', 'deu+eng']
 *   makeRecognizer(lang) -> Promise<{ recognize(canvas) -> Promise<string>, end() }>   lädt Bibliothek, Kern (WASM) und Sprachdaten erst jetzt
 *   ocrTextToHtml(text) -> HTML    reine Funktion: Zeilen zu Absätzen, Silbentrennung am Zeilenende, Maskierung
 * Grenzen: Qualität hängt von der Vorlage ab; Tabellen und Spalten werden nicht als Struktur erkannt, nur als Text. */
export const LANGS = ['deu', 'eng', 'deu+eng'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function ocrTextToHtml(text) {
    const paras = String(text || '').replace(/\r\n?/g, '\n').replace(/­/g, '').split(/\n\s*\n/);
    const out = [];
    for (const p of paras) {
        let cur = '';
        for (const raw of p.split('\n')) {
            const ln = raw.replace(/\s+/g, ' ').trim();
            if (!ln) continue;
            if (!cur) { cur = ln; continue; }
            if (/(\p{L})[-‐‑]$/u.test(cur) && /^\p{Ll}/u.test(ln)) cur = cur.slice(0, -1) + ln;   // Silbentrennung
            else cur += ' ' + ln;
        }
        if (cur) out.push('<p>' + esc(cur) + '</p>');
    }
    return out.join('\n');
}

export async function makeRecognizer(lang) {
    const base = new URL('../vendor/ocr/', import.meta.url).href;
    const T = await import('../vendor/ocr/tesseract.esm.min.js');
    const createWorker = T.createWorker || (T.default && T.default.createWorker);
    const worker = await createWorker(lang, 1, { workerPath: base + 'worker.min.js', corePath: base + 'tesseract-core-simd-lstm.wasm.js', langPath: base, gzip: true, cacheMethod: 'none' });
    return {
        recognize: async (canvas) => { const r = await worker.recognize(canvas); return (r && r.data && r.data.text) || ''; },
        end: () => worker.terminate(),
    };
}
