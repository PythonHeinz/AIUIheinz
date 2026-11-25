/* tools/docheinz/mod/woerterbuch.js – Nachschlagen offline: Wörterbuchdateien lesen und Wörter zum Suchen vorbereiten (rein, ohne Oberfläche, ohne Netz).
 * Unterstützte Formate (Erkennung am Inhalt): TSV oder CSV (Stichwort, Erklärung; „#“ = Kommentar), JSON-Objekt { "Wort": "Erklärung" },
 * JSON-Liste [{ word, definition|text|gloss|senses }], JSONL (eine solche Zeile je Eintrag, auch das Wiktionary-Format von kaikki.org).
 *   keyOf(wort) -> Suchschlüssel (klein, ß = ss, ohne Rand-Satzzeichen)
 *   candidates(wort, sprache) -> Schlüssel in Reihenfolge der Genauigkeit (genau, Grundform-Versuche)
 *   parseLine(zeile, format) -> [schlüssel, erklärung] | null     parseJson(text) -> [[schlüssel, erklärung], …]
 *   detect(textprobe) -> 'tsv' | 'csv' | 'jsonl' | 'json'
 *   wanted(eintrag) -> Sprache des Eintrags (lang_code) gehört zu KEEP_LANGS oder fehlt     words(auswahl) -> Wörter der Auswahl (höchstens 6) */
const EDGE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
export const keyOf = (w) => String(w || '').normalize('NFC').replace(EDGE, '').toLowerCase().replace(/ß/g, 'ss').replace(/[’‘`´]/g, "'");

const SUFFIX = {
    de: ['ungen', 'ungs', 'heiten', 'keiten', 'lichen', 'lichem', 'licher', 'liches', 'ern', 'ens', 'est', 'ten', 'tes', 'tem', 'ter', 'en', 'em', 'er', 'es', 'st', 'te', 'e', 'n', 's', 't'],
    en: ['ies', 'ied', 'ing', 'ers', 'est', 'ed', 'er', 'es', 'ly', 's'],
};
const MIN_STEM = 3;

export function candidates(word, lang) {
    const k = keyOf(word); if (!k) return [];
    const out = [k], add = (x) => { if (x && x.length >= MIN_STEM && !out.includes(x)) out.push(x); };
    const l = String(lang || 'en').slice(0, 2).toLowerCase(), list = SUFFIX[l] || SUFFIX.en;
    for (const s of list) {
        if (k.length - s.length < MIN_STEM || !k.endsWith(s)) continue;
        const stem = k.slice(0, -s.length);
        add(stem);
        if (l === 'en') { if (s === 'ies' || s === 'ied') add(stem + 'y'); if (s === 'ing' || s === 'ed') { add(stem + 'e'); if (/(.)\1$/.test(stem)) add(stem.slice(0, -1)); } }
        if (l === 'de') { add(stem + 'e'); add(stem + 'en'); }
    }
    if (l === 'de') {                                                    // Umlaut der Beugung: Häuser -> Haus, Bücher -> Buch
        const u = { 'ä': 'a', 'ö': 'o', 'ü': 'u' };
        out.slice().forEach(c => { const d = c.replace(/[äöü]/g, (m) => u[m]); if (d !== c) add(d); });
    }
    return out;
}

export function detect(sample) {
    const t = String(sample || '').replace(/^\uFEFF/, '').trimStart();
    if (t[0] === '[') return 'json';
    if (t[0] === '{') {
        const ls = t.split(/\r?\n/).filter(l => l.trim());
        let one = false; try { JSON.parse(ls[0]); one = true; } catch { one = false; }
        return one && ls[1] && ls[1].trim()[0] === '{' ? 'jsonl' : 'json';
    }
    const lines = t.split(/\r?\n/).filter(l => l && l[0] !== '#').slice(0, 20);
    const tab = lines.filter(l => l.includes('\t')).length, semi = lines.filter(l => l.includes(';')).length;
    return tab >= semi ? 'tsv' : 'csv';
}

function glossOf(o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    if (Array.isArray(o)) return o.map(glossOf).filter(Boolean).join('; ');
    const direct = o.definition || o.definitions || o.text || o.gloss || o.glosses || o.meaning || o.translation || o.d;
    if (direct) return glossOf(direct);
    if (o.senses) {
        const pos = o.pos ? '(' + o.pos + ') ' : '';
        return pos + (Array.isArray(o.senses) ? o.senses.map((s, i) => (o.senses.length > 1 ? (i + 1) + '. ' : '') + glossOf(s)).filter(x => x.trim()).join('\n') : glossOf(o.senses));
    }
    return '';
}
export const KEEP_LANGS = ['de', 'en'];                                  // Wiktionary enthält Wörter aller Sprachen; behalten werden deutsche und englische (Einträge ohne Sprachangabe immer)
export const MAX_DEF = 1500;
const FORM = /\b(?:des|der|das|von|vom|of)\s+(?:Adjektivs|Substantivs|Verbs|Pronomens|Artikels|Partizips|Adverbs|Nomens|adjective|noun|verb|participle)\s+(\S+?)\s*$/i;
// Beugungsform („dummen“ = Form von „dumm“): Verweis auf die Grundform statt langer Formenbeschreibung
export function refOf(o) {
    const ss = o && Array.isArray(o.senses) ? o.senses : [];
    if (!ss.length) return '';
    let lemma = '';
    for (const sn of ss) {
        let l = '';
        if (Array.isArray(sn.form_of) && sn.form_of[0] && sn.form_of[0].word) l = String(sn.form_of[0].word);
        else { const m = FORM.exec(glossOf(sn.glosses || sn.gloss || '')); if (m) l = m[1]; }
        l = l.replace(/[.,;:]+$/, '');
        if (!l) return '';
        if (!lemma) lemma = l; else if (keyOf(l) !== keyOf(lemma)) return '';
    }
    return lemma;
}
const entryOf = (o) => {
    const w = o && (o.word || o.w || o.term || o.headword || o.key);
    if (!w) return null;
    const lang = o.lang_code ? String(o.lang_code) : '', r = refOf(o);
    if (r && keyOf(r) !== keyOf(w)) return [keyOf(w), '→ ' + r, String(w), lang, r];
    const d = glossOf(o).trim().slice(0, MAX_DEF);
    return d ? [keyOf(w), d, String(w), lang, ''] : null;
};
export const wanted = (e) => !!e && (!e[3] || KEEP_LANGS.includes(e[3]));

export function parseJson(text) {
    let j; try { j = JSON.parse(String(text).replace(/^﻿/, '')); } catch { return []; }
    const out = [];
    if (Array.isArray(j)) j.forEach(o => { const e = entryOf(o); if (e) out.push(e); });
    else if (j && typeof j === 'object') Object.keys(j).forEach(w => { const d = glossOf(j[w]); const k = keyOf(w); if (k && d) out.push([k, d.trim(), w]); });
    return out;
}
export function parseLine(line, format) {
    const l = String(line).replace(/^﻿/, '');
    if (!l.trim() || l[0] === '#') return null;
    if (format === 'jsonl') { try { return entryOf(JSON.parse(l)); } catch { return null; } }
    const sep = format === 'csv' ? (l.includes(';') ? ';' : ',') : '\t', i = l.indexOf(sep);
    if (i < 1) return null;
    const w = l.slice(0, i).replace(/^"|"$/g, ''), d = l.slice(i + 1).replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim();
    const k = keyOf(w);
    return k && d ? [k, d, w.trim()] : null;
}

export function words(sel) {
    const parts = String(sel || '').split(/\s+/).map(w => w.replace(EDGE, '')).filter(Boolean);
    return parts.slice(0, 6);
}
