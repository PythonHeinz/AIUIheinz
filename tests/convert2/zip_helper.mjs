// Hilfsskript für tests/test_convert2.py: "write <datei>" schreibt ein Zip, "read <datei>" gibt Namen und Inhalte als JSON aus.
import fs from 'node:fs';
import { writeZip, readZip } from '../../tools/convert2/mod/zip.js';
const [mode, file] = process.argv.slice(2);
if (mode === 'write') {
    const z = await writeZip([
        { name: 'mimetype', data: 'application/epub+zip', store: true },
        { name: 'ordner/text.txt', data: 'Grüße '.repeat(300) },
        { name: 'bin.dat', data: new Uint8Array(3000).map((_, i) => i & 255) },
    ], { date: new Date(2026, 10, 17, 12) });
    fs.writeFileSync(file, z);
} else {
    const r = await readZip(new Uint8Array(fs.readFileSync(file)));
    const out = {};
    for (const e of r.entries) out[e.name] = e.dir ? '' : (await r.text(e.name));
    console.log(JSON.stringify(out));
}
