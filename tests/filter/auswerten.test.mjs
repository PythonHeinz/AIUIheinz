import test from 'node:test';
import assert from 'node:assert/strict';
import { mitKontrolle, kontrollEtiketten, zaehlen, trefferquote, verwechslung, mischen, stichprobe, zufall, filtern, sortieren, kontrollWert } from '../../tools/filter/mod/auswerten.js';

const L = ['a', 'b'];
const R = [
    { index: 0, text: 't0', row: ['t0', 'a'], label: 'a' },
    { index: 1, text: 't1', row: ['t1', 'b/x'], label: 'a' },
    { index: 2, text: 't2', row: ['t2', 'b'], label: null },
    { index: 3, text: 't3', row: ['t3', ''], label: 'b', fehler: false },
    { index: 4, text: 't4', row: ['t4', 'a'], label: 'b' }
];

test('kontrolle: erwartet und treffer, Teil vor / zählt, ohne Kontrolle null', () => {
    const k = mitKontrolle(R, 1);
    assert.deepEqual(k.map(x => x.treffer), [true, false, false, null, false]);
    assert.equal(k[1].erwartet, 'b');
    assert.equal(kontrollWert('Öl / Fett'), 'Öl');
    assert.deepEqual(mitKontrolle(R, -1).map(x => x.treffer), [null, null, null, null, null]);
    assert.deepEqual(kontrollEtiketten(R.map(r => r.row), 1), ['a', 'b']);
});

test('zählen und trefferquote (unklar mit Kontrolle ist ein Fehlgriff)', () => {
    const k = mitKontrolle(R, 1);
    const z = zaehlen(k, L);
    assert.deepEqual([z.gesamt, z.unklar, z.je.a, z.je.b], [5, 1, 2, 2]);
    assert.equal(z.anteil.a, 0.4);
    const t = trefferquote(k);
    assert.deepEqual([t.geprueft, t.treffer, t.quote], [4, 1, 0.25]);
    assert.equal(trefferquote(mitKontrolle(R, -1)).quote, null);
    assert.equal(zaehlen([{ label: 'a', fehler: true }], L).fehler, 1);
});

test('verwechslungstabelle', () => {
    const v = verwechslung(mitKontrolle(R, 1), L);
    assert.deepEqual(v.zeilen, ['a', 'b']);
    assert.deepEqual(v.spalten, ['a', 'b', '?']);
    assert.equal(v.zelle('a', 'a'), 1); assert.equal(v.zelle('a', 'b'), 1);
    assert.equal(v.zelle('b', 'a'), 1); assert.equal(v.zelle('b', '?'), 1);
});

test('stichprobe: fester Startwert gibt gleiche Auswahl, anderer Startwert eine andere, keine Duplikate', () => {
    const l = Array.from({ length: 50 }, (_, i) => i);
    const a = stichprobe(l, 10, { zufaellig: true, seed: 7 }), b = stichprobe(l, 10, { zufaellig: true, seed: 7 }), c = stichprobe(l, 10, { zufaellig: true, seed: 8 });
    assert.deepEqual(a, b); assert.notDeepEqual(a, c);
    assert.equal(new Set(a).size, 10);
    assert.deepEqual(stichprobe(l, 3), [0, 1, 2], 'ohne Zufall die ersten n');
    assert.equal(stichprobe(l, 500).length, 50);
    assert.deepEqual(mischen(l, 1).slice().sort((x, y) => x - y), l, 'mischen verliert nichts');
    assert.deepEqual(l.slice(0, 3), [0, 1, 2], 'Quelle bleibt unverändert');
    const r = zufall(5); const x = r(); assert.ok(x >= 0 && x < 1);
});

test('filtern und sortieren', () => {
    const k = mitKontrolle(R, 1);
    assert.deepEqual(filtern(k, { labels: ['b'] }).map(x => x.index), [3, 4]);
    assert.deepEqual(filtern(k, { nurUnklar: true }).map(x => x.index), [2]);
    assert.deepEqual(filtern(k, { nurAbweichung: true }).map(x => x.index), [1, 2, 4]);
    assert.equal(filtern(k, {}).length, 5);
    assert.deepEqual(sortieren(k, 'label', L).map(x => x.index), [0, 1, 3, 4, 2], 'unklar zuletzt, stabil');
    assert.deepEqual(sortieren(k.slice().reverse(), 'index').map(x => x.index), [0, 1, 2, 3, 4]);
    assert.deepEqual(sortieren(k, 'text').map(x => x.text), ['t0', 't1', 't2', 't3', 't4']);
});
