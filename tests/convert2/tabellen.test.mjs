import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDelimited, detectDelimited, rowsToMd, jsonToMd, extractTables, FORMATS } from '../../tools/convert2/mod/tabellen.js';

const MD = 'Text\n\n| Name | Menge |\n|---|---|\n| Öl "rein" | 5 |\n| a\\|b | 7 |\n\n```\n| x | y |\n|---|---|\n```\n';
const T = extractTables(MD);

test('extractTables finds GFM tables, ignores code fences, pads rows', () => {
    assert.deepEqual(T, [[['Name', 'Menge'], ['Öl "rein"', '5'], ['a|b', '7']]]);
    assert.deepEqual(extractTables('a | b\n--|--\n1 |'), [[['a', 'b'], ['1', '']]]);
});

test('csv reader: quotes, doubled quotes, line breaks in cells, delimiters', () => {
    assert.deepEqual(parseDelimited('a,b\n"x, y","he said ""hi"""\n"zwei\nZeilen",3', ','), [['a', 'b'], ['x, y', 'he said "hi"'], ['zwei\nZeilen', '3']]);
    assert.deepEqual(parseDelimited('a;b\r\n1;2\r\n'), [['a', 'b'], ['1', '2']]);
    assert.deepEqual(parseDelimited('a\tb\n1\t\n'), [['a', 'b'], ['1', '']]);
    assert.deepEqual(parseDelimited('\uFEFFa;b\n"1;2";3'), [['a', 'b'], ['1;2', '3']]);
});

test('delimiter detection', () => {
    assert.equal(detectDelimited('a\tb\n1\t2').delimiter, '\t');
    assert.equal(detectDelimited('a;b\n1;2').delimiter, ';');
    assert.equal(detectDelimited('a,b,c\n1,2,3').delimiter, ',');
    assert.equal(detectDelimited('x, y und z\nein Satz.'), null);
    assert.equal(detectDelimited('a,b\n1,2,3'), null);
    assert.equal(detectDelimited('kein Trenner\nzweite Zeile'), null);
});

test('rowsToMd and jsonToMd', () => {
    assert.equal(rowsToMd([['a', 'b'], ['1|2', 'x\ny']]), '| a | b |\n| --- | --- |\n| 1\\|2 | x y |');
    assert.equal(jsonToMd([{ a: 1, b: 'x' }, { a: 2, c: null }]), '| a | b | c |\n| --- | --- | --- |\n| 1 | x |  |\n| 2 |  |  |');
    assert.match(jsonToMd({ a: 1 }), /^```json\n\{\n  "a": 1\n\}\n```$/);
});

test('csv round trip through the writer', () => {
    const out = FORMATS.csv(T, MD);
    assert.equal(out, '"Name","Menge"\n"Öl ""rein""","5"\n"a|b","7"');
    assert.deepEqual(parseDelimited(out, ','), T[0]);
    assert.equal(FORMATS.tsv(T, MD), 'Name\tMenge\nÖl "rein"\t5\na|b\t7');
});

test('ascii box uses character width', () => {
    assert.equal(FORMATS.asciiBox([[['a', 'bb'], ['Ö', '1']]], ''), '┌───┬────┐\n│ a │ bb │\n├───┼────┤\n│ Ö │ 1  │\n└───┴────┘');
});

test('json, yaml', () => {
    assert.deepEqual(JSON.parse(FORMATS.json(T, MD)), [{ Name: 'Öl "rein"', Menge: '5' }, { Name: 'a|b', Menge: '7' }]);
    assert.deepEqual(JSON.parse(FORMATS.json([], 'x')), { content: 'x' });
    assert.equal(FORMATS.yaml([[['Name', 'Menge in kg'], ['a "b"', '1']]], ''), '-\n  Name: "a \\"b\\""\n  "Menge in kg": "1"\n');
});

test('latex, typst, asciidoc, dita escape their cells', () => {
    const t = [[['a_b', '50%'], ['x & y', '#1']]];
    assert.equal(FORMATS.latex(t, ''), '\\begin{tabular}{ll}\n\\hline\na\\_b & 50\\% \\\\\n\\hline\nx \\& y & \\#1 \\\\\n\\hline\n\\end{tabular}');
    assert.match(FORMATS.typst(t, ''), /columns: 2,\n  \[a\\_b\],\n  \[50%\],\n  \[x &y\]|columns: 2/);
    assert.match(FORMATS.typst(t, ''), /\[\\#1\]/);
    assert.match(FORMATS.asciidoc([[['a|b', 'c']]], ''), /\| a\\\|b\n/);
    assert.equal(FORMATS.ditaxml([[['<h>', 'x'], ['1', '2']]], ''), '<table>\n  <tgroup cols="2">\n    <thead>\n      <row>\n        <entry>&lt;h&gt;</entry>\n        <entry>x</entry>\n      </row>\n    </thead>\n    <tbody>\n      <row>\n        <entry>1</entry>\n        <entry>2</entry>\n      </row>\n    </tbody>\n  </tgroup>\n</table>');
});

test('fallbacks without tables', () => {
    assert.equal(FORMATS.csv([], 'nur Text'), 'nur Text');
    assert.equal(FORMATS.latex([], '50% & mehr'), '50\\% \\& mehr');
    assert.equal(FORMATS.ditaxml([], 'a<b'), '<p>a&lt;b</p>');
});

test('bbcode: inline, headings, lists, quotes, code, tables, links', () => {
    const out = FORMATS.bbcode([], '# Titel\n\n**fett** *kursiv* [x](https://a.de)\n\n- a\n- b\n\n> zitat\n\n```\ncode\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    assert.equal(out, '[size=6][b]Titel[/b][/size]\n\n[b]fett[/b] [i]kursiv[/i] [url=https://a.de]x[/url]\n\n[list]\n[*]a\n[*]b\n[/list]\n\n[quote]zitat[/quote]\n\n[code]\ncode\n[/code]\n\n[table]\n[tr][th]a[/th][th]b[/th][/tr]\n[tr][td]1[/td][td]2[/td][/tr]\n[/table]');
});
