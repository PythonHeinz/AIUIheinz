import test from 'node:test';
import assert from 'node:assert/strict';
import { imagesToPdf, readPhotoPages } from '../../tools/docheinz/mod/bilder-pdf.js';

test('PDF aus Seitenbildern: Kopf, Seitenzahl, Größe, xref-Offsets stimmen', () => {
    const jpg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]);
    const pdf = imagesToPdf([{ jpeg: jpg, w: 900, h: 1200 }, { jpeg: jpg, w: 900, h: 1200 }]);
    const s = Buffer.from(pdf).toString('latin1');
    assert.ok(s.startsWith('%PDF-1.4') && s.trimEnd().endsWith('%%EOF'));
    assert.match(s, /\/Count 2/);
    assert.match(s, /\/MediaBox \[0 0 432 576\]/);                 // 900 x 1200 Pixel bei 150 dpi
    const xr = s.lastIndexOf('\nxref\n') + 1, tab = s.slice(xr).split('\n').slice(3, 3 + 8);
    tab.forEach((l, i) => { const off = +l.slice(0, 10); assert.match(s.slice(off, off + 12), new RegExp('^' + (i + 1) + ' 0 obj')); });
    assert.throws(() => imagesToPdf([]));
});

test('Seiten lassen sich zurücklesen und mit neuen zusammensetzen', () => {
    const a = new Uint8Array([0xFF, 0xD8, 1, 2, 3, 0xFF, 0xD9]), b = new Uint8Array([0xFF, 0xD8, 9, 9, 0xFF, 0xD9]);
    const pdf = imagesToPdf([{ jpeg: a, w: 100, h: 200 }, { jpeg: b, w: 120, h: 220 }]);
    const back = readPhotoPages(pdf);
    assert.equal(back.length, 2);
    assert.deepEqual([...back[0].jpeg], [...a]); assert.deepEqual([...back[1].jpeg], [...b]);
    assert.equal(back[1].w, 120); assert.equal(back[1].h, 220);
    assert.equal(readPhotoPages(imagesToPdf([...back, { jpeg: a, w: 100, h: 200 }])).length, 3);
});
