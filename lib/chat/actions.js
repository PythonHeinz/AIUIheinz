/* lib/chat/actions.js – Zuordnung der Bedienelemente des Heinz Chat zu Funktionen (ersetzt die Inline-Handler).
 * ES module (docs/MODULE.md), loaded for its side effect by main.js. Markup: data-click="name"; every name must be in ACTIONS (a test checks it).
 * The rest of the wiring (send, model sheet, lists) sits in main.js. */

import { Heinz } from './base.js';

const ACTIONS = {
    sheetClose: function () { Heinz.sheetClose(); }
};

// One listener for the whole page; goes up from the target like a bubbling inline handler would.
document.addEventListener('click', function (e) {
    for (let el = e.target instanceof Element ? e.target : null; el; el = el.parentElement) {
        const name = el.getAttribute('data-click');
        if (name === null) continue;
        const fn = ACTIONS[name];
        if (!fn) { console.error('Unknown action: ' + name); continue; }
        fn(el.getAttribute('data-arg') === null ? undefined : el.getAttribute('data-arg'), el, e);
    }
});
