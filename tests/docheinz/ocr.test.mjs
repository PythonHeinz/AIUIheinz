import test from 'node:test';
import assert from 'node:assert/strict';
import { ocrTextToHtml } from '../../tools/docheinz/mod/ocr.js';

test('Zeilen werden Absätze, Silbentrennung und Maskierung', () => {
    const h = ocrTextToHtml('Kapitel\n\nDies ist ein Sil-\nbentrenner <b> & mehr\nZeile zwei.\n\n\nNeuer Absatz');
    assert.equal(h, '<p>Kapitel</p>\n<p>Dies ist ein Silbentrenner &lt;b&gt; &amp; mehr Zeile zwei.</p>\n<p>Neuer Absatz</p>');
});
test('leerer Text gibt leeres HTML', () => { assert.equal(ocrTextToHtml('  \n '), ''); assert.equal(ocrTextToHtml(undefined), ''); });
