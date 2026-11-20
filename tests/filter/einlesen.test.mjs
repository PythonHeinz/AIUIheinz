import test from 'node:test';
import assert from 'node:assert/strict';
import { einlesen, eintraege, detectDelim, parseCSV } from '../../tools/filter/mod/einlesen.js';

test('csv: Anführungszeichen, Umbruch in Zelle, Trenner ; und Tab', () => {
    const d = einlesen('Name;Text;Kat\n"A";"zwei\nZeilen; mit Semikolon";x\nB;"sagt ""hi""";y', 'a.csv');
    assert.equal(d.kind, 'table');
    assert.deepEqual(d.headers, ['Name', 'Text', 'Kat']);
    assert.deepEqual(d.rows, [['A', 'zwei\nZeilen; mit Semikolon', 'x'], ['B', 'sagt "hi"', 'y']]);
    assert.equal(detectDelim('a\tb\tc'), '\t');
    assert.deepEqual(einlesen('a\tb\n1\t2', 'x.tsv').rows, [['1', '2']]);
    assert.deepEqual(parseCSV('﻿a,b\n1,2').slice(0, 1), [['a', 'b']]);
});

test('csv ohne Dateiname wird erkannt, Fließtext mit Kommas nicht', () => {
    assert.equal(einlesen('a,b\n1,2\n3,4').kind, 'table');
    const t = einlesen('Heute war es schön, wirklich.\nMorgen auch, hoffe ich.');
    assert.equal(t.kind, 'text');
    assert.deepEqual(t.rows, [['Heute war es schön, wirklich.'], ['Morgen auch, hoffe ich.']]);
});

test('csv: kurze Zeilen werden aufgefüllt, leere Kopfzellen benannt', () => {
    const d = einlesen('a,,c\n1,2\n3,4,5', 'x.csv');
    assert.deepEqual(d.headers, ['a', 'col 2', 'c']);
    assert.deepEqual(d.rows, [['1', '2', ''], ['3', '4', '5']]);
});

test('json: Objekte (Feldliste aus allen Schlüsseln), Texte, Hüllobjekt', () => {
    const d = einlesen('[{"t":"x","n":1},{"t":"y","extra":{"k":1}}]', 'a.json');
    assert.deepEqual(d.headers, ['t', 'n', 'extra']);
    assert.deepEqual(d.rows, [['x', '1', ''], ['y', '', '{"k":1}']]);
    assert.deepEqual(einlesen('["a","b"]').rows, [['a'], ['b']]);
    assert.deepEqual(einlesen('{"items":[{"t":"q"}]}').rows, [['q']]);
    assert.equal(einlesen('{kaputt', 'a.json').format, 'error');
});

test('rss und atom: ein Eintrag je item/entry, CDATA, Entitäten, Link', () => {
    const rss = '<?xml version="1.0"?><rss><channel><title>Feed</title><item><title><![CDATA[Hallo & Welt]]></title><description>&lt;p&gt;Text&lt;/p&gt;</description><link>http://a</link></item><item><title>Zwei &amp; mehr</title></item></channel></rss>';
    const d = einlesen(rss, 'f.xml');
    assert.deepEqual(d.headers, ['title', 'summary', 'link']);
    assert.deepEqual(d.rows, [['Hallo & Welt', 'Text', 'http://a'], ['Zwei & mehr', '', '']]);
    const atom = '<feed><title>F</title><entry><title>Eins</title><summary>s</summary><link href="http://b"/></entry></feed>';
    assert.deepEqual(einlesen(atom).rows, [['Eins', 's', 'http://b']]);
});

test('klartext: Zeile oder Absatz je Eintrag, leere weg', () => {
    assert.deepEqual(einlesen('eins\n\n  zwei  \r\ndrei').rows, [['eins'], ['zwei'], ['drei']]);
    assert.deepEqual(einlesen('a\nb\n\nc\nd\n\n\ne', '', { absatz: true }).rows, [['a b'], ['c d'], ['e']]);
    assert.deepEqual(einlesen('').rows, []);
});

test('eintraege: gewählte Spalten zusammenfassen, leere Einträge fallen weg, row bleibt', () => {
    const d = einlesen('t,u,k\nA,B,x\n,,y\nC,,z', 'a.csv');
    const e = eintraege(d, [0, 1]);
    assert.deepEqual(e.map(x => x.text), ['A · B', 'C']);
    assert.deepEqual(e[1].row, ['C', '', 'z']);
    assert.equal(e[1].index, 2);
    assert.deepEqual(eintraege(einlesen('x\ny'), []).map(x => x.text), ['x', 'y']);
});
