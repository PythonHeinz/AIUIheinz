import test from 'node:test';
import assert from 'node:assert/strict';
import { Clock, dayKey, addSecs, lastDays, sumDays, hm, remaining, resumeBook, overview } from '../../tools/docheinz/mod/statistik.js';

test('Uhr zählt nur bei Sichtbarkeit und Bedienung, mit Obergrenze je Schritt', () => {
    const c = new Clock({ idleMs: 60000, maxStepMs: 10000 });
    c.start(1000);
    assert.equal(c.tick(6000, true), 5);                    // 5 s
    assert.equal(c.tick(36000, true), 10);                  // lange Lücke: höchstens maxStep
    assert.equal(c.tick(42000, false), 0);                  // Bildschirm nicht sichtbar
    c.touch(42000);
    assert.equal(c.tick(47000, true), 5);
    assert.equal(c.tick(140000, true), 0);                  // seit über einer Minute keine Bedienung
    assert.equal(c.tick(145000, true, true), 5);            // aktiv (Vorlesen) zählt trotzdem
});
test('Tagesprotokoll: addieren, Fenster, Summe, Kürzen', () => {
    const now = new Date(2026, 10, 25, 12).getTime();
    let log = addSecs({}, now, 600); log = addSecs(log, now, 300);
    log = addSecs(log, now - 2 * 86400000, 1200);
    assert.equal(log[dayKey(now)], 900);
    assert.equal(sumDays(log, 7, now), 2100);
    assert.equal(sumDays(log, 1, now), 900);
    const d = lastDays(log, 3, now); assert.equal(d.length, 3); assert.equal(d[0].secs, 1200); assert.equal(d[2].secs, 900);
    let big = {}; for (let i = 0; i < 130; i++) big = addSecs(big, now - i * 86400000, 1);
    assert.equal(Object.keys(big).length, 120);
});
test('Stunden und Minuten', () => { assert.deepEqual(hm(4500), { h: 1, m: 15 }); assert.deepEqual(hm(20), { h: 0, m: 0 }); });
test('Restzeit schätzen', () => {
    assert.equal(remaining({ secs: 3600 }, 50), 3600);
    assert.equal(remaining({ secs: 100 }, 50), null);       // zu wenig Daten
    assert.equal(remaining({ secs: 3600 }, 99), null);
    assert.equal(remaining({ secs: 3600, done: true }, 50), null);
});
const book = (o) => Object.assign({ chapters: 10, lens: [], ch: 0, frac: 0, added: 1 }, o);
test('Weiterlesen: zuletzt gelesenes, nicht fertiges Buch', () => {
    const a = book({ id: 'a', lastRead: 10, ch: 2 }), b = book({ id: 'b', lastRead: 20, done: true }), c = book({ id: 'c', lastRead: 15, ch: 5 }), d = book({ id: 'd', lastRead: 0 });
    assert.equal(resumeBook([a, b, c, d]).id, 'c');
    assert.equal(resumeBook([b, d]), null);
    assert.equal(resumeBook([book({ id: 'e', lastRead: 5, ch: 9, frac: 1 })]), null);   // praktisch zu Ende
});
test('Übersicht: heute, Woche, gesamt, fertig, angefangen', () => {
    const now = new Date(2026, 10, 25, 12).getTime();
    const log = { [dayKey(now)]: 600, [dayKey(now - 86400000)]: 1800 };
    const o = overview([book({ id: 'a', lastRead: 1, ch: 5, secs: 3000 }), book({ id: 'b', lastRead: 1, done: true, secs: 600 }), book({ id: 'c' })], log, now);
    assert.equal(o.today, 600); assert.equal(o.week, 2400); assert.equal(o.total, 3600);
    assert.equal(o.done, 1); assert.equal(o.started, 1);
    assert.deepEqual(o.books.map(x => x.rec.id), ['a', 'b']);
    assert.ok(o.books[0].left > 0);
});
