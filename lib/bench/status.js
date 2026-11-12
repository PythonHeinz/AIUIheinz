/* lib/bench/status.js – Serverstatus und Ring.
 * Part of the test bench (chat.html). Plain script: all bench files share one global scope and load in this order (see chat.html);
 * moving text between them changes nothing. Planned: ES modules with explicit state (docs/PRUEFSTAND_INVENTUR.md). */

// ===== Server Status: Ring rot = Engine nicht erreichbar, orange = Modell laedt, blau = bereit, gruen = antwortet =====
const hs = {};
let ringBase = { cls: '', color: 'red', title: '' }, loadedNames = [];
function renderRing() {
    const el = $('status-dot');
    let cls = ringBase.cls, color = ringBase.color, title = ringBase.title;
    if (generating) { cls = 'status-active'; color = gotToken ? 'green' : 'blue'; title = t(gotToken ? 'stAnswering' : 'stThinking'); }
    else if (preloadAbort) { cls = 'status-loading'; color = 'orange'; title = t('preLoading'); }
    el.className = 'ring-btn metal status-dot ' + (cls ? cls + ' ' : '') + 's-' + color;
    el.title = title; qStatus = title;
    renderStatusRow(title, color); renderQuick();
}
async function checkServer() {
    const prov = settings.provider;
    // Zustand und Farbbedeutung kommen aus lib/providers.js (PV.status), gleich für alle Tools; Online-Engines werden nie von selbst angefragt
    const st = await PV.status(prov, $('model-select').value, { handshake: !!hs[prov] });
    if (prov !== settings.provider) return;
    const cls = { cloudReady: 'status-cloud', handshake: 'status-loading', asleep: 'status-loading', loaded: 'status-online', engineUp: 'status-online' }[st.code] || '';
    loadedNames = prov === 'ollama' ? st.names : [];
    ringBase = { cls: cls, color: st.color, title: t(st.key) };
    renderRing();
    if ($('model-sheet').classList.contains('open')) renderModelSheet();
}
setInterval(checkServer, 3000);
