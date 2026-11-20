/* tools/docheinz/mod/pdf-lesen.js – PDF im Umfluss-Modus lesen (Insel-Modul; lädt pdf.js lazy aus vendor/, lokal, keine Anfrage nach außen).
 *   openPdf(bytes, name, BuchFehler) -> Promise<Source>   (Source wie in buch.js)
 * Kapitel: Gliederung (Outline) des PDFs, sonst Gruppen von je PAGES_PER_CH Seiten. Seiten werden erst beim Öffnen eines Kapitels gelesen.
 * Nur PDFs mit Textebene; ohne Text (Scan) wirft BuchFehler('scanned'). Verschlüsselte PDFs: BuchFehler('drm'). */
import { orderPage, furnitureKeys, dropFurniture, baseSize, toBlocks, joinPages, blocksToHtml } from './pdf-text.js';
import { sauber, plain } from './sauber.js';
import { ocrTextToHtml } from './ocr.js';

const PAGES_PER_CH = 10;
const stem = n => String(n || '').replace(/\.[^.]+$/, '');
let libP = null;
function loadLib() {
    if (!libP) libP = import('../vendor/pdf.min.js').then(() => {
        const lib = globalThis.pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.min.js', import.meta.url).href;
        return lib;
    });
    return libP;
}

async function pageLines(page) {
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
        if (typeof it.str !== 'string') continue;
        const t = it.transform, fs = Math.hypot(t[2], t[3]) || it.height || 10;
        items.push({ s: it.str, x: t[4], y: vp.height - t[5], w: it.width || 0, fs });
    }
    return { lines: orderPage(items), h: vp.height };
}

export async function openPdf(bytes, name, BuchFehler, opts = {}) {
    const lib = await loadLib();
    let doc;
    try { doc = await lib.getDocument({ data: bytes.slice(0), isEvalSupported: false, useSystemFonts: false }).promise; }
    catch (e) { throw new BuchFehler(e && e.name === 'PasswordException' ? 'drm' : 'unreadable', e && e.message); }
    const n = doc.numPages;
    if (!n) throw new BuchFehler('empty');
    let meta = {};
    try { meta = (await doc.getMetadata()).info || {}; } catch (e) { /* ohne Metadaten */ }

    // Stichprobe: Gibt es überhaupt Text? (bis zu 8 Seiten gleichmäßig verteilt)
    const cache = new Map();
    const getPage = async (p) => { if (!cache.has(p)) cache.set(p, pageLines(await doc.getPage(p))); return cache.get(p); };
    let chars = 0, probe = 0;
    for (let k = 0; k < Math.min(8, n); k++) {
        const p = 1 + Math.floor(k * n / Math.min(8, n));
        const { lines } = await getPage(p);
        chars += lines.reduce((a, l) => a + l.s.length, 0); probe++;
    }
    const OCR = Array.isArray(opts.ocr) ? opts.ocr : null;          // Scan: Text kommt aus der Texterkennung (rec.ocr, eine Zeichenkette je Seite)
    if (!OCR && chars < 20 * probe * 0.5 && chars < 100) throw new BuchFehler('scanned');

    // Kopf-/Fußzeilen aus einer Stichprobe bestimmen
    const sample = [];
    for (let k = 0; k < Math.min(12, n); k++) sample.push(await getPage(1 + Math.floor(k * n / Math.min(12, n))));
    const keys = furnitureKeys(sample);
    const base = baseSize(sample.flatMap(p => p.lines));

    // Gliederung -> Kapitel (Startseiten)
    let starts = [];
    try {
        const out = await doc.getOutline();
        const walk = async (items, level) => {
            for (const o of items || []) {
                let dest = o.dest; if (typeof dest === 'string') dest = await doc.getDestination(dest);
                if (Array.isArray(dest) && dest[0] && typeof dest[0] === 'object') {
                    const pg = (await doc.getPageIndex(dest[0])) + 1;
                    starts.push({ title: String(o.title || '').trim(), page: pg, level });
                }
                if (level < 2) await walk(o.items, level + 1);
            }
        };
        await walk(out, 0);
    } catch (e) { starts = []; }
    starts = starts.filter(s => s.title).sort((a, b) => a.page - b.page);
    // pro Startseite nur den ersten Eintrag als Kapitelgrenze, tiefere Ebenen bleiben im Inhaltsverzeichnis
    const chapStarts = [];
    for (const s of starts) if (!chapStarts.length || s.page > chapStarts[chapStarts.length - 1].page) chapStarts.push(s);
    let chapters;
    if (chapStarts.length >= 2) {
        chapters = chapStarts.map((s, i) => ({ from: s.page, to: (chapStarts[i + 1] ? chapStarts[i + 1].page - 1 : n), title: s.title }));
        if (chapters[0].from > 1) chapters.unshift({ from: 1, to: chapters[0].from - 1, title: '' });
    } else {
        chapters = [];
        for (let p = 1; p <= n; p += PAGES_PER_CH) chapters.push({ from: p, to: Math.min(n, p + PAGES_PER_CH - 1), title: n > PAGES_PER_CH ? 'p. ' + p + '–' + Math.min(n, p + PAGES_PER_CH - 1) : '' });
    }
    chapters.forEach((c, i) => { c.href = 'pdf-' + (i + 1); if (!c.title) c.title = chapters.length > 1 ? 'p. ' + c.from + '–' + c.to : ''; });
    const toc = [];
    if (chapStarts.length >= 2) {
        for (const s of starts) {
            const i = chapters.findIndex(c => s.page >= c.from && s.page <= c.to);
            if (i >= 0) toc.push({ title: s.title, href: chapters[i].href, level: s.level });
        }
    } else chapters.forEach(c => toc.push({ title: c.title, href: c.href, level: 0 }));

    const htmlCache = new Map();
    const build = async (i) => {
        const c = chapters[i], pages = [];
        if (OCR) { let h = ''; for (let p = c.from; p <= c.to; p++) h += OCR[p - 1] ? ocrTextToHtml(OCR[p - 1]) + '\n' : ''; return sauber(h.trim() ? h : '<p></p>'); }
        for (let p = c.from; p <= c.to; p++) {
            const { lines, h } = await getPage(p);
            pages.push(toBlocks(dropFurniture(lines, h, keys, base), base));
            if (p - c.from > 40) cache.delete(p - 41);          // Speicher schonen
        }
        let html = blocksToHtml(joinPages(pages));
        if (!html.trim()) html = '<p></p>';
        return sauber(html);
    };
    const html = (i) => { if (OCR) return build(i); if (!htmlCache.has(i)) htmlCache.set(i, build(i)); return htmlCache.get(i); };

    return {
        format: 'pdf',
        metadata: { title: (meta.Title || '').trim() || stem(name), creator: (meta.Author || '').trim(), language: (meta.Language || '').trim() },
        toc, chapters: chapters.map(c => ({ href: c.href, title: c.title })),
        html,
        resolve: go => { const [p] = String(go).split('#'); const index = chapters.findIndex(c => c.href === p); return index < 0 ? null : { index, anchor: '' }; },
        textLength: async i => plain(await html(i)).length,
        pages: n,
        pdf: {
            pages: n,
            size: async (p) => { const v = (await doc.getPage(p)).getViewport({ scale: 1 }); return { w: v.width, h: v.height }; },
            // zeichnet Seite p auf das Canvas, cssW = Breite in CSS-Pixeln; liefert { cancel }
            render: (p, canvas, cssW, dpr) => {
                let task = null, dead = false;
                const done = (async () => {
                    const page = await doc.getPage(p), v1 = page.getViewport({ scale: 1 });
                    let scale = (cssW / v1.width) * dpr;
                    const maxPx = 12e6; if (v1.width * v1.height * scale * scale > maxPx) scale = Math.sqrt(maxPx / (v1.width * v1.height));
                    const v = page.getViewport({ scale });
                    if (dead) return;
                    const c = document.createElement('canvas'); c.width = Math.floor(v.width); c.height = Math.floor(v.height);
                    task = page.render({ canvasContext: c.getContext('2d'), canvas: c, viewport: v });
                    await task.promise;
                    if (dead) return;
                    canvas.width = c.width; canvas.height = c.height; canvas.getContext('2d').drawImage(c, 0, 0);
                })().catch(() => {});
                return { done, cancel: () => { dead = true; try { task && task.cancel(); } catch (e) { /* schon fertig */ } } };
            },
            chapterOf: (p) => Math.max(0, chapters.findIndex(c => p >= c.from && p <= c.to)),
            range: (i) => (chapters[i] ? { from: chapters[i].from, to: chapters[i].to } : { from: 1, to: n }),
        },
    };
}
