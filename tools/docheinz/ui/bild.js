/* tools/docheinz/ui/bild.js – Titelbild verkleinern (Canvas, lokal). scaleCover(bytes, type, max?) -> Promise<Blob|null> (JPEG, lange Seite höchstens max Pixel). */
export async function scaleCover(bytes, type, max = 720) {
    try {
        const bmp = await createImageBitmap(new Blob([bytes], { type }));
        const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);      // Transparenz auf Weiß
        g.drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
        return await new Promise(ok => c.toBlob(b => ok(b), 'image/jpeg', 0.82));
    } catch { return null; }
}

// Seitenfoto -> JPEG für das Foto-PDF: EXIF-Drehung wird übernommen, lange Seite höchstens max Pixel, Transparenz auf Weiß.
export async function photoToPage(file, max = 2200) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise(ok => c.toBlob(b => ok(b), 'image/jpeg', 0.88));
    if (!blob) throw new Error('jpeg');
    return { jpeg: new Uint8Array(await blob.arrayBuffer()), w, h };
}

// Für die Texterkennung: Graustufen und Kontrast spreizen (2 %- und 98 %-Perzentil), gleicht Schatten und graues Papier aus.
export function enhanceForOcr(canvas) {
    const g = canvas.getContext('2d'), img = g.getImageData(0, 0, canvas.width, canvas.height), d = img.data, hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) { const y = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8; d[i] = d[i + 1] = d[i + 2] = y; hist[y]++; }
    const total = d.length / 4; let acc = 0, lo = 0, hi = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.02) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.02) { hi = v; break; } }
    if (hi - lo < 40) { g.putImageData(img, 0, 0); return; }
    const k = 255 / (hi - lo);
    for (let i = 0; i < d.length; i += 4) { const v = Math.max(0, Math.min(255, (d[i] - lo) * k)); d[i] = d[i + 1] = d[i + 2] = v; }
    g.putImageData(img, 0, 0);
}
