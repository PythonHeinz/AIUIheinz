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
        let s = '', prev = null, x1 = 0, last = null;
        const w = {}, cells = [];
        for (const it of ln.its) {
            const txt = it.s, fs = it.fs || 10;
            if (!txt.trim()) { if (prev && !/\s$/.test(s)) s += ' '; prev = it; x1 = Math.max(x1, it.x + (it.w || 0)); continue; }
            if (!last || it.x - last > 2.2 * fs) cells.push({ s: '', x0: it.x, x1: it.x });          // große Lücke = neue Zelle (Tabelle)
            const cell = cells[cells.length - 1];
            cell.s += (cell.s && !/\s$/.test(cell.s) && !/^\s/.test(txt) && prev && it.x - (prev.x + (prev.w || 0)) > 0.18 * fs ? ' ' : '') + txt; cell.x1 = it.x + (it.w || 0);
            last = it.x + (it.w || 0);
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
        cells.forEach(c => { c.s = c.s.replace(/\s+/g, ' ').trim(); });
        out.push({ s: text, x0: ln.its[0].x, x1, y: ln.y, fs, cells: cells.filter(c => c.s) });
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
    let two = r - l > 200 && total > 120 && cross / total < 0.2 && left / total > 0.25 && right / total > 0.25;
    if (two) {                                   // echte Spalten haben auf beiden Seiten viele lange Zeilen; Tabellen nicht
        const rows = { l: new Map(), r: new Map() };
        for (const i of its) { const k = Math.round(i.y / ((i.fs || 10) * 0.5)); const m = (i.x + (i.w || 0) / 2 < mid) ? rows.l : rows.r; m.set(k, (m.get(k) || 0) + i.s.trim().length); }
        const ok = m => m.size >= 5 && [...m.values()].reduce((a, b) => a + b, 0) / m.size >= 30;
        two = ok(rows.l) && ok(rows.r);
    }
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

// Tabellen: Zeilen mit mehreren Zellen (große Lücken) bilden zusammen mit den Zeilen dazwischen eine Tabelle
const CAPTION = /^(Tabelle|Table|Tab\.|Abbildung|Abb\.|Figure|Fig\.)\s*\d/i;
function findTables(lines, base) {
    const gaps = [];
    for (let i = 1; i < lines.length; i++) { const g = lines[i].y - lines[i - 1].y; if (g > 0 && g < 3 * base) gaps.push(g); }
    const med = median(gaps) || base * 1.3;
    const multi = lines.map(l => l.cells && l.cells.length >= 2);
    const tables = [];
    let i = 0;
    while (i < lines.length) {
        if (!multi[i]) { i++; continue; }
        let a = i, b = i, nm = 1;
        for (let j = i + 1; j < lines.length && lines[j].y - lines[j - 1].y <= 2.3 * med && !CAPTION.test(lines[j].s); j++) if (multi[j]) { b = j; nm++; }
        if (nm < 2) { i = b + 1; continue; }
        // direkt anschließende Folgezeilen einer Zelle mit einbeziehen
        while (b + 1 < lines.length && lines[b + 1].y - lines[b].y <= 1.2 * med && lines[b + 1].fs <= base * 1.1 && !multi[b + 1] && lines[b + 1].x0 <= lines[a].x0 + 0.3 * (Math.max(...lines.slice(a, b + 1).map(l => l.x1)) - lines[a].x0) && lines[b + 1].s.length < 60) b++;
        tables.push([a, b]); i = b + 1;
    }
    return { tables, med };
}
function buildTable(lines, med) {
    const full = lines.filter(l => l.cells && l.cells.length >= 2), ncols = Math.max(...full.map(l => l.cells.length));
    const ref = full.filter(l => l.cells.length === ncols), bound = [];
    for (let c = 0; c < ncols - 1; c++) bound.push((Math.max(...ref.map(l => l.cells[c].x1)) + Math.min(...ref.map(l => l.cells[c + 1].x0))) / 2);
    const colOf = (cx) => { let c = 0; while (c < bound.length && cx > bound[c]) c++; return c; };
    const rows = []; let lastC0 = null, row = null;
    for (const ln of lines) {
        const cs = (ln.cells || []).map(c => ({ c: colOf((c.x0 + c.x1) / 2), s: c.s }));
        const hasC0 = cs.some(c => c.c === 0);
        if (!row || (hasC0 && (cs.length >= 2 || !lastC0 || ln.y - lastC0 > 1.2 * med))) { row = Array.from({ length: ncols }, () => ''); rows.push(row); }
        if (hasC0) lastC0 = ln.y;
        for (const c of cs) row[c.c] = joinText(row[c.c], c.s);
    }
    return rows;
}
const joinText = (a, b) => { if (!a) return b; const d = a.match(/(\p{L})[-\u00AD]$/u); return d && /^\p{Ll}/u.test(b) ? a.slice(0, -1) + b : a + ' ' + b; };

export function toBlocks(lines, base) {
    if (!lines.length) return [];
    const { tables, med } = findTables(lines, base);
    if (!tables.length) return paragraphs(lines, base);
    const out = []; let from = 0;
    for (const [a, b] of tables) {
        out.push(...paragraphs(lines.slice(from, a), base));
        out.push({ t: 'table', rows: buildTable(lines.slice(a, b + 1), med), fs: base });
        from = b + 1;
    }
    out.push(...paragraphs(lines.slice(from), base));
    return out;
}

function paragraphs(lines, base) {
    const blocks = [];
    if (!lines.length) return blocks;
    const gaps = [];
    for (let i = 1; i < lines.length; i++) { const g = lines[i].y - lines[i - 1].y; if (g > 0 && g < 3 * base) gaps.push(g); }
    const med = median(gaps) || base * 1.3;
    const left = median(lines.map(l => l.x0)), rightEdge = (() => { const pl = lines.filter(l => l.s.length > 50), xs = (pl.length >= 3 ? pl : lines).map(l => l.x1).sort((a, b) => a - b); return xs[Math.floor(xs.length * 0.9)] || xs[xs.length - 1]; })();
    const longL = lines.filter(l => l.s.length > 50);
    const justified = longL.length >= 4 && longL.filter(l => l.x1 >= rightEdge - 0.15 * l.fs || (rightEdge - l.x1 > 0.2 * l.fs && rightEdge - l.x1 < 0.65 * l.fs)).length > 0.7 * longL.length && longL.some(l => l.x1 >= rightEdge - 0.15 * l.fs);
    // pdf.js liefert den weichen Trennstrich nicht mit: eine Blocksatzzeile, die knapp (ca. Strichbreite) vor dem Rand endet, ist ein Worttrenner
    const hidden = (prev, ln) => justified && /\p{L}$/u.test(prev.s) && /^\p{Ll}/u.test(ln.s) && rightEdge - prev.x1 > 0.2 * prev.fs && rightEdge - prev.x1 < 0.65 * prev.fs;
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
        else if (hidden(prev, ln)) cur.text += ln.s;
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
        if (b.t === 'table') out += '<table>\n' + b.rows.map((r, i) => '<tr>' + r.map(c => '<' + (i === 0 ? 'th' : 'td') + '>' + esc(c) + '</' + (i === 0 ? 'th' : 'td') + '>').join('') + '</tr>').join('\n') + '\n</table>\n';
        else if (b.t === 'li') { if (!inList) { out += '<ul>\n'; inList = true; } out += '<li>' + esc(b.text) + '</li>\n'; }
        else if (b.t === 'h') out += '<h' + b.l + '>' + esc(b.text) + '</h' + b.l + '>\n';
        else out += '<p>' + esc(b.text) + '</p>\n';
    }
    if (inList) out += '</ul>\n';
    return out;
}
