/* lib/dashboard/update.js – Update über den Server (git pull), Anbindung des Dashboards an lib/shared/update.js.
 * Die Logik und das LCD liegen in lib/shared/update.js (auch der Hub nutzt sie).
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, createUpdater, readVersion } from './base.js';
import { t } from './i18n.js';
import { state } from './state.js';

let up = null;
function updater() {
    if (!up) up = createUpdater({
        led: $('upd-led'), btn: $('upd-btn'), status: $('upd-status'), t: t,
        busy: function () { return (state.generating || state.speedTesting) ? t('updBusy') : ''; },
        onState: function (st) { state.updState = st; }
    });
    return up;
}
export async function showVersion() {
    // Pille: Stand des Repos auf diesem Handy (Commit und Datum), Tippen sucht nach Updates
    const label = (await readVersion()) || 'Update';
    $('upd-ver').textContent = label; $('menu-ver').textContent = label;
    updater().setVersion(label);
}
export function setUpd(mode, f) { updater().setState(mode, f); }
export function doUpdate() { return updater().run(); }
