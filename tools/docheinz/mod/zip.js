/* KOPIE aus tools/convert2/mod (Entscheidung A, 17.11.2026): Pflege in beiden Werkzeugen, bei Änderungen beide Stellen abgleichen. */
/* tools/convert2/mod/zip.js – Zip lesen und schreiben ohne Bibliothek (Insel-Modul, keine Verweise auf die Oberfläche).
 * ES module. Nutzt nur CompressionStream/DecompressionStream ('deflate-raw'), TextEncoder/TextDecoder, Uint8Array.
 *   crc32(bytes)                         -> Zahl (unsigned)
 *   writeZip(entries, opts?)             -> Promise<Uint8Array>
 *       entries: [{ name, data: string|Uint8Array, store?: boolean }]  (Reihenfolge bleibt, store = nie komprimieren)
 *       opts: { date?: Date }  (Standard: jetzt; für feste Testdateien setzen)
 *   readZip(bytes)                       -> Promise<{ entries: [{name,size,csize,method,dir}], has(name), read(name) -> Promise<Uint8Array>, text(name) -> Promise<string> }>
 * Grenzen: kein ZIP64, keine Verschlüsselung, Methoden 0 (STORE) und 8 (DEFLATE). Fehler werden als Error('zip: …') geworfen. */

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8');

let TABLE = null;
export function crc32(bytes) {
    if (!TABLE) {
        TABLE = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            TABLE[n] = c >>> 0;
        }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function toBytes(d) { return typeof d === 'string' ? enc.encode(d) : d; }

async function pipe(bytes, stream) {
    const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await out.arrayBuffer());
}
const deflateRaw = (b) => pipe(b, new CompressionStream('deflate-raw'));
const inflateRaw = (b) => pipe(b, new DecompressionStream('deflate-raw'));

function dosTime(d) { return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF; }
function dosDate(d) { return ((Math.max(d.getFullYear() - 1980, 0) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF; }

export async function writeZip(entries, opts = {}) {
    const date = opts.date || new Date();
    const t = dosTime(date), dd = dosDate(date);
    const parts = [];
    const central = [];
    let offset = 0;
    const seen = new Set();
    for (const e of entries) {
        if (seen.has(e.name)) throw new Error('zip: doppelter Name ' + e.name);
        seen.add(e.name);
        const name = enc.encode(e.name);
        const raw = toBytes(e.data);
        const crc = crc32(raw);
        let method = 0, body = raw;
        if (!e.store && raw.length > 0) {
            const z = await deflateRaw(raw);
            if (z.length < raw.length) { method = 8; body = z; }
        }
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
        lh.setUint16(8, method, true); lh.setUint16(10, t, true); lh.setUint16(12, dd, true);
        lh.setUint32(14, crc, true); lh.setUint32(18, body.length, true); lh.setUint32(22, raw.length, true);
        lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
        parts.push(new Uint8Array(lh.buffer), name, body);
        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
        ch.setUint16(10, method, true); ch.setUint16(12, t, true); ch.setUint16(14, dd, true);
        ch.setUint32(16, crc, true); ch.setUint32(20, body.length, true); ch.setUint32(24, raw.length, true);
        ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), name);
        offset += 30 + name.length + body.length;
    }
    if (entries.length > 0xFFFF || offset > 0xFFFFFFFF) throw new Error('zip: zu groß (kein ZIP64)');
    let csize = 0;
    for (const c of central) csize += c.length;
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    let total = 0;
    for (const p of all) total += p.length;
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of all) { out.set(p, o); o += p.length; }
    return out;
}

export async function readZip(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
        if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('zip: kein Zip (Ende des Verzeichnisses fehlt)');
    const count = v.getUint16(eocd + 10, true);
    let p = v.getUint32(eocd + 16, true);
    if (count === 0xFFFF || p === 0xFFFFFFFF) throw new Error('zip: ZIP64 wird nicht unterstützt');
    const entries = [];
    const index = new Map();
    for (let n = 0; n < count; n++) {
        if (p + 46 > bytes.length || v.getUint32(p, true) !== 0x02014b50) throw new Error('zip: Verzeichnis beschädigt');
        const flags = v.getUint16(p + 8, true);
        if (flags & 1) throw new Error('zip: verschlüsselte Einträge werden nicht unterstützt');
        const method = v.getUint16(p + 10, true);
        const crc = v.getUint32(p + 16, true);
        const csize = v.getUint32(p + 20, true);
        const size = v.getUint32(p + 24, true);
        const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true);
        const lho = v.getUint32(p + 42, true);
        const name = dec.decode(bytes.subarray(p + 46, p + 46 + nl));
        const e = { name, size, csize, method, dir: name.endsWith('/'), crc, lho };
        entries.push(e);
        index.set(name, e);
        p += 46 + nl + xl + cl;
    }
    async function read(name) {
        const e = index.get(name);
        if (!e) throw new Error('zip: Eintrag fehlt: ' + name);
        const o = e.lho;
        if (v.getUint32(o, true) !== 0x04034b50) throw new Error('zip: lokaler Kopf beschädigt: ' + name);
        const start = o + 30 + v.getUint16(o + 26, true) + v.getUint16(o + 28, true);
        const body = bytes.subarray(start, start + e.csize);
        let data;
        if (e.method === 0) data = body.slice();
        else if (e.method === 8) data = await inflateRaw(body);
        else throw new Error('zip: Methode ' + e.method + ' wird nicht unterstützt');
        if (data.length !== e.size || crc32(data) !== e.crc) throw new Error('zip: Prüfsumme falsch: ' + name);
        return data;
    }
    return {
        entries: entries.map(({ name, size, csize, method, dir }) => ({ name, size, csize, method, dir })),
        has: (name) => index.has(name),
        read,
        text: async (name) => dec.decode(await read(name)),
    };
}
