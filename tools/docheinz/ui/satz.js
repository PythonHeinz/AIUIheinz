/* tools/docheinz/ui/satz.js – Bedienfeld für Satzspiegel und Aussehen (im Einstellungsblatt der Leseansicht).
 * Baut die Regler aus einer Tabelle; liest und schreibt Werte nur über die Schnittstelle api (Leseansicht hält die Daten):
 *   api = { t, get(k), set(k, v), scope(), setScope(book), reset(), profiles(), saveProfile(name), applyProfile(id), deleteProfile(id) } */
import { $ } from './base.js';
import { LIMITS } from '../mod/satz.js';

const GROUPS = [
    { id: 'space', title: 'l_g_space', items: [
        { k: 'lh', step: 0.05, d: 2 }, { k: 'ps', step: 0.05, d: 2 }, { k: 'ind', step: 0.1, d: 1 }] },
    { id: 'margin', title: 'l_g_margin', items: [
        { k: 'mx', step: 1, d: 0 }, { k: 'my', step: 1, d: 0 }, { k: 'maxw', step: 10, d: 0 }] },
    { id: 'text', title: 'l_g_text', items: [
        { k: 'just', seg: [[0, 'l_left'], [1, 'l_just']] }, { k: 'hyph', seg: [[0, 'b_off'], [1, 'b_on']] },
        { k: 'ws', step: 0.01, d: 2 }, { k: 'ls', step: 0.005, d: 3 }, { k: 'fw', step: 100, d: 0 }, { k: 'wid', seg: [[0, 'b_off'], [1, 'b_on']] }] },
    { id: 'cols', title: 'l_g_cols', items: [{ k: 'cols', seg: [[1, 'l_c1'], [2, 'l_c2']] }] },
    { id: 'color', title: 'l_g_color', items: [{ k: 'fgc', color: true }, { k: 'bgc', color: true }, { k: 'bri', step: 1, d: 0 }] },
];
let API = null, host = null;

function row(it) {
    const t = API.t, lab = document.createElement('label');
    lab.className = 'fld'; lab.dataset.k = it.k;
    const head = document.createElement('span');
    head.append(Object.assign(document.createElement('span'), { textContent: t('k_' + it.k) }), document.createTextNode(' '), Object.assign(document.createElement('b'), { className: 'v' }));
    lab.appendChild(head);
    if (it.seg) {
        const box = document.createElement('div'); box.className = 'seg2';
        it.seg.forEach(([v, key]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = t(key); b.addEventListener('click', (e) => { e.preventDefault(); API.set(it.k, v); sync(); }); box.appendChild(b); });
        lab.appendChild(box);
        lab.removeAttribute('for');
    } else if (it.color) {
        const i = document.createElement('input'); i.type = 'color';
        i.addEventListener('input', () => { API.set(it.k, i.value); sync(); });
        lab.appendChild(i);
    } else {
        const i = document.createElement('input'); i.type = 'range'; i.min = LIMITS[it.k][0]; i.max = LIMITS[it.k][1]; i.step = it.step;
        i.addEventListener('input', () => { API.set(it.k, +i.value); sync(false); });
        lab.appendChild(i);
    }
    return lab;
}

export function buildLookUi(el, api) {
    API = api; host = el;
    el.textContent = '';
    const t = api.t;
    for (const g of GROUPS) {
        const d = document.createElement('details'); d.className = 'dh-grp'; d.dataset.g = g.id;
        d.appendChild(Object.assign(document.createElement('summary'), { textContent: t(g.title) }));
        g.items.forEach(it => d.appendChild(row(it)));
        el.appendChild(d);
    }
    const d = document.createElement('details'); d.className = 'dh-grp'; d.dataset.g = 'prof';
    d.appendChild(Object.assign(document.createElement('summary'), { textContent: t('l_g_prof') }));
    const f = document.createElement('div'); f.className = 'dh-pform';
    const n = document.createElement('input'); n.type = 'text'; n.id = 'prof-name'; n.maxLength = 40; n.placeholder = t('l_pname');
    const s = document.createElement('button'); s.type = 'button'; s.className = 'pill'; s.id = 'prof-save'; s.textContent = t('l_psave');
    s.addEventListener('click', () => { const v = n.value.trim(); if (!v) return; api.saveProfile(v); n.value = ''; sync(); });
    f.append(n, s);
    const list = document.createElement('div'); list.className = 'dh-plist'; list.id = 'prof-list';
    d.append(f, list);
    el.appendChild(d);
    sync();
}

export function sync(full = true) {
    if (!host || !API) return;
    const t = API.t;
    host.querySelectorAll('label[data-k]').forEach(l => {
        const k = l.dataset.k, v = API.get(k);
        const it = GROUPS.flatMap(g => g.items).find(x => x.k === k);
        const out = l.querySelector('.v');
        if (it.seg) { l.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === +v)); out.textContent = ''; }
        else if (it.color) { const i = l.querySelector('input'); if (full || i !== document.activeElement) i.value = v; out.textContent = ''; }
        else { const i = l.querySelector('input'); if (full || i !== document.activeElement) i.value = v; out.textContent = (+v).toFixed(it.d); }
    });
    const sc = API.scope();
    document.querySelectorAll('#seg-scope button').forEach(b => b.classList.toggle('on', (b.dataset.scope === '1') === sc));
    const list = $('prof-list');
    if (list && full) {
        list.textContent = '';
        const ps = API.profiles();
        if (!ps.length) list.appendChild(Object.assign(document.createElement('p'), { className: 'help', textContent: t('l_pnone') }));
        ps.forEach(p => {
            const r = document.createElement('div'); r.className = 'dh-prow';
            const a = document.createElement('button'); a.type = 'button'; a.textContent = p.name; a.dataset.id = p.id; a.addEventListener('click', () => { API.applyProfile(p.id); sync(); });
            const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', t('l_pdel')); x.addEventListener('click', () => { API.deleteProfile(p.id); sync(); });
            r.append(a, x); list.appendChild(r);
        });
    }
}
