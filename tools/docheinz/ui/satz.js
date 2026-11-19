/* tools/docheinz/ui/satz.js – Bedienfeld für Satzspiegel und Aussehen (im Einstellungsblatt der Leseansicht).
 * Baut die Regler aus einer Tabelle; liest und schreibt Werte nur über die Schnittstelle api (Leseansicht hält die Daten):
 *   api = { t, get(k), set(k, v), scope(), setScope(book), reset(), profiles(), saveProfile(name), applyProfile(id), deleteProfile(id) } */
import { $ } from './base.js';
import { LIMITS } from '../mod/satz.js';

const GROUPS = [
    { id: 'space', items: [{ k: 'lh', step: 0.05, d: 2 }, { k: 'ps', step: 0.05, d: 2 }, { k: 'ind', step: 0.1, d: 1 }] },
    { id: 'margin', items: [{ k: 'mx', step: 1, d: 0 }, { k: 'my', step: 1, d: 0 }, { k: 'maxw', step: 10, d: 0 }] },
    { id: 'cols', items: [{ k: 'cols', select: [[1, 'l_c1'], [2, 'l_c2']] }] },
    { id: 'text', items: [{ k: 'just', sw: 1 }, { k: 'hyph', sw: 1 }, { k: 'wid', sw: 1 }, { k: 'ws', step: 0.01, d: 2 }, { k: 'ls', step: 0.005, d: 3 }, { k: 'fw', step: 100, d: 0 }] },
    { id: 'color', items: [{ k: 'fgc', color: true }, { k: 'bgc', color: true }, { k: 'bri', step: 1, d: 0 }] },
];
let API = null;
const ALL = GROUPS.flatMap(g => g.items);
const host = (id) => $('lk-' + id);

function row(it) {
    const t = API.t;
    if (it.sw) {          // Schalter in einer Katalogzeile (.row + .sw)
        const lab = document.createElement('label'); lab.className = 'row'; lab.dataset.k = it.k;
        const tx = document.createElement('span'); tx.className = 'tx'; tx.append(Object.assign(document.createElement('b'), { textContent: t('k_' + it.k) }));
        if (['just', 'hyph', 'wid'].includes(it.k)) tx.append(Object.assign(document.createElement('small'), { textContent: t('k_' + it.k + 'S') }));
        const sw = document.createElement('span'); sw.className = 'sw';
        const i = document.createElement('input'); i.type = 'checkbox'; i.addEventListener('change', () => { API.set(it.k, i.checked ? 1 : 0); sync(false); });
        sw.append(i, document.createElement('i'));
        lab.append(tx, sw);
        return lab;
    }
    const lab = document.createElement('label'); lab.className = 'fld'; lab.dataset.k = it.k;
    const head = document.createElement('span');
    head.append(Object.assign(document.createElement('span'), { textContent: t('k_' + it.k) }), document.createTextNode(' '), Object.assign(document.createElement('b'), { className: 'v' }));
    lab.appendChild(head);
    if (it.select) {
        const sel = document.createElement('select'); sel.className = 'sel';
        it.select.forEach(([v, key]) => sel.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: t(key) })));
        sel.addEventListener('change', () => { API.set(it.k, +sel.value); sync(false); });
        lab.appendChild(sel);
    } else if (it.color) {
        const i = document.createElement('input'); i.type = 'color';
        i.addEventListener('input', () => { API.set(it.k, i.value); sync(false); });
        lab.appendChild(i);
    } else {
        const i = document.createElement('input'); i.type = 'range'; i.min = LIMITS[it.k][0]; i.max = LIMITS[it.k][1]; i.step = it.step;
        i.addEventListener('input', () => { API.set(it.k, +i.value); sync(false); });
        lab.appendChild(i);
    }
    return lab;
}

export function buildLookUi(api) {
    API = api;
    const t = api.t;
    for (const g of GROUPS) { const h = host(g.id); h.textContent = ''; g.items.forEach(it => h.appendChild(row(it))); }
    const h = host('prof'); h.textContent = '';
    const f = document.createElement('div'); f.className = 'dh-pform';
    const n = document.createElement('input'); n.type = 'text'; n.id = 'prof-name'; n.maxLength = 40; n.placeholder = t('l_pname');
    const s = document.createElement('button'); s.type = 'button'; s.className = 'pill'; s.id = 'prof-save'; s.textContent = t('l_psave');
    s.addEventListener('click', () => { const v = n.value.trim(); if (!v) return; api.saveProfile(v); n.value = ''; sync(); });
    f.append(n, s);
    const list = document.createElement('div'); list.className = 'dh-plist'; list.id = 'prof-list';
    h.append(f, list);
    sync();
}

export function sync(full = true) {
    if (!API) return;
    const t = API.t;
    document.querySelectorAll('#r-set [data-k]').forEach(l => {
        const k = l.dataset.k, v = API.get(k), it = ALL.find(x => x.k === k);
        if (!it) return;
        const out = l.querySelector('.v');
        if (it.sw) l.querySelector('input').checked = !!+v;
        else if (it.select) l.querySelector('select').value = String(v);
        else { const i = l.querySelector('input'); if (full || i !== document.activeElement) i.value = v; if (out) out.textContent = it.color ? '' : (+v).toFixed(it.d); }
    });
    const sc = $('sel-scope'); if (sc) sc.value = API.scope() ? '1' : '0';
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
