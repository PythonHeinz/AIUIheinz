/* tools/docheinz/mod/ocr.js – Texterkennung (OCR) für gescannte PDF-Seiten, lokal mit tesseract.js (vendor/ocr/, keine Anfrage nach außen).
 *   LANGS = ['deu', 'eng', 'deu+eng']
 *   makeRecognizer(lang) -> Promise<{ recognize(canvas) -> Promise<string>, score(canvas) -> Promise<number>, end() }>   lädt Bibliothek, Kern (WASM) und Sprachdaten erst jetzt
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
// Große Schrift (Titel auf farbigem Grund) erkennt Tesseract oft unsicher: Zeilen deutlich höher als der Durchschnitt bekommen eine niedrigere Schwelle.
// blocks = data.blocks von tesseract.js: Blöcke > Absätze > Zeilen > Wörter { text, confidence, bbox }
export function filterBlocks(blocks, { minWord = 45, minBig = 30, minKeep = 0.6, bigFactor = 1.3 } = {}) {
    const hs = [];
    for (const b of blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) { const h = l.bbox ? l.bbox.y1 - l.bbox.y0 : 0; if (h > 0) hs.push(h); }
    hs.sort((x, y) => x - y);
    const med = hs.length ? hs[hs.length >> 1] : 0;
    const paras = [];
    for (const b of blocks || []) for (const p of b.paragraphs || []) {
        const lines = [];
        for (const l of p.lines || []) {
            const ws = (l.words || []).filter(w => w.text && w.text.trim());
            if (!ws.length) continue;
            const big = med > 0 && l.bbox && (l.bbox.y1 - l.bbox.y0) >= bigFactor * med;
            const min = big ? minBig : minWord;
            const keep = ws.filter(w => w.confidence >= min);
            if (keep.length < Math.max(1, Math.ceil(ws.length * minKeep))) continue;
            const txt = keep.map(w => w.text.trim()).join(' ');
            if ((txt.match(/\p{L}/gu) || []).length < 3 && (txt.match(/\d/g) || []).length < 2) continue;      // Symbolreste wie „® ®“ oder „A x I= ©“
            lines.push(txt);
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
        recognize: async (canvas, opts) => {
            if (canvas.width < 40 || canvas.height < 40) return '';
            const r = await worker.recognize(canvas, {}, { text: true, blocks: true });
            const d = r && r.data; if (!d) return '';
            return d.blocks ? filterBlocks(d.blocks, opts) : (d.text || '');
        },
        // mittlere Wortsicherheit (0..100) für die Ausrichtungsprobe; Text auf dem Kopf oder gedreht ergibt niedrige Werte
        score: async (canvas) => {
            const r = await worker.recognize(canvas, {}, { text: true, blocks: true });
            const words = []; const walk = n => { if (!n) return; if (Array.isArray(n)) return n.forEach(walk); if (typeof n.confidence === 'number' && n.text && !n.words && !n.lines && !n.paragraphs) words.push(n); ['paragraphs', 'lines', 'words'].forEach(k => walk(n[k])); };
            walk(r && r.data && r.data.blocks);
            const good = words.filter(w => /[A-Za-zÄÖÜäöüß]{2,}/.test(w.text));
            return good.length ? good.reduce((a, w) => a + w.confidence, 0) / good.length * Math.min(1, good.length / 15) : 0;
        },
        end: () => worker.terminate(),
    };
}
