import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { markdownToEpub } from '../../tools/convert2/mod/epub-schreiben.js';
import { readZip } from '../../tools/convert2/mod/zip.js';

const FIXED = new Date(Date.UTC(2026, 10, 17, 12, 0, 0));
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const MD = `# Buch & Co

Einleitung mit **Text**.

## Unterkapitel

| A | B |
|---|---|
| 1 | 2 |

![Bild](data:image/png;base64,${PNG})

![Extern](https://example.org/x.png)

# Zweites Kapitel

> [!NOTE] Hinweis

\`\`\`
# kein Kapitel
\`\`\`
`;

test('structure: mimetype first and stored, all parts, two chapters, image extracted', async () => {
    const z = await readZip(await markdownToEpub(MD, { date: FIXED, identifier: '11111111-2222-4333-8444-555555555555', language: 'de', author: 'Ich' }));
    const names = z.entries.map(e => e.name);
    assert.equal(names[0], 'mimetype');
    assert.equal(z.entries[0].method, 0);
    assert.equal(await z.text('mimetype'), 'application/epub+zip');
    assert.deepEqual(names.filter(n => n.startsWith('OEBPS/chapter')), ['OEBPS/chapter-001.xhtml', 'OEBPS/chapter-002.xhtml']);
    assert.ok(names.includes('OEBPS/images/img001.png'));
    const opf = await z.text('OEBPS/content.opf');
    assert.match(opf, /<dc:title>Buch &amp; Co<\/dc:title>/);
    assert.match(opf, /<dc:creator>Ich<\/dc:creator>/);
    assert.match(opf, /dcterms:modified">2026-11-17T12:00:00Z</);
    assert.match(opf, /urn:uuid:11111111-2222-4333-8444-555555555555/);
    const ch1 = await z.text('OEBPS/chapter-001.xhtml');
    assert.match(ch1, /<img src="images\/img001.png" alt="Bild" \/>/);
    assert.match(ch1, /<span class="alt">Extern<\/span>/);
    assert.doesNotMatch(ch1, /https:\/\/example/);
    const nav = await z.text('OEBPS/nav.xhtml');
    assert.match(nav, /<ol><li><a href="chapter-001.xhtml">Buch &amp; Co<\/a><ol><li><a href="chapter-001.xhtml#c1-2">Unterkapitel<\/a><\/li><\/ol><\/li><li><a href="chapter-002.xhtml">Zweites Kapitel<\/a><\/li><\/ol>/);
    assert.doesNotMatch(await z.text('OEBPS/chapter-001.xhtml'), /kein Kapitel/);
    assert.match(await z.text('OEBPS/chapter-002.xhtml'), /kein Kapitel/);
});

test('same input and date give identical bytes', async () => {
    const o = { date: FIXED, identifier: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' };
    assert.deepEqual(await markdownToEpub(MD, o), await markdownToEpub(MD, o));
});

test('document without headings is one chapter; only level-2 headings split at level 2', async () => {
    let z = await readZip(await markdownToEpub('Nur Text.', { date: FIXED, title: 'T' }));
    assert.equal(z.entries.filter(e => e.name.includes('chapter-')).length, 1);
    z = await readZip(await markdownToEpub('## A\n\nx\n\n## B\n\ny', { date: FIXED }));
    assert.equal(z.entries.filter(e => e.name.includes('chapter-')).length, 2);
});

test('every XML part is well-formed (python minidom) and the zip passes python zipfile', async () => {
    const bytes = await markdownToEpub(MD, { date: FIXED });
    const f = path.join(os.tmpdir(), 'c2_' + process.pid + '.epub');
    fs.writeFileSync(f, bytes);
    const py = `
import sys, zipfile, xml.dom.minidom as m
z = zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
assert z.namelist()[0] == 'mimetype' and z.getinfo('mimetype').compress_type == 0
for n in z.namelist():
    if n.endswith(('.xhtml', '.opf', '.xml', '.ncx')): m.parseString(z.read(n))
print('ok')`;
    assert.equal(execFileSync('python3', ['-c', py, f]).toString().trim(), 'ok');
    fs.unlinkSync(f);
});
