/* lib/dashboard/menu.js – Menü, Drawer und Sheets, Seitenwechsel im Menü, Sicherung (Export und Import), Theme.
 * Part of the dashboard (dashboard.html). Plain script: all bench files share one global scope and load in this order (see dashboard.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/DASHBOARD_INVENTUR.md). */

// ===== Menue, Chatliste, Modellwahl, Vollbild-Editor =====
const ICON = function (n, cls) { return '<svg class="i' + (cls === undefined ? ' sm' : (cls ? ' ' + cls : '')) + '"><use href="lib/icons.svg#i-' + n + '"/></svg>'; };
function closeAll() { ['menu-sheet', 'model-sheet', 'drawer'].forEach(function (id) { $(id).classList.remove('open'); }); $('scrim').classList.remove('open'); }
function openLayer(id) { closeAll(); $(id).classList.add('open'); $('scrim').classList.add('open'); }
function openMenu() { showPage('main'); openLayer('menu-sheet'); }
function openDrawer() { renderSavedList(); openLayer('drawer'); }
function openModels() { $('model-search').value = ''; renderModelSheet(); openLayer('model-sheet'); }
const PAGE_TITLES = { main: 'menuTitle', engine: 'rEngine', speed: 'rSpeed', series: 'rSeries', look: 'rLook', update: 'rInfo' };
let curPage = 'main';
function setSheetTitle() { $('sh-title').textContent = t(PAGE_TITLES[curPage]); }
function exportBackup() {
    HeinzStore.exportAll($('bk-keys').checked).then(function (data) {
        const blob = new Blob([JSON.stringify({ app: 'heinz-ui', version: 1, date: new Date().toISOString(), data: data }, null, 1)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'heinz-ui-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        $('bk-status').textContent = t('bkDone', { n: Object.keys(data).length });
    });
}
function importBackup(inp) {
    const f = inp.files && inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = function () {
        try {
            const j = JSON.parse(r.result);
            if (!j || j.app !== 'heinz-ui' || !j.data) throw new Error('format');
            if (!confirm(t('bkConfirm'))) { inp.value = ''; return; }
            HeinzStore.importAll(j.data).then(function () {
                $('bk-status').textContent = t('bkRestored');
                setTimeout(function () { location.reload(); }, 600);
            }, function () { $('bk-status').textContent = t('bkFail'); });
        } catch (e) { $('bk-status').textContent = t('bkBad'); }
        inp.value = '';
    };
    r.readAsText(f);
}
function stGate() {
    const off = settings.provider !== 'ollama', pg = document.querySelector('.pg[data-pg="speed"]');
    if (!pg) return;
    pg.classList.toggle('off', off);
    pg.querySelectorAll('input, select, button').forEach(function (e) { if (e.id !== 'sh-back') e.disabled = off; });
}
function showPage(id) {
    stGate();
    curPage = id;
    document.querySelectorAll('#menu-sheet .pg').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-pg') === id); });
    $('sh-back').hidden = id === 'main'; $('q-reload').hidden = id !== 'main'; 
    setSheetTitle();
    if (id === 'series') srPlan();
    if (id === 'update') setUpd(updState.mode === 'check' ? 'idle' : updState.mode);
    if (id === 'update') renderStoreStatus();
    document.querySelector('#menu-sheet .sh-body').scrollTop = 0;
}
function updateMenuInfo() {
    const p = PV.get(settings.provider) || PV.get('ollama');
    ['auto', 'lt', 'dk'].forEach(function (k) { $('th-' + k).classList.toggle('sel-on', (settings.theme || 'auto') === k); });
    $('menu-theme').textContent = t({ auto: 'thAuto', lt: 'thLt', dk: 'thDk' }[settings.theme || 'auto']);
    setSheetTitle();
}
function setTheme(v) { Heinz.setTheme(v); settings.theme = Heinz.theme; updateMenuInfo(); }
