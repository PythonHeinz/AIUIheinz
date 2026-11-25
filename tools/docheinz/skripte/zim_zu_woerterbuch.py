#!/usr/bin/env python3
"""Macht aus einer Kiwix-Wikipedia (ZIM-Datei, Ausführung "mini") ein Nachschlagewerk für docHeinz.

Pro Artikel bleibt nur die Einleitung als Klartext (Standard höchstens 500 Zeichen, am Satzende gekürzt). Weiterleitungen
(z. B. "Kakerlake" -> "Küchenschabe") werden als Verweise übernommen. Das Ergebnis ist eine .jsonl.gz im Importformat der Wörterbücher.

Am PC (Windows, Mac, Linux), einmalig:   pip install libzim
Im Handy (Termux), wo libzim nicht läuft:   pip install zstandard      (der eigene Leser wird automatisch genommen)
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


class ZimLeser:
    """Eigener, kleiner ZIM-Leser (nur Standardbibliothek, plus `zstandard` für neuere Dateien). Er läuft auch in Termux auf dem Handy,
    wo libzim nicht installierbar ist. Liest Artikel (Namespace C oder A) und Weiterleitungen."""
    def __init__(self, path):
        import mmap, struct
        self.f = open(path, 'rb'); self.m = mmap.mmap(self.f.fileno(), 0, access=mmap.ACCESS_READ); self.st = struct
        m = self.m
        magic, self.major, self.minor = struct.unpack_from('<IHH', m, 0)
        if magic != 72173914: raise ValueError('keine ZIM-Datei')
        self.count, self.nclusters, self.url_ptr, self.title_ptr, self.cluster_ptr, self.mime_pos = struct.unpack_from('<IIQQQQ', m, 24)
        self.checksum_pos = struct.unpack_from('<Q', m, 72)[0]
        self.mimes, pos = [], self.mime_pos
        while True:
            e = m.find(b'\x00', pos); t = m[pos:e].decode('utf-8', 'replace')
            if not t: break
            self.mimes.append(t); pos = e + 1
        self.zstd = None

    def _dirent_pos(self, i): return self.st.unpack_from('<Q', self.m, self.url_ptr + 8 * i)[0]

    def dirent(self, i):
        """-> dict(mime, ns, redirect, cluster, blob, url, title)"""
        m, pos = self.m, self._dirent_pos(i)
        mime, plen, ns = self.st.unpack_from('<HBc', m, pos)
        ns = ns.decode('latin1')
        if mime == 0xFFFF:
            red = self.st.unpack_from('<I', m, pos + 8)[0]; q = pos + 12; cl = bl = None
        else:
            cl, bl = self.st.unpack_from('<II', m, pos + 8); q = pos + 16; red = None
        e1 = m.find(b'\x00', q); e2 = m.find(b'\x00', e1 + 1)
        url = m[q:e1].decode('utf-8', 'replace'); title = m[e1 + 1:e2].decode('utf-8', 'replace') or url
        return dict(mime=None if mime == 0xFFFF else (self.mimes[mime] if mime < len(self.mimes) else ''), ns=ns, redirect=red, cluster=cl, blob=bl, url=url, title=title)

    def cluster(self, n):
        """-> Liste der Blobs (bytes) des Clusters n"""
        a = self.st.unpack_from('<Q', self.m, self.cluster_ptr + 8 * n)[0]
        b = self.st.unpack_from('<Q', self.m, self.cluster_ptr + 8 * (n + 1))[0] if n + 1 < self.nclusters else self.checksum_pos
        info = self.m[a]; comp, ext = info & 15, bool(info & 16)
        raw = bytes(self.m[a + 1:b])
        if comp in (0, 1): data = raw
        elif comp == 4:
            import lzma; data = lzma.decompress(raw)
        elif comp == 5:
            if self.zstd is None:
                try: import zstandard
                except ImportError: raise SystemExit('Für diese ZIM-Datei fehlt das Paket "zstandard": pip install zstandard')
                self.zstd = zstandard.ZstdDecompressor()
            data = self.zstd.decompressobj().decompress(raw)
        else: raise ValueError('unbekannte Kompression %d' % comp)
        w = 8 if ext else 4; fmt = '<Q' if ext else '<I'
        first = self.st.unpack_from(fmt, data, 0)[0]; n_off = first // w
        offs = [self.st.unpack_from(fmt, data, w * k)[0] for k in range(n_off)]
        return [data[offs[k]:offs[k + 1]] for k in range(n_off - 1)]

    def articles(self, limit=0):
        """erzeugt (titel, ziel_oder_None, html_bytes_oder_None) für Artikel und Weiterleitungen"""
        from array import array
        n = min(self.count, limit) if limit else self.count
        idx, cl, bl = array('I'), array('I'), array('I')
        for i in range(n):
            try: d = self.dirent(i)
            except Exception: continue
            if d['ns'] not in ('C', 'A'): continue
            if d['redirect'] is not None:
                try: t = self.dirent(d['redirect'])['title']
                except Exception: continue
                yield d['title'], t, None
            elif d['mime'] and d['mime'].startswith('text/html'):
                idx.append(i); cl.append(d['cluster']); bl.append(d['blob'])
        order = sorted(range(len(idx)), key=lambda k: (cl[k], bl[k]))
        cur, blobs = -1, []
        for k in order:
            if cl[k] != cur:
                cur = cl[k]
                try: blobs = self.cluster(cur)
                except SystemExit: raise
                except Exception: blobs = []
            if bl[k] < len(blobs): yield self.dirent(idx[k])['title'], None, blobs[bl[k]]


def entries(zim, lang='', max_chars=500, redirects=True, limit=0):
    """Erzeugt je Artikel einen Wörterbuch-Eintrag (dict). `zim` ist ein libzim.reader.Archive oder ein ZimLeser."""
    base = {'lang_code': lang} if lang in ('de', 'en') else {}                 # docHeinz behält nur de/en; sonst Sprache weglassen
    for title, target, html in (zim.articles(limit) if isinstance(zim, ZimLeser) else _libzim_articles(zim, limit)):
        title = (title or '').strip()
        if not title or title == 'mainPage': continue
        if target is not None:
            t = target.strip()
            if redirects and t and t.lower() != title.lower():
                yield dict(word=title, senses=[{'form_of': [{'word': t}]}], **base)
            continue
        try: txt = intro_text(bytes(html).decode('utf-8', 'replace'), max_chars)
        except Exception: continue
        if txt: yield dict(word=title, senses=[{'glosses': [txt]}], **base)


def _libzim_articles(zim, limit=0):
    new = getattr(zim, 'has_new_namespace_scheme', True)
    n = zim.all_entry_count if hasattr(zim, 'all_entry_count') else zim.entry_count
    for i in range(n if not limit else min(n, limit)):
        try:
            e = zim._get_entry_by_id(i) if hasattr(zim, '_get_entry_by_id') else zim.get_entry_by_id(i)
            if not new and not e.path.startswith('A/'): continue
            if e.is_redirect: yield e.title, e.get_redirect_entry().title, None; continue
            item = e.get_item()
            if item.mimetype.startswith('text/html'): yield e.title, None, bytes(item.content)
        except Exception:
            continue


def open_zim(path, reader='auto'):
    if reader in ('auto', 'libzim'):
        try:
            from libzim.reader import Archive
            return Archive(path)
        except ImportError:
            if reader == 'libzim': raise
    return ZimLeser(path)


def run(src, dst, lang='', max_chars=500, redirects=True, limit=0, reader='auto'):
    zim = open_zim(src, reader)
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
    p.add_argument('--reader', default='auto', choices=['auto', 'libzim', 'eigen'], help='ZIM-Leser: auto (libzim, sonst eigener), libzim oder eigen (läuft auch in Termux)')
    a = p.parse_args(argv)
    n = run(a.zim, a.ausgabe, a.lang, a.max_chars, not a.no_redirects, a.limit, a.reader)
    print(f'Fertig: {n} Einträge -> {a.ausgabe}')


if __name__ == '__main__':
    main()
