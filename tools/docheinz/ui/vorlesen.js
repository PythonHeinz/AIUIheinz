/* tools/docheinz/ui/vorlesen.js – Vorlesen mit der Sprachausgabe des Browsers (Web Speech API, speechSynthesis): Satz für Satz ab der aktuellen Seite,
 * der gelesene Satz wird markiert, die Seite blättert mit, am Kapitelende geht es im nächsten Kapitel weiter. Nichts verlässt das Gerät, solange die Stimme
 * eine lokale ist (Stimmen „offline“ werden bevorzugt). Pause = Satz abbrechen und beim Fortsetzen neu beginnen (pause/resume sind auf Android unzuverlässig).
 *   initVorlesen(env)   env: { body(), rec(), lang(), t(k, v), pageInfo() -> { page, step }, ready(), follow(range), nextChapter() -> Promise<bool>, isOpen() }
 *   supported(), startReading(), stopReading(), isReading() */
import { $, HeinzStore } from './base.js';
import { splitSentences, pickVoice, RATES } from '../mod/vorlesen.js';

const KEY = 'heinz_docheinz_tts';
const R = { env: null, on: false, paused: false, text: '', segs: [], sents: [], idx: 0, run: 0, wired: false, voices: [] };
export const supported = () => !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
export const isReading = () => R.on;
const pref = () => { const p = HeinzStore.get(KEY, null); return p && typeof p === 'object' ? p : {}; };
const savePref = (patch) => HeinzStore.set(KEY, Object.assign(pref(), patch));
const lang = () => String(R.env.rec().language || R.env.lang() || 'en').slice(0, 2).toLowerCase();
const t = (k, v) => R.env.t(k, v);

// ---------- Text und Sätze der sichtbaren Kapitel ----------
const BLOCK = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,div,pre,td,th,figcaption,dd,dt';
function build() {
    const b = R.env.body(), w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
    let text = '', prev = null, n; R.segs = [];
    while ((n = w.nextNode())) {
        const v = n.nodeValue; if (!v) continue;
        const bl = (n.parentElement && n.parentElement.closest(BLOCK)) || b;
        if (prev && bl !== prev && text && !text.endsWith('\n')) text += '\n';          // Blockgrenze = Satzgrenze
        R.segs.push({ node: n, v: text.length, len: v.length });
        text += v; prev = bl;
    }
    R.text = text; R.sents = splitSentences(text, lang()); R.idx = 0;
}
function loc(pos, end) {
    const s = R.segs;
    let lo = 0, hi = s.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (s[mid].v <= pos) lo = mid; else hi = mid - 1; }
    const g = s[lo]; if (!g) return null;
    return { node: g.node, off: Math.min(g.len, Math.max(0, pos - g.v) + (end ? 1 : 0)) };
}
function rangeOf(sn) {
    const a = loc(sn.start, false), z = loc(sn.start + sn.len - 1, true);
    if (!a || !z) return null;
    const r = document.createRange();
    try { r.setStart(a.node, a.off); r.setEnd(z.node, z.off); } catch { return null; }
    return r;
}
const rectLeft = (r) => { const q = r.getClientRects()[0] || r.getBoundingClientRect(); return q.left; };
function firstOnPage() {
    const { page, step } = R.env.pageInfo(), base = R.env.body().getBoundingClientRect().left;
    for (let i = 0; i < R.sents.length; i++) { const r = rangeOf(R.sents[i]); if (r && rectLeft(r) - base >= page * step - 1) return i; }
    return Math.max(0, R.sents.length - 1);
}
const pageOfSentence = (i) => { const r = R.sents[i] && rangeOf(R.sents[i]); if (!r) return -1; const { step } = R.env.pageInfo(); return Math.floor((rectLeft(r) - R.env.body().getBoundingClientRect().left + 1) / step); };

// ---------- Sprechen ----------
function voiceFor() { return pickVoice(R.voices, lang(), pref().voice); }
function say(str) {
    return new Promise((ok) => {
        const u = new SpeechSynthesisUtterance(str), v = voiceFor(), rate = +pref().rate || 1;
        u.lang = (v && v.lang) || lang(); if (v) u.voice = v; u.rate = rate;
        let done = false; const fin = () => { if (!done) { done = true; clearTimeout(wd); ok(); } };
        const wd = setTimeout(() => { try { speechSynthesis.cancel(); } catch { /* weiter */ } fin(); }, 4000 + str.length * 180 / rate);    // hängende Ausgabe (bekannter Fehler) nicht ewig abwarten
        u.onend = fin; u.onerror = fin;
        speechSynthesis.speak(u);
    });
}
async function loop(from) {
    const my = ++R.run;
    try { speechSynthesis.cancel(); } catch { /* nichts zu stoppen */ }
    R.on = true; R.paused = false; R.idx = from; bar();
    while (my === R.run && R.env.isOpen()) {
        const sn = R.sents[R.idx];
        if (!sn) {                                                               // Kapitelende
            if (!(await R.env.nextChapter()) || my !== R.run) { if (my === R.run) stopReading(); return; }
            build(); R.idx = 0;
            continue;
        }
        const r = rangeOf(sn);
        if (r) R.env.follow(r);
        const str = R.text.slice(sn.start, sn.start + sn.len);
        if (/[\p{L}\p{N}]/u.test(str)) await say(str);
        if (my !== R.run) return;
        R.idx++;
    }
}

// ---------- Steuerung ----------
function bar() {
    const b = $('r-tts'); if (!b) return;
    const lvl = R.on ? (R.paused ? '2' : '1') : '0', changed = $('reader').dataset.tts !== lvl;
    b.hidden = !R.on;
    $('reader').dataset.tts = lvl;
    $('tts-play').textContent = R.paused ? '▶' : '❚❚';
    $('tts-play').setAttribute('aria-label', t(R.paused ? 'tts_play' : 'tts_pause'));
    $('tts-voice-row').hidden = !R.paused;
    if (changed && R.env.relayout) R.env.relayout();                       // Platz für die Leiste: Seiten neu einteilen
}
function fillBar() {
    const rs = $('tts-rate'); rs.textContent = '';
    RATES.forEach(r => rs.appendChild(Object.assign(document.createElement('option'), { value: r, textContent: r + '×' })));
    rs.value = +pref().rate || 1;
    const vs = $('tts-voice'); vs.textContent = '';
    loadVoices();
    const l = lang(), fit = R.voices.filter(v => String(v.lang).slice(0, 2).toLowerCase() === l), list = fit.length ? fit : R.voices;
    list.forEach(v => vs.appendChild(Object.assign(document.createElement('option'), { value: v.voiceURI, textContent: v.name + (v.localService ? ' · ' + t('tts_offline') : '') })));
    const cur = voiceFor(); if (cur) vs.value = cur.voiceURI;
    vs.hidden = list.length < 1;
}
function loadVoices() { try { R.voices = speechSynthesis.getVoices() || []; } catch { R.voices = []; } }
function wire() {
    if (R.wired) return; R.wired = true;
    const restart = (i) => { R.paused = false; loop(Math.max(0, Math.min(R.sents.length - 1, i))); };
    $('tts-prev').addEventListener('click', () => { if (R.on) restart(R.idx - 1); });
    $('tts-next').addEventListener('click', () => { if (R.on) restart(R.idx + 1); });
    $('tts-play').addEventListener('click', () => {
        if (!R.on) return;
        if (!R.paused) { R.run++; try { speechSynthesis.cancel(); } catch { /* weiter */ } R.paused = true; fillBar(); bar(); return; }
        restart(pageOfSentence(R.idx) === R.env.pageInfo().page ? R.idx : firstOnPage());
    });
    $('tts-stop').addEventListener('click', stopReading);
    $('tts-rate').addEventListener('change', (e) => { savePref({ rate: +e.target.value }); if (R.on && !R.paused) restart(R.idx); });
    $('tts-voice').addEventListener('change', (e) => { savePref({ voice: e.target.value }); });
    try { speechSynthesis.addEventListener('voiceschanged', () => { loadVoices(); if (R.on) fillBar(); }); } catch { /* ohne Ereignis */ }
}
export function initVorlesen(env) { R.env = env; wire(); }
export function startReading() {
    if (!supported() || !R.env || !R.env.isOpen()) return;
    R.env.ready();
    loadVoices(); fillBar();
    build();
    if (!R.sents.length) return;
    loop(firstOnPage());
}
export function afterTurn(newText) {              // von Hand geblättert: ab der ersten Zeile der neuen Seite weiterlesen (bei Pause nur den Platz merken)
    if (!R.on || !R.env.isOpen()) return;
    if (newText || !R.sents.length) build();
    const i = firstOnPage();
    if (R.paused) { R.idx = i; return; }
    loop(i);
}
export function stopReading() {
    R.run++;
    try { if (supported()) speechSynthesis.cancel(); } catch { /* weiter */ }
    R.on = false; R.paused = false;
    try { if (window.CSS && CSS.highlights) CSS.highlights.delete('dh-read'); } catch { /* ohne Hervorhebung */ }
    if (R.env) bar();
}
