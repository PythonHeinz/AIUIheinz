import test from 'node:test';
import assert from 'node:assert/strict';
import { tabelle, zuCSV, zuTSV, zuMarkdown, zuJSON, exportiere } from '../../tools/filter/mod/ausgabe.js';
import { mitKontrolle } from '../../tools/filter/mod/auswerten.js';
import { einlesen } from '../../tools/filter/mod/einlesen.js';

const D = einlesen('Titel,Kat\n"Hallo, Welt",x\n"zwei\nZeilen",y', 'a.csv');
const mk = (label, i) => ({ index: i, text: D.rows[i][0], row: D.rows[i], label, grund: label ? 'weil' : '' });
const ERG = mitKontrolle([mk('a', 0), mk(null, 1)], 1);

test('tabelle: Quellspalten plus label, reason, control', () => {
    const t = tabelle(ERG, { headers: D.headers, mitGrund: true, mitKontrolle: true });
    assert.deepEqual(t.head, ['Titel', 'Kat', 'label', 'reason', 'control', 'match']);
    assert.deepEqual(t.rows[0], ['Hallo, Welt', 'x', 'a', 'weil', 'x', 'no']);
    assert.deepEqual(t.rows[1].slice(2, 3), ['(unclear)']);
    assert.deepEqual(tabelle([{ index: 0, text: 'x', label: 'a' }], {}).head, ['entry', 'label']);
});

test('csv: Anführungszeichen, BOM, Umbruch in Zelle bleibt lesbar', () => {
    const t = tabelle(ERG, { headers: D.headers });
    const c = zuCSV(t, { bom: true });
    assert.ok(c.startsWith('﻿"Titel","Kat","label"'));
    assert.match(c, /"zwei\nZeilen"/);
    assert.equal(zuCSV({ head: ['a'], rows: [['x"y']] }), '"a"\n"x""y"\n');
});

test('tsv für Sheets: Tab und Umbruch gequotet, einfache Zellen nackt', () => {
    assert.equal(zuTSV({ head: ['a', 'b'], rows: [['x\ty', 'z'], ['p\nq', 'r"s'], ['1', '2']] }), 'a\tb\n"x\ty"\tz\n"p\nq"\t"r""s"\n1\t2\n');
});

test('markdown: Pipe maskiert, Umbruch weg', () => {
    assert.equal(zuMarkdown({ head: ['a', 'b'], rows: [['x|y', 'p\nq']] }), '| a | b |\n|---|---|\n| x\\|y | p q |\n');
});

test('json: Quellfelder als Objekt, unklar als null, Kontrolle', () => {
    const j = JSON.parse(zuJSON(ERG, { headers: D.headers }));
    assert.deepEqual(j[0], { entry: 'Hallo, Welt', label: 'a', reason: 'weil', control: 'x', match: false, row: { Titel: 'Hallo, Welt', Kat: 'x' } });
    assert.equal(j[1].label, null);
});

test('exportiere: Name, Mime, Text je Format; unbekannt wirft', () => {
    assert.deepEqual(['csv', 'tsv', 'json', 'md'].map(f => exportiere(f, ERG, { headers: D.headers }).name), ['heinz-filter.csv', 'heinz-filter.tsv', 'heinz-filter.json', 'heinz-filter.md']);
    assert.throws(() => exportiere('xls', ERG, {}));
});
