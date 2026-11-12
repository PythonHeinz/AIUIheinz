/* lib/dashboard/speech.js – Diktat und Vorlesen.
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

// ===== Sprache ein/aus =====
function startListening() {
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
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        if (chatHistory[i].role === 'assistant') return chatHistory[i].content;
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

let speaking = false;
function updateReadBtn(on) {
    speaking = on;
    document.querySelectorAll('.msg-read use').forEach(function (u) { u.setAttribute('href', 'lib/icons.svg#i-' + (on ? 'stop' : 'volume')); });
    if (eqPx) eqPx.wake();
}
function toggleRead() { if (speaking) stopSpeaking(); else speakResponse(); }
function stopSpeaking() { window.speechSynthesis.cancel(); updateReadBtn(false); }
