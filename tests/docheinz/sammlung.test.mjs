import test from 'node:test';
import assert from 'node:assert/strict';
import { collect, markTags, filterItems, groupItems, countBy, toMarkdownAll } from '../../tools/docheinz/mod/sammlung.js';
import { makeMark, cleanMarks, updateMark, toMarkdown } from '../../tools/docheinz/mod/markierung.js';

const mk = (o) => makeMark({ ch: 0, start: 0, len: o.text.length, ...o, now: 1000 });
const books = [
    { id: 'b2', title: 'Zebra', author: 'Z', marks: [mk({ text: 'Zitat Z', color: 1, tags: ['Mut', 'Krimi'], note: 'wichtig' })] },
    { id: 'b1', title: 'Alpha', author: 'A', marks: [mk({ text: 'Zitat A2', start: 50, color: 0, tags: ['mut'] }), mk({ text: 'Zitat A1', start: 5, color: 2 })] },
    { id: 'b3', title: 'Leer', marks: [] },
];
test('Schlagwörter an Markierungen: bereinigt, höchstens 6, überstehen cleanMarks und updateMark', () => {
    const m = mk({ text: 'x', tags: ['a', 'A', ' b ', 'c', 'd', 'e', 'f', 'g'] });
    assert.deepEqual(m.tags, ['a', 'b', 'c', 'd', 'e', 'f']);
    assert.equal(mk({ text: 'x' }).tags, undefined);
    assert.deepEqual(cleanMarks([m])[0].tags, m.tags);
    assert.deepEqual(updateMark([m], m.id, { note: 'n' })[0].tags, m.tags);
    assert.deepEqual(updateMark([m], m.id, { tags: ['neu'] })[0].tags, ['neu']);
});
test('collect: nur Bücher mit Markierungen, nach Titel, je Buch nach Stelle', () => {
    const it = collect(books);
    assert.deepEqual(it.map(i => i.mark.text), ['Zitat A1', 'Zitat A2', 'Zitat Z']);
    assert.equal(it[0].book.title, 'Alpha');
});
test('markTags zählt ohne Beachtung der Schreibweise', () => {
    assert.deepEqual(markTags(collect(books)).map(x => [x.tag.toLowerCase(), x.count]), [['mut', 2], ['krimi', 1]]);
});
test('filterItems: Farbe, Schlagwort, nur mit Notiz, Suche, Buch', () => {
    const it = collect(books), txt = (l) => l.map(i => i.mark.text);
    assert.deepEqual(txt(filterItems(it, { color: 'g' })), ['Zitat Z']);
    assert.deepEqual(txt(filterItems(it, { tag: 'MUT' })), ['Zitat A2', 'Zitat Z']);
    assert.deepEqual(txt(filterItems(it, { notesOnly: true })), ['Zitat Z']);
    assert.deepEqual(txt(filterItems(it, { q: 'wichtig' })), ['Zitat Z']);
    assert.deepEqual(txt(filterItems(it, { q: 'krim' })), ['Zitat Z']);
    assert.deepEqual(txt(filterItems(it, { book: 'b1' })), ['Zitat A1', 'Zitat A2']);
    assert.equal(filterItems(it, {}).length, 3);
});
test('groupItems nach Buch, Schlagwort (mehrfach, ohne zuletzt) und Farbe', () => {
    const it = collect(books);
    assert.deepEqual(groupItems(it, 'book').map(g => [g.title, g.items.length]), [['Alpha', 2], ['Zebra', 1]]);
    const g = groupItems(it, 'tag');
    assert.deepEqual(g.map(x => [x.key, x.items.length]), [['mut', 2], ['krimi', 1], ['', 1]]);
    assert.deepEqual(groupItems(it, 'color').map(x => x.key), ['y', 'g', 'b']);
    assert.deepEqual(countBy(it), { marks: 3, notes: 1, books: 2, tags: 2 });
});
test('toMarkdownAll: Überschriften, Quellen, Notiz', () => {
    const L = { title: 'Thema Mut', color: ['Gelb', 'Grün', 'Blau', 'Rosa'], note: 'Notiz', count: '{n} Einträge aus {b} Büchern', untagged: 'Ohne', chapter: () => '' };
    const md = toMarkdownAll(filterItems(collect(books), { tag: 'mut' }), 'tag', L);
    assert.match(md, /^# Thema Mut\n\n2 Einträge aus 2 Büchern\n\n## #mut\n/);
    assert.match(md, /> Zitat A2\n\n— \*Alpha · Gelb\*/);
    assert.match(md, /\*\*Notiz:\*\* wichtig/);
    const b = toMarkdownAll(collect(books), 'book', L);
    assert.match(b, /## Alpha\n\n> Zitat A1\n\n— \*Blau\*/);
});
test('Buch-Export zeigt Schlagwörter', () => {
    const md = toMarkdown({ title: 'T' }, [mk({ text: 'Q', tags: ['x'] })], () => 'K', { color: ['Gelb'] });
    assert.match(md, /\*\(Gelb #x\)\*/);
});
