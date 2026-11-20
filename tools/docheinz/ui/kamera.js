/* tools/docheinz/ui/kamera.js – Seiten nacheinander fotografieren (Live-Kamera im Vollbild, lokal, keine Anfrage nach außen).
 *   cameraSupported() -> boolean
 *   openCamera({ t, onDone(pages), onCancel(), onError() })   pages = [{ jpeg: Uint8Array, w, h }] in Aufnahmereihenfolge
 * Jede Aufnahme bleibt im Speicher, bis „Fertig“; „Zurücknehmen“ verwirft die letzte. Der Strom wird beim Schließen immer beendet. */
const $ = id => document.getElementById(id);
const C = { stream: null, pages: [], urls: [], cb: null, busy: false, wired: false, max: 2200 };
export const cameraSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

function stop() {
    if (C.stream) { C.stream.getTracks().forEach(t => t.stop()); C.stream = null; }
    $('cam-v').srcObject = null;
    C.urls.forEach(u => URL.revokeObjectURL(u)); C.urls = [];
    $('cam-t').textContent = '';
    $('cam').hidden = true;
}
function refresh() {
    const n = C.pages.length;
    $('cam-n').textContent = C.cb.t('k_count', { n });
    $('cam-d').disabled = !n; $('cam-u').disabled = !n;
}
function thumb(blob) {
    const u = URL.createObjectURL(blob); C.urls.push(u);
    const img = document.createElement('img'); img.src = u; img.alt = '';
    const box = $('cam-t'); box.appendChild(img); box.scrollLeft = box.scrollWidth;
}
async function shoot() {
    if (C.busy || !C.stream) return;
    const v = $('cam-v'); if (!v.videoWidth) return;
    C.busy = true;
    try {
        const k = Math.min(1, C.max / Math.max(v.videoWidth, v.videoHeight));
        const w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(v, 0, 0, w, h);
        const blob = await new Promise(ok => c.toBlob(b => ok(b), 'image/jpeg', 0.9));
        if (!blob) throw new Error('jpeg');
        C.pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), w, h });
        thumb(blob); refresh();
        const f = $('cam-f'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');   // kurzes Aufblitzen als Rückmeldung
        if (navigator.vibrate) navigator.vibrate(30);
    } catch { /* diese Aufnahme fehlt, die nächste geht */ }
    C.busy = false;
}
function wire() {
    if (C.wired) return; C.wired = true;
    $('cam-s').addEventListener('click', shoot);
    $('cam-v').addEventListener('click', shoot);
    $('cam-u').addEventListener('click', () => { if (!C.pages.length) return; C.pages.pop(); const box = $('cam-t'); if (box.lastChild) box.lastChild.remove(); refresh(); });
    $('cam-d').addEventListener('click', () => { const p = C.pages, cb = C.cb; stop(); if (p.length) cb.onDone(p); else if (cb.onCancel) cb.onCancel(); });
    $('cam-x').addEventListener('click', () => { const cb = C.cb; stop(); if (cb.onCancel) cb.onCancel(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && C.stream) { /* Strom pausiert der Browser selbst; Aufnahmen bleiben */ } });
}
export async function openCamera(cb) {
    wire();
    C.cb = cb; C.pages = [];
    try {
        const portrait = window.innerHeight >= window.innerWidth;
        C.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: portrait ? 2160 : 3840 }, height: { ideal: portrait ? 3840 : 2160 } } });
    } catch { if (cb.onError) cb.onError(); return; }
    const v = $('cam-v'); v.srcObject = C.stream;
    $('cam').hidden = false;
    try { await v.play(); } catch { /* autoplay */ }
    refresh();
}
