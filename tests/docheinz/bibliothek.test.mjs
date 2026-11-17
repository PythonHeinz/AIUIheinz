import test from 'node:test';
import assert from 'node:assert/strict';
import { signature, makeRecord, percent, filterSort, initial, hue, newId } from '../../tools/docheinz/mod/bibliothek.js';

const src = { format: 'epub', metadata: { title: ' Das Buch ', creator: 'Ich', language: 'de' }, chapters: [{ href: 'a' }, { href: 'b' }], toc: [{ title: 'A', href: 'a', level: 1, extra: 1 }] };

test('makeRecord takes metadata, signature and chapter data', () => {
    const r = makeRecord(src, { name: 'Buch.EPUB', size: 10, lens: [100, 300], now: 5 });
    assert.equal(r.title, 'Das Buch');
    assert.equal(r.author, 'Ich');
    assert.equal(r.sig, 'buch.epub|10');
    assert.equal(r.sig, signature('buch.epub', 10));
    assert.deepEqual([r.chapters, r.lens, r.added, r.ch, r.frac, r.lastRead], [2, [100, 300], 5, 0, 0, 0]);
    assert.deepEqual(r.toc, [{ title: 'A', href: 'a', level: 1 }]);
    assert.notEqual(newId(), newId());
});

test('title falls back to the file name', () => {
    assert.equal(makeRecord({ ...src, metadata: { title: '' } }, { name: 'x.txt', size: 1 }).title, 'x.txt');
});

test('percent is weighted by text length', () => {
    const rec = { chapters: 2, lens: [100, 300] };
    assert.equal(percent(rec, 0, 0), 0);
    assert.equal(percent(rec, 0, 1), 25);
    assert.equal(percent(rec, 1, 0), 25);
    assert.equal(percent(rec, 1, 0.5), 63);
    assert.equal(percent(rec, 1, 1), 100);
    assert.equal(percent(rec, 9, 5), 100);          // wird begrenzt
    assert.equal(percent(rec, -1, -1), 0);
});

test('percent without lengths counts chapters', () => {
    assert.equal(percent({ chapters: 4, lens: [] }, 1, 0.5), 38);
    assert.equal(percent({ chapters: 1, lens: [0] }, 0, 0.5), 50);
});

const L = [
    { id: 1, title: 'Zebra', author: 'Anna', added: 1, lastRead: 0, chapters: 1, lens: [1], ch: 0, frac: 0.2 },
    { id: 2, title: 'Äpfel', author: 'Zoe', added: 2, lastRead: 50, chapters: 1, lens: [1], ch: 0, frac: 0.9 },
    { id: 3, title: 'Mango', author: '', added: 3, lastRead: 20, chapters: 1, lens: [1], ch: 0, frac: 0 },
];
const ids = (l) => l.map(b => b.id);
test('sort orders', () => {
    assert.deepEqual(ids(filterSort(L, '', 'recent')), [2, 3, 1]);
    assert.deepEqual(ids(filterSort(L, '', 'title')), [2, 3, 1]);
    assert.deepEqual(ids(filterSort(L, '', 'author')), [3, 1, 2]);
    assert.deepEqual(ids(filterSort(L, '', 'added')), [3, 2, 1]);
    assert.deepEqual(ids(filterSort(L, '', 'progress')), [2, 1, 3]);
});
test('search ignores case and accents and covers author', () => {
    assert.deepEqual(ids(filterSort(L, 'apfel')), [2]);
    assert.deepEqual(ids(filterSort(L, 'ZOE')), [2]);
    assert.deepEqual(ids(filterSort(L, 'xyz')), []);
    assert.equal(L.length, 3);                      // Eingabe unverändert
});
test('cover helpers', () => {
    assert.equal(initial('  ärger'), 'Ä');
    assert.equal(initial('42 Wege'), '4');
    assert.equal(initial('***'), '·');
    assert.equal(hue('Abc'), hue('Abc'));
    assert.ok(hue('Abc') >= 0 && hue('Abc') < 360);
});
