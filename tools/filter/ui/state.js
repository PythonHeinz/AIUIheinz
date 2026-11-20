/* tools/filter/ui/state.js – gemeinsamer Zustand der drei Schritte, Meldungen, kleine Ereignisse und Speichern (eigene IndexedDB). */
import { Heinz, $ } from './base.js';
import { D } from './i18n.js';
import { dbGet, dbPut, dbDel } from '../mod/db.js';

export const t = (k, v) => Heinz.t(D, k, v);
export { $ };

export const DEFAULTS = { preset: 'mood', rule: '', labels: '', provider: 'ollama', model: 'qwen2.5:3b', temp: 0, maxTok: 120, limit: 100, mitGrund: false, zufall: false, seed: 1, only: false, sort: 'index' };

export const S = {
    text: '', name: '', absatz: false, data: null, cols: [], cmp: -1, entries: [],
    cfg: Object.assign({}, DEFAULTS),
    run: null,          // { indices, labels, rule, mitGrund, provider, model, temp, total, done }
    resMap: {},         // index -> Ergebnis
    sel: [],            // gewählte Kacheln (Etiketten, '?' unklar, '!' Abweichung)
    running: false, ac: null, onlineOk: false, loaded: false
};

const subs = {};
export const on = (n, f) => { (subs[n] = subs[n] || []).push(f); };
export const emit = (n, ...a) => { (subs[n] || []).forEach(f => f(...a)); };

export function msg(text, kind) {
    const el = $('msg');
    el.textContent = text; el.className = 'notice' + (kind ? ' ' + kind : ''); el.hidden = !text;
    clearTimeout(msg.t);
    if (text && kind !== 'err') msg.t = setTimeout(() => { el.hidden = true; }, 8000);
}

// ---- Speichern: Einstellungen klein über HeinzStore (heinz_filter_…), Eingabe und Ergebnisse in IndexedDB heinz_filter ----
export function saveCfg(HeinzStore) { return HeinzStore.set('heinz_filter_settings', S.cfg); }
let pend = 0;
export function persist(now) {
    clearTimeout(pend);
    const go = () => dbPut('last', { text: S.text, name: S.name, absatz: S.absatz, cols: S.cols, cmp: S.cmp, run: S.run, results: Object.values(S.resMap), sel: S.sel, ts: Date.now() }).catch(() => {});
    if (now) return go();
    pend = setTimeout(go, 600);
}
export async function restore() { try { return await dbGet('last'); } catch (e) { return null; } }
export function forget() { return dbDel('last'); }
