import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMark, cleanMarks, addMark, updateMark, removeMark, markAt, relocate, sortMarks, toMarkdown, COLORS } from '../../tools/docheinz/mod/markierung.js';

test('makeMark begrenzt und prüft Farbe', () => {
    const m = makeMark({ ch: 2, start: 5, len: 4, text: 'Welt', color: 9, note: 'x'.repeat(5000) });
    assert.equal(m.color, 0); assert.equal(m.note.length, 4000); assert.equal(m.ch, 2); assert.ok(m.id.startsWith('m'));
    assert.equal(makeMark({ ch: 0, start: 0, len: 1, text: 'a', color: 3 }).color, 3);
    assert.equal(COLORS.length, 4);
});
test('cleanMarks wirft Kaputtes und Doppelte weg', () => {
    const a = makeMark({ ch: 0, start: 0, len: 3, text: 'abc', id: 'x' });
    const out = cleanMarks([a, a, null, { text: '' }, { text: 'zz', len: 0 }, 5, { text: 'ok', ch: -3, start: 'q', len: 2, id: 'y' }]);
    assert.deepEqual(out.map(m => m.id), ['x', 'y']);
    assert.equal(out[1].ch, 0); assert.equal(out[1].start, 0);
    assert.deepEqual(cleanMarks('nope'), []);
});
test('Hinzufügen, Ändern, Entfernen, Treffer an einer Stelle', () => {
    let l = [];
    l = addMark(l, makeMark({ ch: 1, start: 10, len: 20, text: 'a'.repeat(20), id: 'big' }));
    l = addMark(l, makeMark({ ch: 1, start: 12, len: 4, text: 'aaaa', id: 'small' }));
    assert.equal(markAt(l, 1, 13).id, 'small');
    assert.equal(markAt(l, 1, 25).id, 'big');
    assert.equal(markAt(l, 1, 30), null);
    assert.equal(markAt(l, 0, 13), null);
    l = updateMark(l, 'small', { note: 'Notiz', color: 2 });
    assert.equal(l[1].note, 'Notiz'); assert.equal(l[1].color, 2); assert.equal(l[1].text, 'aaaa');
    l = removeMark(l, 'big'); assert.equal(l.length, 1);
});
test('relocate: gleiche Stelle, verschobene Stelle, verschwundenes Zitat', () => {
    const m = makeMark({ ch: 0, start: 4, len: 4, text: 'Welt' });
    assert.equal(relocate('Die Welt ist', m), 4);
    assert.equal(relocate('Vorwort. Die Welt ist', m), 13);
    assert.equal(relocate('Die Erde ist', m), -1);
    const near = relocate('Welt und Welt und Welt', makeMark({ ch: 0, start: 9, len: 4, text: 'Welt' }));
    assert.equal(near, 9);
});
test('toMarkdown: Kapitel, Zitate, Notizen, KI-Antworten', () => {
    const l = [
        makeMark({ ch: 1, start: 20, len: 3, text: 'Eis', color: 1, note: 'Merken', id: 'b' }),
        makeMark({ ch: 0, start: 5, len: 9, text: 'Zeile eins\nZeile zwei', color: 0, id: 'a', ai: true, model: 'gem', note: 'Antwort' }),
    ];
    const md = toMarkdown({ title: 'Buch', author: 'Autor' }, l, (c) => (c === 0 ? 'Vorwort' : ''), { color: ['gelb', 'grün', 'blau', 'rosa'], note: 'Notiz', ai: 'KI', count: '{n} Markierungen', part: 'Teil {n}' });
    assert.ok(md.startsWith('# Buch\n\n*Autor*\n\n2 Markierungen\n\n## Vorwort\n\n> Zeile eins\n> Zeile zwei *(gelb)*'));
    assert.ok(md.includes('**KI (gem):** Antwort'));
    assert.ok(md.includes('## Teil 2\n\n> Eis *(grün)*\n\n**Notiz:** Merken'));
    assert.deepEqual(sortMarks(l).map(m => m.id), ['a', 'b']);
});

test('Notiz zur Seite: ohne Text erlaubt, nur mit Notiz, sortiert nach Lesestand, Export', () => {
    const a = makeMark({ ch: 0, pn: true, frac: 0.5, text: 'Anfang der Seite', note: 'Später prüfen', id: 'a' });
    assert.equal(a.pn, true); assert.equal(a.len, 0); assert.equal(a.frac, 0.5);
    const b = makeMark({ ch: 0, start: 3, len: 4, text: 'Welt', id: 'b' });
    const out = cleanMarks([a, b, makeMark({ ch: 0, pn: true, frac: 0.1, text: 'x', note: '', id: 'leer' })]);
    assert.deepEqual(out.map(m => m.id), ['a', 'b']);
    assert.equal(markAt(out, 0, 3).id, 'b');
    assert.deepEqual(sortMarks(out).map(m => m.id), ['b', 'a']);
    const md = toMarkdown({ title: 'T' }, out, () => 'K', { color: ['g', 'g', 'g', 'g'], pageNote: 'Seitennotiz' });
    assert.ok(md.includes('> Anfang der Seite …\n\n**Seitennotiz:** Später prüfen'));
});
