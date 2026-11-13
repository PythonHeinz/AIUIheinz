/* lib/dashboard/sliders.js – Regler im Parameterfenster lesen und setzen (reine Oberflächenhelfer).
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $ } from './base.js';

export function setSliders(t, p, k, c) {
    $('param-temp').value = t; $('val-temp').innerText = t;
    $('param-topp').value = p; $('val-topp').innerText = p;
    $('param-topk').value = k; $('val-topk').innerText = k;
    $('param-ctx').value = c; $('val-ctx').innerText = c;
}
export function readSliders() {
    return {
        temp: parseFloat($('param-temp').value),
        topp: parseFloat($('param-topp').value),
        topk: parseInt($('param-topk').value, 10),
        ctx: parseInt($('param-ctx').value, 10)
    };
}
