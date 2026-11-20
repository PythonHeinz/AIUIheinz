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

// Wörter mit niedriger Sicherheit (Grafiken, Bildrauschen) verwerfen; Zeilen, die danach fast leer sind, ebenfalls.
// blocks = data.blocks von tesseract.js: Blöcke > Absätze > Zeilen > Wörter { text, confidence }
export function filterBlocks(blocks, minWord = 60, minKeep = 0.6) {
    const paras = [];
    for (const b of blocks || []) for (const p of b.paragraphs || []) {
        const lines = [];
        for (const l of p.lines || []) {
            const ws = (l.words || []).filter(w => w.text && w.text.trim());
            if (!ws.length) continue;
            const keep = ws.filter(w => w.confidence >= minWord);
            if (keep.length < Math.max(1, Math.ceil(ws.length * minKeep))) continue;
            lines.push(keep.map(w => w.text.trim()).join(' '));
        }
        if (lines.length) paras.push(lines.join('\n'));
    }
    return paras.join('\n\n');
}

export async function makeRecognizer(lang) {
    const base = new URL('../vendor/ocr/', import.meta.url).href;
    const T = await import('../vendor/ocr/tesseract.esm.min.js');
    const createWorker = T.createWorker || (T.default && T.default.createWorker);
    const worker = await createWorker(lang, 1, { workerPath: base + 'worker.min.js', corePath: base + 'tesseract-core-simd-lstm.wasm.js', langPath: base, gzip: true, cacheMethod: 'none' });
    return {
        recognize: async (canvas) => {
            const r = await worker.recognize(canvas, {}, { text: true, blocks: true });
            const d = r && r.data; if (!d) return '';
            return d.blocks ? filterBlocks(d.blocks) : (d.text || '');
        },
        end: () => worker.terminate(),
    };
}
