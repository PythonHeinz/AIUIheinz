/* KOPIE aus tools/convert2/mod (Entscheidung A, 17.11.2026): Pflege in beiden Werkzeugen, bei Änderungen beide Stellen abgleichen. */
/* tools/convert2/mod/html.js – HTML → Markdown (Insel-Modul, keine Oberfläche).
 * Braucht nur die Browser-Schnittstelle DOMParser; Skripte, Event-Handler und Styles werden nie ausgeführt oder übernommen.
 *   looksLikeHtml(raw)     erkennt HTML-Text (Dokument oder mehrere Tags)
 *   htmlToMarkdown(html)   Überschriften, Absätze, Listen (verschachtelt), Tabellen, Zitate, Code, Links (https, mailto), Bilder (https, data:image), fett/kursiv/durchgestrichen
 * Ausgangspunkt war die Funktion aus der Vorlage (frühere Vorlage, nur noch in der Git-Historie); Überschriften jetzt bis Ebene 6, Bilder und Code-Sprache neu. */

export function looksLikeHtml(raw) {
  if (/^\s*<!doctype html|^\s*<html[\s>]/i.test(raw)) return true;
  const tags = raw.match(/<\/?(?:h[1-6]|p|div|span|table|thead|tbody|tr|td|th|ul|ol|li|br|hr|a|b|i|u|strong|em|blockquote|pre|code|section|article|body|head|img)(?:\s[^<>]*)?\/?>/gi) || [];
  if (!tags.length) return false;
  if (raw.trim().startsWith('<')) return true;
  return tags.length >= 3 && !/^(#{1,4} |\s*[-*] |\|)/m.test(raw);
}

/* HTML -> MARKDOWN (DOMParser: Skripte/Event-Handler werden nie ausgefuehrt) */
export function htmlToMarkdown(html) {
  // Vorbereinigung: nicht geschlossene <style>/<script>/<title> wuerden sonst den ganzen Rest verschlucken
  html = html
    .replace(/<style\b[^>]*>[\s\S]*?(?:<\/style\s*>|(?=<\/head\s*>|<body\b))/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|(?=<\/head\s*>|<body\b))/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?(?:<\/title\s*>|(?=<\/head\s*>|<body\b|<style\b))/gi, '')
    .replace(/<\/?(?:template|noscript)\b[^>]*>/gi, '');   // Inhalt behalten, Huelle entfernen
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, head, title, svg, iframe, canvas, object, embed, select, option, button, input, textarea').forEach(n => n.remove());

  const BLOCK_SEL = 'address,article,aside,blockquote,dd,div,dl,dt,fieldset,figure,figcaption,footer,form,h1,h2,h3,h4,h5,h6,header,hr,main,nav,ol,p,pre,section,table,ul,li';
  const INLINE_RE = /^(a|abbr|b|big|br|cite|code|del|em|font|i|img|ins|kbd|label|mark|q|s|samp|small|span|strike|strong|sub|sup|u|var)$/;
  const escText = s => s.replace(/([\\`*~])/g, '\\$1');
  const guardLine = l => l.replace(/^(\d+)([.)])(\s)/, '$1\\$2$3').replace(/^([-+>#|])/, '\\$1');
  const hasBlock = el => !!el.querySelector(BLOCK_SEL);
  const mark = (m, s) => {
    const p = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    return p[2] ? p[1] + m + p[2] + m + p[3] : s;
  };

  function inl(node) {
    let out = '';
    node.childNodes.forEach(c => {
      if (c.nodeType === 3) { out += escText(c.nodeValue.replace(/\s+/g, ' ')); return; }
      if (c.nodeType !== 1) return;
      const t = c.tagName.toLowerCase();
      if (t === 'br') { out += '\n'; return; }
      if (t === 'img') {
        const src = (c.getAttribute('src') || '').trim();
        if (/^(https?:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(src)) out += '![' + escText((c.getAttribute('alt') || '').replace(/\s+/g, ' ').trim()) + '](' + src.replace(/ /g, '%20').replace(/\)/g, '%29') + ')';
        return;
      }
      if (t === 'code' || t === 'kbd' || t === 'samp') {
        const s = c.textContent.replace(/`/g, "'");
        out += s.trim() ? '`' + s + '`' : '';
        return;
      }
      const inner = inl(c);
      if (t === 'b' || t === 'strong') out += mark('**', inner);
      else if (t === 'i' || t === 'em' || t === 'cite') out += mark('*', inner);
      else if (t === 's' || t === 'del' || t === 'strike') out += mark('~~', inner);
      else if (t === 'a') {
        const href = (c.getAttribute('href') || '').trim();
        const s = inner.trim();
        out += (s && /^(https?:\/\/|mailto:)/i.test(href))
          ? '[' + s + '](' + href.replace(/ /g, '%20').replace(/\)/g, '%29') + ')'
          : inner;
      } else out += inner;
    });
    return out;
  }

  function para(out, s) {
    const ls = s.split('\n').map(l => l.trim()).filter(Boolean).map(guardLine);
    if (ls.length) out.push(ls.join('\n'));
  }

  function listMd(el, depth) {
    const ordered = el.tagName.toLowerCase() === 'ol';
    let n = 0;
    const ls = [];
    Array.from(el.children).forEach(li => {
      if (li.tagName.toLowerCase() !== 'li') return;
      n++;
      const clone = li.cloneNode(true);
      clone.querySelectorAll('ul, ol').forEach(x => x.remove());
      const txt = inl(clone).replace(/\s+/g, ' ').trim();
      if (txt) ls.push('  '.repeat(depth) + (ordered ? n + '. ' : '- ') + txt);
      Array.from(li.children).filter(x => /^(ul|ol)$/i.test(x.tagName)).forEach(sub => {
        const m = listMd(sub, depth + 1);
        if (m) ls.push(m);
      });
    });
    return ls.join('\n');
  }

  function tableMd(el) {
    const rows = Array.from(el.querySelectorAll('tr'))
      .filter(tr => tr.closest('table') === el)
      .map(tr => Array.from(tr.children)
        .filter(c => /^t[hd]$/i.test(c.tagName))
        .map(c => inl(c).replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|')))
      .filter(r => r.length);
    if (!rows.length) return '';
    const cols = Math.max(...rows.map(r => r.length));
    const fmt = r => '| ' + Array.from({ length: cols }, (_, i) => r[i] || '').join(' | ') + ' |';
    return [fmt(rows[0]), '| ' + Array(cols).fill('---').join(' | ') + ' |', ...rows.slice(1).map(fmt)].join('\n');
  }

  function blocksOf(parent) {
    const out = [];
    let run = [];
    const flush = () => {
      if (!run.length) return;
      const w = doc.createElement('div');
      run.forEach(n => w.appendChild(n.cloneNode(true)));
      para(out, inl(w));
      run = [];
    };
    parent.childNodes.forEach(c => {
      if (c.nodeType === 3) { run.push(c); return; }
      if (c.nodeType !== 1) return;
      const t = c.tagName.toLowerCase();
      if (INLINE_RE.test(t) && !hasBlock(c)) { run.push(c); return; }
      flush();
      if (/^h[1-6]$/.test(t)) {
        const s = inl(c).replace(/\s+/g, ' ').trim();
        if (s) out.push('#'.repeat(+t[1]) + ' ' + s);
      } else if (t === 'ul' || t === 'ol') {
        const m = listMd(c, 0);
        if (m) out.push(m);
      } else if (t === 'table') {
        const m = tableMd(c);
        if (m) out.push(m);
      } else if (t === 'pre') {
        const lang = ((c.querySelector('code') || c).getAttribute('class') || '').match(/language-([\w+#.-]+)/);
        out.push('```' + (lang ? lang[1] : '') + '\n' + c.textContent.replace(/^\n+|\s+$/g, '') + '\n```');
      } else if (t === 'blockquote') {
        blocksOf(c).join('\n').split('\n').filter(l => l.trim()).forEach(l => out.push('> ' + l.trim()));
      } else if (t === 'hr') {
        out.push('---');
      } else if (hasBlock(c)) {
        blocksOf(c).forEach(b => out.push(b));
      } else {
        para(out, inl(c));
      }
    });
    flush();
    return out;
  }

  return blocksOf(doc.body).join('\n\n').trim();
}

