/* lib/dashboard/preload.js – Modell vorladen, Modusleiste und Modus-Stil, Sprachknopf.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, PV, esc } from './base.js';
import { buildMessages, buildOptions } from './build.js';
import { renderQuick, updateChatBar, updateChip, updateCtxCount } from './caps.js';
import { resolveModel } from './config.js';
import { newChat, renderSavedList, saveCurrentToList } from './conversations.js';
import { normalizeMode } from './engine.js';
import { applyI18n, t } from './i18n.js';
import { ICON, updateMenuInfo } from './menu.js';
import { applySavedParams, markState, promptChanged, resetToPerson, toneSent } from './params.js';
import { persistCurrent, saveSettings } from './persist.js';
import { loadThreads, renderPrompts } from './settings.js';
import { updateReadBtn } from './speech.js';
import { settings, state } from './state.js';
import { checkServer, renderRing } from './status.js';

// ===== Modell vorladen: Modell und Systemprompt im Hintergrund warm machen =====
export const KEEP_ALIVE = PV.KEEP_ALIVE;   // gemeinsam mit allen Tools (lib/providers.js)
let preloadTimer = null, preloadHideTimer = null;
export function preloadKeyNow() {
    return [settings.provider, $('model-select').value, settings.mode, promptChanged() ? 'own' + settings.ownPrompt.length : 'base', settings.lang, !!settings.fast,
        toneSent(), parseInt($('param-ctx').value, 10), parseInt($('param-threads').value, 10)].join('|');
}
function setPreloadStatus(kind) {
    clearTimeout(preloadHideTimer);
    state.preloadReady = kind === 'ready';
    if (state.preloadReady) preloadHideTimer = setTimeout(function () { state.preloadReady = false; renderRing(); }, 4000);
    renderRing();
}
export function abortPreload() {
    clearTimeout(preloadTimer);
    if (state.preloadAbort) { state.preloadAbort.abort(); state.preloadAbort = null; }
    setPreloadStatus('');
}
export function schedulePreload() {
    clearTimeout(preloadTimer);
    if (!settings.preload || settings.provider !== 'ollama') return;
    preloadTimer = setTimeout(preloadModel, 1200);
}
// Es bleibt nur das gewählte Modell im Arbeitsspeicher: sonst halten mehrere Modelle (mit 30 min keep_alive)
// und große Kontexte den Speicher, und Android beendet Termux (Absturz am Handy 10.11.2026).
export async function unloadOthers(model) { await PV.prepare('ollama', model); }
function alreadyLoaded(model, opts) { return PV.loadedWith('ollama', model, opts); }
async function preloadModel() {
    if (!settings.preload || state.generating || state.speedTesting || settings.provider !== 'ollama') return;
    const model = $('model-select').value;
    const key = preloadKeyNow();
    if (!model || key === state.preloadKey) return;
    if (state.preloadAbort) state.preloadAbort.abort();
    const ac = new AbortController();
    state.preloadAbort = ac;
    setPreloadStatus('loading');
    try {
        await unloadOthers(model);
        if (ac.signal.aborted) return;
        const opts = buildOptions(state.MODE_PRESETS[settings.mode]);
        delete opts.stop; delete opts.num_predict;
        opts.num_predict = 1;
        // Model already in memory and the last request (any page) used the same load options: nothing would be loaded, and the
        // preload would only make Ollama read the mode prompt again (seconds on the phone). Skip it.
        if (await alreadyLoaded(model, opts)) {
            state.preloadKey = key;
            if (state.preloadAbort === ac) setPreloadStatus('ready');
            checkServer();
            return;
        }
        await PV.chat('ollama', { model: model, stream: false, keepAlive: KEEP_ALIVE, options: opts, signal: ac.signal,
            messages: buildMessages(false, '', [{ role: 'user', content: '.' }]) });
        state.preloadKey = key;
        if (state.preloadAbort === ac) setPreloadStatus('ready');
        checkServer();
    } catch (e) {
        if (e.name !== 'AbortError' && state.preloadAbort === ac) setPreloadStatus('');
    } finally {
        if (state.preloadAbort === ac) state.preloadAbort = null;
        renderRing();
    }
}
// Personenleiste: wird aus MODE_PRESETS gebaut (Nativ, Heinz, Wilson, Audit, Code, Kreativ). Heinz trägt einen Ring (Ausgangspunkt der App).
// Der Stern an der gewählten Person zeigt „geändert“ (gefüllt) oder einen gemerkten eigenen Stand (umrandet; Tipp holt ihn zurück).
function renderModeBar() {
    const bar = $('mode-bar');
    bar.setAttribute('aria-label', t('chooseMode'));
    bar.querySelectorAll('.mode-pill').forEach(function (b) { b.remove(); });
    Object.keys(state.MODE_PRESETS).forEach(function (m) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mode-pill' + (m === settings.mode ? ' active' : '') + (m === 'heinz' ? ' home' : '');
        b.setAttribute('data-mode', m);
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', m === settings.mode ? 'true' : 'false');
        b.title = t('m_' + m);
        b.style.setProperty('--mc', state.MODE_PRESETS[m].color);
        b.style.setProperty('--mo', state.MODE_PRESETS[m].on || '#fff');
        b.innerHTML = '<span class="mi">' + ICON('m-' + m, '') + '</span><span class="mn">' + esc(t('mb_' + m)) + '</span>';
        b.onclick = function () { pickMode(m); };
        bar.appendChild(b);
    });
    renderMarks();
}
export function renderMarks() {
    const bar = $('mode-bar'); if (!bar) return;
    bar.querySelectorAll('.mode-pill').forEach(function (e) { e.classList.remove('chg'); e.title = t('m_' + e.getAttribute('data-mode')); e.removeAttribute('data-changed'); });
    const st = markState(), b = bar.querySelector('.mode-pill[data-mode="' + settings.mode + '"]');
    if (!st || !b) return;
    b.classList.add('chg'); b.setAttribute('data-changed', st);   // LED-Ring: Prompt oder Ton weicht von der Vorgabe der Person ab
    b.title = t('m_' + settings.mode) + ' · ' + t('ledPerson');
}
function pickMode(m) {
    if (state.generating || state.speedTesting) return;
    if (m === settings.mode) { resetToPerson(); renderPrompts(); renderMarks(); return; }   // Rücksprung auf die Vorgabe dieser Person
    $('mode-select').value = m;
    updateModeUI();
}
export function applyModeStyling() {
    renderModeBar();
    renderSavedList();
    const preset = state.MODE_PRESETS[settings.mode];
    const ctxBox = $('context');
    const modelSel = $('model-select');
    $('context-wrapper').hidden = preset.ctx === 'none';
    const rs = document.documentElement.style;
    rs.setProperty('--acc', preset.color); rs.setProperty('--onacc', preset.on || '#fff');   // one accent per mode
    ctxBox.classList.remove('req-warn');
    $('context-wrapper').classList.toggle('req', preset.ctx === 'required');
    ctxBox.placeholder = t(preset.ctx === 'required' ? 'ctxRequired' : 'ctxOptional');
    $('ctx-label').textContent = t(preset.ctx === 'required' ? 'ctxLabelReq' : 'ctxLabelOpt');
    updateCtxCount(); updateChatBar(); updateMenuInfo();
    $('fast-mode').checked = !!settings.fast;
    $('param-fastn').value = settings.fastN; $('fastn-val').textContent = settings.fastN;
    $('preload-on').checked = settings.preload; 
}
// Nutzer wechselt den Modus: Preset-Modell + Preset-Regler (außer bei Standardwerten)
export function updateModeUI() {
    // Zuerst den alten Chat unter seinem Modus und Modell speichern, danach erst umstellen
    if (state.chatHistory.length) saveCurrentToList();
    settings.mode = normalizeMode($('mode-select').value);
    const preset = state.MODE_PRESETS[settings.mode];
    // Mode = prompt + sampling only. The chosen model stays (the bench tests any model with any mode, and the model choice is shared
    // with the other pages, so a mode click must not unload it). The preset model is only a suggestion when nothing usable is chosen.
    if (settings.provider === 'ollama' && state.MODELS.indexOf(settings.model) < 0) settings.model = resolveModel(preset);
    $('model-select').value = settings.model;
    loadThreads();
    schedulePreload();
    applySavedParams();
    saveSettings();
    applyModeStyling();
    newChat(false);  // Moduswechsel = neuer Chat (der alte ist oben schon gespeichert)
    checkServer();
}
export function onModelChange() {
    settings.model = $('model-select').value;
    updateChip();
    settings.modelByProvider[settings.provider] = settings.model;
    $('model-free').value = settings.provider === 'ollama' ? '' : settings.model;
    loadThreads();
    applySavedParams();
    schedulePreload();
    saveSettings();
    persistCurrent();
    checkServer();
    renderQuick();
}
export function updateLangBtn() {
    document.querySelectorAll('#lang-btn span').forEach(function (s) {
        s.classList.toggle('active', s.getAttribute('data-l') === settings.lang);
    });
}
export function toggleLang() {
    settings.lang = settings.lang === 'en' ? 'de' : 'en';
    saveSettings();
    updateLangBtn();
    applyI18n();
    window.speechSynthesis.cancel(); updateReadBtn(false);
    schedulePreload();
}

export function onPreloadToggle() {
    settings.preload = $('preload-on').checked;
    saveSettings();
    if (settings.preload) schedulePreload(); else abortPreload();
}
