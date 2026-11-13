/* lib/dashboard/i18n.js – Oberflächentexte: t(), applyI18n() (Texte selbst: lib/data/dashboard.i18n.json).
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { hooks } from './hooks.js';
import { settings, state } from './state.js';

// ===== UI-Texte (Standard Englisch, Deutsch über den EN|DE-Schalter) =====
export function t(key, vars) {
    let str = (state.I18N[settings.lang] && state.I18N[settings.lang][key]) || state.I18N.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { str = str.replace('{' + k + '}', vars[k]); });
    return str;
}
export function applyI18n() {
    document.documentElement.lang = settings.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = t(el.getAttribute('data-i18n-title')); });
    hooks.call('repaintLang');   // everything drawn by script (init.js)
}
