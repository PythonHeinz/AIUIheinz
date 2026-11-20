/* tools/filter/ui/ergebnis.js – Schritt 3: Lauf (Start, Abbruch, Fortsetzen), Kacheln, Tabelle, Kontrolle, Export. Rechnen und Prüfen machen die Module in ../mod/. */
import { Heinz, HeinzProviders as PV, $ } from './base.js';
import { S, t, on, emit, msg, persist } from './state.js';
import { lauf } from '../mod/bewerten.js';
import { mitKontrolle, zaehlen, trefferquote, verwechslung, stichprobe, sortieren } from '../mod/auswerten.js';
import { exportiere, tabelle, zuTSV } from '../mod/ausgabe.js';
import { labelList, onlineState, providerName } from './regel.js';

const ROWS_MAX = 300;
const COLORS = ['var(--green)', 'var(--pri)', 'var(--orange)', 'var(--red)', 'var(--sub)', 'var(--muted)'];

const results = () => (S.run ? S.run.indices.map(i => S.resMap[i]).filter(Boolean) : []);
const okCount = () => results().filter(r => !r.fehler).length;
const canResume = () => !S.running && !!S.run && !S.run.done && okCount() < S.run.indices.length;
const labels = () => (S.run ? S.run.labels : labelList());

function view() {
    let rows = mitKontrolle(results(), S.cmp);
    if (S.cfg.only && S.sel.length) rows = rows.filter(e => S.sel.some(k => k === '?' ? e.label == null : k === '!' ? e.treffer === false : e.label === k));
    return sortieren(rows, S.cfg.sort, labels());
}

function renderButtons() {
    const blocked = onlineState() === 'blocked';
    $('b-run').disabled = S.running || blocked; $('b-run').hidden = S.running;
    $('b-cancel').hidden = !S.running;
    const r = canResume();
    $('b-resume').hidden = !r; $('b-resume').disabled = blocked;
    if (r) $('t-resume').textContent = t('resume', { d: okCount(), n: S.run.indices.length });
}

function renderProgress() {
    const run = S.run, total = run ? run.indices.length : 0, d = results().length;
    $('prog').hidden = !run || !total;
    $('progbar').style.width = total ? Math.round(100 * d / total) + '%' : '0';
    const errs = results().filter(r => r.fehler).length;
    $('status').textContent = run && total ? t('progress', { d, n: total }) + (errs ? ' · ' + t('errors', { n: errs }) : '') : '';
}

export function render() {
    renderButtons(); renderProgress();
    const rs = mitKontrolle(results(), S.cmp);
    $('resbox').hidden = !rs.length;
    if (!rs.length) return;
    const L = labels(), z = zaehlen(rs, L), q = trefferquote(rs), run = S.run;
    $('fact').textContent = t('fact', { engine: run.provider, model: run.model, temp: run.temp });
    const tiles = $('tiles'); tiles.textContent = '';
    const add = (key, big, small, color) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'fl-tile';
        b.setAttribute('aria-pressed', S.sel.indexOf(key) >= 0 ? 'true' : 'false');
        const n = document.createElement('b'), s = document.createElement('span');
        n.textContent = big;
        if (color) { const d = document.createElement('i'); d.className = 'fl-dot'; d.style.background = color; s.appendChild(d); }
        s.appendChild(document.createTextNode(small)); b.append(n, s);
        b.addEventListener('click', () => { const i = S.sel.indexOf(key); if (i >= 0) S.sel.splice(i, 1); else S.sel.push(key); render(); persist(); });
        tiles.appendChild(b);
    };
    L.forEach((l, i) => add(l, z.je[l] + ' · ' + Math.round(100 * z.anteil[l]) + ' %', l, COLORS[i % COLORS.length]));
    if (z.unklar) add('?', String(z.unklar), t('unclear'), COLORS[5]);
    if (q.quote !== null) {
        add('!', Math.round(100 * q.quote) + ' %', t('quote') + ' (' + t('quoteOf', { t: q.treffer, g: q.geprueft }) + ')');
    }
    $('only').checked = !!S.cfg.only;
    document.querySelectorAll('#seg-sort button').forEach(b => b.classList.toggle('on', b.dataset.sort === S.cfg.sort));
    // Tabelle
    const rows = view(), tbl = $('tbl'); tbl.textContent = '';
    const th = document.createElement('tr');
    const head = [t('thEntry'), t('thLabel')]; if (S.cmp >= 0) head.push(t('thCtl')); if (run.mitGrund) head.push(t('thWhy'));
    head.forEach(h => { const c = document.createElement('th'); c.textContent = h; th.appendChild(c); });
    tbl.appendChild(th);
    rows.slice(0, ROWS_MAX).forEach(e => {
        const tr = document.createElement('tr');
        const cell = (txt, cls) => { const c = document.createElement('td'); c.textContent = txt; if (cls) c.className = cls; tr.appendChild(c); return c; };
        cell(e.text.length > 160 ? e.text.slice(0, 160) + ' …' : e.text);
        const li = L.indexOf(e.label), lc = cell(e.label == null ? (e.fehler ? '⚠ ' : '') + t('unclear') : e.label);
        if (li >= 0) { const d = document.createElement('i'); d.className = 'fl-dot'; d.style.background = COLORS[li % COLORS.length]; lc.prepend(d); }
        if (S.cmp >= 0) cell(e.erwartet || '', e.treffer === true ? 'ok' : e.treffer === false ? 'bad' : '');
        if (run.mitGrund) cell(e.grund || '');
        tbl.appendChild(tr);
    });
    $('more').textContent = rows.length > ROWS_MAX ? t('more', { n: ROWS_MAX, m: rows.length }) : '';
    // Verwechslungstabelle
    const cfb = $('cfbox'); cfb.hidden = S.cmp < 0;
    if (S.cmp >= 0) {
        const v = verwechslung(rs, L), ct = $('cf'); ct.textContent = '';
        const h = document.createElement('tr');
        [t('cfRow')].concat(v.spalten.map(s => s === '?' ? t('unclear') : s)).forEach(x => { const c = document.createElement('th'); c.textContent = x; h.appendChild(c); });
        ct.appendChild(h);
        v.zeilen.forEach(zl => {
            const tr = document.createElement('tr'), c0 = document.createElement('td'); c0.textContent = zl; tr.appendChild(c0);
            v.spalten.forEach(sp => { const c = document.createElement('td'); c.className = 'num' + (sp === zl ? ' ok' : ''); c.textContent = String(v.zelle(zl, sp)); tr.appendChild(c); });
            ct.appendChild(tr);
        });
    }
    const wrong = rs.filter(r => r.quelle === 'ungueltig' || r.quelle === 'leer').length, cut = rs.filter(r => r.gekuerzt).length;
    const notes = [];
    if (cut) notes.push(t('short', { n: cut, c: 500 }));
    if (wrong && PV.get(run.provider) && PV.get(run.provider).format !== 'ollama') notes.push(t('fallback', { n: wrong }));
    if (notes.length && !S.running) msg(notes.join(' '), 'warn');
}

function errText(e) {
    if (e instanceof TypeError) return t('offline');
    if (e && e.code === 'ONLINE_BLOCKED') return t('blocked');
    if (e && e.http === 404) return t('notFound', { m: S.cfg.model });
    return t('failed', { m: String(e && e.message || e) });
}

async function start(resume) {
    if (S.running) return;
    msg('');
    const c = S.cfg, L = labelList();
    if (!resume) {
        if (!S.entries.length) return msg(t('noData'), 'err');
        if (L.length < 2) return msg(t('noLabels'), 'err');
        if (!c.rule.trim()) return msg(t('noRule'), 'err');
        if (!c.model) return msg(t('noModel'), 'err');
    }
    const st = onlineState();
    if (st === 'blocked') return;
    if (st === 'online' && S.onlineOk !== c.provider) {   // eigene Rückfrage: jeder Eintrag verlässt das Gerät
        const el = $('onl'); el.hidden = false; el.className = 'notice warn'; el.textContent = t('onlineAsk', { name: providerName() }) + ' ';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = t('onlineYes');
        b.addEventListener('click', () => { S.onlineOk = c.provider; emit('online'); start(resume); });
        el.appendChild(b); return;
    }
    if (!resume) {
        const list = stichprobe(S.entries, c.limit, { zufaellig: c.zufall, seed: c.seed });
        S.run = { indices: list.map(e => e.index), labels: L, rule: c.rule.trim(), mitGrund: !!c.mitGrund, provider: c.provider, model: c.model, temp: c.temp, maxTok: c.maxTok, done: false };
        S.resMap = {}; S.sel = [];
    }
    const run = S.run, byIndex = {}; S.entries.forEach(e => { byIndex[e.index] = e; });
    const eintr = run.indices.map(i => byIndex[i]).filter(Boolean);
    const bereits = {}; Object.keys(S.resMap).forEach(k => { if (!S.resMap[k].fehler) bereits[k] = S.resMap[k]; });
    Object.keys(S.resMap).forEach(k => { if (S.resMap[k].fehler) delete S.resMap[k]; });
    S.running = true; S.ac = new AbortController(); render();
    try { await PV.prepare(run.provider, run.model); } catch (e) { /* the first request reports a real problem */ }
    const rt = PV.runtime(run.provider, run.model) || {};
    const senden = async (a, signal) => {
        const r = await PV.chat(run.provider, {
            model: run.model, system: a.system, messages: [{ role: 'user', content: a.user }], format: a.format, signal,
            options: Object.assign({}, rt.options || {}, { temperature: run.temp, num_predict: run.maxTok || 120 }), keepAlive: rt.keepAlive
        });
        return r.text;
    };
    let out;
    try {
        out = await lauf({ eintraege: eintr, labels: run.labels, regel: run.rule, mitGrund: run.mitGrund, senden, signal: S.ac.signal, bereits,
            onErgebnis: (e) => { S.resMap[e.index] = e; renderProgress(); if (Object.keys(S.resMap).length % 3 === 0) render(); persist(); } });
    } catch (e) { out = { fatal: e, abgebrochen: false }; }
    S.running = false; S.ac = null;
    run.done = !out.fatal && !out.abgebrochen;
    render(); persist(true);
    if (out.fatal) msg(errText(out.fatal), 'err');
    else if (out.abgebrochen) msg(t('aborted'), 'warn');
    else if ($('msg').hidden) msg(t('fin'), 'ok');
}

function download(name, mime, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportOpts() { return { headers: S.data && S.data.kind === 'table' ? S.data.headers : null, mitGrund: S.run && S.run.mitGrund, mitKontrolle: S.cmp >= 0, unklar: t('unclear') }; }

export function initErgebnis() {
    $('b-run').addEventListener('click', () => start(false));
    $('b-resume').addEventListener('click', () => start(true));
    $('b-cancel').addEventListener('click', () => { if (S.ac) S.ac.abort(); });
    $('only').addEventListener('change', (e) => { S.cfg.only = e.target.checked; render(); persist(); });
    document.querySelectorAll('#seg-sort button').forEach(b => b.addEventListener('click', () => { S.cfg.sort = b.dataset.sort; render(); }));
    document.querySelectorAll('[data-exp]').forEach(b => b.addEventListener('click', () => {
        const x = exportiere(b.dataset.exp, view(), exportOpts()); download(x.name, x.mime, x.text); msg(t('saved', { n: x.name }), 'ok');
    }));
    $('b-copy').addEventListener('click', async () => {
        try { await Heinz.copy(zuTSV(tabelle(view(), exportOpts()))); msg(t('copied'), 'ok'); } catch (e) { msg(t('copyFail'), 'warn'); }
    });
    on('lang', render); on('cmp', render); on('online', renderButtons); on('cfg', renderButtons);
    on('reset', render);
    on('input', renderButtons);
    document.addEventListener('visibilitychange', () => { if (document.hidden) persist(true); });
    window.addEventListener('pagehide', () => persist(true));
}
