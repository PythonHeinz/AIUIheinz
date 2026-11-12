/* lib/dashboard/speech.js – Diktat und Vorlesen.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { setQuery } from './caps.js';
import { SPEECH_LANG } from './engine.js';
import { t } from './i18n.js';
import { settings, state } from './state.js';

// ===== Sprache ein/aus =====
export function startListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return alert(t('micUnsupported'));
    const recognition = new Recognition();
    recognition.lang = SPEECH_LANG[settings.lang];
    const micBtn = document.querySelector('.voice-btn');
    micBtn.classList.add('rec');
    recognition.onresult = (e) => { setQuery(e.results[0][0].transcript); };
    recognition.onend = () => { micBtn.classList.remove('rec'); };
    recognition.onerror = () => { micBtn.classList.remove('rec'); };
    recognition.start();
}
function pickVoice(langTag) {
    const voices = (window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || [];
    const norm = function (v) { return (v.lang || '').toLowerCase().replace('_', '-'); };
    const full = langTag.toLowerCase();
    const base = full.split('-')[0];
    const matches = voices.filter(v => norm(v).startsWith(base));
    return matches.find(v => v.localService && norm(v) === full)
        || matches.find(v => v.localService)
        || matches.find(v => norm(v) === full)
        || matches[0] || null;
}
function speechText(md) {
    return md
        .replace(/```[\s\S]*?(?:```|$)/g, ' ')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/[*_#>|~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function lastAssistantText() {
    for (let i = state.chatHistory.length - 1; i >= 0; i--) {
        if (state.chatHistory[i].role === 'assistant') return state.chatHistory[i].content;
    }
    return '';
}
function speakResponse() {
    const text = speechText(lastAssistantText());
    if (!text) return;
    window.speechSynthesis.cancel();
    const tag = SPEECH_LANG[settings.lang];
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = tag;
    const voice = pickVoice(tag);
    if (voice) utter.voice = voice;
    utter.onstart = function () { updateReadBtn(true); };
    utter.onend = utter.onerror = function () { updateReadBtn(false); };
    window.speechSynthesis.speak(utter);
}
export function updateReadBtn(on) {
    state.speaking = on;
    document.querySelectorAll('.msg-read use').forEach(function (u) { u.setAttribute('href', 'lib/icons.svg#i-' + (on ? 'stop' : 'volume')); });
    if (state.eqPx) state.eqPx.wake();
}
export function toggleRead() { if (state.speaking) stopSpeaking(); else speakResponse(); }
function stopSpeaking() { window.speechSynthesis.cancel(); updateReadBtn(false); }
