import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, LIMITS, clean, full, sameAsDefaults } from '../../tools/docheinz/mod/satz.js';

test('clean begrenzt Zahlen, prüft Schalter und Farben und lässt Unbekanntes weg', () => {
    const r = clean({ lh: 9, mx: -5, cols: 3, just: 2, fgc: '#ABCDEF', bgc: 'rot', evil: 1, size: '22' });
    assert.equal(r.lh, LIMITS.lh[1]); assert.equal(r.mx, 0); assert.equal(r.cols, 1); assert.equal(r.just, 1);
    assert.equal(r.fgc, '#abcdef'); assert.ok(!('bgc' in r)); assert.ok(!('evil' in r)); assert.equal(r.size, 22);
});
test('Teilobjekte bleiben teilweise, full ergänzt Standard, global und Buch', () => {
    assert.deepEqual(clean({ lh: 2 }), { lh: 2 });
    const f = full({ lh: 1.8, size: 24 }, { lh: 2.2 });
    assert.equal(f.lh, 2.2); assert.equal(f.size, 24); assert.equal(f.mx, DEFAULTS.mx);
});
test('Thema und Schrift werden nur mit gültigem Wert übernommen', () => {
    const ctx = { themes: ['auto', 'custom'], isFont: (f) => f === 'serif' };
    assert.deepEqual(clean({ theme: 'custom', font: 'serif' }, ctx), { theme: 'custom', font: 'serif' });
    assert.deepEqual(clean({ theme: 'x', font: 'y' }, ctx), {});
});
test('sameAsDefaults', () => { assert.ok(sameAsDefaults({})); assert.ok(sameAsDefaults({ lh: 1.65 })); assert.ok(!sameAsDefaults({ lh: 2 })); });
