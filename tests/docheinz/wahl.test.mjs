import test from 'node:test';
import assert from 'node:assert/strict';
import { wordBounds, isWordChar } from '../../tools/docheinz/mod/wahl.js';

test('Wort in der Mitte, am Rand und direkt hinter dem Wort', () => {
    const t = 'Der Übermensch kommt.';
    assert.deepEqual(wordBounds(t, 6), [4, 14]);
    assert.deepEqual(wordBounds(t, 4), [4, 14]);
    assert.deepEqual(wordBounds(t, 14), [4, 14]);
    assert.deepEqual(wordBounds(t, 0), [0, 3]);
});
test('Leerzeichen und Satzzeichen ergeben kein Wort', () => {
    assert.equal(wordBounds('a  b', 2), null);
    assert.equal(wordBounds('', 0), null);
    assert.equal(wordBounds('...', 1), null);
});
test('Bindestrich und Apostroph nur zwischen Buchstaben', () => {
    assert.deepEqual(wordBounds('Hand-in-Hand', 2), [0, 12]);
    assert.deepEqual(wordBounds("it's", 1), [0, 4]);
    assert.deepEqual(wordBounds('wort- und', 2), [0, 4]);
});
test('isWordChar', () => { assert.ok(isWordChar('ß')); assert.ok(isWordChar('7')); assert.ok(!isWordChar(' ')); });
