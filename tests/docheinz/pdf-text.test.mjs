import test from 'node:test';
import assert from 'node:assert/strict';
import { orderPage, furnitureKeys, dropFurniture, baseSize, toBlocks, joinPages, blocksToHtml } from '../../tools/docheinz/mod/pdf-text.js';

const it = (s, x, y, fs = 10, w) => ({ s, x, y, fs, w: w ?? s.length * fs * 0.5 });

test('Stücke werden zu Zeilen, Lücken werden Leerzeichen', () => {
    const l = orderPage([it('Hallo', 50, 100), it('Welt', 90, 100), it('Zwei', 50, 114)]);
    assert.deepEqual(l.map(x => x.s), ['Hallo Welt', 'Zwei']);
});
test('zwei Spalten: erst links, dann rechts', () => {
    const items = [];
    for (let i = 0; i < 6; i++) { items.push(it('linke Spalte Zeile ' + i + ' mit etwas Text', 50, 100 + i * 14, 10, 200)); items.push(it('rechte Spalte Zeile ' + i + ' mit etwas Text', 320, 100 + i * 14, 10, 200)); }
    const l = orderPage(items).map(x => x.s);
    assert.equal(l[0], 'linke Spalte Zeile 0 mit etwas Text'); assert.equal(l[5], 'linke Spalte Zeile 5 mit etwas Text'); assert.equal(l[6], 'rechte Spalte Zeile 0 mit etwas Text');
});
test('Kopf-/Fußzeilen und Seitenzahlen fallen weg', () => {
    const pages = [1, 2, 3].map(n => ({ h: 800, lines: [{ s: 'Mein Buch', x0: 50, x1: 120, y: 30, fs: 9 }, { s: 'Inhalt ' + n, x0: 50, x1: 200, y: 400, fs: 10 }, { s: String(n), x0: 300, x1: 310, y: 780, fs: 9 }] }));
    const keys = furnitureKeys(pages);
    assert.deepEqual(dropFurniture(pages[1].lines, 800, keys).map(l => l.s), ['Inhalt 2']);
});
test('große Zeilen oben (Kapitelüberschrift) bleiben trotz Wiederholung', () => {
    const pages = [1, 2, 3].map(n => ({ h: 800, lines: [{ s: 'Kapitel ' + n, x0: 50, x1: 120, y: 30, fs: 20 }] }));
    const keys = furnitureKeys(pages);
    assert.equal(dropFurniture(pages[0].lines, 800, keys, 10).length, 1);
});
test('Absätze, Überschrift, Aufzählung, Silbentrennung', () => {
    const L = (s, y, fs = 10, x0 = 50) => ({ s, x0, x1: 400, y, fs });
    const lines = [L('Kapitel Eins', 60, 20), L('Dies ist ein Satz, der mit einer Sil-', 100), L('bentrennung weitergeht und endet.', 112), L('Neuer Absatz beginnt hier.', 140), L('• Punkt A', 160), L('• Punkt B', 172)];
    const b = toBlocks(lines, 10);
    assert.equal(b[0].t, 'h'); assert.equal(b[0].l, 2);
    assert.equal(b[1].text, 'Dies ist ein Satz, der mit einer Silbentrennung weitergeht und endet.');
    assert.equal(b[2].text, 'Neuer Absatz beginnt hier.');
    assert.deepEqual(b.slice(3).map(x => [x.t, x.text]), [['li', 'Punkt A'], ['li', 'Punkt B']]);
    assert.equal(baseSize(lines), 10);
});
test('Absatz über Seitenumbruch wird verbunden, HTML maskiert', () => {
    const j = joinPages([[{ t: 'p', text: 'Ende ohne Punkt' }], [{ t: 'p', text: 'und weiter <b>' }, { t: 'h', l: 3, text: 'X' }]]);
    assert.equal(j.length, 2); assert.equal(j[0].text, 'Ende ohne Punkt und weiter <b>');
    assert.equal(blocksToHtml(j), '<p>Ende ohne Punkt und weiter &lt;b&gt;</p>\n<h3>X</h3>\n');
});
