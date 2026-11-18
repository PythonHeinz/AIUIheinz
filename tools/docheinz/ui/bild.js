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
