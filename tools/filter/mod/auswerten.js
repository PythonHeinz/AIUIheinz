/* tools/filter/mod/auswerten.js – Auswerten: Zählung, Kontrollspalte, Verwechslungstabelle, Stichprobe, Filtern, Sortieren (Insel-Modul, rein).
 * Zählen, Auswählen, Sortieren und die Trefferquote macht der Code, nie das Modell. Ein Ergebnis: { index, text, row, label|null, grund, fehler, ... };
 * label null heißt unklar. Mit Kontrolle kommen erwartet (Text oder '') und treffer (true/false/null = keine Kontrolle) dazu. */

export function kontrollWert(v) { return String(v == null ? '' : v).split('/')[0].trim(); }

export function mitKontrolle(ergebnisse, col) {
    return ergebnisse.map(e => {
        const erwartet = col >= 0 && e.row ? kontrollWert(e.row[col]) : '';
        const treffer = erwartet ? (e.label != null && e.label.toLowerCase() === erwartet.toLowerCase()) : null;
        return Object.assign({}, e, { erwartet, treffer });
    });
}

export function kontrollEtiketten(rows, col) {
    const seen = [];
    rows.forEach(r => { const v = kontrollWert(r[col]); if (v && seen.indexOf(v) < 0) seen.push(v); });
    return seen;
}

export function zaehlen(ergebnisse, labels) {
    const je = {}; labels.forEach(l => { je[l] = 0; });
    let unklar = 0, fehler = 0;
    ergebnisse.forEach(e => { if (e.fehler) fehler++; if (e.label == null) unklar++; else if (je[e.label] !== undefined) je[e.label]++; });
    const gesamt = ergebnisse.length;
    return { gesamt, unklar, fehler, je, anteil: Object.fromEntries(Object.keys(je).map(l => [l, gesamt ? je[l] / gesamt : 0])) };
}

export function trefferquote(ergebnisse) {
    const g = ergebnisse.filter(e => e.treffer === true || e.treffer === false);
    const t = g.filter(e => e.treffer === true).length;
    return { geprueft: g.length, treffer: t, quote: g.length ? t / g.length : null };
}

export function verwechslung(ergebnisse, labels) {
    const zeilen = [], spalten = labels.concat(['?']), zellen = {};
    ergebnisse.forEach(e => {
        if (!e.erwartet) return;
        if (zeilen.indexOf(e.erwartet) < 0) zeilen.push(e.erwartet);
        const s = e.label == null ? '?' : e.label, k = e.erwartet + '\u0000' + s;
        zellen[k] = (zellen[k] || 0) + 1;
    });
    return { zeilen, spalten, zelle: (z, s) => zellen[z + '\u0000' + s] || 0 };
}

// Zufall mit festem Startwert (mulberry32): gleiche Eingabe + gleicher Startwert = gleiche Auswahl und Reihenfolge.
export function zufall(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function mischen(liste, seed) {
    const r = zufall(seed), a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
}
// n Einträge: zufällig mit Startwert oder die ersten n in der Reihenfolge der Quelle.
export function stichprobe(liste, n, opts) {
    const o = opts || {}, k = Math.max(0, Math.min(Number.isFinite(n) ? n : liste.length, liste.length));
    return (o.zufaellig ? mischen(liste, o.seed) : liste).slice(0, k);
}

export function filtern(ergebnisse, f) {
    const o = f || {}, set = o.labels && o.labels.length ? new Set(o.labels) : null;
    return ergebnisse.filter(e => {
        if (o.nurUnklar) return e.label == null;
        if (o.nurAbweichung) return e.treffer === false;
        if (set) return e.label != null && set.has(e.label);
        return true;
    });
}

export function sortieren(ergebnisse, nach, labels) {
    const a = ergebnisse.slice(), pos = l => (l == null ? 1e9 : Math.max(0, (labels || []).indexOf(l)));
    if (nach === 'label') a.sort((x, y) => pos(x.label) - pos(y.label) || x.index - y.index);
    else if (nach === 'text') a.sort((x, y) => x.text.localeCompare(y.text) || x.index - y.index);
    else a.sort((x, y) => x.index - y.index);
    return a;
}
