/* lib/shared/postfach.js – HeinzPostfach: Briefkasten zwischen Werkzeugen (Stufe 2 des Strangs AIUIheinz-Wissen, Auftrag docs/agent/AUFTRAG_Wissen.md).
 * Zweck: Ein Werkzeug (zum Beispiel docHeinz) legt einen Merkzettel ab; das empfangende Werkzeug (WikiHeinz) fragt den Nutzer und übernimmt erst nach Ja.
 * Es wird nie automatisch in ein fremdes Werkzeug geschrieben. Ablage: HeinzStore (IndexedDB, Schlüssel `heinz_postfach`), nie in Sicherungen, nie im Export.
 * Eintrag: { id, von, an, art: 'merke' | 'zitat', daten, zeit }   `zeit` in Millisekunden, `daten` ein einfaches Objekt (Titel, Text, Herkunft, Tags; Buch, Autor, Kapitel).
 * Grenzen: höchstens 50 Einträge (danach `voll`, nichts wird stillschweigend verworfen), höchstens 20 000 Zeichen je Eintrag (JSON-Länge; danach `zu-lang`, nichts wird gekürzt),
 * Einträge älter als 30 Tage verfallen.
 *   legen(an, art, daten, { von, jetzt })  -> Promise<{ zustand: 'abgelegt' | 'voll' | 'zu-lang' | 'ungueltig', id? }>
 *   offen(an, { jetzt })                   -> [Eintrag] für `an`, älteste zuerst, ohne verfallene (synchron, aus dem geöffneten Speicher)
 *   entfernen(id)                          -> Promise<boolean>
 *   beiNeu(an, fn)                         -> Abmelder; fn(offen(an)) läuft, wenn ein Eintrag für `an` ankommt (auch von einer anderen Seite, über BroadcastChannel)
 *   neuLaden()                             -> Promise; liest den Briefkasten erneut (eine andere Seite kann geschrieben haben)
 * Vor dem ersten Lesen muss `HeinzStore.open()` abgewartet sein (wie überall). Schreibt eine zweite Seite im selben Augenblick, gilt der Stand der Seite, die zuletzt speichert
 * (Lesen-Ändern-Schreiben nach `neuLaden`); bei von Hand ausgelösten Merkzetteln genügt das. */
import { HeinzStore } from '../store.js';

const POSTFACH_KEY = 'heinz_postfach';
export const GRENZEN = { eintraege: 50, zeichen: 20000, tage: 30 };
const TAG = 24 * 60 * 60 * 1000, ARTEN = ['merke', 'zitat'];
const hoerer = [];
let kanal = null;

const lade = () => { const l = HeinzStore.get(POSTFACH_KEY, []); return Array.isArray(l) ? l : []; };
const frisch = (l, jetzt) => l.filter(e => e && typeof e.zeit === 'number' && jetzt - e.zeit <= GRENZEN.tage * TAG);
const sichtbar = (an, jetzt) => frisch(lade(), jetzt).filter(e => e.an === an).sort((a, b) => a.zeit - b.zeit);
const meldeLokal = (an) => { for (const h of hoerer.slice()) if (h.an === an) { try { h.fn(sichtbar(an, Date.now())); } catch (e) { /* ein fehlerhafter Hörer stört die anderen nicht */ } } };

function kanalOeffnen() {
    if (kanal || typeof BroadcastChannel === 'undefined') return kanal;
    kanal = new BroadcastChannel('heinz_postfach');
    kanal.onmessage = async (ev) => { await HeinzStore.reload(POSTFACH_KEY); if (ev && ev.data && ev.data.an) meldeLokal(ev.data.an); };
    return kanal;
}

export const HeinzPostfach = {
    async neuLaden() { await HeinzStore.reload(POSTFACH_KEY); },

    async legen(an, art, daten, { von = '', jetzt } = {}) {
        if (!an || typeof an !== 'string' || !ARTEN.includes(art) || !daten || typeof daten !== 'object' || Array.isArray(daten)) return { zustand: 'ungueltig' };
        if (JSON.stringify(daten).length > GRENZEN.zeichen) return { zustand: 'zu-lang' };
        const t = typeof jetzt === 'number' ? jetzt : Date.now();
        await HeinzStore.reload(POSTFACH_KEY);
        const liste = frisch(lade(), t);                                  // verfallene Einträge fallen beim Schreiben weg
        if (liste.length >= GRENZEN.eintraege) return { zustand: 'voll' };
        const id = 'p' + t.toString(36) + Math.random().toString(36).slice(2, 7);
        liste.push({ id, von: String(von || ''), an, art, daten, zeit: t });
        await HeinzStore.set(POSTFACH_KEY, liste);
        const k = kanalOeffnen(); if (k) k.postMessage({ an });
        meldeLokal(an);
        return { zustand: 'abgelegt', id };
    },

    offen(an, { jetzt } = {}) { return sichtbar(an, typeof jetzt === 'number' ? jetzt : Date.now()); },

    async entfernen(id) {
        await HeinzStore.reload(POSTFACH_KEY);
        const alt = lade(), neu = frisch(alt, Date.now()).filter(e => e.id !== id);
        const gefunden = alt.some(e => e && e.id === id);
        if (neu.length !== alt.length) await HeinzStore.set(POSTFACH_KEY, neu);
        return gefunden;
    },

    beiNeu(an, fn) {
        kanalOeffnen();
        const h = { an, fn }; hoerer.push(h);
        return () => { const i = hoerer.indexOf(h); if (i >= 0) hoerer.splice(i, 1); };
    },
};
