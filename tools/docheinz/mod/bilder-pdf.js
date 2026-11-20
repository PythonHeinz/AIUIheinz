/* tools/docheinz/mod/bilder-pdf.js – Seitenfotos (JPEG) zu einem PDF zusammensetzen (Insel-Modul, reine Funktion, kein DOM, kein Netz).
 *   imagesToPdf(pages: [{ jpeg: Uint8Array, w: Pixel, h: Pixel }], dpi = 150) -> Uint8Array
 * Jede Seite ist ein Bild in Seitengröße (Pixel * 72 / dpi Punkte). Das PDF hat keine Textebene und läuft in docHeinz wie ein Scan
 * durch Texterkennung (OCR), Originalansicht und Export. Bilder bleiben unverändert (DCTDecode). */
export function imagesToPdf(pages, dpi = 150) {
    if (!pages.length) throw new Error('empty');
    const enc = new TextEncoder(), chunks = [], offsets = [];
    let len = 0;
    const push = (u8) => { chunks.push(u8); len += u8.length; };
    const str = (s) => push(enc.encode(s));
    const n = pages.length, k = 72 / dpi;
    // Objekte: 1 Katalog, 2 Seitenbaum, dann je Seite 3 (Seite, Inhalt, Bild)
    str('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const obj = (id, body) => { offsets[id] = len; str(id + ' 0 obj\n' + body + '\nendobj\n'); };
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Count ' + n + ' /Kids [' + pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] >>');
    pages.forEach((p, i) => {
        const pg = 3 + i * 3, ct = pg + 1, im = pg + 2, W = +(p.w * k).toFixed(2), H = +(p.h * k).toFixed(2);
        obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>');
        const cs = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q';
        obj(ct, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
        offsets[im] = len;
        str(im + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
        push(p.jpeg);
        str('\nendstream\nendobj\n');
    });
    const total = 2 + n * 3, xref = len;
    let x = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
    for (let i = 1; i <= total; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    str(x + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    const out = new Uint8Array(len);
    let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
}
