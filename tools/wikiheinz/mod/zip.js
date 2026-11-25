/* tools/wikiheinz/mod/zip.js – ZIP ohne Kompression (Speichern), UTF-8-Dateinamen; für den Export von „Mein Wiki“ (rein, ohne Bibliothek).
 *   crc32(bytes) -> Zahl      zip([{ name, text | bytes }], datum?) -> Uint8Array */
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

export function zip(dateien, datum) {
    const d = datum instanceof Date ? datum : new Date(), enc = new TextEncoder();
    const zeit = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
    const tag = ((Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    const teile = [], zentral = []; let pos = 0;
    for (const f of dateien) {
        const name = enc.encode(f.name), data = f.bytes || enc.encode(f.text || ''), crc = crc32(data);
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, zeit, true); lh.setUint16(12, tag, true);
        lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, zeit, true); ch.setUint16(14, tag, true);
        ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, pos, true);
        teile.push(new Uint8Array(lh.buffer), name, data); zentral.push(new Uint8Array(ch.buffer), name);
        pos += 30 + name.length + data.length;
    }
    const zl = zentral.reduce((s, x) => s + x.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, dateien.length, true); end.setUint16(10, dateien.length, true); end.setUint32(12, zl, true); end.setUint32(16, pos, true);
    const alle = [...teile, ...zentral, new Uint8Array(end.buffer)], out = new Uint8Array(alle.reduce((s, x) => s + x.length, 0)); let o = 0;
    for (const x of alle) { out.set(x, o); o += x.length; }
    return out;
}
