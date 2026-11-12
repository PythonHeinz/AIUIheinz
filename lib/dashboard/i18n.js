/* lib/dashboard/i18n.js – Oberflächentexte: t(), applyI18n() (Texte selbst: lib/data/dashboard.i18n.json).
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

// ===== UI-Texte (Standard Englisch, Deutsch über den EN|DE-Schalter) =====
let I18N = { en: {}, de: {} };
function t(key, vars) {
    let str = (I18N[settings.lang] && I18N[settings.lang][key]) || I18N.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { str = str.replace('{' + k + '}', vars[k]); });
    return str;
}
function applyI18n() {
    document.documentElement.lang = settings.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = t(el.getAttribute('data-i18n-title')); });
    const ph = chatBox.querySelector('.placeholder');
    if (ph && !chatHistory.length) ph.textContent = ph.getAttribute('data-new') ? t('readyNew') : t('ready');
    applyModeStyling();
    renderSavedList();
    renderEngineUI();
    setSheetTitle(); updateCtxCount();
    renderStoreNote();
}
