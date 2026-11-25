/* tools/wikiheinz/mod/eigene.js – „Mein Wiki“: Seiten anlegen, ändern, anhängen, löschen, Verweise und Schlagwörter lesen, Rückverweise, Export und Wiederherstellen (rein; der Speicher kommt als Parameter).
 *   verweise(md) -> Titel aus [[Titel]] und [[Titel|Anzeige]]      tags(md) -> Schlagwörter aus #wort (Überschriften mit „# “ zählen nicht)
 *   speichere(sp, qid, { titel, text, herkunft }, jetzt) -> Eintrag   haengeAn(sp, qid, titel, zusatz, herkunft, jetzt) -> Eintrag (legt die Seite an, wenn sie fehlt)
 *   loescheSeite(sp, qid, titel)   seiten(sp, qid) -> alphabetisch   rueckverweise(sp, qid, titel) -> Seiten, die auf `titel` verweisen
 *   zitatBlock(h) -> Markdown-Block aus einer Herkunft { buch, autor, kapitel, zitat, am }
 *   exportJSON(sp, qid) / wiederherstellen(sp, qid, json) -> Anzahl      exportDateien(sp, qid) -> [{ name, text }] (je Seite eine Markdown-Datei mit Kopf) */
import { keyOf } from './schluessel.js';

export function verweise(md) {
    const out = [], re = /\[\[([^\[\]|]+?)(?:\|[^\[\]]*)?\]\]/g; let m;
    while ((m = re.exec(String(md || '')))) { const t = m[1].trim(); if (t && !out.includes(t)) out.push(t); }
    return out;
}
export function tags(md) {
    const out = [], re = /(?:^|[\s(])#([\p{L}][\p{L}\p{N}_-]*)/gu; let m;
    for (const z of String(md || '').split('\n')) { re.lastIndex = 0; while ((m = re.exec(z))) { const t = m[1].toLowerCase(); if (!out.includes(t)) out.push(t); } }
    return out;
}
export function zitatBlock(h) {
    h = h || {}; const z = [];
    if (h.zitat) z.push(String(h.zitat).trim().split('\n').map(l => '> ' + l).join('\n'));
    const q = [h.autor, h.buch ? '*' + h.buch + '*' : '', h.kapitel].filter(Boolean).join(', ');
    if (q) z.push('— ' + q + (h.am ? ' (' + h.am + ')' : ''));
    return z.join('\n\n');
}
const alt = async (sp, qid, titel) => (await sp.hole(qid, keyOf(titel))).find(e => e.t === titel) || (await sp.hole(qid, keyOf(titel)))[0] || null;

export async function speichere(sp, qid, { titel, text, herkunft }, jetzt) {
    titel = String(titel || '').trim(); if (!titel) throw new Error('Titel fehlt');
    const k = keyOf(titel), vorher = await alt(sp, qid, titel), md = String(text || '');
    if (vorher && vorher.t !== titel) await sp.loesche(qid, vorher.k, vorher.t);
    const e = { q: qid, k, t: titel, x: md, v: '', tags: tags(md), links: verweise(md), h: herkunft || (vorher && vorher.h) || null, e: (vorher && vorher.e) || jetzt || '', g: jetzt || '' };
    await sp.put(e); return e;
}
export async function haengeAn(sp, qid, titel, zusatz, herkunft, jetzt) {
    const v = await alt(sp, qid, titel), neu = v ? (v.x ? v.x + '\n\n' : '') + zusatz : zusatz;
    return speichere(sp, qid, { titel: v ? v.t : titel, text: neu, herkunft: herkunft || (v && v.h) }, jetzt);
}
export async function loescheSeite(sp, qid, titel) { const e = await alt(sp, qid, titel); if (e) await sp.loesche(qid, e.k, e.t); return !!e; }
export async function seiten(sp, qid) { return (await sp.alle(qid)).filter(e => !e.v).sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : 0); }
export async function rueckverweise(sp, qid, titel) { const k = keyOf(titel); return (await seiten(sp, qid)).filter(e => (e.links || []).some(l => keyOf(l) === k) && e.k !== k); }

export async function exportJSON(sp, qid) {
    const q = await sp.quelle(qid);
    return JSON.stringify({ format: 'wikiheinz-1', quelle: q ? { id: q.id, name: q.name } : { id: qid }, seiten: (await seiten(sp, qid)).map(e => ({ titel: e.t, text: e.x, tags: e.tags || [], links: e.links || [], herkunft: e.h || null, erstellt: e.e || '', geaendert: e.g || '' })) }, null, 1);
}
export async function wiederherstellen(sp, qid, json) {
    let o; try { o = JSON.parse(json); } catch { throw new Error('Datei nicht lesbar'); }
    if (!o || o.format !== 'wikiheinz-1' || !Array.isArray(o.seiten)) throw new Error('Kein WikiHeinz-Export');
    let n = 0;
    for (const s of o.seiten) { if (!s || !s.titel) continue; const k = keyOf(s.titel), md = String(s.text || ''); await sp.put({ q: qid, k, t: String(s.titel), x: md, v: '', tags: tags(md), links: verweise(md), h: s.herkunft || null, e: s.erstellt || '', g: s.geaendert || '' }); n++; }
    return n;
}
const dateiname = (t) => String(t).normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Seite';
export async function exportDateien(sp, qid) {
    const out = [], benutzt = new Set();
    for (const e of await seiten(sp, qid)) {
        let n = dateiname(e.t), i = 1; while (benutzt.has(n.toLowerCase())) n = dateiname(e.t) + ' (' + (++i) + ')';
        benutzt.add(n.toLowerCase());
        const kopf = ['---', 'titel: ' + JSON.stringify(e.t)]; if ((e.tags || []).length) kopf.push('tags: [' + e.tags.join(', ') + ']'); if (e.g) kopf.push('geaendert: ' + e.g); kopf.push('---', '');
        out.push({ name: n + '.md', text: kopf.join('\n') + '\n# ' + e.t + '\n\n' + e.x + '\n' });
    }
    return out;
}
