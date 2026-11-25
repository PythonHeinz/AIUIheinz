/* tools/docheinz/mod/wikipedia.js – Wikipedia-Kurztext (nur Text) über die öffentliche MediaWiki-Schnittstelle: Anfrage bauen, Antwort lesen (rein, ohne Netz).
 *   wikiLang(sprache) -> 2-stelliger Kürzel der Wikipedia (Rückfall de)
 *   wikiUrl(begriff, sprache) -> URL der Anfrage (Suche, erster Treffer, nur Einleitung als Klartext, `origin=*` für den Browser)
 *   wikiPage(json, sprache) -> { title, extract, url } | null
 * Es geht nur der markierte Begriff nach außen; die Anfrage ist nur mit eingeschalteter Option erlaubt (siehe ui/wikipedia.js). */
export const SENTENCES = 5;
export const wikiLang = (l) => { const c = String(l || '').slice(0, 2).toLowerCase(); return /^[a-z]{2,3}$/.test(c) ? c : 'de'; };
export function wikiUrl(q, lang) {
    const p = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: String(q).trim().slice(0, 120), gsrlimit: '1', gsrnamespace: '0',
        prop: 'extracts', exintro: '1', explaintext: '1', exsentences: String(SENTENCES), redirects: '1', origin: '*' });
    return 'https://' + wikiLang(lang) + '.wikipedia.org/w/api.php?' + p.toString();
}
export function wikiPage(j, lang) {
    const pg = j && j.query && Array.isArray(j.query.pages) ? j.query.pages[0] : null;
    if (!pg || !pg.title || !pg.extract || !String(pg.extract).trim()) return null;
    return { title: String(pg.title), extract: String(pg.extract).trim(), url: 'https://' + wikiLang(lang) + '.wikipedia.org/wiki/' + encodeURIComponent(String(pg.title).replace(/ /g, '_')) };
}
