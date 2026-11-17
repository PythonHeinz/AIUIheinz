/* tools/convert2/mod/text.js – Textbausteine: Escapes und Bereinigung (Insel-Modul, reine Funktionen, keine Oberfläche).
 *   escHtml(s)  escXml(s)=escHtml   &amp; &lt; &gt; &quot; &#39;
 *   escLatex(s)  escYaml(s)  escTypst(s)
 *   clean(text, opts?)   Zeilenenden, geschützte Leerzeichen, unsichtbare Zeichen, Leerzeilen; opts.citations = true entfernt Zitatmarken ([1], [cite: …], 【…】)
 *   fileName(title, ext, fallback?)   sicherer Dateiname */

export function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export const escXml = escHtml;

export function escLatex(s) {
    return String(s).replace(/\\/g, '\u0001').replace(/([&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}').replace(/\u0001/g, '\\textbackslash{}');
}

export function escYaml(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export function escTypst(s) {
    return String(s).replace(/([\\\[\]#$*_`<>@~])/g, '\\$1');
}

export function clean(text, opts = {}) {
    let t = String(text).replace(/\r\n?/g, '\n');
    t = t.replace(/[\u00A0\u2007\u202F]/g, ' ').replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '');
    if (opts.citations) {
        t = t.replace(/\u3010[^\u3011]*\u3011/g, '').replace(/\[cite(?:_start|_end)?[^\]]*\]/gi, '').replace(/\s?\[(?:\d{1,3}(?:\s*[,\u2013-]\s*\d{1,3})*)\]/g, '');
    }
    t = t.replace(/ +$/gm, m => (m.length >= 2 ? '  ' : ''));   // Tabulatoren am Zeilenende bleiben (leere letzte TSV-Zelle)
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.replace(/^\n+/, '').replace(/[\n ]+$/, '');
}

export function fileName(title, ext, fallback = 'convert2') {
    let base = String(title || '').replace(/[*`~\\#>_]/g, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9._ -]+/g, '').trim().replace(/\s+/g, '_').replace(/^[._-]+|[._-]+$/g, '').slice(0, 60);
    if (!base) base = fallback;
    return base + (ext ? '.' + ext : '');
}
