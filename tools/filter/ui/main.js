/* tools/filter/ui/main.js – Einstieg von Filter: Zustand laden, Schritte starten, Sprache. Nur Oberfläche; Logik in ../mod/. */
import { Heinz, HeinzStore, $ } from './base.js';
import { D } from './i18n.js';
import { S, t, DEFAULTS, emit, restore, msg } from './state.js';
import { dbInfo } from '../mod/db.js';
import { PRESETS } from '../mod/presets.js';
import { initEingabe, restoreInput, rerender } from './eingabe.js';
import { initRegel } from './regel.js';
import { initErgebnis, render as renderResult } from './ergebnis.js';

function applyI18n() {
    document.documentElement.lang = Heinz.lang;
    document.querySelectorAll('[data-i]').forEach(e => { e.textContent = t(e.getAttribute('data-i')); });
    document.querySelectorAll('[data-ph]').forEach(e => { e.placeholder = t(e.getAttribute('data-ph')); });
    document.title = 'AIUIheinz · ' + t('title');
}

(async function init() {
    Heinz.header({ sub: { en: D.en.sub, de: D.de.sub }, back: '/' });
    await HeinzStore.open();
    S.cfg = Object.assign({}, DEFAULTS, HeinzStore.get('heinz_filter_settings', {}) || {});
    if (!S.cfg.rule && PRESETS[S.cfg.preset]) { S.cfg.rule = PRESETS[S.cfg.preset].rule; S.cfg.labels = PRESETS[S.cfg.preset].labels.join(', '); }
    applyI18n();
    initEingabe(); initRegel(); initErgebnis();
    const last = await restore();
    if (last && (last.text || (last.results && last.results.length))) {
        restoreInput(last);
        S.run = last.run || null; S.sel = last.sel || [];
        S.resMap = {}; (last.results || []).forEach(r => { S.resMap[r.index] = r; });
        if (S.run) msg(t('restored'), '');
    }
    if (dbInfo().mode === 'memory') msg(t('storeMem'), 'warn');
    emit('input'); renderResult();
    Heinz.onLang(() => { applyI18n(); emit('lang'); rerender(); });
    window.__filterReady = true;
})();
