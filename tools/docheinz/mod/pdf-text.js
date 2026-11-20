/* tools/docheinz/mod/pdf-text.js – Text eines PDFs in lesbare Absätze bringen (Insel-Modul, reine Funktionen, kein DOM, kein pdf.js).
 * Eingabe sind die Textstücke einer Seite, wie pdf.js sie liefert, schon umgerechnet: { s, x, y, w, fs } (Text, linke Kante, Grundlinie von oben, Breite, Schriftgröße).
 *   orderPage(items) -> Zeilen [{ s, x0, x1, y, fs }] in Lesereihenfolge (erkennt zwei Spalten und volle Zeilen darüber/dazwischen)
 *   furnitureKeys(pages: [{ lines, h }]) -> Set  wiederkehrende Kopf-/Fußzeilen (Seitenzahlen, Buchtitel oben/unten)
 *   dropFurniture(lines, h, keys, base?) -> Zeilen ohne Kopf-/Fußzeilen (Zeilen größer als base*1,15 bleiben: Kapitelüberschriften)
 *   baseSize(lines[]) -> Standardschriftgröße (Zeichen-gewichtet)
 *   toBlocks(lines, base) -> [{ t: 'h'|'p'|'li', l?, text, fs }]   Absätze, Überschriften (nach Schriftgröße), Aufzählungspunkte; Silbentrennung am Zeilenende aufgelöst
 *   joinPages(blocksPerPage) -> Blöcke   Absätze, die über einen Seitenumbruch laufen, werden zusammengefügt
 *   blocksToHtml(blocks) -> HTML-Text (nur h2–h4, p, ul, li; Text maskiert)
 * Grenzen: kein OCR (nur PDFs mit Textebene), Tabellen und Formeln werden als Text in Lesereihenfolge geliefert, mehr als zwei Spalten werden nicht erkannt. */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const median = (a) => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const END = /[.!?:;…"”“»)\]’']$/;
const BULLET = /^([•·▪◦●■◆▸►‣⁃\-–—*]|\(?\d{1,3}[.)]|[a-z][.)])\s+(?=\S)/;

// Textstücke einer Spalte zu Zeilen gruppieren
function groupLines(items) {
    const its = items.filter(i => i.s !== undefined).slice().sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const it of its) {
        const ref = it.fs || 10;
        let ln = null;
        for (let k = lines.length - 1; k >= 0 && k >= lines.length - 3; k--) { if (Math.abs(lines[k].y - it.y) <= 0.45 * Math.max(ref, lines[k].fs)) { ln = lines[k]; break; } }
        if (!ln) { ln = { y: it.y, fs: ref, its: [] }; lines.push(ln); }
        ln.its.push(it);
    }
    const out = [];
    for (const ln of lines) {
        ln.its.sort((a, b) => a.x - b.x);
        let s = '', prev = null, x1 = 0;
        const w = {};
        for (const it of ln.its) {
            const txt = it.s, fs = it.fs || 10;
            if (!txt.trim()) { if (prev && !/\s$/.test(s)) s += ' '; prev = it; x1 = Math.max(x1, it.x + (it.w || 0)); continue; }
            if (prev) {
                const gap = it.x - (prev.x + (prev.w || 0));
                if (!/\s$/.test(s) && !/^\s/.test(txt) && gap > 0.18 * fs) s += ' ';
            }
            s += txt;
            const r = Math.round(fs * 2) / 2; w[r] = (w[r] || 0) + txt.trim().length;
            prev = it; x1 = Math.max(x1, it.x + (it.w || 0));
        }
        const text = s.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const fs = +Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
        out.push({ s: text, x0: ln.its[0].x, x1, y: ln.y, fs });
    }
    return out;
}

export function orderPage(items) {
    const its = items.filter(i => i.s && i.s.trim());
    if (!its.length) return [];
    const l = Math.min(...its.map(i => i.x)), r = Math.max(...its.map(i => i.x + (i.w || 0))), mid = (l + r) / 2;
    let total = 0, cross = 0, left = 0, right = 0;
    for (const i of its) {
        const n = i.s.trim().length, w = i.w || 0, fs = i.fs || 10;
        total += n;
        if (i.x < mid - 0.5 * fs && i.x + w > mid + 0.5 * fs) cross += n;
        else if (i.x + w / 2 < mid) left += n; else right += n;
    }
    const two = r - l > 200 && total > 120 && cross / total < 0.2 && left / total > 0.25 && right / total > 0.25;
    if (!two) return groupLines(its);
    const full = [], lft = [], rgt = [];
    for (const i of its) {
        const w = i.w || 0, fs = i.fs || 10;
        if (i.x < mid - 0.5 * fs && i.x + w > mid + 0.5 * fs) full.push(i); else if (i.x + w / 2 < mid) lft.push(i); else rgt.push(i);
    }
    const fl = groupLines(full), ll = groupLines(lft), rl = groupLines(rgt);
    const out = [];
    const edges = fl.map(f => f.y);
    const band = (y) => { let b = 0; while (b < edges.length && y > edges[b]) b++; return b; };
    for (let b = 0; b <= edges.length; b++) {
        out.push(...ll.filter(x => band(x.y) === b), ...rl.filter(x => band(x.y) === b));
        if (b < edges.length) out.push(fl[b]);
    }
    return out;
}

const keyOf = (s) => s.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
const inZone = (y, h) => y < 0.09 * h || y > 0.91 * h;
export function furnitureKeys(pages) {
    const cnt = new Map(), n = pages.length;
    for (const p of pages) {
        const seen = new Set();
        for (const ln of p.lines) if (inZone(ln.y, p.h)) { const k = keyOf(ln.s); if (k && !seen.has(k)) { seen.add(k); cnt.set(k, (cnt.get(k) || 0) + 1); } }
    }
    const keys = new Set(), need = Math.max(2, Math.ceil(n * 0.4));
    for (const [k, c] of cnt) if (c >= need) keys.add(k);
    return keys;
}
export function dropFurniture(lines, h, keys, base) {
    return lines.filter(ln => !(inZone(ln.y, h) && !(base && ln.fs > base * 1.15) && (keys.has(keyOf(ln.s)) || /^[-–—\s]*\d{1,4}[-–—\s]*$/.test(ln.s))));
}

export function baseSize(lines) {
    const w = {};
    for (const ln of lines) { const r = Math.round(ln.fs * 2) / 2; w[r] = (w[r] || 0) + ln.s.length; }
    const e = Object.entries(w).sort((a, b) => b[1] - a[1]);
    return e.length ? +e[0][0] : 10;
}

export function toBlocks(lines, base) {
    const blocks = [];
    if (!lines.length) return blocks;
    const gaps = [];
    for (let i = 1; i < lines.length; i++) { const g = lines[i].y - lines[i - 1].y; if (g > 0 && g < 3 * base) gaps.push(g); }
    const med = median(gaps) || base * 1.3;
    const left = median(lines.map(l => l.x0)), rightEdge = (() => { const xs = lines.map(l => l.x1).sort((a, b) => a - b); return xs[Math.floor(xs.length * 0.9)] || xs[xs.length - 1]; })();
    const heading = (ln) => ln.fs >= base * 1.18 && ln.s.length <= 160 && !/[,;]$/.test(ln.s);
    let cur = null;
    const flush = () => { if (cur) { blocks.push(cur); cur = null; } };
    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i], prev = lines[i - 1], isH = heading(ln);
        if (isH) {
            const ratio = ln.fs / base, l = ratio >= 1.6 ? 2 : ratio >= 1.3 ? 3 : 4;
            if (cur && cur.t === 'h' && Math.abs(cur.fs - ln.fs) < 0.5 && ln.y - prev.y < 1.8 * ln.fs) cur.text += ' ' + ln.s;      // Überschrift über mehrere Zeilen
            else { flush(); cur = { t: 'h', l, text: ln.s, fs: ln.fs }; }
            continue;
        }
        const b = ln.s.match(BULLET);
        let start = !cur || cur.t === 'h';
        if (!start && b) start = true;
        if (!start) {
            const gap = ln.y - prev.y, indent = ln.x0 - left;
            if (gap > 1.45 * med || gap < 0) start = true;
            else if (Math.abs(ln.fs - prev.fs) > 0.2 * prev.fs) start = true;
            else if (indent > 0.8 * ln.fs && END.test(prev.s)) start = true;
            else if (prev.x1 < rightEdge - 4 * ln.fs && END.test(prev.s) && cur.t !== 'li') start = true;
        }
        if (start) { flush(); cur = b ? { t: 'li', text: ln.s.replace(BULLET, ''), fs: ln.fs } : { t: 'p', text: ln.s, fs: ln.fs }; continue; }
        const dash = cur.text.match(/(\p{L})[-­]$/u);
        if (dash && /^\p{Ll}/u.test(ln.s)) cur.text = cur.text.slice(0, -1) + ln.s;               // Silbentrennung am Zeilenende
        else cur.text += ' ' + ln.s;
    }
    flush();
    return blocks;
}

export function joinPages(pages) {
    const out = [];
    for (const blocks of pages) {
        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i], last = out[out.length - 1];
            if (i === 0 && last && last.t === 'p' && b.t === 'p' && !END.test(last.text) && /^\p{Ll}/u.test(b.text)) {
                const dash = last.text.match(/(\p{L})[-­]$/u);
                last.text = dash ? last.text.slice(0, -1) + b.text : last.text + ' ' + b.text;
            } else out.push({ ...b });
        }
    }
    return out;
}

export function blocksToHtml(blocks) {
    let out = '', inList = false;
    for (const b of blocks) {
        if (b.t !== 'li' && inList) { out += '</ul>\n'; inList = false; }
        if (b.t === 'li') { if (!inList) { out += '<ul>\n'; inList = true; } out += '<li>' + esc(b.text) + '</li>\n'; }
        else if (b.t === 'h') out += '<h' + b.l + '>' + esc(b.text) + '</h' + b.l + '>\n';
        else out += '<p>' + esc(b.text) + '</p>\n';
    }
    if (inList) out += '</ul>\n';
    return out;
}
