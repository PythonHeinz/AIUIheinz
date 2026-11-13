/* lib/dashboard/settings.js – Einstellungsfelder: Regler, Threads, Systemprompt, „In den Chat übernehmen“, Vorladen-Haken.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV } from './base.js';
import { buildOptions, buildSystemPrompt } from './build.js';
import { copyText } from './clipboard.js';
import { hooks } from './hooks.js';
import { t } from './i18n.js';
import { basePromptText, isNative, promptChanged, runtimeChanged, syncSliders } from './params.js';
import { saveSettings } from './persist.js';
import { settings, state } from './state.js';

export function pwTab(id) {
    document.querySelectorAll('.pw-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pw') === id); });
    $('pw-params').hidden = id !== 'params'; $('pw-prompts').hidden = id !== 'prompts';
}

function threadsFor(model) {
    return PV.threadsFor(model, settings);   // eine Regel für alle Tools: lib/providers.js
}
export function loadThreads() {
    const n = threadsFor($('model-select').value || settings.model);
    $('param-threads').value = n; $('val-threads').innerText = n;
}
export function onThreads() {
    const n = parseInt($('param-threads').value, 10);
    $('val-threads').innerText = n;
    if (!settings.threads) settings.threads = {};
    settings.threads[$('model-select').value] = n;
    saveSettings();
    hooks.call('schedulePreload'); hooks.call('renderQuick');
}
// „Reset“ im Abschnitt Laufzeit: nur Kontextfenster und Threads zurück auf die Standardwerte (Ton und Prompt bleiben)
export function resetRuntime() {
    if (!runtimeChanged()) return;
    $('param-ctx').value = PV.DEFAULT_CTX;
    if (settings.threads) delete settings.threads[$('model-select').value || settings.model];
    loadThreads();
    syncSliders();
    hooks.call('schedulePreload');
}

// Der Prompt ist immer bedienbar: die erste Änderung gegenüber der Vorgabe der Person setzt „geändert“ (Stern), auch bei Nativ.
// Gleicht der Text wieder der Vorgabe, ist nichts mehr geändert. Der eigene Text bleibt (einmal insgesamt) gemerkt.
export function onOwnPromptInput() {
    const v = $('ps-text').value;
    settings.ownPrompt = v;
    settings.ownOn = v !== basePromptText();
    saveSettings(); hooks.call('schedulePreload'); renderPrompts(true); hooks.call('renderQuick');
}
// Übergibt dem Heinz Chat, was das Dashboard für dieses Modell sendet: Prompt (ohne Antwortsprache-Satz, der Chat antwortet in der Sprache des Nutzers)
// und Sampling-Werte. Threads und Kontext teilen beide Seiten ohnehin (PV.runtime).
export function copySysPrompt() {
    const v = promptChanged() ? settings.ownPrompt : buildSystemPrompt(settings.mode, true);
    const sp = $('ps-copy').querySelector('span'), old = sp.textContent;
    copyText(v || '').then(function () { sp.textContent = '✓'; }).catch(function () { sp.textContent = '✕'; })
        .then(function () { setTimeout(function () { sp.textContent = old; }, 1500); });
}
export function renderPrompts(typing) {
    if (!$('ps-text')) return;
    const ta = $('ps-text');
    if (!typing) ta.value = promptChanged() ? (settings.ownPrompt || '') : basePromptText();
    ta.placeholder = isNative() ? t('psNothing') : t('psPh');
    $('ps-count').textContent = ta.value.length ? ta.value.length + ' ' + t('chars') : '';
    $('ps-copy').disabled = !ta.value.length;
    $('ps-tab').classList.toggle('chg', promptChanged());
    $('ps-reset').disabled = !promptChanged(); $('ps-reset').classList.toggle('act', promptChanged());
    $('ps-note').textContent = promptChanged() ? t('psNoteChanged', { m: t('mb_' + settings.mode) }) : isNative() ? t('psNoteNative') : t('psNotePerson', { m: t('mb_' + settings.mode) });
}
export function onFast() {
    settings.fast = $('fast-mode').checked;
    const n = parseInt($('param-fastn').value, 10);
    if (n > 0) settings.fastN = Math.min(1024, Math.max(16, n));
    $('param-fastn').value = settings.fastN; $('fastn-val').textContent = settings.fastN;
    saveSettings();
    hooks.call('schedulePreload');
}

