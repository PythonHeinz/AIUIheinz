/* tools/docheinz/mod/seiten.js – Seitenlogik der Leseansicht ohne Oberfläche (Insel-Modul, reine Funktionen, Node-testbar).
 * Eine Seite ist eine Spalte des Kapitels (CSS-Spalten, waagerecht verschoben); Seitenzahl und Lage kommen aus Maßen, nicht aus Zeichen.
 *   pageCount(scrollWidth, step) -> Anzahl Seiten (mindestens 1)
 *   clampPage(i, n) -> 0..n-1
 *   fracOfPage(i, n) -> Lage des Seitenanfangs im Kapitel 0..1 (wird im Buchdatensatz gespeichert)
 *   fracEnd(i, n) -> Ende der Seite 0..1 (für Prozent: auf der letzten Seite 100 %)
 *   pageOfFrac(f, n) -> Seite zur gespeicherten Lage (stabil bei anderer Schriftgröße, nur näherungsweise)
 *   pageOfOffset(left, step, n) -> Seite, auf der ein Element liegt (Abstand vom Anfang des Kapitels)
 *   zoneOf(x, y, w, h) -> 'top' | 'prev' | 'next' | 'none' (Tippzonen)
 *   turn(pos, dir, pages, chapters) -> { ch, page: number | 'first' | 'last' } | null  (null: Buchanfang/-ende)
 * Tippzonen (Anteil der Breite/Höhe): oben ZONE.top schaltet die Steuerung, darunter links ZONE.side zurück, rechts ZONE.side vor, dazwischen nichts. */
export const ZONE = { top: 0.16, side: 0.36 };

const clamp01 = f => Math.max(0, Math.min(1, +f || 0));
export const clampPage = (i, n) => Math.max(0, Math.min(Math.max(1, n | 0) - 1, i | 0));
export function pageCount(scrollWidth, step) {
    if (!(step > 0)) return 1;
    return Math.max(1, Math.round(scrollWidth / step));
}
export const fracOfPage = (i, n) => (n <= 1 ? 0 : clamp01(clampPage(i, n) / n));
export const fracEnd = (i, n) => (n <= 1 ? 1 : clamp01((clampPage(i, n) + 1) / n));
export const pageOfFrac = (f, n) => clampPage(Math.floor(clamp01(f) * Math.max(1, n | 0) + 1e-6), n);
export const pageOfOffset = (left, step, n) => (step > 0 ? clampPage(Math.floor((+left || 0) / step + 1e-6), n) : 0);

export function zoneOf(x, y, w, h) {
    if (!(w > 0) || !(h > 0)) return 'none';
    if (y < h * ZONE.top) return 'top';
    if (x < w * ZONE.side) return 'prev';
    if (x > w * (1 - ZONE.side)) return 'next';
    return 'none';
}

export function turn(pos, dir, pages, chapters) {
    const ch = pos.ch | 0, page = pos.page | 0;
    if (dir > 0) {
        if (page < pages - 1) return { ch, page: page + 1 };
        if (ch < chapters - 1) return { ch: ch + 1, page: 'first' };
        return null;
    }
    if (page > 0) return { ch, page: page - 1 };
    if (ch > 0) return { ch: ch - 1, page: 'last' };
    return null;
}
