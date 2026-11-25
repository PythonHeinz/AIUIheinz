/* tools/docheinz/mod/statistik.js – Lesezeit, Statistik und „Weiterlesen“ (Insel-Modul, reine Funktionen, Node-testbar).
 *   new Clock({ idleMs, maxStepMs })   touch(now)  tick(now, visible, active) -> Sekunden, die dazukommen (Lesezeit läuft nur bei sichtbarem Bildschirm
 *                                       und Bedienung in den letzten idleMs; active = true hält sie an, z. B. beim Vorlesen)
 *   dayKey(ts) -> 'JJJJ-MM-TT' (Ortszeit)      addSecs(log, ts, secs) -> neues Protokoll (Sekunden je Tag, höchstens 120 Tage)
 *   lastDays(log, n, now) -> [{ key, secs }] (älteste zuerst)      sumDays(log, n, now) -> Sekunden
 *   hm(secs) -> { h, m }     remaining(rec, pct) -> geschätzte Restsekunden | null     resumeBook(list) -> Datensatz | null
 *   overview(list, log, now) -> { today, week, total, done, started, books: [{ rec, secs, pct, left }] } */
import { percent } from './bibliothek.js';

export class Clock {
    constructor({ idleMs = 120000, maxStepMs = 15000 } = {}) { this.idleMs = idleMs; this.maxStepMs = maxStepMs; this.last = 0; this.touched = 0; }
    touch(now) { this.touched = now; if (!this.last) this.last = now; }
    start(now) { this.last = now; this.touched = now; }
    tick(now, visible = true, active = false) {
        const dt = this.last ? now - this.last : 0;
        this.last = now;
        if (!visible || dt <= 0) return 0;
        if (!active && now - this.touched > this.idleMs) return 0;
        return Math.min(dt, this.maxStepMs) / 1000;
    }
}

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
export function addSecs(log, ts, secs) {
    const out = Object.assign({}, log || {}), k = dayKey(ts);
    out[k] = Math.round(((out[k] || 0) + secs) * 10) / 10;
    const keys = Object.keys(out).sort();
    while (keys.length > 120) delete out[keys.shift()];
    return out;
}
export function lastDays(log, n = 7, now = Date.now()) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const key = dayKey(d.getTime()); out.push({ key, secs: (log && log[key]) || 0 }); }
    return out;
}
export const sumDays = (log, n, now) => lastDays(log, n, now).reduce((a, d) => a + d.secs, 0);
export const hm = (secs) => { const m = Math.round((secs || 0) / 60); return { h: Math.floor(m / 60), m: m % 60 }; };

export function remaining(rec, pct) {
    const secs = +rec.secs || 0;
    if (secs < 300 || pct < 3 || pct >= 99 || rec.done) return null;
    return Math.round(secs * (100 - pct) / pct);
}
export function resumeBook(list) {
    let best = null;
    for (const b of list || []) {
        if (!b.lastRead || b.done || percent(b, b.ch, b.frac) >= 99) continue;
        if (!best || b.lastRead > best.lastRead) best = b;
    }
    return best;
}
export function overview(list, log, now = Date.now()) {
    const books = (list || []).map(rec => { const pct = percent(rec, rec.ch, rec.frac); return { rec, secs: +rec.secs || 0, pct, left: remaining(rec, pct) }; });
    return {
        today: (log && log[dayKey(now)]) || 0, week: sumDays(log, 7, now),
        total: books.reduce((a, b) => a + b.secs, 0),
        done: books.filter(b => b.rec.done || b.pct >= 99).length, started: books.filter(b => b.rec.lastRead && !(b.rec.done || b.pct >= 99)).length,
        books: books.filter(b => b.secs > 0).sort((a, b) => b.secs - a.secs),
    };
}
