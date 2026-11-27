/* tools/wikiheinz/ui/fragen.js – Reiter „Fragen“: Frage eingeben, Modell wählen, Antwort mit den verwendeten Auszügen. Modellzugriff nur über HeinzProviders; der Ablauf steht in ../../../lib/wissen/frage.js. */
import { Heinz, HeinzStore, HeinzProviders as PV, $ } from './base.js';
import { S, t, on, emit, msg, esc, zim } from './state.js';
import { beantworte } from '../../../lib/wissen/frage.js';

const KEY = 'heinz_wikiheinz_settings', DEF = { provider: 'ollama', model: 'qwen2.5:3b', temp: 0.2, maxTok: 300, scope: '', config: '' };
let cfg = { ...DEF }, ac = null, onlineOk = '', last = null, status = '', modelSeq = 0, modelleGeladen = false;
const attr = (s) => esc(String(s)).replace(/"/g, '&quot;');
const cfgObj = () => (cfg.config ? PV.configById(cfg.config) : null);
function zeigeParam() { const el = $('par-sum'); if (el) el.textContent = [providerName(), cfg.model || '–', t('temp') + ' ' + cfg.temp, cfg.maxTok + ' tok'].join(' · '); }
const speichern = () => { zeigeParam(); const s = HeinzStore.get(KEY, {}) || {}; s.fragen = { ...cfg }; return HeinzStore.set(KEY, s); };

export function onlineState() { const p = PV.get(cfg.provider); if (!p || p.local) return 'local'; return PV.onlineAllowed() ? 'online' : 'blocked'; }
const providerName = () => { const p = PV.get(cfg.provider); return p ? p.name : cfg.provider; };

function renderOnline() {
    const el = $('onl'), st = onlineState();
    if (st === 'local') { el.hidden = true; el.textContent = ''; }
    else { el.hidden = false; el.className = 'notice ' + (st === 'blocked' ? 'err' : 'warn'); el.textContent = st === 'blocked' ? t('onlineOff') : t('onlineWarn', { name: providerName() }); }
    $('b-ask').disabled = !!ac || st === 'blocked'; renderRt();
}
function renderRt() {
    let rt = t('ctxNone');
    try { const o = PV.runtime(cfg.provider, cfg.model).options || {}, p = []; if (o.num_thread) p.push('threads ' + o.num_thread); if (o.num_ctx) p.push('context ' + o.num_ctx); if (p.length) rt = p.join(', '); } catch (e) { /* Vorgabe */ }
    $('rtinfo').textContent = t('ctxInfo', { rt });
}
function fillProviders() {
    const sel = $('provider'); sel.textContent = '';
    const list = PV.list().filter(p => p.local || PV.onlineAllowed());
    if (!list.some(p => p.id === cfg.provider)) { const c = PV.get(cfg.provider); if (c) list.push(c); }
    list.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name + (p.local ? '' : ' ☁'); sel.appendChild(o); });
    sel.value = cfg.provider;
}
async function fillModels() {
    const seq = ++modelSeq, sel = $('model'); sel.textContent = '';
    let names = []; try { names = await PV.models(cfg.provider); } catch (e) { names = []; }
    if (seq !== modelSeq) return;
    if (cfg.model && names.indexOf(cfg.model) < 0) names = [cfg.model].concat(names);
    names.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
    sel.value = cfg.model; $('modelhelp').textContent = names.length <= 1 ? t('modelNone') : ''; renderRt();
}
function fillScope() {
    const sel = $('scope'); sel.textContent = '';
    const a = document.createElement('option'); a.value = ''; a.textContent = t('scopeAll'); sel.appendChild(a);
    S.quellen.forEach(q => { const o = document.createElement('option'); o.value = q.id; o.textContent = q.name; sel.appendChild(o); });
    sel.value = S.quellen.some(q => q.id === cfg.scope) ? cfg.scope : '';
}

/* Phasen einer Frage: Ring und Statuszeile zeigen sie wie im Dashboard (blau = wartet/arbeitet, grün = das Modell schreibt, orange = lädt). */
function phase(s) { setLauf(...({ begriffe: ['blue', 'stBegriffeSenden'], suche: ['blue', 'stSuchen'], lese: ['blue', 'stLesen'], antworte: ['blue', 'stAntwortSenden'] }[s] || [])); }
function zeigeAntwort() {
    const r = last, box = $('antwort'); box.hidden = !r; if (!r) return;
    const b = r.begriffe.join(', ');
    $('ant-text').innerHTML = r.status === 'ok' ? r.antwort.split(/\n+/).filter(Boolean).map(p => '<p>' + esc(p) + '</p>').join('') : '<p>' + esc(t('notFoundAnswer', { b })) + '</p>';
    $('ant-hinweis').textContent = r.status === 'ok' && r.ohneBeleg ? t('noCite') : '';
    $('ant-qkopf').hidden = !r.quellen.length;
    $('ant-quellen').innerHTML = r.quellen.map(q => '<details class="wh-ex' + (q.zitiert ? ' zit' : '') + '"><summary>[' + q.nr + '] ' + esc(q.titel) + (q.zitiert ? ' · ' + esc(t('cited')) : '') + '</summary><p>' + esc(q.auszug) + '</p><small>' + esc(q.angabe) +
        (q.link ? ' · <a href="' + attr(q.link) + '" target="_blank" rel="noopener noreferrer">' + esc(t('openWiki')) + '</a>' : '') + ' · <a href="#" data-q="' + attr(q.q) + '" data-t="' + attr(q.titel) + '">' + esc(t('excerptOf')) + '</a></small></details>').join('');
    $('ant-fact').textContent = t('fact', { engine: r.engine, model: r.model, von: t(r.von === 'modell' ? 'vonModell' : 'vonCode'), b }) + (r.quellen.some(x => x.voll) ? ' ' + t('usedFull') : '') + (r.von === 'code' ? ' ' + (r.modellBegriffe ? t('modelTerms', { m: r.modellBegriffe.join(', ') }) : t('modelNoTerms')) : '');
}
function errText(e) {
    if (e instanceof TypeError) return t('offline');
    if (e && e.code === 'ONLINE_BLOCKED') return t('blocked');
    if (e && e.http === 404) return t('modelNotFound', { m: cfg.model });
    return t('failed', { m: String(e && e.message || e) });
}


// ---- Modellstatus (geladen / schläft / offline), wie Ring und LED der anderen Seiten: Zustand und Farbe kommen aus HeinzProviders.status ----
let stSeq = 0, laedt = null, lauf = null, anz = null;
function ringSetzen(color, key) {                                       // der Ring in der Kopfzeile zeigt den Zustand wie im Dashboard
    anz = anz && anz.color === color && anz.key === key ? anz : { color, key };
    const r = document.querySelector('#app-header .ring'); if (!r) return;
    r.className = 'ring wh-status s-' + color; r.title = t(key); r.setAttribute('aria-label', t(key));
}
function anzeigen(color, key, knopf) {
    const el = $('mstat'); el.replaceChildren();
    const dot = document.createElement('span'); dot.className = 'ring-btn wh-ring s-' + color; dot.title = t(key); el.appendChild(dot);
    const tx = document.createElement('span'); tx.textContent = t(key); el.appendChild(tx);
    if (knopf) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = t('loadNow'); b.addEventListener('click', ladeModell); el.appendChild(b); }
    ringSetzen(color, key);
}
function setLauf(color, key) {
    lauf = color ? { color, key } : null; $('askstatus').textContent = lauf ? t(key) : '';
    if (lauf) anzeigen(lauf.color, lauf.key); else zeigeModell();
}
async function zeigeModell() {
    const seq = ++stSeq;
    if (lauf) return anzeigen(lauf.color, lauf.key);
    if (!cfg.model) { $('mstat').textContent = ''; return; }
    let st = null; try { st = await PV.status(cfg.provider, cfg.model); } catch (e) { st = null; }
    if (seq !== stSeq || lauf) return;
    anzeigen(laedt ? 'orange' : st ? st.color : 'red', laedt ? 'stLoading' : st ? st.key : 'stOffline', !laedt && st && st.code === 'asleep');
}
async function ladeModell() {
    const p = PV.get(cfg.provider); if (!cfg.model || !p || !p.local || p.format !== 'ollama' || laedt || ac) return zeigeModell();
    laedt = new AbortController(); zeigeModell();
    try { await PV.preload(cfg.provider, cfg.model, laedt.signal, (cfgObj() || {}).runtime); } catch (e) { /* der Status zeigt es */ }
    laedt = null; zeigeModell();
}

// ---- Konfiguration aus dem Dashboard (benannte Konfigurationen, gemeinsame Liste heinz_configs); „WikiHeinz-Vorgabe“ setzt zurück ----
function fillConfigs() {
    const sel = $('cfgsel'); sel.replaceChildren();
    const a = document.createElement('option'); a.value = ''; a.textContent = t('cfgDefault'); sel.appendChild(a);
    PV.configs().forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.name + ' · ' + f.model + (PV.get(f.provider) && !PV.get(f.provider).local ? ' ☁' : ''); sel.appendChild(o); });
    sel.value = cfg.config && PV.configById(cfg.config) ? cfg.config : '';
    $('cfghelp').textContent = PV.configs().length ? '' : t('cfgNone');
}
function wendeKonfigAn(id) {
    onlineOk = '';
    if (!id) cfg = { ...DEF, scope: cfg.scope };                       // Zurücksetzen: eingebaute Vorgabe von WikiHeinz
    else {
        const f = PV.configById(id); if (!f) return;
        cfg = { ...cfg, config: f.id, provider: f.provider, model: f.model };
        if (f.tone && typeof f.tone.temperature === 'number') cfg.temp = f.tone.temperature;
    }
    speichern(); $('temp').value = cfg.temp; $('maxtok').value = cfg.maxTok;
    fillProviders(); renderOnline(); fillModels().then(zeigeModell);
}

async function fragen() {
    if (ac) return;
    const frage = $('f-frage').value.trim();
    if (!frage) return msg(t('noQuestion'), 'err');
    if (!cfg.model) return msg(t('noModel'), 'err');
    msg('');
    const st = onlineState(); if (st === 'blocked') return;
    if (st === 'online' && onlineOk !== cfg.provider) {                       // Frage und Auszüge verlassen das Gerät: eigene Rückfrage
        const el = $('onl'); el.hidden = false; el.className = 'notice warn'; el.textContent = t('onlineAsk', { name: providerName() }) + ' ';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = t('onlineYes');
        b.addEventListener('click', () => { onlineOk = cfg.provider; renderOnline(); fragen(); }); el.appendChild(b); return;
    }
    ac = new AbortController(); $('b-ask').hidden = true; $('b-askstop').hidden = false; last = null; zeigeAntwort();
    setLauf('orange', 'stLoading');
    try { await PV.prepare(cfg.provider, cfg.model); } catch (e) { /* die erste Anfrage meldet ein echtes Problem */ }
    const kf = cfgObj(), rt = PV.runtime(cfg.provider, cfg.model, undefined, kf && kf.runtime) || {};
    const senden = async (a, signal) => {
        const suche = a.art === 'begriffe'; let erstes = true;
        setLauf('blue', suche ? 'stBegriffeSenden' : 'stAntwortSenden');
        const r = await PV.chat(cfg.provider, { model: cfg.model, system: a.system, messages: [{ role: 'user', content: a.user }], format: a.format, signal, onDelta: () => { if (erstes) { erstes = false; setLauf('green', suche ? 'stBegriffeToken' : 'stAntwortToken'); } },
            options: Object.assign({}, rt.options || {}, kf && kf.tone ? kf.tone : {}, kf && kf.stop && kf.stop.length ? { stop: kf.stop.slice() } : {}, { temperature: suche ? 0 : cfg.temp, num_predict: suche ? 80 : cfg.maxTok }), keepAlive: rt.keepAlive });
        return r.text;
    };
    try {
        const zs = await zim.status(), r = await beantworte({ frage, sp: S.sp, artikel: zs.available ? (ti) => zim.artikel(ti) : undefined, quellen: cfg.scope ? [cfg.scope] : undefined, senden, signal: ac.signal, onStatus: phase, sprache: Heinz.lang });
        last = { ...r, engine: cfg.provider, model: cfg.model };
    } catch (e) { if (ac.signal.aborted) msg(t('aborted'), 'warn'); else msg(errText(e), 'err'); }
    ac = null; setLauf(null); $('b-ask').hidden = false; $('b-askstop').hidden = true; renderOnline(); zeigeAntwort();
}

export function initFragen() {
    cfg = { ...DEF, ...((HeinzStore.get(KEY, {}) || {}).fragen || {}) };
    $('temp').value = cfg.temp; $('maxtok').value = cfg.maxTok; zeigeParam();
    const num = (d) => (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
    $('temp').addEventListener('input', (e) => { cfg.temp = num(DEF.temp)(e.target.value); speichern(); });
    $('maxtok').addEventListener('input', (e) => { cfg.maxTok = num(DEF.maxTok)(e.target.value); speichern(); });
    $('scope').addEventListener('change', (e) => { cfg.scope = e.target.value; speichern(); });
    $('provider').addEventListener('change', (e) => { cfg.config = ''; fillConfigs(); cfg.provider = e.target.value; cfg.model = ''; onlineOk = ''; speichern(); renderOnline(); fillModels().then(() => { const s = $('model'); if (!cfg.model && s.options.length) { cfg.model = s.options[0].value; s.value = cfg.model; speichern(); renderRt(); } }); });
    $('model').addEventListener('change', (e) => { cfg.model = e.target.value; cfg.config = ''; fillConfigs(); speichern(); zeigeModell(); ladeModell(); PV.setActiveModel(cfg.provider, cfg.model); renderRt(); });
    $('cfgsel').addEventListener('change', (e) => wendeKonfigAn(e.target.value));
    $('b-ask').addEventListener('click', fragen);
    $('b-askstop').addEventListener('click', () => { if (ac) ac.abort(); });
    $('f-frage').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fragen(); } });
    $('ant-quellen').addEventListener('click', (ev) => { const a = ev.target.closest('a[data-q]'); if (a) { ev.preventDefault(); emit('open', { q: a.dataset.q, titel: a.dataset.t }); } });
    on('quellen', fillScope); on('lang', () => { zeigeParam(); fillProviders(); fillScope(); fillConfigs(); zeigeModell(); renderOnline(); zeigeAntwort(); if (anz) ringSetzen(anz.color, anz.key); });
    on('tabwechsel', (name) => { if (name !== 'fragen') return; if (!modelleGeladen) { modelleGeladen = true; fillModels().then(() => { zeigeModell(); ladeModell(); }); } else zeigeModell(); });   // die Modellliste wird erst beim ersten Öffnen des Reiters von der lokalen Engine geholt
    fillProviders(); fillScope(); fillConfigs(); renderOnline();
    zeigeModell(); setInterval(() => { if (!document.hidden && !ac && !laedt) zeigeModell(); }, 15000);   // Ring in der Kopfzeile: Modellstatus auf jedem Reiter
}
