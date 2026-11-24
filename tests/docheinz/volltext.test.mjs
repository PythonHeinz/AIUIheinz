import test from 'node:test';
import assert from 'node:assert/strict';
import { searchBook, rankBooks, cacheKey, MIN_QUERY } from '../../tools/docheinz/mod/volltext.js';

test('Treffer je Kapitel mit Position, Zahl und Begrenzung', () => {
    const book = { chapters: ['Alpha beta gamma. Beta wieder.', 'Nichts hier', 'Noch ein Beta am Ende'] };
    const r = searchBook(book, 'beta', { perBook: 2 });
    assert.equal(r.count, 3);
    assert.equal(r.hits.length, 2);
    assert.deepEqual([r.hits[0].ch, r.hits[0].start, r.hits[0].len], [0, 6, 4]);
    assert.equal(r.hits[1].ch, 0);
    assert.equal(searchBook(book, 'zzz'), null);
});
test('zu kurze Anfrage und fehlende Kapitel geben null', () => {
    assert.equal(MIN_QUERY, 2);
    assert.equal(searchBook({ chapters: ['abc'] }, 'a'), null);
    assert.equal(searchBook({}, 'abc'), null);
    assert.equal(searchBook(null, 'abc'), null);
});
test('Rangfolge nach Trefferzahl, dann Titel; Cache-Schlüssel hängt an Signatur und OCR-Seiten', () => {
    const l = rankBooks([{ title: 'B', count: 1 }, { title: 'A', count: 1 }, { title: 'C', count: 5 }]);
    assert.deepEqual(l.map(x => x.title), ['C', 'A', 'B']);
    assert.notEqual(cacheKey({ sig: 'x', ocr: ['a'] }), cacheKey({ sig: 'x', ocr: ['a', 'b'] }));
    assert.equal(cacheKey({ sig: 'x' }), 'x:0');
});
