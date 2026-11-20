/* tools/docheinz/ui/pdfansicht.js – PDF-Originalansicht: Seiten als Bild, Zoom per Pinch, Doppeltipp, Knöpfe und Strg+Mausrad.
 *   openOriginal(src, page, { t, onClose(page) })   src.pdf aus mod/pdf-lesen.js; page = Startseite (1-basiert)
 *   closeOriginal() · isOriginalOpen()
 * Seiten werden erst gezeichnet, wenn sie in Sicht kommen, und beim Wegscrollen wieder freigegeben (Speicher). Breite = Zoom * Fensterbreite. */
const $ = id => document.getElementById(id);
const ZMIN = 1, ZMAX = 5, STEP = 1.4;
const O = { open: false, src: null, z: 1, sizes: [], boxes: [], jobs: new Map(), io: null, cb: null, cur: 1, wired: false, seq: 0 };
const dpr = () => Math.min(window.devicePixelRatio || 1, 3);
const baseW = () => Math.max(200, $('o-scroll').clientWidth - 0);

function layoutBoxes() {
    const w = baseW() * O.z;
    O.boxes.forEach((b, i) => { const s = O.sizes[i]; b.style.width = w + 'px'; b.style.height = Math.round(w * s.h / s.w) + 'px'; });
}
function renderBox(i) {
    const b = O.boxes[i], c = b.firstChild, w = Math.round(baseW() * O.z), key = w + ':' + dpr();
    if (b.dataset.k === key) return;
    const old = O.jobs.get(i); if (old) old.cancel();
    b.dataset.k = key;
    const job = O.src.pdf.render(i + 1, c, w, dpr());
    O.jobs.set(i, job);
    job.done.then(() => { if (O.jobs.get(i) === job) { O.jobs.delete(i); c.style.width = '100%'; c.style.height = '100%'; b.classList.add('ok'); } });
}
function freeBox(i) {
    const b = O.boxes[i], job = O.jobs.get(i); if (job) { job.cancel(); O.jobs.delete(i); }
    b.dataset.k = ''; b.classList.remove('ok'); const c = b.firstChild; c.width = c.height = 1;
}
function watch() {
    if (O.io) O.io.disconnect();
    O.io = new IntersectionObserver(es => { for (const e of es) { const i = +e.target.dataset.i; e.isIntersecting ? renderBox(i) : freeBox(i); } }, { root: $('o-scroll'), rootMargin: '60% 0px' });
    O.boxes.forEach(b => O.io.observe(b));
}
function curPage() {
    const sc = $('o-scroll'), mid = sc.scrollTop + sc.clientHeight / 3;
    let p = 0; for (let i = 0; i < O.boxes.length; i++) { if (O.boxes[i].offsetTop <= mid) p = i; else break; }
    return p + 1;
}
function updatePos() { O.cur = curPage(); $('o-pos').textContent = O.cur + ' / ' + O.src.pdf.pages + (O.z > 1.01 ? '  ·  ' + Math.round(O.z * 100) + ' %' : ''); }

// Zoom um den Punkt (cx, cy) in Fensterkoordinaten; behält den Inhalt unter dem Punkt
function zoomTo(z, cx, cy) {
    z = Math.max(ZMIN, Math.min(ZMAX, z)); if (Math.abs(z - O.z) < 0.001) return;
    const sc = $('o-scroll'), r = sc.getBoundingClientRect();
    if (cx === undefined) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    const f = z / O.z, px = sc.scrollLeft + cx - r.left, py = sc.scrollTop + cy - r.top;
    O.z = z; layoutBoxes();
    sc.scrollLeft = px * f - (cx - r.left); sc.scrollTop = py * f - (cy - r.top);
    O.boxes.forEach((b, i) => { if (b.classList.contains('ok') || O.jobs.has(i)) renderBox(i); });   // sichtbare Seiten neu in passender Schärfe
    updatePos();
}

function wire() {
    if (O.wired) return; O.wired = true;
    const sc = $('o-scroll');
    $('o-close').addEventListener('click', () => closeOriginal());
    $('o-in').addEventListener('click', () => zoomTo(O.z * STEP));
    $('o-out').addEventListener('click', () => zoomTo(O.z / STEP));
    sc.addEventListener('scroll', () => { cancelAnimationFrame(O.raf); O.raf = requestAnimationFrame(updatePos); }, { passive: true });
    sc.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoomTo(O.z * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY); }, { passive: false });
    // Pinch: zwei Finger; während der Geste nur skaliert (CSS), beim Loslassen scharf gerechnet
    let g = null, last = 0;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    sc.addEventListener('touchstart', e => {
        if (e.touches.length === 2) { const t = e.touches; g = { d: dist(t), z: O.z, cx: (t[0].clientX + t[1].clientX) / 2, cy: (t[0].clientY + t[1].clientY) / 2, f: 1 }; }
        else if (e.touches.length === 1 && !g) {
            const now = Date.now(), t = e.touches[0];
            if (now - last < 300) { e.preventDefault(); zoomTo(O.z > 1.2 ? 1 : 2.5, t.clientX, t.clientY); last = 0; } else last = now;
        }
    }, { passive: false });
    sc.addEventListener('touchmove', e => {
        if (!g || e.touches.length !== 2) return; e.preventDefault();
        g.f = Math.max(ZMIN / g.z, Math.min(ZMAX / g.z, dist(e.touches) / g.d));
        $('o-pages').style.transformOrigin = (g.cx - sc.getBoundingClientRect().left + sc.scrollLeft) + 'px ' + (g.cy - sc.getBoundingClientRect().top + sc.scrollTop) + 'px';
        $('o-pages').style.transform = 'scale(' + g.f + ')';
    }, { passive: false });
    const end = () => { if (!g) return; const k = g; g = null; $('o-pages').style.transform = ''; $('o-pages').style.transformOrigin = ''; zoomTo(k.z * k.f, k.cx, k.cy); };
    sc.addEventListener('touchend', e => { if (e.touches.length < 2) end(); });
    sc.addEventListener('touchcancel', end);
    window.addEventListener('resize', () => { if (O.open) { layoutBoxes(); O.boxes.forEach((b, i) => { if (b.classList.contains('ok')) renderBox(i); }); } });
}

export async function openOriginal(src, page, cb) {
    wire();
    O.src = src; O.cb = cb; O.z = 1; O.open = true; const my = ++O.seq;
    const host = $('o-pages'); host.textContent = ''; O.boxes = []; O.jobs.clear();
    $('r-orig').hidden = false; $('o-scroll').scrollTop = 0; $('o-scroll').scrollLeft = 0;
    O.sizes = [];
    const first = await src.pdf.size(1);                       // Größen: erste Seite sofort, Rest nachladen (fast, nur Maße)
    for (let p = 1; p <= src.pdf.pages; p++) O.sizes.push(p === 1 ? first : first);
    for (let p = 1; p <= src.pdf.pages; p++) {
        const b = document.createElement('div'); b.className = 'dh-opg'; b.dataset.i = p - 1;
        b.appendChild(document.createElement('canvas')); host.appendChild(b); O.boxes.push(b);
    }
    layoutBoxes(); watch(); updatePos();
    const go = Math.max(1, Math.min(src.pdf.pages, page || 1));
    $('o-scroll').scrollTop = O.boxes[go - 1].offsetTop; updatePos();
    // echte Seitengrößen (Seiten können sich unterscheiden) nachtragen
    for (let p = 2; p <= src.pdf.pages && O.open && my === O.seq; p++) {
        const s = await src.pdf.size(p);
        if (Math.abs(s.w / s.h - first.w / first.h) > 0.005) { const keep = O.boxes[go - 1].offsetTop; O.sizes[p - 1] = s; layoutBoxes(); if (p < go) $('o-scroll').scrollTop += O.boxes[go - 1].offsetTop - keep; }
    }
}
export function closeOriginal(silent) {
    if (!O.open) return;
    updatePos(); const page = O.cur;
    O.open = false; O.seq++;
    if (O.io) O.io.disconnect();
    O.jobs.forEach(j => j.cancel()); O.jobs.clear();
    $('o-pages').textContent = ''; O.boxes = [];
    $('r-orig').hidden = true;
    if (!silent && O.cb && O.cb.onClose) O.cb.onClose(page);
}
export const isOriginalOpen = () => O.open;
