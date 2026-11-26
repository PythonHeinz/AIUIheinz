import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, zip } from '../../lib/wissen/zip.js';
import { writeFileSync } from 'node:fs';

test('crc32: bekannter Wert', () => { assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926); });
test('zip: Kopf, Dateizahl, Umlaut im Namen; Datei für den Python-Test, wenn gewünscht', () => {
    const z = zip([{ name: 'Äpfel.md', text: 'Größe' }, { name: 'B.md', text: '' }], new Date(2026, 10, 25, 12, 0, 0));
    assert.equal(new DataView(z.buffer).getUint32(0, true), 0x04034b50);
    assert.equal(new DataView(z.buffer).getUint16(z.length - 22 + 10, true), 2);
    if (process.env.WIKI_ZIP_OUT) writeFileSync(process.env.WIKI_ZIP_OUT, z);
});
