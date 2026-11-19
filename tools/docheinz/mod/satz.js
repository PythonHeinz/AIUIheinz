/* tools/docheinz/mod/satz.js – Satzspiegel und Aussehen der Leseansicht als reine Daten (Insel-Modul, keine Oberfläche, Node-testbar).
 *   DEFAULTS            Standardwerte (entsprechen dem bisherigen Aussehen)
 *   LIMITS              { Schlüssel: [min, max] } für Zahlenwerte; bewusst weit
 *   clean(obj, ctx)     nur bekannte Schlüssel, Werte begrenzt/geprüft (teilweise Objekte bleiben teilweise); ctx = { themes, isFont }
 *   full(global, book)  vollständiger Satz: DEFAULTS, dann global, dann die Überschreibungen des Buchs
 *   sameAsDefaults(o)   true, wenn keine Abweichung
 * Schlüssel: size, theme, font, lh (Zeilenabstand), ps (Absatzabstand em), ind (Einzug em), mx/my (Rand px), maxw (Textbreite px), just (0 links, 1 Blocksatz),
 * hyph (Silbentrennung), ws/ls (Wort-/Buchstabenabstand em), fw (Schriftstärke), wid (Hurenkinder/Schusterjungen vermeiden), cols (1 oder 2),
 * fgc/bgc (eigene Farben, #rrggbb, für Thema „custom“), bri (Helligkeit %). */
export const DEFAULTS = { size: 19, theme: 'auto', font: 'serif', lh: 1.65, ps: 0.85, ind: 0, mx: 22, my: 16, maxw: 640, just: 0, hyph: 1, ws: 0, ls: 0, fw: 400, wid: 1, cols: 1, fgc: '#1d1d1b', bgc: '#fbfbf8', bri: 100 };
export const LIMITS = { size: [10, 60], lh: [1, 3], ps: [0, 3], ind: [0, 4], mx: [0, 80], my: [0, 80], maxw: [240, 1200], ws: [-0.2, 0.8], ls: [-0.05, 0.3], fw: [300, 800], bri: [40, 120] };
const FLAGS = ['just', 'hyph', 'wid'];
const COLOR = /^#[0-9a-f]{6}$/i;
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function clean(o, ctx = {}) {
    const r = {};
    if (!o || typeof o !== 'object') return r;
    for (const k of Object.keys(LIMITS)) {
        if (!(k in o)) continue;
        const v = +o[k];
        if (!isFinite(v)) continue;
        r[k] = round(Math.max(LIMITS[k][0], Math.min(LIMITS[k][1], v)), k === 'size' || k === 'mx' || k === 'my' || k === 'maxw' || k === 'fw' || k === 'bri' ? 0 : 2);
    }
    for (const k of FLAGS) if (k in o) r[k] = +o[k] ? 1 : 0;
    if ('cols' in o) r.cols = +o.cols === 2 ? 2 : 1;
    if ('theme' in o && (!ctx.themes || ctx.themes.includes(o.theme))) r.theme = String(o.theme);
    if ('font' in o && (!ctx.isFont || ctx.isFont(o.font))) r.font = String(o.font);
    for (const k of ['fgc', 'bgc']) if (k in o && COLOR.test(String(o[k]))) r[k] = String(o[k]).toLowerCase();
    return r;
}
export const full = (global, book) => Object.assign({}, DEFAULTS, global || {}, book || {});
export const sameAsDefaults = (o) => Object.keys(DEFAULTS).every(k => !(k in (o || {})) || o[k] === DEFAULTS[k]);
