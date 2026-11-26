"""Baut eine kleine ZIM-Datei für Tests (unkomprimierte Cluster, nur Artikel und Weiterleitungen)."""
import struct


def baue_zim(pfad, eintraege):
    """Minimal ZIM (unkomprimierte Cluster), eintraege = [(url, titel, html | ('->', url))], sortiert nach url. Nur zum Testen von zim_roh.py."""
    eintraege = sorted(eintraege, key=lambda e: e[0])
    mime = b"text/html\0\0"
    idx = {e[0]: i for i, e in enumerate(eintraege)}
    blobs = [e[2].encode() for e in eintraege if not isinstance(e[2], tuple)]
    cluster = struct.pack("<B", 1)
    offs, pos = [], (len(blobs) + 1) * 4
    for b in blobs:
        offs.append(pos); pos += len(b)
    offs.append(pos)
    cluster += b"".join(struct.pack("<I", o) for o in offs) + b"".join(blobs)
    dirents, blob_nr = [], 0
    for url, titel, inhalt in eintraege:
        if isinstance(inhalt, tuple):
            d = struct.pack("<HBcII", 0xFFFF, 0, b"C", 0, idx[inhalt[1]])
        else:
            d = struct.pack("<HBcIII", 0, 0, b"C", 0, 0, blob_nr); blob_nr += 1
        dirents.append(d + url.encode() + b"\0" + titel.encode() + b"\0")
    kopf_len = 80
    mime_pos = kopf_len; url_ptr = mime_pos + len(mime); title_ptr = url_ptr + 8 * len(eintraege)
    cl_ptr = title_ptr + 4 * len(eintraege); dir_pos = cl_ptr + 8
    ptrs, p = [], dir_pos
    for d in dirents:
        ptrs.append(p); p += len(d)
    cluster_pos = p; checksum_pos = cluster_pos + len(cluster)
    kopf = struct.pack("<IHH16sIIQQQQII", 72173914, 6, 1, b"\0" * 16, len(eintraege), 1, url_ptr, title_ptr, cl_ptr, mime_pos, 0, 0xFFFFFFFF)
    kopf += struct.pack("<Q", checksum_pos); kopf = kopf.ljust(kopf_len, b"\0")
    data = kopf + mime + b"".join(struct.pack("<Q", x) for x in ptrs) + b"".join(struct.pack("<I", i) for i in range(len(eintraege))) + struct.pack("<Q", cluster_pos)
    data += b"".join(dirents) + cluster + b"\0" * 16
    with open(pfad, "wb") as f:
        f.write(data)
