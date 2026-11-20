/* tools/docheinz/mod/docx-schreiben.js – Word-Datei (.docx) aus Markdown erzeugen, ohne Bibliothek und ohne Netz (Insel-Modul, keine Oberfläche).
 *   markdownToDocx(md, opts?) -> Promise<Uint8Array>
 *       opts: { title, author, language ('de'), date (Date) }
 *   Unterstützt: Überschriften 1 bis 6, Absätze, fett/kursiv/durchgestrichen/Code, Links (äußere als Hyperlink), nummerierte und Aufzählungslisten (verschachtelt),
 *   Zitate, Codeblöcke, Trennlinien, Tabellen (erste Zeile als Kopf), Bilder aus data:image-URLs (PNG, JPEG, GIF; andere Bilder werden zum Alternativtext).
 *   Öffnet in Word, LibreOffice und Google Docs (Drive: Hochladen, „Mit Google Docs öffnen“). Braucht den DOMParser des Browsers.
 * Aufbau: [Content_Types].xml, _rels/.rels, docProps/core.xml, word/document.xml, styles.xml, numbering.xml, word/_rels/document.xml.rels, word/media/*. */
import { writeZip } from './zip.js';
import { mdToHtml } from './markdown.js';
import { escXml } from './text.js';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const MAX_W = 6116000, MAX_H = 8000000, EMU = 9525;      // Satzbreite A4 mit 2 cm Rand, Pixel -> EMU

function b64(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

// Bildgröße (Pixel) aus den Kopfdaten lesen
export function imageSize(b, type) {
    try {
        if (type === 'png' && b.length > 24) return [(b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0];
        if (type === 'gif' && b.length > 10) return [b[6] | b[7] << 8, b[8] | b[9] << 8];
        if (type === 'jpg') {
            let i = 2;
            while (i + 9 < b.length) {
                if (b[i] !== 0xFF) { i++; continue; }
                const m = b[i + 1];
                if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [b[i + 7] << 8 | b[i + 8], b[i + 5] << 8 | b[i + 6]];
                i += 2 + (b[i + 2] << 8 | b[i + 3]);
            }
        }
    } catch { /* Standardgröße */ }
    return [400, 300];
}

const STYLES = XML + `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:eastAsia="Cambria" w:cs="Cambria"/><w:sz w:val="23"/><w:szCs w:val="23"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="52"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="480" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="27"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading5"><w:name w:val="heading 5"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="4"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading6"><w:name w:val="heading 6"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="5"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="999999"/></w:pBdr><w:ind w:left="567"/></w:pPr><w:rPr><w:i/><w:color w:val="444444"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="CodeBlock"><w:name w:val="Code Block"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/></w:pPr></w:style>
<w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Char"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;

export async function markdownToDocx(md, opts = {}) {
    const html = mdToHtml(String(md || ''));
    const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + html + '</body></html>', 'text/html');
    const rels = [];                 // { id, type, target, external? }
    const media = [];                // { name, data }
    const nums = [];                 // numId je nummerierter Liste
    let rid = 10, imgSeq = 0, numSeq = 2, drawId = 1;
    const rel = (type, target, external) => { const id = 'rId' + (rid++); rels.push({ id, type, target, external }); return id; };

    const run = (text, f) => {
        if (!text) return '';
        const pr = (f.code ? '<w:rStyle w:val="CodeChar"/>' : '') + (f.link ? '<w:rStyle w:val="Hyperlink"/>' : '') + (f.b ? '<w:b/>' : '') + (f.i ? '<w:i/>' : '') + (f.s ? '<w:strike/>' : '') + (f.sup ? '<w:vertAlign w:val="superscript"/>' : '') + (f.sub ? '<w:vertAlign w:val="subscript"/>' : '');
        const parts = String(text).split('\n');
        return '<w:r>' + (pr ? '<w:rPr>' + pr + '</w:rPr>' : '') + parts.map((t, k) => (k ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + escXml(t) + '</w:t>').join('') + '</w:r>';
    };
    const image = (el) => {
        const src = el.getAttribute('src') || '', alt = el.getAttribute('alt') || '';
        const m = src.match(/^data:image\/(png|jpe?g|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
        if (!m) return alt ? run(alt, {}) : '';
        const type = m[1].toLowerCase().replace('jpeg', 'jpg'), data = b64(m[2].replace(/\s+/g, ''));
        const [pw, ph] = imageSize(data, type);
        let w = Math.max(1, pw) * EMU, h = Math.max(1, ph) * EMU;
        const k = Math.min(1, MAX_W / w, MAX_H / h); w = Math.round(w * k); h = Math.round(h * k);
        const name = 'image' + (++imgSeq) + '.' + type;
        media.push({ name, data });
        const id = rel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', 'media/' + name);
        const n = drawId++;
        return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + w + '" cy="' + h + '"/><wp:docPr id="' + n + '" name="Bild ' + n + '" descr="' + escXml(alt) + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + n + '" name="' + name + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + id + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + w + '" cy="' + h + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    };
    function inline(node, f = {}) {
        let out = '';
        node.childNodes.forEach(c => {
            if (c.nodeType === 3) { out += run(c.nodeValue.replace(/\s*\n\s*/g, ' '), f); return; }
            if (c.nodeType !== 1) return;
            const t = c.tagName.toLowerCase();
            if (t === 'br') out += '<w:r><w:br/></w:r>';
            else if (t === 'img') out += image(c);
            else if (t === 'strong' || t === 'b') out += inline(c, { ...f, b: true });
            else if (t === 'em' || t === 'i') out += inline(c, { ...f, i: true });
            else if (t === 'del' || t === 's') out += inline(c, { ...f, s: true });
            else if (t === 'code') out += run(c.textContent, { ...f, code: true });
            else if (t === 'sup') out += inline(c, { ...f, sup: true });
            else if (t === 'sub') out += inline(c, { ...f, sub: true });
            else if (t === 'a') {
                const href = c.getAttribute('href') || '';
                if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) out += '<w:hyperlink r:id="' + rel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', href, true) + '">' + inline(c, { ...f, link: true }) + '</w:hyperlink>';
                else out += inline(c, f);
            } else out += inline(c, f);
        });
        return out;
    }
    const para = (inner, ppr = '') => '<w:p>' + (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + inner + '</w:p>';
    const isBlock = (t) => /^(p|h[1-6]|ul|ol|blockquote|pre|table|hr|div|li)$/.test(t);

    function listItems(list, depth, numId) {
        let out = '';
        list.childNodes.forEach(li => {
            if (li.nodeType !== 1 || li.tagName.toLowerCase() !== 'li') return;
            const flow = splitItem(li);
            const ppr = '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="' + Math.min(depth, 8) + '"/><w:numId w:val="' + numId + '"/></w:numPr>';
            out += para(inline(flow.inl), ppr);
            flow.blocks.forEach(b => {
                const t = b.tagName.toLowerCase();
                if (t === 'ul' || t === 'ol') out += listBlock(b, depth + 1);
                else out += block(b);
            });
        });
        return out;
    }
    // Listenpunkt in „eigener Text“ und „Unterblöcke“ trennen
    function splitItem(li) {
        const holder = doc.createElement('div'), blocks = [];
        li.childNodes.forEach(c => {
            if (c.nodeType === 1 && isBlock(c.tagName.toLowerCase())) { if (c.tagName.toLowerCase() === 'p') holder.appendChild(c.cloneNode(true)); else blocks.push(c); }
            else holder.appendChild(c.cloneNode(true));
        });
        return { inl: holder, blocks };
    }
    function listBlock(list, depth) {
        const ordered = list.tagName.toLowerCase() === 'ol';
        let numId = 1;
        if (ordered) { numId = numSeq++; nums.push(numId); }
        return listItems(list, depth, numId);
    }
    function table(tb) {
        const rows = Array.from(tb.querySelectorAll('tr'));
        if (!rows.length) return '';
        const cols = Math.max(...rows.map(r => r.children.length)), w = Math.floor(9638 / cols);
        let out = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9638" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>' + ('<w:gridCol w:w="' + w + '"/>').repeat(cols) + '</w:tblGrid>';
        rows.forEach((r, ri) => {
            out += '<w:tr>' + (ri === 0 && r.querySelector('th') ? '<w:trPr><w:tblHeader/></w:trPr>' : '');
            for (let c = 0; c < cols; c++) {
                const cell = r.children[c], head = cell && cell.tagName.toLowerCase() === 'th';
                const al = cell && /right|center/.test((cell.getAttribute('align') || cell.getAttribute('style') || '').toLowerCase()) ? '<w:jc w:val="' + (/center/.test(cell.getAttribute('align') || cell.getAttribute('style') || '') ? 'center' : 'right') + '"/>' : '';
                out += '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (head ? '<w:shd w:val="clear" w:color="auto" w:fill="EEEEEE"/>' : '') + '</w:tcPr>' + para(cell ? inline(cell, head ? { b: true } : {}) : '', '<w:spacing w:after="40"/>' + al) + '</w:tc>';
            }
            out += '</w:tr>';
        });
        return out + '</w:tbl>' + para('', '<w:spacing w:after="60"/>');
    }
    function block(el) {
        const t = el.tagName.toLowerCase();
        if (/^h[1-6]$/.test(t)) return para(inline(el), '<w:pStyle w:val="Heading' + t[1] + '"/>');
        if (t === 'p') return para(inline(el));
        if (t === 'ul' || t === 'ol') return listBlock(el, 0);
        if (t === 'blockquote') { let o = ''; el.childNodes.forEach(c => { if (c.nodeType === 1 && isBlock(c.tagName.toLowerCase())) o += c.tagName.toLowerCase() === 'p' ? para(inline(c), '<w:pStyle w:val="Quote"/>') : block(c); else if (c.nodeType === 3 && c.nodeValue.trim()) o += para(run(c.nodeValue.trim(), {}), '<w:pStyle w:val="Quote"/>'); }); return o; }
        if (t === 'pre') return el.textContent.replace(/\n$/, '').split('\n').map(l => para(run(l || ' ', {}), '<w:pStyle w:val="CodeBlock"/>')).join('');
        if (t === 'hr') return para('', '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>');
        if (t === 'table') return table(el);
        if (t === 'div' || t === 'li') return blocks(el);
        return para(inline(el));
    }
    function blocks(root) {
        let out = '', loose = '';
        const flush = () => { if (loose.trim()) out += para(loose); loose = ''; };
        root.childNodes.forEach(c => {
            if (c.nodeType === 1 && isBlock(c.tagName.toLowerCase())) { flush(); out += block(c); }
            else if (c.nodeType === 3) loose += run(c.nodeValue.replace(/\s+/g, ' '), {});
            else if (c.nodeType === 1) { const tmp = doc.createElement('span'); tmp.appendChild(c.cloneNode(true)); loose += inline(tmp); }
        });
        flush();
        return out;
    }

    const body = blocks(doc.body);
    const lang = opts.language || 'en';
    const docXml = XML + '<w:document ' + NS + '><w:body>' + (opts.title ? para(run(opts.title, {}), '<w:pStyle w:val="Title"/>') : '') + (body || para('')) + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>';
    const styles = STYLES.replace('w:val="en-US"', 'w:val="' + escXml(lang) + '"');

    // Nummerierung: 1 = Aufzählung, weitere = je eine nummerierte Liste (beginnt bei 1)
    const lvl = (i, fmt, text, left) => '<w:lvl w:ilvl="' + i + '"><w:start w:val="1"/><w:numFmt w:val="' + fmt + '"/><w:lvlText w:val="' + text + '"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="' + left + '" w:hanging="360"/></w:pPr>' + (fmt === 'bullet' ? '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>' : '') + '</w:lvl>';
    let bullets = '', decimals = '';
    for (let i = 0; i < 9; i++) { bullets += lvl(i, 'bullet', '', 720 + i * 360); decimals += lvl(i, 'decimal', '%' + (i + 1) + '.', 720 + i * 360); }
    const numbering = XML + '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' + bullets + '</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' + decimals + '</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
        + nums.map(n => '<w:num w:numId="' + n + '"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>').join('') + '</w:numbering>';

    const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
    const allRels = [{ id: 'rId1', type: R + 'styles', target: 'styles.xml' }, { id: 'rId2', type: R + 'numbering', target: 'numbering.xml' }].concat(rels);
    const docRels = XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + allRels.map(r => '<Relationship Id="' + r.id + '" Type="' + r.type + '" Target="' + escXml(r.target) + '"' + (r.external ? ' TargetMode="External"' : '') + '/>').join('') + '</Relationships>';
    const types = XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
    const root = XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + R + 'officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
    const date = (opts.date instanceof Date ? opts.date : new Date()).toISOString().replace(/\.\d+Z$/, 'Z');
    const core = XML + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + escXml(opts.title || '') + '</dc:title><dc:creator>' + escXml(opts.author || '') + '</dc:creator><dc:language>' + escXml(lang) + '</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">' + date + '</dcterms:created></cp:coreProperties>';

    const entries = [
        { name: '[Content_Types].xml', data: types }, { name: '_rels/.rels', data: root }, { name: 'docProps/core.xml', data: core },
        { name: "word/document.xml", data: docXml }, { name: 'word/styles.xml', data: styles }, { name: 'word/numbering.xml', data: numbering }, { name: 'word/_rels/document.xml.rels', data: docRels },
        ...media.map(m => ({ name: 'word/media/' + m.name, data: m.data, store: true })),
    ];
    return writeZip(entries, { date: opts.date instanceof Date ? opts.date : undefined });
}
