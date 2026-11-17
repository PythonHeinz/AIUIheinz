import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, writeZip, readZip } from '../../tools/docheinz/mod/zip.js';

const enc = new TextEncoder();
const FIXED = new Date(2026, 10, 17, 12, 0, 0);

test('crc32 of known values', () => {
    assert.equal(crc32(enc.encode('')), 0);
    assert.equal(crc32(enc.encode('123456789')), 0xCBF43926);
});

test('round trip with text, binary and empty entries', async () => {
    const bin = new Uint8Array(5000).map((_, i) => (i * 7) & 255);
    const z = await writeZip([
        { name: 'mimetype', data: 'application/epub+zip', store: true },
        { name: 'a/Ümlaut äöü.txt', data: 'Hallo '.repeat(500) },
        { name: 'bin.dat', data: bin },
        { name: 'leer.txt', data: '' },
    ], { date: FIXED });
    const r = await readZip(z);
    assert.deepEqual(r.entries.map(e => e.name), ['mimetype', 'a/Ümlaut äöü.txt', 'bin.dat', 'leer.txt']);
    assert.equal(r.entries[0].method, 0);
    assert.equal(r.entries[1].method, 8);
    assert.ok(r.entries[1].csize < r.entries[1].size);
    assert.equal(await r.text('mimetype'), 'application/epub+zip');
    assert.equal(await r.text('a/Ümlaut äöü.txt'), 'Hallo '.repeat(500));
    assert.deepEqual(await r.read('bin.dat'), bin);
    assert.equal((await r.read('leer.txt')).length, 0);
});

test('mimetype stays first and stored, local header starts with the name', async () => {
    const z = await writeZip([{ name: 'mimetype', data: 'application/epub+zip', store: true }, { name: 'x', data: 'y' }], { date: FIXED });
    assert.equal(new TextDecoder().decode(z.subarray(30, 38)), 'mimetype');
    assert.equal(new TextDecoder().decode(z.subarray(38, 58)), 'application/epub+zip');
});

test('same input gives the same bytes', async () => {
    const e = [{ name: 'a.txt', data: 'abc'.repeat(100) }];
    assert.deepEqual(await writeZip(e, { date: FIXED }), await writeZip(e, { date: FIXED }));
});

test('duplicate names, missing entries and broken files throw', async () => {
    await assert.rejects(writeZip([{ name: 'a', data: '1' }, { name: 'a', data: '2' }]), /doppelter Name/);
    const z = await writeZip([{ name: 'a.txt', data: 'abc'.repeat(100) }], { date: FIXED });
    const r = await readZip(z);
    await assert.rejects(r.read('nein'), /fehlt/);
    await assert.rejects(readZip(enc.encode('kein zip')), /kein Zip/);
    const bad = z.slice();
    bad[40] ^= 0xFF; // Inhalt beschädigen
    const rb = await readZip(bad);
    await assert.rejects(rb.read('a.txt'));
});

test('a zip with a comment at the end is still found', async () => {
    const z = await writeZip([{ name: 'a.txt', data: 'x' }], { date: FIXED });
    const c = new Uint8Array(z.length + 5);
    c.set(z);
    c[z.length - 2] = 5; // Kommentarlänge
    c.set(enc.encode('hallo'), z.length);
    assert.equal(await (await readZip(c)).text('a.txt'), 'x');
});
