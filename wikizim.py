#!/usr/bin/env python3
"""Wikipedia aus einer ZIM-Datei lesen (WikiHeinz, Variante B): ganze Artikel, in Abschnitte zerlegt.

Nur Standardbibliothek. Neuere ZIM-Dateien (Kiwix, Kompression zstd) brauchen zusätzlich `pip install zstandard` (läuft auch in Termux).
Die Datei wird nur gelesen (mmap) und nie verändert. server.py nutzt dieses Modul für /api/wiki/status und /api/wiki/artikel.

    z = Zim(pfad);  z.status();  artikel(z, 'Köln')  ->  {titel, intro, abschnitte: [{h, text}], infobox: [[Name, Wert]], zeichen} oder None
"""
import mmap
import re
import struct
import threading
from collections import OrderedDict
from html.parser import HTMLParser

MAX_ZEICHEN = 120000          # Obergrenze je Artikel (Text), danach wird abgeschnitten
MAX_ABSCHNITT = 6000          # Obergrenze je Abschnitt
SKIP = {'script', 'style', 'sup', 'figure', 'math', 'noscript', 'aside', 'nav', 'table', 'figcaption', 'sub'}
BLOCK = {'p', 'li', 'dd', 'dt', 'blockquote', 'pre'}
ENDE = {'weblinks', 'einzelnachweise', 'literatur', 'siehe auch', 'anmerkungen', 'fußnoten', 'fussnoten', 'quellen', 'normdaten', 'references', 'external links', 'further reading',
        'see also', 'notes', 'footnotes', 'sources', 'bibliography', 'einzelnachweise und anmerkungen', 'belege'}


class ZimFehler(Exception):
    """Etwas an der Datei oder der Umgebung stimmt nicht (Text für den Nutzer in .args[0]); .code = 'zstd' | 'datei' | 'format'."""
    def __init__(self, text, code='datei'):
        super().__init__(text)
        self.code = code


class Zim:
    """Kleiner ZIM-Leser: Kopf, Titel-/Adresslisten, Weiterleitungen, Cluster (unkomprimiert, xz, zstd). Mehrere Anfragen zugleich sind erlaubt."""
    def __init__(self, path, cache=8):
        try:
            self.f = open(path, 'rb')
            self.m = mmap.mmap(self.f.fileno(), 0, access=mmap.ACCESS_READ)
        except (OSError, ValueError) as e:
            raise ZimFehler('Datei nicht lesbar: %s' % e, 'datei')
        magic, self.major, self.minor = struct.unpack_from('<IHH', self.m, 0)
        if magic != 72173914:
            self.close()
            raise ZimFehler('keine ZIM-Datei', 'format')
        self.count, self.nclusters, self.url_ptr, self.title_ptr, self.cluster_ptr, self.mime_pos = struct.unpack_from('<IIQQQQ', self.m, 24)
        self.checksum_pos = struct.unpack_from('<Q', self.m, 72)[0]
        self.mimes, pos = [], self.mime_pos
        while True:
            e = self.m.find(b'\x00', pos)
            t = self.m[pos:e].decode('utf-8', 'replace')
            if not t:
                break
            self.mimes.append(t)
            pos = e + 1
        self.path = path
        self._lock = threading.Lock()
        self._cache = OrderedDict()
        self._cache_max = cache
        self._zstd = None

    def close(self):
        try:
            self.m.close()
            self.f.close()
        except Exception:
            pass

    def _dirent_pos(self, i):
        return struct.unpack_from('<Q', self.m, self.url_ptr + 8 * i)[0]

    def dirent(self, i):
        m, pos = self.m, self._dirent_pos(i)
        mime, _plen, ns = struct.unpack_from('<HBc', m, pos)
        if mime == 0xFFFF:
            red = struct.unpack_from('<I', m, pos + 8)[0]
            q, cl, bl = pos + 12, None, None
        else:
            cl, bl = struct.unpack_from('<II', m, pos + 8)
            q, red = pos + 16, None
        e1 = m.find(b'\x00', q)
        e2 = m.find(b'\x00', e1 + 1)
        url = m[q:e1].decode('utf-8', 'replace')
        title = m[e1 + 1:e2].decode('utf-8', 'replace') or url
        return {'ns': ns.decode('latin1'), 'redirect': red, 'cluster': cl, 'blob': bl, 'url': url, 'title': title,
                'mime': None if mime == 0xFFFF else (self.mimes[mime] if mime < len(self.mimes) else '')}

    def _key(self, i):
        pos = self._dirent_pos(i)
        mime = struct.unpack_from('<H', self.m, pos)[0]
        ns = self.m[pos + 3:pos + 4].decode('latin1')
        q = pos + (12 if mime == 0xFFFF else 16)
        return ns, self.m[q:self.m.find(b'\x00', q)].decode('utf-8', 'replace')

    def find(self, ns, url):
        """Binäre Suche in der nach (Namensraum, Adresse) sortierten Liste -> Dirent oder None."""
        lo, hi, ziel = 0, self.count - 1, (ns, url)
        while lo <= hi:
            mid = (lo + hi) // 2
            k = self._key(mid)
            if k < ziel:
                lo = mid + 1
            elif k > ziel:
                hi = mid - 1
            else:
                return self.dirent(mid)
        return None

    def _decompress(self, comp, raw):
        if comp in (0, 1):
            return raw
        if comp == 4:
            import lzma
            return lzma.decompress(raw)
        if comp == 5:
            if self._zstd is None:
                try:
                    import zstandard
                except ImportError:
                    raise ZimFehler('Für diese ZIM-Datei fehlt das Paket "zstandard" (pip install zstandard).', 'zstd')
                self._zstd = zstandard.ZstdDecompressor()
            return self._zstd.decompressobj().decompress(raw)
        raise ZimFehler('unbekannte Kompression %d' % comp, 'format')

    def cluster(self, n):
        with self._lock:
            if n in self._cache:
                self._cache.move_to_end(n)
                return self._cache[n]
            a = struct.unpack_from('<Q', self.m, self.cluster_ptr + 8 * n)[0]
            b = struct.unpack_from('<Q', self.m, self.cluster_ptr + 8 * (n + 1))[0] if n + 1 < self.nclusters else self.checksum_pos
            info = self.m[a]
            data = self._decompress(info & 15, bytes(self.m[a + 1:b]))
            w, fmt = (8, '<Q') if info & 16 else (4, '<I')
            first = struct.unpack_from(fmt, data, 0)[0]
            offs = [struct.unpack_from(fmt, data, w * k)[0] for k in range(first // w)]
            blobs = [data[offs[k]:offs[k + 1]] for k in range(len(offs) - 1)]
            self._cache[n] = blobs
            while len(self._cache) > self._cache_max:
                self._cache.popitem(last=False)
            return blobs

    def artikel_html(self, titel):
        """-> (Titel, html als Text) oder (None, None); folgt Weiterleitungen (höchstens 5)."""
        t = str(titel or '').strip().replace(' ', '_')
        if not t:
            return None, None
        d = None
        for versuch in (t, t[:1].upper() + t[1:]):
            for ns in ('C', 'A'):
                d = self.find(ns, versuch)
                if d:
                    break
            if d:
                break
        n = 0
        while d and d['redirect'] is not None and n < 5:
            d, n = self.dirent(d['redirect']), n + 1
        if not d or d['cluster'] is None or not (d['mime'] or '').startswith('text/html'):
            return None, None
        return d['title'], self.cluster(d['cluster'])[d['blob']].decode('utf-8', 'replace')

    def status(self):
        return {'datei': self.path.replace('\\', '/').rsplit('/', 1)[-1], 'eintraege': self.count, 'version': '%d.%d' % (self.major, self.minor)}


def _sauber(s):
    s = re.sub(r'\[\s*(?:\d+|[a-z]|Anm\.?\s*\d*|note \d+)\s*\]', '', s)
    s = re.sub(r'\s+', ' ', s).replace(' ,', ',').replace(' .', '.').replace('( ', '(').replace(' )', ')')
    return s.strip()


class _Seite(HTMLParser):
    """Zerlegt den Artikel in Einleitung, Abschnitte (nach h2 bis h4) und Infobox; Tabellen, Fußnoten und Bilder fallen weg."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.cur, self.in_block, self.in_head, self.head = [], 0, 0, []
        self.sections = [{'h': '', 'text': []}]
        self.ende = False
        self.zeichen = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP:
            self.skip += 1
            return
        if tag in ('h2', 'h3', 'h4') and not self.skip:
            self.in_head, self.head = 1, []
        elif tag in BLOCK and not self.skip:
            self.in_block, self.cur = 1, []

    def handle_endtag(self, tag):
        if tag in SKIP and self.skip:
            self.skip -= 1
            return
        if self.skip:
            return
        if tag in ('h2', 'h3', 'h4') and self.in_head:
            self.in_head = 0
            h = _sauber(''.join(self.head))
            if h.lower() in ENDE:
                self.ende = True
            elif h and not self.ende:
                self.sections.append({'h': h, 'text': []})
        elif tag in BLOCK and self.in_block:
            self.in_block = 0
            t = _sauber(''.join(self.cur))
            if len(t) >= 2 and not self.ende and self.zeichen < MAX_ZEICHEN:
                self.sections[-1]['text'].append(t)
                self.zeichen += len(t)

    def handle_data(self, data):
        if self.in_head:
            self.head.append(data)
        elif self.in_block and not self.skip:
            self.cur.append(data)


class _Info(HTMLParser):
    """Liest nur die Zeilen der Infobox (Name: Wert)."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth, self.row, self.cell, self.in_cell, self.out = 0, [], [], False, []

    def handle_starttag(self, tag, attrs):
        cls = (dict(attrs).get('class', '') or '').lower()
        if tag == 'table':
            self.depth += 1 if self.depth else (1 if 'infobox' in cls else 0)
        elif self.depth and tag == 'tr':
            self.row = []
        elif self.depth and tag in ('td', 'th'):
            self.in_cell, self.cell = True, []

    def handle_endtag(self, tag):
        if tag == 'table' and self.depth:
            self.depth -= 1
        elif self.depth and tag in ('td', 'th') and self.in_cell:
            self.in_cell = False
            self.row.append(_sauber(''.join(self.cell)))
        elif self.depth and tag == 'tr':
            r = [c for c in self.row if c]
            if len(r) >= 2:
                self.out.append([r[0], ' '.join(r[1:])])
            elif len(r) == 1 and len(r[0]) < 80:
                self.out.append([r[0], ''])

    def handle_data(self, data):
        if self.in_cell and self.depth:
            self.cell.append(data)


def zerlege(titel, html):
    p = _Seite()
    try:
        p.feed(html)
        p.close()
    except Exception:
        pass
    abschnitte = []
    for s in p.sections:
        text = ' '.join(s['text'])
        if len(text) > MAX_ABSCHNITT:
            cut = text[:MAX_ABSCHNITT]
            m = list(re.finditer(r'[.!?](?=\s|$)', cut))
            text = cut[:m[-1].end()] if m and m[-1].end() > MAX_ABSCHNITT * 0.5 else cut.rsplit(' ', 1)[0] + ' …'
        if s['h'] == '' or text:
            abschnitte.append({'h': s['h'], 'text': text})
    intro = abschnitte[0]['text'] if abschnitte and abschnitte[0]['h'] == '' else ''
    rest = [a for a in abschnitte if a['h'] != '' and a['text']]
    info = []
    if 'infobox' in html.lower():
        q = _Info()
        try:
            q.feed(html)
            q.close()
        except Exception:
            pass
        info = q.out[:40]
    return {'titel': titel, 'intro': intro, 'abschnitte': rest, 'infobox': info, 'zeichen': len(intro) + sum(len(a['text']) for a in rest)}


def artikel(z, titel):
    t, html = z.artikel_html(titel)
    return zerlege(t, html) if html is not None else None


def finde_zim(pfad='', ordner=''):
    """Pfad der ZIM-Datei: ausdrücklich gegeben, sonst die erste *.zim im Ordner (data/wiki). Leer = keine."""
    import os
    if pfad:
        return pfad if os.path.isfile(pfad) else ''
    if ordner and os.path.isdir(ordner):
        z = sorted(f for f in os.listdir(ordner) if f.lower().endswith('.zim'))
        if z:
            return os.path.join(ordner, z[0])
    return ''
