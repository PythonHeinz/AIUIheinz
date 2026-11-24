/* tools/docheinz/ui/volltext.js – Kapiteltexte aller Bücher für die Volltextsuche bereitstellen (lokal, in der eigenen IndexedDB, Store „texts“).
 *   bookChapters(db, rec) -> Promise<string[]>   Text je Kapitel; beim ersten Mal wird das Buch geöffnet und der Text gespeichert, danach kommt er aus dem Speicher.
 * Der Text entsteht wie im Leser (src.html(i), reiner Text), damit die Positionen der Treffer stimmen. Nichts verlässt das Gerät. */
import { openSource } from '../mod/buch.js';
import { cacheKey } from '../mod/volltext.js';

export async function bookChapters(db, rec) {
    const key = cacheKey(rec), have = await db.getText(rec.id);
    if (have && have.key === key && Array.isArray(have.chapters)) return have.chapters;
    const blob = await db.file(rec.id);
    if (!blob) return [];
    const src = await openSource(new Uint8Array(await blob.arrayBuffer()), rec.format, rec.name, rec.ocrTotal ? { ocr: rec.ocr || [] } : {});
    const chapters = [];
    for (let i = 0; i < src.chapters.length; i++) {
        const html = await src.html(i);
        chapters.push(new DOMParser().parseFromString(html, 'text/html').body.textContent || '');
    }
    try { await db.putText(rec.id, key, chapters); } catch { /* Gerät voll: es geht ohne Zwischenspeicher, nur langsamer */ }
    return chapters;
}
