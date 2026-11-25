/* tools/docheinz/ui/wikipedia.js – Wikipedia-Kurztext zum markierten Begriff. Standard AUS. Ohne eigenen Haken UND ohne „Online erlauben“ geht keine Anfrage nach außen.
 * Treffer werden auf dem Gerät gemerkt (die letzten 60) und sind danach auch offline abrufbar.
 *   wikiOn() / setWikiOn(b) / wikiAllowed()     wikiLookup(begriff, sprache) -> Promise<{ page|null, cached, blocked }> */
import { HeinzStore } from './base.js';
import { HeinzProviders as PV } from '../../../lib/providers.js';
import { wikiUrl, wikiPage, wikiLang } from '../mod/wikipedia.js';

const KEY = 'heinz_docheinz_wiki', CACHE = 'heinz_docheinz_wikicache', MAXC = 60;
export const wikiOn = () => +HeinzStore.get(KEY, 0) === 1;
export const setWikiOn = (on) => HeinzStore.set(KEY, on ? 1 : 0);
export const wikiAllowed = () => { try { return !!PV.onlineAllowed(); } catch { return false; } };
const ck = (q, l) => wikiLang(l) + ':' + String(q).trim().toLowerCase();

export async function wikiLookup(q, lang) {
    const cache = HeinzStore.get(CACHE, null) || {}, k = ck(q, lang);
    if (cache[k]) return { page: cache[k].p, cached: true, blocked: false };
    if (!wikiOn() || !wikiAllowed()) return { page: null, cached: false, blocked: true };
    let page = null;
    try {
        const r = await fetch(wikiUrl(q, lang), { headers: { Accept: 'application/json' }, referrerPolicy: 'no-referrer' });
        if (r.ok) page = wikiPage(await r.json(), lang);
    } catch { return { page: null, cached: false, blocked: false, failed: true }; }
    if (page) {
        cache[k] = { p: page, t: Date.now() };
        const keys = Object.keys(cache).sort((a, b) => cache[a].t - cache[b].t);
        while (keys.length > MAXC) delete cache[keys.shift()];
        HeinzStore.set(CACHE, cache);
    }
    return { page, cached: false, blocked: false };
}
