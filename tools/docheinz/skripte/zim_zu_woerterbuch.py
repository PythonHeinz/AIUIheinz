#!/usr/bin/env python3
"""Macht aus einer Kiwix-Wikipedia (ZIM-Datei, Ausführung "mini") ein Nachschlagewerk für docHeinz.

Pro Artikel bleibt nur die Einleitung als Klartext (Standard höchstens 500 Zeichen, am Satzende gekürzt). Weiterleitungen
(z. B. "Kakerlake" -> "Küchenschabe") werden als Verweise übernommen. Das Ergebnis ist eine .jsonl.gz im Importformat der Wörterbücher.

Am PC (Windows, Mac, Linux), einmalig:   pip install libzim
Beispiel:
    python zim_zu_woerterbuch.py wikipedia_de_all_mini_2026-06.zim wikipedia-de.jsonl.gz --lang de
    python zim_zu_woerterbuch.py in.zim out.jsonl.gz --lang en --max-chars 300 --limit 100000     (Test mit den ersten 100000 Einträgen)

Die ZIM-Dateien gibt es bei Kiwix (download.kiwix.org/zim/wikipedia/). "mini" enthält nur Einleitungen; die kleineren Auszüge
"top" (häufigste Artikel) sind schneller fertig. Das Ergebnis wird danach in docHeinz unter Bibliothek, Wörterbuch importiert.
Die Texte stehen unter CC BY-SA (Wikipedia); der Hinweis steht im Namen des Wörterbuchs in der App.
"""
import argparse, gzip, json, re, sys
from html.parser import HTMLParser

SKIP = {'script', 'style', 'table', 'sup', 'figure', 'math', 'noscript', 'aside', 'nav'}
BLOCK_END = {'p'}


class Intro(HTMLParser):
    """Sammelt die Absätze (<p>) außerhalb von Infoboxen, Tabellen und Fußnoten, bis genug Text da ist."""
    def __init__(self, need):
        super().__init__(convert_charrefs=True)
        self.need, self.depth, self.in_p, self.cur, self.paras, self.total = need, 0, 0, [], [], 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP: self.depth += 1
        elif tag == 'p' and not self.depth: self.in_p += 1; self.cur = []

    def handle_endtag(self, tag):
        if tag in SKIP and self.depth: self.depth -= 1
        elif tag == 'p' and self.in_p:
            self.in_p = 0
            text = clean(''.join(self.cur))
            if len(text) >= 25:
                self.paras.append(text); self.total += len(text)

    def handle_data(self, data):
        if self.in_p and not self.depth: self.cur.append(data)

    @property
    def done(self): return self.total >= self.need


def clean(s):
    s = re.sub(r'\[\s*(?:\d+|[a-z]|Anm\.?\s*\d*|note \d+)\s*\]', '', s)         # [1], [a]
    s = re.sub(r'\s+', ' ', s).replace(' ,', ',').replace(' .', '.').replace('( ', '(').replace(' )', ')')
    return s.strip()


def cut(text, n):
    if len(text) <= n: return text
    head = text[:n]
    m = list(re.finditer(r'[.!?](?=\s|$)', head))
    if m and m[-1].end() >= n * 0.5: return head[:m[-1].end()]
    return head.rsplit(' ', 1)[0] + ' …'


def intro_text(html, max_chars=500):
    p = Intro(max_chars)
    try:
        for i in range(0, len(html), 4096):
            p.feed(html[i:i + 4096])
            if p.done: break
        p.close()
    except Exception:
        pass
    return cut(' '.join(p.paras), max_chars) if p.paras else ''


def entries(zim, lang='', max_chars=500, redirects=True, limit=0):
    """Erzeugt je Artikel einen Wörterbuch-Eintrag (dict). `zim` ist ein libzim.reader.Archive."""
    new = getattr(zim, 'has_new_namespace_scheme', True)
    n = zim.all_entry_count if hasattr(zim, 'all_entry_count') else zim.entry_count
    base = {'lang_code': lang} if lang in ('de', 'en') else {}                 # docHeinz behält nur de/en; sonst Sprache weglassen
    for i in range(n if not limit else min(n, limit)):
        try:
            e = zim._get_entry_by_id(i) if hasattr(zim, '_get_entry_by_id') else zim.get_entry_by_id(i)
            if not new and not e.path.startswith('A/'): continue
            title = (e.title or '').strip()
            if not title or title == 'mainPage': continue
            if e.is_redirect:
                if not redirects: continue
                t = e.get_redirect_entry().title.strip()
                if t and t.lower() != title.lower():
                    yield dict(word=title, senses=[{'form_of': [{'word': t}]}], **base)
                continue
            item = e.get_item()
            if not item.mimetype.startswith('text/html'): continue
            txt = intro_text(bytes(item.content).decode('utf-8', 'replace'), max_chars)
            if txt: yield dict(word=title, senses=[{'glosses': [txt]}], **base)
        except Exception:
            continue


def run(src, dst, lang='', max_chars=500, redirects=True, limit=0):
    from libzim.reader import Archive
    zim = Archive(src)
    n = 0
    with gzip.open(dst, 'wt', encoding='utf-8') as out:
        for e in entries(zim, lang, max_chars, redirects, limit):
            out.write(json.dumps(e, ensure_ascii=False, separators=(',', ':')) + '\n'); n += 1
            if n % 100000 == 0: print(f'{n} Einträge …', file=sys.stderr)
    return n


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    p.add_argument('zim'); p.add_argument('ausgabe')
    p.add_argument('--lang', default='', help='de oder en (andere Sprachen: leer lassen)')
    p.add_argument('--max-chars', type=int, default=500, help='Länge der Einleitung (Standard 500)')
    p.add_argument('--no-redirects', action='store_true', help='Weiterleitungen weglassen (kleinere Datei)')
    p.add_argument('--limit', type=int, default=0, help='nur die ersten N Einträge der ZIM-Datei (zum Testen)')
    a = p.parse_args(argv)
    n = run(a.zim, a.ausgabe, a.lang, a.max_chars, not a.no_redirects, a.limit)
    print(f'Fertig: {n} Einträge -> {a.ausgabe}')


if __name__ == '__main__':
    main()
