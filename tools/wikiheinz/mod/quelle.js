/* tools/wikiheinz/mod/quelle.js – Eine Quelle ist ein Bestand von Einträgen: eine importierte Wikipedia (schreibgeschützt) oder „Mein Wiki“ (schreibbar).
 *   neueQuelle({ id, name, sprache, lizenz, stand, art, quelle })  -> Quelle mit allen Feldern
 *   ART  = { IMPORT: 'import', EIGEN: 'eigen' }       EIGEN_ID = 'mein-wiki'
 *   ausDatei(dateiname) -> Vorbelegung für eine Wikipedia-Datei (Name, Sprache, Lizenz, Stand aus „…2026-10…“) oder null
 *   istSchreibbar(q)    -> Quelle darf Seiten anlegen und ändern
 *   angabe(q, titel)    -> Quellenangabe als Text („Wikipedia (de), Artikel „Sokrates“, CC BY-SA 4.0, Stand 2026-10“)
 *   linkZu(q, titel)    -> normaler Link in die Wikipedia oder '' (keine Anfrage der Seite, nur ein Verweis zum Anklicken) */
export const ART = { IMPORT: 'import', EIGEN: 'eigen' };
export const EIGEN_ID = 'mein-wiki';
export const WIKI_LIZENZ = 'CC BY-SA 4.0';

export function neueQuelle(o) {
    o = o || {};
    const art = o.art === ART.EIGEN ? ART.EIGEN : ART.IMPORT;
    const id = String(o.id || (art === ART.EIGEN ? EIGEN_ID : 'quelle')).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'quelle';
    return { id, name: String(o.name || id), sprache: String(o.sprache || 'de'), lizenz: String(o.lizenz || ''), stand: String(o.stand || ''), art,
        wikipedia: !!o.wikipedia, anzahl: Number(o.anzahl) || 0, gelesen: Number(o.gelesen) || 0, fertig: o.fertig !== false };
}
export function ausDatei(dateiname) {
    const n = String(dateiname || '');
    if (!/^wikipedia/i.test(n)) return null;
    const l = (/(?:^|[-_])([a-z]{2})(?:[-_.]|$)/i.exec(n.replace(/^wikipedia/i, '')) || [])[1] || 'de';
    const st = (/(20\d\d-\d\d)/.exec(n) || [])[1] || '';
    return { id: 'wikipedia-' + l.toLowerCase(), name: 'Wikipedia (' + l.toLowerCase() + ', offline)', sprache: l.toLowerCase(), lizenz: WIKI_LIZENZ, stand: st, art: ART.IMPORT, wikipedia: true };
}
export const istSchreibbar = (q) => !!q && q.art === ART.EIGEN;
export function angabe(q, titel) {
    if (!q) return '';
    const teile = [q.name + ', „' + titel + '“'];
    if (q.lizenz) teile.push(q.lizenz);
    if (q.stand) teile.push('Stand ' + q.stand);
    return teile.join(', ');
}
export const linkZu = (q, titel) => q && q.wikipedia ? 'https://' + q.sprache + '.wikipedia.org/wiki/' + encodeURIComponent(String(titel).replace(/ /g, '_')) : '';
