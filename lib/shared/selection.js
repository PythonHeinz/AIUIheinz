/* lib/shared/selection.js – Langes Drücken auf einen Eintrag der Unterhaltungsliste (Heinz Chat und Dashboard).
 * ES module (docs/MODULE.md). Leaf: imports nothing; kennt weder Dashboard noch Chat.
 * ctl = { isSel(): Auswahlmodus an?, start(id): Auswahl beginnen, toggle(id): Eintrag an/aus, open(id): Eintrag öffnen }. */

export function bindLongPress(btn, id, ctl) {
    let timer = null, fired = false, x0 = 0, y0 = 0;
    const clear = function () { if (timer) { clearTimeout(timer); timer = null; } };
    btn.addEventListener('pointerdown', function (e) {
        fired = false; x0 = e.clientX; y0 = e.clientY; clear();
        if (ctl.isSel()) return;
        timer = setTimeout(function () { timer = null; fired = true; ctl.start(id); }, 500);
    });
    btn.addEventListener('pointermove', function (e) { if (timer && (Math.abs(e.clientX - x0) > 8 || Math.abs(e.clientY - y0) > 8)) clear(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { btn.addEventListener(ev, clear); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function (e) {
        if (fired) { fired = false; e.preventDefault(); return; }
        if (ctl.isSel()) ctl.toggle(id); else ctl.open(id);
    });
}

// Tipp auf den Titel, solange die fünf Pillen offen sind: nur die Pillen schließen, die Liste bleibt
export function openOrClose(row, openFn) {
    return function (id) { if (row.classList.contains('open')) row.classList.remove('open'); else openFn(id); };
}
