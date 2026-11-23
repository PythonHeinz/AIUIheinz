/* tools/docheinz/ui/seite.js – Seitenfoto für die Texterkennung vorbereiten (Canvas, lokal).
 *   inkMap(canvas, long=900)     -> { w, h, ink }   ink[y*w+x] = 1 bei Strichen (dunkler als die lokale Umgebung; Schatten zählen nicht)
 *   textAxis(map)                -> 0 (Zeilen waagerecht) | 90 (Zeilen senkrecht)
 *   gutterAt(map)                -> Anteil 0..1 der Buchfalz bei Doppelseiten, sonst null
 *   rotated(canvas, deg)         -> neues Canvas, im Uhrzeigersinn gedreht (90, 180, 270)
 *   cropped(canvas, x0, x1)      -> neues Canvas, Ausschnitt in Anteilen der Breite */
export function inkMap(canvas, long = 900) {
    const k = Math.min(1, long / Math.max(canvas.width, canvas.height));
    const w = Math.max(8, Math.round(canvas.width * k)), h = Math.max(8, Math.round(canvas.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(canvas, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, y = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) y[i] = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) / 256;
    const r = Math.max(3, Math.round(Math.max(w, h) / 120)), tmp = new Float32Array(w * h), mean = new Float32Array(w * h);
    for (let yy = 0; yy < h; yy++) {                       // Mittel waagerecht (laufende Summe)
        let s = 0, n = 0; const o = yy * w;
        for (let x = 0; x < Math.min(w, r); x++) { s += y[o + x]; n++; }
        for (let x = 0; x < w; x++) {
            if (x + r < w) { s += y[o + x + r]; n++; }
            if (x - r - 1 >= 0) { s -= y[o + x - r - 1]; n--; }
            tmp[o + x] = s / n;
        }
    }
    for (let x = 0; x < w; x++) {                          // Mittel senkrecht
        let s = 0, n = 0;
        for (let yy = 0; yy < Math.min(h, r); yy++) { s += tmp[yy * w + x]; n++; }
        for (let yy = 0; yy < h; yy++) {
            if (yy + r < h) { s += tmp[(yy + r) * w + x]; n++; }
            if (yy - r - 1 >= 0) { s -= tmp[(yy - r - 1) * w + x]; n--; }
            mean[yy * w + x] = s / n;
        }
    }
    const ink = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) ink[i] = mean[i] - y[i] > 28 ? 1 : 0;
    return { w, h, ink };
}
const variance = a => { let m = 0; for (const v of a) m += v; m /= a.length; let s = 0; for (const v of a) s += (v - m) * (v - m); return s / a.length; };
export function textAxis(map) {
    const { w, h, ink } = map, rows = new Float32Array(h), cols = new Float32Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink[y * w + x]) { rows[y]++; cols[x]++; }
    // Zeilen erzeugen quer zur Zeilenrichtung ein Profil mit scharfem Wechsel Zeile/Lücke: Streuung der Profile vergleichen
    const spread = a => { let m = 0; for (const v of a) m += v; m /= a.length || 1; return m > 0 ? variance(a) / (m * m) : 0; };
    return spread(rows) >= spread(cols) ? 0 : 90;
}
export function gutterAt(map) {
    const { w, h, ink } = map; 
    const cols = new Float32Array(w); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink[y * w + x]) cols[x]++;
    const win = Math.max(2, Math.round(w / 60)), sm = new Float32Array(w);
    for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let i = Math.max(0, x - win); i <= Math.min(w - 1, x + win); i++) { s += cols[i]; n++; } sm[x] = s / n; }
    let best = -1, bv = Infinity; for (let x = Math.round(w * 0.38); x <= Math.round(w * 0.62); x++) if (sm[x] < bv) { bv = sm[x]; best = x; }
    const side = []; for (let x = Math.round(w * 0.1); x < Math.round(w * 0.9); x++) if (Math.abs(x - best) > w * 0.08) side.push(sm[x]);
    side.sort((a, b) => a - b); const med = side[Math.floor(side.length / 2)] || 0;
    return med > 0 && bv < med * 0.4 ? best / w : null;
}
export function rotated(canvas, deg) {
    const c = document.createElement('canvas'), q = deg % 180 === 90;
    c.width = q ? canvas.height : canvas.width; c.height = q ? canvas.width : canvas.height;
    const g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.rotate(deg * Math.PI / 180);
    g.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return c;
}
export function cropped(canvas, x0, x1) {
    const c = document.createElement('canvas'), a = Math.round(canvas.width * x0), b = Math.round(canvas.width * x1);
    c.width = Math.max(1, b - a); c.height = canvas.height;
    c.getContext('2d').drawImage(canvas, a, 0, c.width, canvas.height, 0, 0, c.width, canvas.height);
    return c;
}

// Schräglage der Zeilen in Grad (−15…+15, 0,5er-Schritte): Winkel mit der schärfsten Zeilen-Lücken-Verteilung. Positiv = Zeilen fallen nach rechts ab.
export function skewAngle(map) {
    const { w, h, ink } = map, pts = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink[y * w + x] && ((x * 7 + y * 13) & 1) === 0) pts.push(x, y);
    if (pts.length < 400) return 0;
    let best = 0, bs = -1; const bins = new Float32Array(Math.ceil(Math.hypot(w, h)) + 20);
    for (let a = -15; a <= 15.001; a += 0.5) {
        const s = Math.sin(a * Math.PI / 180), c = Math.cos(a * Math.PI / 180); bins.fill(0);
        for (let i = 0; i < pts.length; i += 2) bins[Math.round(pts[i + 1] * c - pts[i] * s + w * 0.5)]++;
        let q = 0; for (let i = 0; i < bins.length; i++) q += bins[i] * bins[i];
        if (q > bs) { bs = q; best = a; }
    }
    return best;
}
export function leveled(canvas, deg) {
    if (Math.abs(deg) < 0.4) return canvas;
    const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.translate(c.width / 2, c.height / 2); g.rotate(-deg * Math.PI / 180); g.drawImage(canvas, -c.width / 2, -c.height / 2);
    return c;
}

// Foto-Seite für die Erkennung säubern: bunte Flächen (Tischdecke) werden weiß, Schatten und durchscheinende Rückseite verschwinden
// durch lokale Schwelle (Strich = deutlich dunkler als die Umgebung), Ergebnis schwarz auf weiß.
export function binarized(canvas) {
    const w = canvas.width, h = canvas.height, g = canvas.getContext('2d', { willReadFrequently: true }), img = g.getImageData(0, 0, w, h), d = img.data;
    const y = new Float32Array(w * h), tmp = new Float32Array(w * h), mean = new Float32Array(w * h), r = Math.max(6, Math.round(Math.max(w, h) / 90));
    for (let i = 0; i < w * h; i++) {
        const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        y[i] = mx - mn > 70 ? 255 : (R * 77 + G * 150 + B * 29) / 256;
    }
    for (let yy = 0; yy < h; yy++) { let s = 0, n = 0; const o = yy * w; for (let x = 0; x < Math.min(w, r); x++) { s += y[o + x]; n++; }
        for (let x = 0; x < w; x++) { if (x + r < w) { s += y[o + x + r]; n++; } if (x - r - 1 >= 0) { s -= y[o + x - r - 1]; n--; } tmp[o + x] = s / n; } }
    for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let yy = 0; yy < Math.min(h, r); yy++) { s += tmp[yy * w + x]; n++; }
        for (let yy = 0; yy < h; yy++) { if (yy + r < h) { s += tmp[(yy + r) * w + x]; n++; } if (yy - r - 1 >= 0) { s -= tmp[(yy - r - 1) * w + x]; n--; } mean[yy * w + x] = s / n; } }
    for (let i = 0; i < w * h; i++) { const v = (mean[i] - y[i] > 24 && y[i] < mean[i] * 0.86) || mean[i] - y[i] > 60 ? 0 : 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); return canvas;
}

// Hauptspalte des Textes (Anteile der Breite): größter zusammenhängender Strichbereich, kleine Lücken überbrückt. Schneidet Randreste
// anderer Seiten (Blattkanten, durchscheinende Nachbarseite) ab. Gibt [0, 1] zurück, wenn nichts Sinnvolles gefunden wird.
export function mainColumns(map) {
    const { w, h, ink } = map, cols = new Float32Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink[y * w + x]) cols[x]++;
    const mx = Math.max(...cols); if (mx < 5) return [0, 1];
    const thr = mx * 0.12, gap = Math.round(w * 0.04), runs = []; let s = -1, last = -1, sum = 0;
    for (let x = 0; x < w; x++) {
        if (cols[x] >= thr) { if (s < 0) { s = x; sum = 0; } last = x; sum += cols[x]; }
        else if (s >= 0 && x - last > gap) { runs.push([s, last, sum]); s = -1; }
    }
    if (s >= 0) runs.push([s, last, sum]);
    if (!runs.length) return [0, 1];
    // aufeinanderfolgende Läufe mit kleinem Abstand zusammenführen ist oben schon geschehen; größten wählen
    const b = runs.reduce((a, r) => (r[2] > a[2] ? r : a));
    return [Math.max(0, b[0] / w - 0.02), Math.min(1, (b[1] + 1) / w + 0.02)];
}
