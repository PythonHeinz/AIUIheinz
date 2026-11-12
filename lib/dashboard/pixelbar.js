/* lib/dashboard/pixelbar.js – Pixeldisplays (Modellchip, Equalizer), Statuszeile und Layout.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

import { $, Heinz, PV, esc } from './base.js';
import { t } from './i18n.js';
import { settings, state } from './state.js';

// ===== Pixeldisplays: Modellchip (Engine, Modell) und Equalizer in der Statuszeile =====
export const pulse = { e: 0 };
const CLR_ENG = '#8ab4f8', CLR_MOD = '#fdd663';
const PX_DIM = '#3c4043', PX_SUB = '#9aa0a6';
const STATUS_COLORS = { yellow: '#fbbc04', red: '#ea4335', orange: '#fb8c00', blue: '#4285f4', green: '#34a853' };
function drawChip(p) {
    const preset = state.MODE_PRESETS[settings.mode] || state.MODE_PRESETS.wilson;
    const pv = PV.get(settings.provider) || PV.get('ollama');
    const online = !pv.local && !pv.custom;
    const eng = (pv.name + (online ? ' · ' + t('chipOnline') : '')).toUpperCase();
    const x1 = p.cols - 11;
    p.ticker('c1', 3, 4, eng, CLR_ENG, { x1: x1, small: true });
    p.ticker('c2', 11, 4, settings.model || '–', CLR_MOD, { x1: x1 });
    p.sprite(['#...#', '.#.#.', '..#..'], p.cols - 8, 9, PX_SUB);
}
// Equalizer: Pegel schlagen bei jedem Token aus; Denken = ruhige Welle, Laden = Lichtlauf, sonst Grundlinie
function drawEq(p) {
    const f = p.frameNo, N = Math.max(3, Math.floor(p.cols / 3));
    pulse.e *= 0.88;
    if (state.generating && !state.gotToken) {            // Warten auf das erste Wort: zuckender Balken (blau, wie der Ring)
        const k = Math.floor(f / 2), r = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;
        const len = Math.max(3, Math.round(p.cols * (0.15 + 0.85 * r)));
        p.rect(1, 2, len, 2, STATUS_COLORS.blue);
        p.rect(1, 4, p.cols - 2, 1, PX_DIM);
        return;
    }
    if (state.preloadAbort) {                        // Modell wird vorbereitet: Wählpunkte (orange, wie der Ring)
        const n = Math.max(3, Math.floor(p.cols / 5)), ph = Math.floor(f / 3);
        for (let d = 0; d < n; d++) {
            const q = ((ph - d) % (n + 3) + (n + 3)) % (n + 3);
            p.rect(1 + d * 5, 2, 2, 2, q < 2 ? STATUS_COLORS.orange : q === 2 ? '#7a4a00' : PX_DIM);
        }
        return;
    }
    for (let i = 0; i < N; i++) {              // Sprechen (Antwort, Vorlesen): Equalizer, eine Farbe (grün)
        let h = 1, c = STATUS_COLORS[eqState.color] || PX_DIM;
        if (eqState.color === 'yellow' && !state.generating && !state.speaking) { h = (Math.floor(f / 12) % 2) ? 1 : 2; }
        if (eqState.color === 'blue' && !state.generating && !state.speaking) { const pos = (f / 4) % (N + 10); h = Math.abs(i - pos) < 1.5 ? 2 : 1; }
        if (state.generating && state.gotToken) { c = STATUS_COLORS.green; h = Math.round(1 + Math.abs(Math.sin(f / 4 + i * 1.3)) * 1.5 + pulse.e * 4 * (0.5 + 0.5 * Math.abs(Math.sin(f / 2 + i * 2.1)))); }
        else if (state.speaking) { c = STATUS_COLORS.green; h = Math.round(1.5 + Math.abs(Math.sin(f / 3 + i * 1.7)) * 3.5); }
        h = Math.max(1, Math.min(6, h));
        p.rect(i * 3, 6 - h, 2, h, c);
    }
}
const eqState = { color: 'red' };
// Performance colours of the telemetry pills (preliminary thresholds for a phone; tune with measured values, see docs/DESIGN.md)
const PERF = { tpsGood: 15, tpsSlow: 6, startGood: 2, startSlow: 8 };
export function perfColors() {
    const sp = parseFloat($('dash-speed').textContent) || 0, st = parseFloat($('dash-start').textContent) || 0;
    $('dash-speed').style.color = !sp ? '' : sp >= PERF.tpsGood ? 'var(--green)' : sp < PERF.tpsSlow ? 'var(--orange)' : '';
    $('dash-start').style.color = !st ? '' : st <= PERF.startGood ? 'var(--green)' : st > PERF.startSlow ? 'var(--orange)' : '';
}
function eqLive() { return state.generating || !!state.preloadAbort || state.speaking || pulse.e > 0.03 || ((eqState.color === 'blue' || eqState.color === 'yellow') && !document.hidden); }
export function renderStatusRow(title, color) {
    const el = $('preload-status');
    let txt = title;
    if (!state.generating && state.preloadAbort) txt = t('preLoading');
    else if (!state.generating && state.preloadReady) txt = t('preReady');
    el.textContent = txt;
    const dot = $('st-dot'); if (dot) { dot.style.background = STATUS_COLORS[color] || 'var(--sub)'; dot.style.color = STATUS_COLORS[color] || 'var(--sub)'; }
    el.style.color = color === 'red' ? 'var(--red)' : color === 'yellow' ? '#fbbc04' : color === 'orange' ? 'var(--orange)' : color === 'green' ? 'var(--green)' : '';
    eqState.color = color;
    if (!stLog.length || stLog[0].txt !== txt) { stLog.unshift({ txt: txt, color: color, at: new Date() }); stLog.length = Math.min(stLog.length, 3); renderStLog(); }
    if (state.eqPx) state.eqPx.wake();
}
export function chipWake() { if (state.chipPx) state.chipPx.wake(); }
// Equalizer-Pille so breit wie Sprachschalter + Menütaste
function sizeEq() {
    const l = document.querySelector('.top .lang-btn'), b = document.querySelector('.top .burger-btn');
    if (!l || !b || !state.eqPx) return;
    const w = Math.round(b.getBoundingClientRect().right - l.getBoundingClientRect().left);
    if (w < 60) return;
    state.eqPx.fixedCols = Math.max(9, Math.floor((w - 2 - 16) / 3));
    state.eqPx.resize(); state.eqPx.redraw();
}
export const stLog = [];
function renderStLog() {
    const box = $('st-log'); if (!box) return;
    box.innerHTML = stLog.map(function (e) {
        const hh = e.at.toTimeString().slice(0, 8);
        return '<div><i style="background:' + (STATUS_COLORS[e.color] || 'var(--sub)') + '"></i><span style="color:' + (STATUS_COLORS[e.color] || 'var(--sub)') + '">' + esc(e.txt) + '</span><small>' + hh + '</small></div>';
    }).join('');
}
let stFullT = null;
document.addEventListener('click', function (e) {
    const lg = $('st-log');
    if (e.target && e.target.id === 'eq-led') { lg.hidden = !lg.hidden; renderStLog(); } else if (lg && !lg.hidden) lg.hidden = true;
    const el = $('preload-status');
    if (e.target === el) { el.classList.toggle('st-open'); el.parentNode.classList.toggle('xl', el.classList.contains('st-open')); }
    else if (el) { el.classList.remove('st-open'); el.parentNode.classList.remove('xl'); }
});
function fitApp() {
    const vv = window.visualViewport, h = vv ? vv.height * (vv.scale || 1) : window.innerHeight;
    if (h > 300) document.documentElement.style.setProperty('--appH', Math.round(h) + 'px');
}
fitApp();
window.addEventListener('resize', fitApp);
window.addEventListener('pageshow', fitApp);
window.addEventListener('orientationchange', fitApp);
if (window.visualViewport) window.visualViewport.addEventListener('resize', fitApp);
[150, 500, 1200, 2500].forEach(function (ms) { setTimeout(fitApp, ms); });
Heinz.enhanceSelects('select.sel');
function initRingLogo() { Heinz.ringLogo($('ring-logo')); }
export function initChip() {
    initRingLogo();
    if (state.chipPx || !$('chip-led')) return;
    state.chipPx = new Heinz.Pixel($('chip-led'), { rows: 22, pitch: 2, dot: 1.1 });
    state.chipPx.run(drawChip);
    state.eqPx = new Heinz.Pixel($('eq-led'), { rows: 6, cols: 11, pitch: 3, dot: 1.6 });
    state.eqPx.run(drawEq, { live: eqLive });
    sizeEq();
    window.addEventListener('resize', function () { state.chipPx.resize(); state.chipPx.redraw(); sizeEq(); });
}
