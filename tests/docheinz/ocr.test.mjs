import test from 'node:test';
import assert from 'node:assert/strict';
import { ocrTextToHtml } from '../../tools/docheinz/mod/ocr.js';

test('Zeilen werden Absätze, Silbentrennung und Maskierung', () => {
    const h = ocrTextToHtml('Kapitel\n\nDies ist ein Sil-\nbentrenner <b> & mehr\nZeile zwei.\n\n\nNeuer Absatz');
    assert.equal(h, '<p>Kapitel</p>\n<p>Dies ist ein Silbentrenner &lt;b&gt; &amp; mehr Zeile zwei.</p>\n<p>Neuer Absatz</p>');
});
test('leerer Text gibt leeres HTML', () => { assert.equal(ocrTextToHtml('  \n '), ''); assert.equal(ocrTextToHtml(undefined), ''); });

import { filterBlocks } from '../../tools/docheinz/mod/ocr.js';
test('Wörter und Zeilen mit niedriger Sicherheit fallen weg', () => {
    const w = (text, confidence) => ({ text, confidence });
    const blocks = [{ paragraphs: [{ lines: [
        { words: [w('Guter', 93), w('Text', 90), w('hier', 88)] },
        { words: [w('xX', 20), w('#', 15), w('Z', 30)] },
        { words: [w('®', 70), w('A', 80), w('x', 75)] },
        { words: [w('Titel', 95), w('r=', 10)] },
    ] }, { lines: [{ words: [w('~', 5)] }] }] }];
    assert.equal(filterBlocks(blocks), 'Guter Text hier\nTitel');
});
