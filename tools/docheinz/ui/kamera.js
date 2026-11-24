/* tools/docheinz/ui/kamera.js – Seiten nacheinander fotografieren (Live-Kamera im Vollbild, lokal, keine Anfrage nach außen).
 *   cameraSupported() -> boolean
 *   openCamera({ t, onDone(pages), onCancel(), onError() })   pages = [{ jpeg: Uint8Array, w, h }] in Aufnahmereihenfolge
 * Jede Aufnahme bleibt im Speicher, bis „Fertig“; „Zurücknehmen“ verwirft die letzte. Der Strom wird beim Schließen immer beendet. */
const $ = id => document.getElementById(id);
const C = { extra: 0, stream: null, pages: [], urls: [], cb: null, busy: false, wired: false, max: 3200 };
export const cameraSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

function stop() {
    if (C.stream) { C.stream.getTracks().forEach(t => t.stop()); C.stream = null; }
    $('cam-v').srcObject = null;
    window.removeEventListener('deviceorientation', onTilt);
    C.urls.forEach(u => URL.revokeObjectURL(u)); C.urls = [];
    $('cam-t').textContent = '';
    $('cam').hidden = true;
}
// Der Browser liefert hier die Rohbilder des Sensors (quer). Wie die Kamera-App drehen wir sie passend zur Haltung des Handys:
// Handy hochkant -> Hochformat-Bild; quer -> Querformat. Der Knopf ↻ dreht zusätzlich, falls die Haltung nicht erkannt wird.
function autoRot() {
    const v = $('cam-v'); if (!v.videoWidth) return 0;
    const portraitWin = window.innerHeight >= window.innerWidth, landFrame = v.videoWidth > v.videoHeight;
    if (portraitWin === !landFrame) return 0;                  // Format passt schon (Browser hat selbst gedreht)
    const a = ((screen.orientation && screen.orientation.angle) || 0) % 360;
    return portraitWin ? (90 - a + 360) % 360 : 90;
}
const totalRot = () => (autoRot() + C.extra) % 360;
function layout() {       // Ansicht um 90° Schritte drehen (Handy bleibt, wie es ist; die Aufnahme wird mitgedreht)
    const v = $('cam-v'), rot = totalRot(), q = rot % 180 === 90;
    Object.assign(v.style, q
        ? { inset: 'auto', left: '50%', top: '50%', width: window.innerHeight + 'px', height: window.innerWidth + 'px', transform: `translate(-50%,-50%) rotate(${rot}deg)` }
        : { inset: '0', left: '', top: '', width: '100%', height: '100%', transform: rot ? `rotate(${rot}deg)` : '' });
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
        const k = Math.min(1, C.max / Math.max(v.videoWidth, v.videoHeight)), rot = totalRot(), q = rot % 180 === 90;
        const fw = Math.round(v.videoWidth * k), fh = Math.round(v.videoHeight * k), w = q ? fh : fw, h = q ? fw : fh;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); g.translate(w / 2, h / 2); g.rotate(rot * Math.PI / 180); g.drawImage(v, -fw / 2, -fh / 2, fw, fh);
        const blob = await new Promise(ok => c.toBlob(b => ok(b), 'image/jpeg', 0.9));
        if (!blob) throw new Error('jpeg');
        C.pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), w, h });
        thumb(blob); refresh();
        const f = $('cam-f'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');   // kurzes Aufblitzen als Rückmeldung
        if (navigator.vibrate) navigator.vibrate(30);
    } catch { /* diese Aufnahme fehlt, die nächste geht */ }
    C.busy = false;
}
// Wasserwaage: Punkt wandert aus der Mitte, wenn das Handy nicht parallel zur Seite liegt; grün ab etwa 4° Abweichung. Ohne Sensor bleibt der Ring unsichtbar.
function onTilt(e) {
    if (e.beta == null || e.gamma == null) return;
    const l = $('cam-l'), d = $('cam-ld'), cl = v => Math.max(-30, Math.min(30, v)) * 0.9;
    l.hidden = false; d.style.transform = 'translate(' + cl(e.gamma) + 'px,' + cl(e.beta) + 'px)';
    l.classList.toggle('ok', Math.abs(e.beta) < 4 && Math.abs(e.gamma) < 4);
}
function wire() {
    if (C.wired) return; C.wired = true;
    $('cam-s').addEventListener('click', shoot);
    $('cam-v').addEventListener('click', shoot);
    $('cam-r').addEventListener('click', () => { C.extra = (C.extra + 90) % 360; layout(); });
    if (screen.orientation) screen.orientation.addEventListener('change', () => { if (C.stream) layout(); });
    window.addEventListener('resize', () => { if (C.stream) layout(); });
    $('cam-v').addEventListener('loadedmetadata', layout);
    $('cam-u').addEventListener('click', () => { if (!C.pages.length) return; C.pages.pop(); const box = $('cam-t'); if (box.lastChild) box.lastChild.remove(); refresh(); });
    $('cam-d').addEventListener('click', () => { const p = C.pages, cb = C.cb; stop(); if (p.length) cb.onDone(p); else if (cb.onCancel) cb.onCancel(); });
    $('cam-x').addEventListener('click', () => { const cb = C.cb; stop(); if (cb.onCancel) cb.onCancel(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && C.stream) { /* Strom pausiert der Browser selbst; Aufnahmen bleiben */ } });
}
export async function openCamera(cb) {
    wire();
    C.cb = cb; C.pages = []; C.extra = 0;
    try {
        C.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } } });
    } catch { if (cb.onError) cb.onError(); return; }
    const v = $('cam-v'); v.srcObject = C.stream;
    $('cam').hidden = false; layout();
    $('cam-l').hidden = true; window.addEventListener('deviceorientation', onTilt);
    try { await v.play(); } catch { /* autoplay */ }
    refresh();
}
