/* tools/filter/ui/eingabe.js – Schritt 1: Eingabe (Einfügen, Datei, Beispiel), Spaltenwahl, Kontrollspalte. Logik steckt in ../mod/einlesen.js. */
import { Heinz, $ } from './base.js';
import { S, t, on, emit, msg, persist } from './state.js';
import { einlesen, eintraege } from '../mod/einlesen.js';
import { kontrollEtiketten } from '../mod/auswerten.js';

const SAMPLE = ['Invoice 2024-118 is overdue – please pay by Friday', 'Your weekly newsletter: 10 tips for better sleep', 'Thanks a lot, the new release works great!',
    'Re: server outage – customers are complaining', '50% off everything this weekend only!!!', 'Meeting moved to 3 pm, hope that works for you',
    'Leider müssen wir Ihren Auftrag stornieren', 'Happy birthday! Let\'s have dinner on Saturday', 'Security alert: new login from unknown device',
    'Quarterly report attached, numbers look disappointing', 'Vielen Dank für die schnelle Hilfe, super Service!', 'Reminder: dentist appointment tomorrow at 9:00'].join('\n');
const MAX_MB = 20, SHOW_MAX = 100000;
let source = 'paste';

function bestCol(d) {   // die Spalte mit dem längsten Durchschnittstext liest das Modell zuerst
    let best = 0, bl = -1;
    d.headers.forEach((_, c) => { const n = d.rows.length || 1; const l = d.rows.reduce((s, r) => s + (r[c] || '').length, 0) / n; if (l > bl) { bl = l; best = c; } });
    return best;
}

export function parse(reset) {
    S.data = einlesen(S.text, S.name, { absatz: S.absatz });
    if (S.data.kind === 'table') {
        if (reset || S.cols.some(c => c >= S.data.headers.length) || !S.cols.length) { S.cols = [bestCol(S.data)]; S.cmp = -1; }
        if (S.cmp >= S.data.headers.length) S.cmp = -1;
    } else { S.cols = [0]; S.cmp = -1; }
    S.entries = eintraege(S.data, S.cols);
    render();
    emit('input');
}

function render() {
    const d = S.data, info = $('info');
    if (!S.text) { info.textContent = ''; } else if (d && d.error) info.textContent = t('infoErr', { why: d.error });
    else if (!S.entries.length) info.textContent = t('infoNone');
    else info.textContent = t('info', { n: S.entries.length.toLocaleString(Heinz.lang), src: srcName() }) + ' (' + t('fmt_' + d.format) + ').';
    $('row-absatz').hidden = !(d && d.kind === 'text' && S.text);
    $('absatz').checked = S.absatz;
    const tab = d && d.kind === 'table';
    $('colbox').hidden = !tab;
    if (!tab) return;
    const box = $('cols'); box.textContent = '';
    d.headers.forEach((h, c) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'fl-chip'; b.textContent = h;
        b.setAttribute('aria-pressed', S.cols.indexOf(c) >= 0 ? 'true' : 'false');
        b.addEventListener('click', () => {
            const i = S.cols.indexOf(c);
            if (i >= 0) { if (S.cols.length > 1) S.cols.splice(i, 1); } else S.cols.push(c);
            S.cols.sort((a, b2) => a - b2); S.entries = eintraege(S.data, S.cols); render(); emit('input'); persist();
        });
        box.appendChild(b);
    });
    const sel = $('cmp'); sel.textContent = '';
    const none = document.createElement('option'); none.value = '-1'; none.textContent = t('none'); sel.appendChild(none);
    d.headers.forEach((h, c) => { const o = document.createElement('option'); o.value = String(c); o.textContent = h; sel.appendChild(o); });
    sel.value = String(S.cmp);
    $('b-take').hidden = S.cmp < 0;
}
function srcName() { return source === 'file' ? t('src_file', { f: S.name }) : source === 'sample' ? t('src_sample') : source === 'restored' ? t('src_restored') : t('src_paste'); }

export function setSource(s) { source = s; }
export function rerender() { render(); }

function load(text, name, src, setBox) {
    S.text = text; S.name = name || ''; source = src;
    S.run = null; S.resMap = {}; S.sel = [];
    if (setBox !== false) $('in').value = text.length > SHOW_MAX ? '' : text;
    parse(true); emit('reset'); persist();
}

export function initEingabe() {
    let timer = 0;
    $('in').addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => load($('in').value, '', 'paste', false), 250);
    });
    $('b-paste').addEventListener('click', async () => {
        try { const x = await navigator.clipboard.readText(); if (x) load(x, '', 'paste'); } catch (e) { msg(t('copyFail'), 'warn'); }
    });
    $('b-sample').addEventListener('click', () => load(SAMPLE, '', 'sample'));
    $('b-clear').addEventListener('click', () => load('', '', 'paste'));
    $('file').addEventListener('change', async (ev) => {
        const f = ev.target.files && ev.target.files[0]; ev.target.value = '';
        if (!f) return;
        if (f.size > MAX_MB * 1048576) { msg(t('infoErr', { why: '> ' + MAX_MB + ' MB' }), 'err'); return; }
        try { load(await f.text(), f.name, 'file'); } catch (e) { msg(t('infoErr', { why: String(e && e.message || e) }), 'err'); }
    });
    $('absatz').addEventListener('change', (e) => { S.absatz = e.target.checked; S.run = null; S.resMap = {}; parse(false); emit('reset'); persist(); });
    $('cmp').addEventListener('change', (e) => { S.cmp = parseInt(e.target.value, 10); render(); emit('cmp'); persist(); });
    $('b-take').addEventListener('click', () => {
        const l = kontrollEtiketten(S.data.rows, S.cmp);
        if (l.length) { S.cfg.labels = l.join(', '); S.cfg.preset = 'custom'; emit('labels'); }
    });
    on('lang', () => { render(); });
}

// aus der letzten Sitzung: Eingabe wiederherstellen, ohne Ergebnisse zu löschen
export function restoreInput(r) {
    S.text = r.text || ''; S.name = r.name || ''; S.absatz = !!r.absatz; source = 'restored';
    $('in').value = S.text.length > SHOW_MAX ? '' : S.text;
    S.data = einlesen(S.text, S.name, { absatz: S.absatz });
    S.cols = (r.cols && r.cols.length ? r.cols : [0]); S.cmp = typeof r.cmp === 'number' ? r.cmp : -1;
    if (S.data.kind === 'table') { S.cols = S.cols.filter(c => c < S.data.headers.length); if (!S.cols.length) S.cols = [bestCol(S.data)]; if (S.cmp >= S.data.headers.length) S.cmp = -1; } else { S.cols = [0]; S.cmp = -1; }
    S.entries = eintraege(S.data, S.cols);
    render();
}
