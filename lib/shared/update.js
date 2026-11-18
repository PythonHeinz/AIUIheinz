/* lib/shared/update.js – Update über den Server (git pull) mit LCD-Anzeige, für Hub und Dashboard.
 * Eine Logik an einer Stelle (AUFTRAG_Update.md); die Seiten liefern nur Elemente, Texte (t) und Rückrufe.
 * Endpunkt: POST api/update (Header X-Heinz). Der Server führt feste Git-Befehle aus, nie Eingaben des Browsers.
 *
 *   const up = createUpdater({ led: canvas, btn, status, t, busy: () => '', onState: (st) => {} });
 *   up.setVersion(await readVersion());   // LCD zeigt im Ruhezustand die Version
 *   up.setState('idle');                  // erstes Zeichnen, sobald das Canvas sichtbar ist
 *   up.run();                             // Tippen auf den Knopf
 * Texte (t): pxCheck, pxRestart, pxDone, pxCurrent, pxErr, updRunning, updCurrent {v}, updDone {a,b,n}, updErr {m}.
 * ES module (docs/MODULE.md). */

import { Pixel } from '../pixel.js';

const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

// Stand dieses Klons als Text: v1.0 · abc1234 · 2026-11-09 (leer ohne Server)
export async function readVersion() {
    try {
        const r = await fetch('api/ping', { cache: 'no-store' });
        const j = await r.json();
        const a = j && j.app, parts = [];
        if (a) {
            if (a.version) parts.push('v' + a.version);
            if (a.commit) parts.push(a.commit);
            if (a.date) parts.push(String(a.date).slice(0, 16));
        }
        return parts.join(' · ');
    } catch (e) { return ''; }   // ohne Server keine Version
}

export function createUpdater(o) {
    const t = o.t;
    let st = { mode: 'idle', f: 0 }, ver = '', px = null;
    function draw(g) {
        const W = g.cols, m = st.mode;
        const txt = { idle: ver.toUpperCase(), check: t('pxCheck'), restart: t('pxRestart'), done: t('pxDone'), current: t('pxCurrent'), err: t('pxErr') }[m] || '';
        g.ticker('upd-t', 2, 4, txt, m === 'err' ? '#ea4335' : m === 'done' || m === 'current' ? '#34a853' : '#8ab4f8', { loop: false });
        if (m === 'check') g.rect(4 + (g.frameNo * 2) % Math.max(1, W - 24), 10, 14, 1, '#fbbc04');
        else if (m === 'restart') g.rect(4, 10, Math.round((W - 8) * Math.min(1, st.f / 25)), 1, '#fbbc04');
        else if (m === 'done' || m === 'current') g.rect(4, 10, W - 8, 1, '#34a853');
        else if (m === 'err') g.rect(4, 10, W - 8, 1, '#ea4335');
    }
    function setState(mode, f) {
        st = { mode: mode, f: f || 0 };
        if (o.onState) o.onState(st);
        if (!o.led) return;
        if (!px) px = new Pixel(o.led, { rows: 11, pitch: 2, dot: 1.1 });
        px.run(draw, { live: function () { return st.mode === 'check'; } });
    }
    const api = {
        get state() { return st; },
        setState: setState,
        setVersion: function (v) { ver = v || ''; if (px) setState(st.mode, st.f); },   // zeichnet nur neu, wenn die Anzeige schon steht (Canvas war sichtbar)
        // nach einem Ergebnis kehrt die Anzeige zum Stand (Version) zurück
        backToVersion: function (mode) { setTimeout(function () { if (st.mode === mode) setState('idle'); }, 5000); },
        async run() {
            const stat = o.status, btn = o.btn;
            const say = function (s) { if (stat) stat.textContent = s; };
            const busy = o.busy && o.busy();
            if (busy) { say(busy); return; }
            if (btn) btn.disabled = true;
            say(t('updRunning')); setState('check');
            const fail = function (m) { say(t('updErr', { m: m })); setState('err'); if (btn) btn.disabled = false; api.backToVersion('err'); };
            try {
                const res = await fetch('api/update', { method: 'POST', headers: { 'X-Heinz': '1' } });
                const j = await res.json();
                if (!res.ok || !j.ok) { fail((j.error || ('HTTP ' + res.status)) + (j.output ? ' - ' + j.output : '')); return; }
                if (!j.changed) { say(t('updCurrent', { v: j.to || '' })); setState('current'); if (btn) btn.disabled = false; api.backToVersion('current'); return; }
                say(t('updDone', { a: j.from || '?', b: j.to || '?', n: j.files.length }));
                setState('done');
                if (j.restarting) {   // server.py changed: the server restarts itself, wait until it answers again
                    await sleep(1500);
                    for (let i = 0; i < 25; i++) {
                        setState('restart', i);
                        try { const r = await fetch('api/ping', { cache: 'no-store' }); if (r.ok) break; } catch (e) { /* noch nicht da */ }
                        await sleep(1000);
                    }
                } else { await sleep(800); }
                location.reload();
            } catch (e) { fail(e.message); }
        }
    };
    return api;
}
