import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONE, clampPage, pageCount, fracOfPage, fracEnd, pageOfFrac, pageOfOffset, zoneOf, turn } from '../../tools/docheinz/mod/seiten.js';
import { FONTS, fontOf, isFont, DEFAULT_FONT } from '../../tools/docheinz/mod/schriften.js';

test('page count and clamping', () => {
    assert.equal(pageCount(1000, 100), 10);
    assert.equal(pageCount(0, 100), 1);
    assert.equal(clampPage(-3, 5), 0);
    assert.equal(clampPage(9, 5), 4);
});
test('fractions round-trip', () => {
    for (const n of [1, 7, 40]) for (let i = 0; i < n; i++) assert.equal(pageOfFrac(fracOfPage(i, n), n), i);
    assert.equal(fracEnd(9, 10), 1);
    assert.equal(pageOfFrac(1, 10), 9);
    assert.equal(pageOfOffset(250, 100, 10), 2);
});
test('tap zones', () => {
    assert.equal(zoneOf(200, 5, 400, 800), 'top');
    assert.equal(zoneOf(380, 400, 400, 800), 'next');
    assert.equal(zoneOf(10, 400, 400, 800), 'prev');
    assert.equal(zoneOf(200, 400, 400, 800), 'none');
    assert.ok(ZONE.top < 0.3 && ZONE.side < 0.5);
});
test('turn across chapters', () => {
    assert.deepEqual(turn({ ch: 0, page: 0 }, 1, 3, 2), { ch: 0, page: 1 });
    assert.deepEqual(turn({ ch: 0, page: 2 }, 1, 3, 2), { ch: 1, page: 'first' });
    assert.deepEqual(turn({ ch: 1, page: 0 }, -1, 3, 2), { ch: 0, page: 'last' });
    assert.equal(turn({ ch: 0, page: 0 }, -1, 3, 2), null);
    assert.equal(turn({ ch: 1, page: 2 }, 1, 3, 2), null);
});
test('fonts', () => {
    assert.ok(isFont(DEFAULT_FONT));
    assert.ok(!isFont('comic'));
    assert.equal(fontOf('nope').id, DEFAULT_FONT);
    assert.equal(FONTS.length, 7);
    for (const f of FONTS) assert.ok(f.label.en && f.label.de);
});
