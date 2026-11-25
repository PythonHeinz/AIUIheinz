#!/usr/bin/env python3
"""Zeigt den rohen HTML-Text einzelner Artikel einer Kiwix-ZIM und meldet, ob eine Infobox darin steckt (Strang AIUIheinz-WikiHeinz).

Frage, die das klärt: Enthält die Ausführung „mini“ (oder „nopic“, „maxi“) die Infobox (in der Wikipedia eine Tabelle), oder nur die Einleitung?
Das Skript zum Auszug (docHeinz) lässt Tabellen bewusst weg; hier wird nichts gekürzt.

Im Handy (Termux):   pip install zstandard      (der eigene Leser, kein libzim nötig)
Beispiel:
    python zim_roh.py wikipedia_de_all_mini_2026-10.zim Sokrates Köln Albert_Einstein --aus roh
Ergebnis: je Artikel eine Zeile mit Länge, Zahl der Tabellen und „infobox“-Treffern, dazu die Datei roh/<Titel>.html (zum Ansehen im Browser).
Die ZIM wird nur gelesen. Die Klasse ZimLeser ist eine Kopie aus ../../docheinz/skripte/zim_zu_woerterbuch.py (Insel-Regel: keine Importe zwischen Werkzeugen).
"""
import argparse, os, re, sys


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

def schluessel(z, i):
    d = z.dirent(i); return (d['ns'], d['url'])


def finde(z, titel):
    """Binäre Suche über die nach Namensraum und Adresse sortierte Liste; folgt Weiterleitungen. -> (Titel, html_bytes) oder (None, None)"""
    ziel = ('C', titel.replace(' ', '_')); alt = ('A', ziel[1])
    for z_ in (ziel, alt):
        lo, hi = 0, z.count - 1
        while lo <= hi:
            mid = (lo + hi) // 2; k = schluessel(z, mid)
            if k < z_: lo = mid + 1
            elif k > z_: hi = mid - 1
            else:
                d = z.dirent(mid); n = 0
                while d['redirect'] is not None and n < 5: d = z.dirent(d['redirect']); n += 1
                if d['cluster'] is None: return None, None
                return d['title'], bytes(z.cluster(d['cluster'])[d['blob']])
    return None, None


def untersuche(html):
    s = html.decode('utf-8', 'replace')
    return dict(laenge=len(html), tabellen=len(re.findall(r'<table', s, re.I)), infobox=len(re.findall(r'infobox', s, re.I)), absaetze=len(re.findall(r'<p[ >]', s, re.I)), ueberschriften=len(re.findall(r'<h[2-6]', s, re.I)))


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('zim'); p.add_argument('titel', nargs='+', help='Artikeltitel (Leerzeichen oder Unterstrich)')
    p.add_argument('--aus', default='', help='Ordner für die rohen HTML-Dateien')
    a = p.parse_args(argv); z = ZimLeser(a.zim)
    if a.aus: os.makedirs(a.aus, exist_ok=True)
    for t in a.titel:
        name, html = finde(z, t)
        if html is None: print('%-24s nicht gefunden' % t); continue
        u = untersuche(html)
        print('%-24s %7d Bytes, %d Tabellen, %d x "infobox", %d Absätze, %d Zwischenüberschriften' % (name, u['laenge'], u['tabellen'], u['infobox'], u['absaetze'], u['ueberschriften']))
        if a.aus:
            with open(os.path.join(a.aus, re.sub(r'[\\/:*?"<>|]+', '_', name) + '.html'), 'wb') as f: f.write(html)


if __name__ == '__main__':
    main()
