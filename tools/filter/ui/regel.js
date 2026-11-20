/* tools/filter/ui/regel.js – Schritt 2: Regel, Etiketten, Voreinstellungen, Parameter, Engine und Modell (nur über HeinzProviders). */
import { Heinz, HeinzStore, HeinzProviders as PV, $ } from './base.js';
import { S, t, on, emit, saveCfg } from './state.js';
import { PRESETS, PRESET_IDS } from '../mod/presets.js';

const lg = () => Heinz.lang === 'de' ? 'de' : 'en';
export const labelList = () => S.cfg.labels.split(',').map(s => s.trim()).filter(Boolean);
let modelSeq = 0;

function renderPresets() {
    const box = $('presets'); box.textContent = '';
    PRESET_IDS.concat(['custom']).forEach(id => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'fl-chip';
        b.textContent = id === 'custom' ? t('custom') : PRESETS[id].name[lg()];
        b.setAttribute('aria-pressed', S.cfg.preset === id ? 'true' : 'false');
        b.addEventListener('click', () => {
            S.cfg.preset = id;
            if (id !== 'custom') { S.cfg.rule = PRESETS[id].rule; S.cfg.labels = PRESETS[id].labels.join(', '); }
            fillFields(); saveCfg(HeinzStore);
        });
        box.appendChild(b);
    });
    $('presetdesc').textContent = S.cfg.preset !== 'custom' && PRESETS[S.cfg.preset] ? PRESETS[S.cfg.preset].desc[lg()] : '';
}

function fillFields() {
    renderPresets();
    $('rule').value = S.cfg.rule; $('labels').value = S.cfg.labels;
    $('temp').value = S.cfg.temp; $('maxtok').value = S.cfg.maxTok; $('limit').value = S.cfg.limit;
    $('why').checked = !!S.cfg.mitGrund; $('zufall').checked = !!S.cfg.zufall; $('seed').value = S.cfg.seed;
    $('row-seed').hidden = !S.cfg.zufall;
    emit('cfg');
}

export function onlineState() {   // 'local' | 'blocked' | 'online'
    const p = PV.get(S.cfg.provider);
    if (!p || p.local) return 'local';
    return PV.onlineAllowed() ? 'online' : 'blocked';
}
export function providerName() { const p = PV.get(S.cfg.provider); return p ? p.name : S.cfg.provider; }

function renderOnline() {
    const el = $('onl'), st = onlineState();
    if (st === 'local') { el.hidden = true; el.textContent = ''; }
    else { el.hidden = false; el.className = 'notice ' + (st === 'blocked' ? 'err' : 'warn'); el.textContent = st === 'blocked' ? t('onlineOff') : t('onlineWarn', { name: providerName() }); }
    renderRt();
    emit('online');
}
function renderRt() {
    let rt = t('ctxNone');
    try {
        const o = PV.runtime(S.cfg.provider, S.cfg.model).options || {};
        const parts = []; if (o.num_thread) parts.push('threads ' + o.num_thread); if (o.num_ctx) parts.push('context ' + o.num_ctx);
        if (parts.length) rt = parts.join(', ');
    } catch (e) { /* keep default */ }
    $('rtinfo').textContent = t('ctxInfo', { rt });
}

function fillProviders() {
    const sel = $('provider'); sel.textContent = '';
    const list = PV.list().filter(p => p.local || PV.onlineAllowed());
    if (!list.some(p => p.id === S.cfg.provider)) { const cur = PV.get(S.cfg.provider); if (cur) list.push(cur); }
    list.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name + (p.local ? '' : ' ☁'); sel.appendChild(o); });
    sel.value = S.cfg.provider;
}

async function fillModels() {
    const seq = ++modelSeq, sel = $('model'); sel.textContent = '';
    let names = [];
    try { names = await PV.models(S.cfg.provider); } catch (e) { names = []; }
    if (seq !== modelSeq) return;
    if (S.cfg.model && names.indexOf(S.cfg.model) < 0) names = [S.cfg.model].concat(names);
    names.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
    sel.value = S.cfg.model;
    $('modelhelp').textContent = t('modelHelp') + (names.length <= 1 ? ' ' + t('modelNone') : '');
    renderRt();
}

export function initRegel() {
    const bind = (id, key, conv, after) => $(id).addEventListener(id === 'why' || id === 'zufall' ? 'change' : 'input', (e) => {
        const el = e.target; S.cfg[key] = conv(el.type === 'checkbox' ? el.checked : el.value);
        if (after) after(); saveCfg(HeinzStore); emit('cfg');
    });
    const num = (d) => (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
    bind('rule', 'rule', String, () => { S.cfg.preset = 'custom'; renderPresets(); });
    bind('labels', 'labels', String, () => { S.cfg.preset = 'custom'; renderPresets(); });
    bind('temp', 'temp', num(0)); bind('maxtok', 'maxTok', num(120)); bind('limit', 'limit', num(100));
    bind('why', 'mitGrund', Boolean); bind('zufall', 'zufall', Boolean, () => { $('row-seed').hidden = !S.cfg.zufall; }); bind('seed', 'seed', num(1));
    $('provider').addEventListener('change', (e) => {
        S.cfg.provider = e.target.value; S.cfg.model = ''; S.onlineOk = false; saveCfg(HeinzStore); renderOnline(); fillModels().then(() => {
            const sel = $('model'); if (!S.cfg.model && sel.options.length) { S.cfg.model = sel.options[0].value; sel.value = S.cfg.model; saveCfg(HeinzStore); renderRt(); }
        });
    });
    $('model').addEventListener('change', (e) => { S.cfg.model = e.target.value; saveCfg(HeinzStore); PV.setActiveModel(S.cfg.provider, S.cfg.model); renderRt(); emit('cfg'); });
    on('labels', () => { fillFields(); saveCfg(HeinzStore); });
    on('lang', () => { renderPresets(); renderOnline(); fillFields(); });
    fillProviders(); fillFields(); renderOnline(); fillModels();
}
