import test from 'node:test';
import assert from 'node:assert/strict';
import { escHtml, escLatex, escYaml, clean, fileName } from '../../tools/docheinz/mod/text.js';
import { mdToHtml, mdToPlain, sections, headings, splitTableRow, isTableSeparator } from '../../tools/docheinz/mod/markdown.js';

test('escapes', () => {
    assert.equal(escHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
    assert.equal(escLatex('50% & a_b #1 \\ ~ ^'), '50\\% \\& a\\_b \\#1 \\textbackslash{} \\textasciitilde{} \\textasciicircum{}');
    assert.equal(escYaml('a "b"\nc'), 'a \\"b\\"\\nc');
});

test('clean removes invisible characters, normalises line ends and blank lines', () => {
    assert.equal(clean('a b​c\r\n\r\n\r\n\r\nd  \n'), 'a bc\n\nd');
    assert.equal(clean('Text [1] und [2, 3] hier【4:0†source】', { citations: true }), 'Text und hier');
    assert.equal(clean('Text [1]'), 'Text [1]');
});

test('fileName is safe', () => {
    assert.equal(fileName('Äpfel & Birnen: Ein *Test*!', 'epub'), 'Apfel_Birnen_Ein_Test.epub');
    assert.equal(fileName('', 'md'), 'convert2.md');
    assert.equal(fileName('../../etc/passwd', 'txt'), 'etcpasswd.txt');
});

test('inline formats and escaping', () => {
    const h = mdToHtml('**fett** *kursiv* ~~weg~~ `a<b` \\*kein\\* <script>alert(1)</script>');
    assert.equal(h, '<p><strong>fett</strong> <em>kursiv</em> <del>weg</del> <code>a&lt;b</code> *kein* &lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('links: only safe addresses; underscores in URLs stay intact', () => {
    assert.equal(mdToHtml('[x](https://a.de/a_b_c)'), '<p><a href="https://a.de/a_b_c">x</a></p>');
    assert.equal(mdToHtml('[x](javascript:alert(1))'), '<p>[x](javascript:alert(1))</p>');
    assert.match(mdToHtml('![b](data:image/png;base64,AAAA)'), /<img src="data:image\/png;base64,AAAA" alt="b" \/>/);
    assert.doesNotMatch(mdToHtml('![b](data:text/html;base64,AAAA)'), /<img/);
});

test('blocks: headings, lists, quotes, code, rules', () => {
    const h = mdToHtml('# A\n\n- x\n  - y\n- z\n\n1. a\n2. b\n\n> zitat\n\n```js\nif (a<b) {}\n```\n\n---');
    assert.equal(h, '<h1>A</h1>\n<ul>\n<li>x\n<ul>\n<li>y</li>\n</ul></li>\n<li>z</li>\n</ul>\n<ol>\n<li>a</li>\n<li>b</li>\n</ol>\n<blockquote><p>zitat</p></blockquote>\n<pre><code class="language-js">if (a&lt;b) {}</code></pre>\n<hr />');
});

test('callouts use the given labels', () => {
    assert.match(mdToHtml('> [!WARNING] Heiß', { labels: { WARNING: 'Warnung' } }), /callout-warning"><p><strong>Warnung:<\/strong> Heiß/);
});

test('tables: header, alignment, escaped pipe, short rows padded', () => {
    const h = mdToHtml('| A | B |\n|:-:|--:|\n| 1 \\| 2 |\n');
    assert.equal(h, '<table><thead><tr><th style="text-align:center">A</th><th style="text-align:right">B</th></tr></thead><tbody><tr><td style="text-align:center">1 | 2</td><td style="text-align:right"></td></tr></tbody></table>');
    assert.deepEqual(splitTableRow('| a \\| b | c |'), ['a | b', 'c']);
    assert.ok(isTableSeparator('|---|:--:|'));
    assert.ok(!isTableSeparator('---'));
});

test('output is well-formed XML for a mixed document', async () => {
    const h = mdToHtml('# T\n\nA<br>B & C\n\n- [ ] auf\n- [x] zu\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n![x](https://a.de/i.png?a=1&b=2)\n\nzwei  \nZeilen');
    const { execFileSync } = await import('node:child_process');
    const py = 'import sys,xml.dom.minidom as m; m.parseString("<r>"+sys.stdin.read()+"</r>")';
    execFileSync('python3', ['-c', py], { input: h });
});

test('plain text', () => {
    assert.equal(mdToPlain('# T\n\n**a** [l](https://x.de)\n\n- p\n\n| a | b |\n|---|---|\n| 1 | 2 |'), 'T\n\na l (https://x.de)\n\n• p\n\na  |  b\n1  |  2');
});

test('sections and headings ignore code fences', () => {
    const md = 'vor\n\n# Eins\ntext\n```\n# kein Kapitel\n```\n## Unter\n# Zwei\nende';
    assert.deepEqual(sections(md).map(s => s.title), ['', 'Eins', 'Zwei']);
    assert.deepEqual(headings(md).map(h => h.level + h.text), ['1Eins', '2Unter', '1Zwei']);
    assert.equal(sections(md, 2).length, 4);
});
