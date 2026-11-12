/* lib/bench/update.js – Update über den Server (git pull).
 * Part of the test bench (chat.html). Plain script: all bench files share one global scope and load in this order (see chat.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/PRUEFSTAND_INVENTUR.md). */

// ===== Update (git pull über den Server) =====
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
async function showVersion() {
    // Pille: Stand des Repos auf diesem Handy (Commit und Datum), Tippen sucht nach Updates
    let label = 'Update';
    try {
        const r = await fetch('api/ping', { cache: 'no-store' });
        const j = await r.json();
        if (j.app) {
            const parts = [];
            if (j.app.version) parts.push('v' + j.app.version);
            if (j.app.commit) parts.push(j.app.commit);
            if (j.app.date) parts.push(j.app.date);
            if (parts.length) label = parts.join(' · ');
        }
    } catch (e) { /* ohne Server keine Version */ }
    $('upd-ver').textContent = label; $('menu-ver').textContent = label;
}
// Update-LED: klein und fein (Raster 2 px, 3x5-Schrift), wie ein kleiner Rechner
let updPx = null, updState = { mode: 'idle', f: 0 };
function updDraw(g) {
    const W = g.cols;
    const m = updState.mode, ver = ($('upd-ver').textContent || '').toUpperCase();
    const txt = { idle: ver, check: t('pxCheck'), restart: t('pxRestart'), done: t('pxDone'), current: t('pxCurrent'), err: t('pxErr') }[m] || '';
    g.ticker('upd-t', 2, 4, txt, m === 'err' ? '#ea4335' : m === 'done' || m === 'current' ? '#34a853' : '#8ab4f8', { loop: false });
    if (m === 'check') g.rect(4 + (g.frameNo * 2) % Math.max(1, W - 24), 10, 14, 1, '#fbbc04');
    else if (m === 'restart') g.rect(4, 10, Math.round((W - 8) * Math.min(1, updState.f / 25)), 1, '#fbbc04');
    else if (m === 'done' || m === 'current') g.rect(4, 10, W - 8, 1, '#34a853');
    else if (m === 'err') g.rect(4, 10, W - 8, 1, '#ea4335');
}
function setUpd(mode, f) {
    updState = { mode: mode, f: f || 0 };
    if (!updPx) { if (!window.Heinz || !Heinz.Pixel) return; updPx = new Heinz.Pixel($('upd-led'), { rows: 11, pitch: 2, dot: 1.1 }); }
    updPx.run(updDraw, { live: function () { return updState.mode === 'check'; } });
}
async function doUpdate() {
    const st = $('upd-status'), btn = $('upd-btn');
    if (generating || speedTesting) { st.textContent = t('updBusy'); return; }
    btn.disabled = true; st.textContent = t('updRunning'); setUpd('check');
    try {
        const res = await fetch('api/update', { method: 'POST', headers: { 'X-Heinz': '1' } });
        const j = await res.json();
        if (!res.ok || !j.ok) {
            st.textContent = t('updErr', { m: (j.error || ('HTTP ' + res.status)) + (j.output ? ' - ' + j.output : '') });
            setUpd('err'); btn.disabled = false; return;
        }
        if (!j.changed) { st.textContent = t('updCurrent', { v: j.to || '' }); setUpd('current'); btn.disabled = false; return; }
        st.textContent = t('updDone', { a: j.from || '?', b: j.to || '?', n: j.files.length });
        setUpd('done');
        if (j.restarting) {   // server.py changed: the server restarts itself, wait until it answers again
            await sleep(1500);
            for (let i = 0; i < 25; i++) {
                setUpd('restart', i);
                try { const r = await fetch('api/ping', { cache: 'no-store' }); if (r.ok) break; } catch (e) { /* noch nicht da */ }
                await sleep(1000);
            }
        } else { await sleep(800); }
        location.reload();
    } catch (e) {
        st.textContent = t('updErr', { m: e.message });
        setUpd('err'); btn.disabled = false;
    }
}
