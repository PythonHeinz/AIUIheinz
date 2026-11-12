/* lib/dashboard/failsafe.js – Sicherheitsnetz für den Start der Seite (bewusst KEIN ES-Modul).
 * Classic script, no imports, no dependencies: it must keep working when a module of the dashboard fails to load or to run
 * (a failed import leaves the page empty and, in a module graph, does not always raise an error event).
 * Shows a red banner with the error and buttons Update / Reload; also fires when the start has not finished after 6 s.
 * The dashboard reports "ready" through window.HeinzDashboard.ready (lib/dashboard/main.js, init.js). */
(function () {
    function ready() { return !!(window.HeinzDashboard && window.HeinzDashboard.ready); }
    // Startfehler sichtbar machen (sonst bleibt die Seite halb aufgebaut und man sieht nur eine leere Fläche).
    function showInitError(e) {
        try {
            const d = document.createElement('div');
            d.id = 'init-error';
            d.setAttribute('style', 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#5c1a1a;color:#fff;border:1px solid #ea4335;border-radius:12px;padding:10px 12px;font:12px/1.4 monospace;white-space:pre-wrap;word-break:break-all;max-height:60vh;overflow:auto;user-select:text');
            d.textContent = 'Start failed / Start fehlgeschlagen:\n' + String((e && (e.stack || e.message)) || e).split('\n').slice(0, 6).join('\n');
            const row = document.createElement('div');
            row.setAttribute('style', 'display:flex;gap:8px;margin-top:10px;font-family:system-ui,sans-serif;font-size:14px');
            const msg = document.createElement('span'); msg.setAttribute('style', 'flex:1;align-self:center;opacity:.85');
            function mk(label, fn) { const b = document.createElement('button'); b.textContent = label; b.setAttribute('style', 'min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #ea4335;background:#2a0d0d;color:#fff;font-size:14px'); b.onclick = fn; return b; }
            row.appendChild(msg);
            // Wege aus dem Fehler: Update holen (Server-Endpunkt wie im Menü), neu laden, schließen
            row.appendChild(mk('Update', function () {
                msg.textContent = '…';
                fetch('api/update', { method: 'POST', headers: { 'X-Heinz': '1' } }).then(function (r) { return r.json(); }).then(function (j) {
                    msg.textContent = j.ok ? (j.changed ? 'OK' : '=') : String(j.error || 'error');
                    if (j.ok) setTimeout(function () { location.reload(); }, j.restarting ? 5000 : 800);
                }).catch(function (x) { msg.textContent = String(x.message || x); });
            }));
            row.appendChild(mk('Reload', function () { location.reload(); }));
            row.appendChild(mk('×', function () { d.remove(); }));
            d.appendChild(row);
            document.body.appendChild(d);
        } catch (x) {}
    }
    window.addEventListener('error', function (ev) { if (!document.getElementById('init-error') && !ready()) showInitError(ev.error || ev.message); });
    window.addEventListener('unhandledrejection', function (ev) { if (!document.getElementById('init-error') && !ready()) showInitError(ev.reason); });
    setTimeout(function () { if (!ready() && !document.getElementById('init-error')) showInitError(new Error('The start did not finish within 6 s (data files or storage not answering?)')); }, 6000);
})();
