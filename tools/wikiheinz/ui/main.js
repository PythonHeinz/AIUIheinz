/* tools/wikiheinz/ui/main.js – Einstieg von WikiHeinz: Speicher öffnen, Reiter, Sprache. Nur Oberfläche; Logik in ../mod/. */
import { Heinz, HeinzStore, $ } from './base.js';
import { D } from './i18n.js';
import { S, t, on, emit, msg, ladeQuellen } from './state.js';
import { oeffne } from '../mod/db.js';
import { initStoebern } from './stoebern.js';
import { initWiki } from './wiki.js';
import { initQuellen } from './quellen.js';

function applyI18n() {
    document.documentElement.lang = Heinz.lang;
    document.querySelectorAll('[data-i]').forEach(e => { e.textContent = t(e.getAttribute('data-i')); });
    document.querySelectorAll('[data-ph]').forEach(e => { e.placeholder = t(e.getAttribute('data-ph')); });
    document.title = 'AIUIheinz · ' + t('title');
}
function tab(name) {
    S.tab = name;
    for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === name);
    for (const id of ['stoebern', 'wiki', 'quellen']) $('p-' + id).hidden = id !== name;
}

(async function init() {
    Heinz.header({ sub: { en: D.en.sub, de: D.de.sub }, back: '/' });
    await HeinzStore.open();
    S.sp = await oeffne();
    applyI18n();
    on('msg', msg); on('tab', tab);
    document.getElementById('tabs').addEventListener('click', (ev) => { const b = ev.target.closest('button[data-tab]'); if (b) tab(b.dataset.tab); });
    await ladeQuellen();
    initStoebern(); initWiki(); initQuellen();
    if (S.sp.info().art === 'memory') msg(t('storeMem'), 'warn');
    Heinz.onLang(() => { applyI18n(); emit('lang'); });
    window.__wikiReady = true;
})();
