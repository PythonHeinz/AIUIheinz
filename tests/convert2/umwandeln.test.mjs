import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMAT_LIST, convertMarkdown } from '../../tools/convert2/mod/umwandeln.js';
import { readZip } from '../../tools/convert2/mod/zip.js';

const MD = '# Liste\n\nText **fett**.\n\n| Name | Menge |\n|---|---|\n| Öl | 5 |\n';

test('sixteen formats, unique ids', () => {
    assert.equal(FORMAT_LIST.length, 16);
    assert.equal(new Set(FORMAT_LIST.map(f => f.id)).size, 16);
});

test('every format converts the same document without error', async () => {
    for (const f of FORMAT_LIST) {
        const r = await convertMarkdown(MD, f.id, { date: new Date(Date.UTC(2026, 10, 17)) });
        assert.equal(r.ext, f.ext);
        assert.match(r.html, /<table>/);
        if (f.kind === 'binary') assert.ok(r.bytes instanceof Uint8Array && r.bytes.length > 500, f.id);
        else assert.ok(r.text.length > 0, f.id);
    }
});

test('selected outputs', async () => {
    assert.equal((await convertMarkdown(MD, 'csv')).text, '"Name","Menge"\n"Öl","5"');
    assert.equal((await convertMarkdown(MD, 'tsv')).text, 'Name\tMenge\nÖl\t5');
    assert.equal((await convertMarkdown(MD, 'plaintext')).text, 'Liste\n\nText fett.\n\nName  |  Menge\nÖl  |  5');
    assert.equal((await convertMarkdown(MD, 'markdown')).text, MD.trim());
    const raw = (await convertMarkdown(MD, 'htmlRaw', { title: 'A & B' })).text;
    assert.match(raw, /^<!DOCTYPE html>[\s\S]*<title>A &amp; B<\/title>[\s\S]*<table>/);
    assert.equal((await convertMarkdown(MD, 'pdf')).kind, 'print');
});

test('epub has the title of the first heading and opens as zip', async () => {
    const r = await convertMarkdown(MD, 'epub');
    const z = await readZip(r.bytes);
    assert.match(await z.text('OEBPS/content.opf'), /<dc:title>Liste<\/dc:title>/);
});

test('text without tables falls back, unknown format throws', async () => {
    assert.equal((await convertMarkdown('nur Text', 'csv')).text, 'nur Text');
    await assert.rejects(convertMarkdown('x', 'docx'), /unbekanntes Format/);
});

test('invisible characters are cleaned before conversion', async () => {
    assert.equal((await convertMarkdown('a b​', 'plaintext')).text, 'a b');
});
