/* lib/wissen/index.js – HeinzWissen: das lokale Wissen (Wikipedia aus der ZIM-Datei, „Mein Wiki“, später Bücher und weitere Wikis) als Baustein für alle Werkzeuge.
 * Ein Einstieg, ein ES-Modul, keine Kreise (die Dateien daneben importieren nur sich gegenseitig). Der Baustein ruft nie selbst ein Modell und nie ein fremdes Netz auf:
 * `senden(anfrage, signal) -> Promise<string>` ist die Funktion der aufrufenden App (eigenes Modell über HeinzProviders, eigene Konfiguration, eigener Statusring).
 * Fehlt eine Quelle (nichts importiert, ZIM nicht da), melden die Aufrufe einen Zustand, keinen Fehler; Aufrufer blenden die Funktion aus.
 * Wording: „belegt durch Quelle (Stand der ZIM-Datei)“, nicht „verifiziert“. Jeder Treffer trägt Quelle, Quellenangabe, Link und Lizenz.
 *
 *   zustand()                      -> { quellen, weg: 'voll' | 'auszug' | 'keine', zim }       weg: ganze Artikel über den Server (Variante B), nur gespeicherte Einleitungen (Variante A) oder keine Quelle
 *   quellen()                      -> [{ id, name, art, sprache, lizenz, stand, anzahl, wikipedia, vollstaendig, bereit }]
 *   suche(text | [begriffe], { quellen, max = 3, voll = true })
 *                                  -> { zustand: 'ok' | 'leer' | 'keine-quelle', weg, treffer: [{ q, quelle, titel, auszug, angabe, link, lizenz, voll }] }
 *   kontext(frage, { senden, quellen, begriffeVom = 'app', max = 3, signal, onStatus })
 *                                  -> { zustand, weg, text, verwendet: [{ nr, q, quelle, titel, auszug, angabe, link, lizenz, voll }], begriffe, von: 'code' | 'modell', rueckfall }   (Begriffe, Suche, Auszüge; ohne Antwort)
 *   beantworte(frage, { senden, quellen, begriffeVom, max, signal, onStatus, sprache })
 *                                  -> { zustand, weg, status, antwort, ohneBeleg, quellen: [{ nr, … , zitiert }], begriffe, von }   (Antwort nur aus Auszügen, wie WikiHeinz)
 *   wert(titel, feld)              -> { zustand: 'ok' | 'leer' | 'kein-feld' | 'keine-zim', wert, feld, titel, genau, quelle, link, lizenz }   Infobox der ZIM, kein Modell
 *   merke({ titel, text, herkunft, tags, von })
 *                                  -> { zustand: 'abgelegt' | 'voll' | 'zu-lang' | 'ungueltig' | 'kein-postfach' }   legt einen Merkzettel ins Postfach von WikiHeinz (`HeinzPostfach` aus lib/shared/postfach.js, per `konfiguriere({ postfach })` verdrahtet); die Aufnahme ins Wiki geschieht erst nach Rückfrage in WikiHeinz
 *   konfiguriere({ speicher, holen, postfach })   für Tests und die Verdrahtung: eigener Speicher, eigene `holen(url) -> { status, json }`, Postfach
 * `begriffeVom`: 'app' (Vorgabe: der Code sucht, das Modell ist nur Rückfall, wenn der Code nichts findet und `senden` da ist) oder 'modell' (das Modell übersetzt zuerst; 'code' gilt wie 'app'). */
import { oeffne } from './db.js';
import { volltextQuelle } from './volltext.js';
import { suche as sucheTitel, suchbegriffe } from './suche.js';
import { sammle, beantworte as frageBeantworte, leseVoll, baueKontext, MAX_AUSZUG_VOLL, MAX_KONTEXT_VOLL } from './frage.js';
import { angabe, linkZu } from './quelle.js';
import { keyOf, woerter } from './schluessel.js';

let sp = null, spOffen = null, postfach = null;
// nur Anfragen an die eigene Adresse (Server liest die ZIM); nichts verlässt das Gerät
const holenStandard = async (u) => { const r = await fetch(u, { cache: 'no-store' }); let j = null; try { j = await r.json(); } catch (e) { j = null; } return { status: r.status, json: j }; };
let zim = volltextQuelle(holenStandard);

async function speicher() {
    if (sp) return sp;
    spOffen = spOffen || oeffne().then((s) => { sp = s; return s; });
    return spOffen;
}
const ausQuelle = (q) => ({ id: q.id, name: q.name, art: q.art, sprache: q.sprache, lizenz: q.lizenz || '', stand: q.stand || '', anzahl: q.anzahl || 0, wikipedia: !!q.wikipedia, vollstaendig: q.fertig !== false, bereit: (q.anzahl || 0) > 0 });
async function quellenListe() { const s = await speicher(); return (await s.quellen()).map(ausQuelle); }
async function bereiteQuellen(wahl) {
    const alle = await quellenListe(), bereit = alle.filter(q => q.bereit && (!wahl || !wahl.length || wahl.includes(q.id)));
    return { alle, bereit, ids: bereit.map(q => q.id), meta: new Map(alle.map(q => [q.id, q])) };
}
async function zimStatus() { try { return (await zim.status()) || { available: false }; } catch (e) { return { available: false }; } }
const ohneQuelle = (extra) => ({ zustand: 'keine-quelle', weg: 'keine', ...extra });
const verwendetMit = (v, meta) => { const q = meta.get(v.q) || {}; return { nr: v.nr, q: v.q, quelle: q.name || v.q, titel: v.titel, auszug: v.auszug, angabe: angabe(q, v.titel), link: linkZu(q, v.titel), lizenz: q.lizenz || '', voll: !!v.voll }; };

export const HeinzWissen = {
    konfiguriere(o) {
        o = o || {};
        if (o.speicher) { sp = o.speicher; spOffen = Promise.resolve(sp); }
        if (typeof o.holen === 'function') zim = volltextQuelle(o.holen);
        if ('postfach' in o) postfach = o.postfach || null;
    },

    async quellen() { return quellenListe(); },

    async zustand() {
        const qs = await quellenListe(), z = await zimStatus(), bereit = qs.some(q => q.bereit);
        return { quellen: qs, weg: !bereit ? 'keine' : z.available ? 'voll' : 'auszug', zim: !!z.available };
    },

    async suche(was, { quellen, max = 3, voll = true } = {}) {
        const { bereit, ids, meta } = await bereiteQuellen(quellen);
        if (!bereit.length) return ohneQuelle({ treffer: [] });
        const s = await speicher(), text = Array.isArray(was) ? was.join(' ') : String(was || '');
        let begriffe = Array.isArray(was) ? was.map(String).filter(Boolean) : text.trim() ? [text.trim()] : [];
        let treffer = begriffe.length ? await suchbegriffe(s, begriffe, { quellen: ids, proBegriff: max, gesamt: max }) : [];
        if (!treffer.length && woerter(text).length > 1) { begriffe = woerter(text); treffer = await suchbegriffe(s, begriffe, { quellen: ids, proBegriff: max, gesamt: max }); }
        treffer = treffer.slice(0, max);
        if (!treffer.length) return { zustand: 'leer', weg: 'auszug', treffer: [] };
        const z = voll ? await zimStatus() : { available: false };
        const ganz = await leseVoll(treffer, begriffe.concat(woerter(text)), meta, z.available ? (t) => zim.artikel(t) : undefined);
        const out = treffer.map((t) => { const q = meta.get(t.q) || {}, k = baueKontext([t], t.voll ? { maxAuszug: MAX_AUSZUG_VOLL, maxKontext: MAX_KONTEXT_VOLL } : undefined);
            return { q: t.q, quelle: q.name || t.q, titel: t.titel, auszug: k.verwendet[0] ? k.verwendet[0].auszug : '', angabe: angabe(q, t.titel), link: linkZu(q, t.titel), lizenz: q.lizenz || '', voll: !!t.voll }; });
        return { zustand: 'ok', weg: ganz ? 'voll' : 'auszug', treffer: out };
    },

    async kontext(frage, { senden, quellen, begriffeVom = 'app', max = 3, signal, onStatus } = {}) {
        const { bereit, ids, meta } = await bereiteQuellen(quellen);
        if (!bereit.length) return ohneQuelle({ text: '', verwendet: [], begriffe: [], von: '', rueckfall: false });
        const s = await speicher(), z = await zimStatus();
        const r = await sammle({ frage, sp: s, quellen: ids, senden, signal, onStatus, maxTreffer: max, begriffeVom, artikel: z.available ? (t) => zim.artikel(t) : undefined });
        if (r.status !== 'ok') return { zustand: 'leer', weg: z.available ? 'voll' : 'auszug', text: '', verwendet: [], begriffe: r.begriffe || [], von: r.von, rueckfall: !!r.rueckfall };
        return { zustand: 'ok', weg: r.voll ? 'voll' : 'auszug', text: r.k.text, verwendet: r.k.verwendet.map(v => verwendetMit(v, meta)), begriffe: r.begriffe, von: r.von, rueckfall: !!r.rueckfall };
    },

    async beantworte(frage, { senden, quellen, begriffeVom = 'app', max = 3, signal, onStatus, sprache } = {}) {
        const { bereit, ids, meta } = await bereiteQuellen(quellen);
        if (!bereit.length) return ohneQuelle({ status: 'nichtGefunden', antwort: '', ohneBeleg: false, quellen: [], begriffe: [], von: '' });
        const s = await speicher(), z = await zimStatus();
        const r = await frageBeantworte({ frage, sp: s, quellen: ids, senden, signal, onStatus, maxTreffer: max, sprache, begriffeVom, artikel: z.available ? (t) => zim.artikel(t) : undefined });
        return { zustand: r.status === 'ok' ? 'ok' : 'leer', weg: r.quellen.some(x => x.voll) ? 'voll' : 'auszug', status: r.status, antwort: r.antwort, ohneBeleg: r.ohneBeleg,
            quellen: r.quellen.map(v => ({ ...verwendetMit(v, meta), zitiert: v.zitiert })), begriffe: r.begriffe, von: r.von };
    },

    async wert(titel, feld) {
        const z = await zimStatus(); if (!z.available) return { zustand: 'keine-zim', wert: '', feld: String(feld || ''), titel: String(titel || ''), genau: false, quelle: '', link: '', lizenz: '' };
        const { alle, ids } = await bereiteQuellen(null), wikis = alle.filter(q => q.bereit && q.wikipedia).map(q => q.id);
        const leer = { zustand: 'leer', wert: '', feld: String(feld || ''), titel: String(titel || ''), genau: false, quelle: '', link: '', lizenz: '' };
        if (!wikis.length || !ids.length) return leer;
        const t = await sucheTitel(await speicher(), String(titel || ''), { quellen: wikis, limit: 5 }); if (!t.length) return leer;
        const w = t.find(x => x.genau) || t[0], a = await zim.artikel(w.titel); if (!a) return leer;
        const kf = keyOf(feld), zeile = (a.infobox || []).find(([n]) => keyOf(n) === kf) || (kf ? (a.infobox || []).find(([n]) => keyOf(n).includes(kf)) : null);
        const q = alle.find(x => x.id === w.q) || {}, bas = { feld: zeile ? zeile[0] : String(feld || ''), titel: w.titel, genau: !!w.genau, quelle: angabe(q, w.titel), link: linkZu(q, w.titel), lizenz: q.lizenz || '' };
        return zeile ? { zustand: 'ok', wert: String(zeile[1]), ...bas } : { zustand: 'kein-feld', wert: '', ...bas };
    },

    async merke({ titel, text, herkunft, tags, von } = {}) {
        if (!postfach || typeof postfach.legen !== 'function') return { zustand: 'kein-postfach' };
        const r = await postfach.legen('wikiheinz', 'merke', { titel: String(titel || ''), text: String(text || ''), herkunft: herkunft || null, tags: tags || [] }, { von: String(von || '') });
        return r && r.zustand ? r : { zustand: 'abgelegt' };
    },
};

if (typeof window !== 'undefined') window.HeinzWissen = HeinzWissen;
