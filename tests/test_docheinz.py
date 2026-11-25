"""docHeinz (tools/docheinz/): Node-Tests der Module, Browsertests der Module mit DOM und IndexedDB, Oberfläche (Playwright, Pixel-Viewport, keine Anfragen nach außen).
Echte Dateiauswahl des Handys, Hintergrund und Rückkehr, Speicherdruck gibt es nur am Gerät."""
import io, json, os, shutil, subprocess, sys, unittest, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = shutil.which("node")
URL = "/tools/docheinz/index.html"
PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="


def tiny_png(w=40, h=60, noisy=False):
    import struct, zlib
    raw = b"".join(b"\x00" + (os.urandom(3 * w) if noisy else bytes([200, 60, 60]) * w) for _ in range(h))
    def ch(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw)) + ch(b"IEND", b"")


def make_epub(title="Testbuch", author="Frau Test", chapters=2, drm=False, long=False, cover=None):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/c.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
        if drm:
            z.writestr("META-INF/encryption.xml", '<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#"><CipherData/></EncryptedData></encryption>')
        items = "".join('<item id="k%d" href="text/k%d.xhtml" media-type="application/xhtml+xml"/>' % (i, i) for i in range(1, chapters + 1))
        spine = "".join('<itemref idref="k%d"/>' % i for i in range(1, chapters + 1))
        opf = ('<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>%s</dc:title><dc:creator>%s</dc:creator><dc:language>de</dc:language><dc:identifier id="id">x</dc:identifier></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>%s</manifest><spine>%s</spine></package>' % (title, author, items, spine))
        if cover:
            items_extra = '<item id="cv" href="img/c.png" media-type="image/png"%s/>' % (' properties="cover-image"' if cover == "prop" else '')
            opf = opf.replace('</manifest>', items_extra + '</manifest>')
            if cover == "meta": opf = opf.replace('</metadata>', '<meta name="cover" content="cv"/></metadata>')
            z.writestr("OEBPS/img/c.png", tiny_png(120, 120, True) if cover == "page" else tiny_png())
        z.writestr("OEBPS/c.opf", opf)
        lis = "".join('<li><a href="text/k%d.xhtml">Kapitel %d</a></li>' % (i, i) for i in range(1, chapters + 1))
        z.writestr("OEBPS/nav.xhtml", '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol>%s</ol></nav></body></html>' % lis)
        for i in range(1, chapters + 1):
            nxt = '<p><a href="k%d.xhtml#ziel">weiter zu Kapitel %d</a></p>' % (i + 1, i + 1) if i < chapters else ""
            filler = "".join("<p>Absatz %d dieses langen Kapitels mit etwas Text, damit die Seite scrollt.</p>" % n for n in range(60)) if long else ""
            html = ('<html xmlns="http://www.w3.org/1999/xhtml"><head><style>body{background:red}</style></head><body><h1 id="ziel">Kapitel %d</h1><p class="x" style="position:fixed;background:url(http://evil.example/a.png)" onclick="window.__x=1">Text von Kapitel %d. <a href="https://evil.example/">extern</a></p>%s<script>window.__x=1</script><img src="http://evil.example/b.png" alt="Fremdbild"/>%s</body></html>' % (i, i, nxt, filler))
            if cover == "page" and i == 1:
                html = html.replace("<head>", "<head><title>Titelseite</title>").replace("<h1", '<img src="../img/c.png" alt=""/><h1')
            z.writestr("OEBPS/text/k%d.xhtml" % i, html)
    return buf.getvalue()


@unittest.skipUnless(NODE, "node fehlt")
class DocHeinzModuleTests(unittest.TestCase):
    def test_node_tests_of_all_modules_pass(self):
        files = sorted(f for f in os.listdir(os.path.join(ROOT, "tests", "docheinz")) if f.endswith(".test.mjs"))
        r = subprocess.run([NODE, "--test", *[os.path.join("tests", "docheinz", f) for f in files]], cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_copied_modules_match_convert2_apart_from_the_header_line(self):
        for f in ("zip", "text", "markdown", "html", "epub-lesen", "epub-schreiben"):
            with open(os.path.join(ROOT, "tools", "convert2", "mod", f + ".js"), encoding="utf-8") as fa:
                a = fa.read()
            with open(os.path.join(ROOT, "tools", "docheinz", "mod", f + ".js"), encoding="utf-8") as fb:
                b = fb.read().split("\n", 1)[1]
            self.assertEqual(a.replace("tools/convert2/mod", "X"), b.replace("tools/convert2/mod", "X"), f)


class DocHeinzBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = Server()
        cls.srv.start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.srv.stop()


class DocHeinzDomTests(DocHeinzBase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.page = cls.browser.new_page()
        cls.page.add_init_script("window.__x = 0")
        cls.page.goto(cls.srv.base + "/manifest.webmanifest")

    def ev(self, js, arg=None):
        return self.page.evaluate("async (a) => { const S = await import('/tools/docheinz/mod/sauber.js'), B = await import('/tools/docheinz/mod/buch.js'), Db = await import('/tools/docheinz/mod/db.js'); " + js + " }", arg)

    def test_sauber_keeps_text_structure_and_removes_everything_active(self):
        out = self.ev("""return S.sauber('<h1 id="t" class="c" style="color:red">Titel</h1><p onclick="window.__x=1">A <b>fett</b> <script>window.__x=1</script><a href="https://evil.example/">extern</a> <a href="javascript:window.__x=1">js</a> <a href="mailto:a@b.de">mail</a></p><svg><circle/></svg><iframe src="x"></iframe><form><input></form><img src="http://evil.example/a.png" alt="Fremd"><img src="data:image/png;base64,%s" alt="ok"><img src="data:image/svg+xml;base64,AAAA">', { base: 'OEBPS/text/k1.xhtml' });""" % PNG)
        self.assertIn('<h1 id="t">Titel</h1>', out)
        self.assertIn("<b>fett</b>", out)
        for bad in ("onclick", "script", "style=", "class=", "evil.example", "javascript", "mailto", "<svg", "<iframe", "<form", "<input", "svg+xml"):
            self.assertNotIn(bad, out, bad)
        self.assertIn("extern", out)            # Text bleibt
        self.assertIn("Fremd", out)             # Alternativtext statt Bild
        self.assertIn('src="data:image/png;base64,', out)
        self.assertFalse(self.ev("return window.__x === 1"))

    def test_sauber_turns_internal_links_into_data_go(self):
        out = self.ev("""return S.sauber('<p><a href="k2.xhtml#a">zwei</a> <a href="../img/../k3.xhtml">drei</a> <a href="#hier" epub:type="noteref">fn</a></p>', { base: 'OEBPS/text/k1.xhtml' });""")
        self.assertIn('data-go="OEBPS/text/k2.xhtml#a"', out)
        self.assertIn('data-go="OEBPS/k3.xhtml"', out)
        self.assertIn('data-go="OEBPS/text/k1.xhtml#hier"', out)
        self.assertIn('data-etype="noteref"', out)
        self.assertNotIn("href=", out)

    def test_docx_writer_makes_a_valid_file_that_libreoffice_reads(self):
        import base64, tempfile
        from xml.dom import minidom
        md = ("# Kapitel Eins\n\nEin Absatz mit **fett**, *kursiv*, `Code` und [Link](https://example.org/x).\n\n"
              "- Punkt A\n- Punkt B\n  - Unterpunkt\n\n1. Erstens\n2. Zweitens\n\n> Ein Zitat\n\n```\nzeile1\n  zeile2\n```\n\n"
              "| Name | Wert |\n|---|---|\n| Alpha | 1 |\n| Beta | 2 |\n\n![Bild](data:image/png;base64," + PNG + ")\n\n---\n\n## Kapitel Zwei\n\nSchlusssatz.")
        b64 = self.page.evaluate("""async (md) => { const D = await import('/tools/docheinz/mod/docx-schreiben.js');
            const u = await D.markdownToDocx(md, { title: 'Testbuch', author: 'Frau Test', language: 'de', date: new Date('2026-01-02T03:04:05Z') });
            let s = ''; u.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); }""", md)
        data = base64.b64decode(b64)
        z = zipfile.ZipFile(io.BytesIO(data))
        names = z.namelist()
        for need in ("[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/numbering.xml", "word/_rels/document.xml.rels", "word/media/image1.png"):
            self.assertIn(need, names)
        for n in names:
            if n.endswith(".xml") or n.endswith(".rels"):
                minidom.parseString(z.read(n))                    # wohlgeformt
        doc = z.read("word/document.xml").decode("utf-8")
        for frag in ("Heading1", "Heading2", "<w:tbl>", "<w:drawing>", "w:numId", "CodeBlock", "Quote", "Hyperlink"):
            self.assertIn(frag, doc)
        self.assertIn('Target="https://example.org/x"', z.read("word/_rels/document.xml.rels").decode())
        soffice = shutil.which("soffice")
        if soffice:
            with tempfile.TemporaryDirectory() as d:
                src = os.path.join(d, "t.docx")
                open(src, "wb").write(data)
                subprocess.run([soffice, "--headless", "--convert-to", "txt:Text", "--outdir", d, src], check=True, capture_output=True, timeout=120, env=dict(os.environ, HOME=d))
                txt = open(os.path.join(d, "t.txt"), encoding="utf-8").read()
            self.assertEqual(doc.count("<w:gridCol"), 2)
            for w in ("Testbuch", "Kapitel Eins", "fett", "Unterpunkt", "Zweitens", "Alpha", "Wert", "Schlusssatz", "zeile1"):
                self.assertIn(w, txt, w)

    def test_plain_text(self):
        self.assertEqual(self.ev("return S.plain('<style>x{}</style><p>Ein  <b>Satz</b></p><script>1</script>');"), "Ein Satz")

    def test_formats(self):
        r = self.ev("return ['a.EPUB','b.md','c.markdown','d.txt','e.html','f.pdf','g.mobi','h.azw3','i.fb2','j.cbz'].map(n => B.formatOf(n, '')).concat([B.formatOf('x', 'application/epub+zip'), B.formatOf('x', 'text/plain'), B.formatOf('x', '')]);")
        self.assertEqual(r, ["epub", "md", "md", "txt", "html", "pdf", "other", "other", "other", "other", "epub", "txt", "other"])

    def test_text_books(self):
        r = self.ev("""
            const enc = new TextEncoder(), out = {};
            const t = await B.openSource(enc.encode('Erster Absatz\\nzweite Zeile.\\n\\nZweiter <b>Absatz</b>.'), 'txt', 'mein_buch.txt');
            out.txt = [t.metadata.title, t.chapters.length, await t.html(0)];
            const m = await B.openSource(enc.encode('# Haupttitel\\n\\nText.\\n\\n## Unter\\n\\nmehr'), 'md', 'x.md');
            out.md1 = [m.metadata.title, m.chapters.length, m.toc.length];
            const m2 = await B.openSource(enc.encode('# Eins\\n\\na\\n\\n# Zwei\\n\\nb'), 'md', 'zwei.md');
            out.md2 = [m2.metadata.title, m2.chapters.map(c => c.title), (await m2.html(1)).includes('Zwei'), m2.resolve('k2#x')];
            const h = await B.openSource(enc.encode('<html lang="de"><head><title>Seite</title><script>window.__x=1</script></head><body><h1>Kopf</h1><p>Inhalt</p></body></html>'), 'html', 'q.html');
            out.html = [h.metadata.title, h.metadata.language, await h.html(0)];
            const w = await B.openSource(new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]), 'txt', 'w.txt');
            out.w1252 = await w.html(0);
            const bom = await B.openSource(new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x69]), 'txt', 'b.txt');
            out.bom = await bom.html(0);
            return out;""")
        self.assertEqual(r["txt"], ["mein buch", 1, "<p>Erster Absatz zweite Zeile.</p>\n<p>Zweiter &lt;b&gt;Absatz&lt;/b&gt;.</p>"])
        self.assertEqual(r["md1"], ["Haupttitel", 1, 1])
        self.assertEqual(r["md2"], ["zwei", ["Eins", "Zwei"], True, {"index": 1, "anchor": "x"}])
        self.assertEqual(r["html"][:2], ["Seite", "de"])
        self.assertIn("<h1>Kopf</h1>", r["html"][2])
        self.assertNotIn("script", r["html"][2])
        self.assertEqual(r["w1252"], "<p>Müller</p>")
        self.assertEqual(r["bom"], "<p>Hi</p>")
        self.assertFalse(self.ev("return window.__x === 1"))

    def test_errors_have_clear_codes(self):
        r = self.ev("""
            const out = {}, enc = new TextEncoder();
            for (const [k, bytes, fmt, name] of [['pdf', new Uint8Array([1]), 'pdf', 'a.pdf'], ['mobi', new Uint8Array([1]), 'other', 'a.mobi'], ['empty', enc.encode('  \\n '), 'txt', 'e.txt'], ['bad', new Uint8Array([1, 2, 3]), 'epub', 'b.epub'], ['emptyhtml', enc.encode('<script>1</script>'), 'html', 'h.html']]) {
                try { await B.openSource(bytes, fmt, name); out[k] = 'no error'; } catch (e) { out[k] = [e instanceof B.BuchFehler, e.code, e.detail]; }
            }
            return out;""")
        self.assertEqual(r["pdf"][:2], [True, "unreadable"])
        self.assertEqual(r["mobi"], [True, "unsupported", "mobi"])
        self.assertEqual(r["empty"][1], "empty")
        self.assertEqual(r["bad"][1], "unreadable")
        self.assertEqual(r["emptyhtml"][1], "empty")

    def read_epub(self, data, extra=""):
        return self.ev("""const src = await B.openSource(new Uint8Array(a), 'epub', 'b.epub'); const d = await B.describe(src); %s""" % (extra or "return { m: src.metadata, toc: src.toc, ch: src.chapters, lens: d.lens, h0: await src.html(0), r: src.resolve('OEBPS/text/k2.xhtml#ziel') };"), list(data))

    def test_epub_source_is_clean_and_resolvable(self):
        r = self.read_epub(make_epub(chapters=2))
        self.assertEqual((r["m"]["title"], r["m"]["creator"], r["m"]["language"]), ("Testbuch", "Frau Test", "de"))
        self.assertEqual([t["title"] for t in r["toc"]], ["Kapitel 1", "Kapitel 2"])
        self.assertEqual(len(r["ch"]), 2)
        self.assertEqual(len(r["lens"]), 2)
        self.assertTrue(all(n > 20 for n in r["lens"]))
        self.assertEqual(r["r"], {"index": 1, "anchor": "ziel"})
        for bad in ("onclick", "script", "style", "evil.example", "class="):
            self.assertNotIn(bad, r["h0"], bad)
        self.assertIn("Text von Kapitel 1", r["h0"])
        self.assertIn('data-go="OEBPS/text/k2.xhtml#ziel"', r["h0"])
        self.assertNotIn("Fremdbild", r["h0"])      # fremdes Bild: das EPUB-Lesen entfernt es ganz
        self.assertFalse(self.ev("return window.__x === 1"))

    def test_epub_with_drm_is_refused(self):
        r = self.ev("try { await B.openSource(new Uint8Array(a), 'epub', 'd.epub'); return 'no error'; } catch (e) { return e.code; }", list(make_epub(drm=True)))
        self.assertEqual(r, "drm")

    def test_database_round_trip(self):
        r = self.ev("""
            const db = await Db.openDb('docheinz_test_' + Date.now()), out = {};
            await db.put({ id: 'a', title: 'A', added: 1 }, new Blob(['hallo']));
            await db.put({ id: 'b', title: 'B', added: 2 }, new Blob(['welt']));
            out.list = (await db.list()).map(r => r.id).sort();
            out.file = await (await db.file('a')).text();
            out.upd = (await db.update('a', { frac: 0.5 })).frac;
            out.got = (await db.get('a')).title + (await db.get('a')).frac;
            out.none = [await db.get('zz'), await db.file('zz'), await db.update('zz', {})];
            await db.putText('a', 'k1', ['eins', 'zwei']);
            out.text = await db.getText('a'); out.noText = await db.getText('zz');
            await db.remove('a');
            out.textGone = await db.getText('a');
            out.after = [(await db.list()).length, await db.file('a')];
            await db.clear();
            out.cleared = (await db.list()).length;
            const s = await Db.storage();
            out.storage = ['usage' in s, 'quota' in s, 'persisted' in s];
            db.close();
            return out;""")
        self.assertEqual(r["list"], ["a", "b"])
        self.assertEqual(r["file"], "hallo")
        self.assertEqual(r["upd"], 0.5)
        self.assertEqual(r["got"], "A0.5")
        self.assertEqual(r["none"], [None, None, None])
        self.assertEqual(r["text"], {"id": "a", "key": "k1", "chapters": ["eins", "zwei"]})
        self.assertIsNone(r["noText"]); self.assertIsNone(r["textGone"])
        self.assertEqual(r["after"], [1, None])
        self.assertEqual(r["cleared"], 0)
        self.assertEqual(r["storage"], [True, True, True])


LONG_MD = "# Langes Buch\n\n" + "\n\n".join("Absatz %d mit genug Text, damit die Leseansicht scrollen muss und der Fortschritt messbar wird." % i for i in range(120))


class DocHeinzUiTests(DocHeinzBase):
    def open(self, lang="en", theme="dk", height=803):
        ctx = self.browser.new_context(viewport={"width": 426, "height": height})
        page = ctx.new_page()
        page.errors, page.external = [], []
        page.on("pageerror", lambda e: page.errors.append(str(e)))
        page.on("console", lambda m: page.errors.append(m.text) if m.type == "error" else None)
        page.on("request", lambda r: page.external.append(r.url) if not r.url.startswith(self.srv.base) and not r.url.startswith("data:") and not r.url.startswith("blob:") else None)
        page.add_init_script("window.__x = 0; if(!localStorage.getItem('heinz_settings'))localStorage.setItem('heinz_settings', JSON.stringify({lang:'%s', theme:'%s'}));" % (lang, theme))
        page.goto(self.srv.base + URL)
        page.wait_for_selector("html[data-dh=ready]")
        self.addCleanup(ctx.close)
        return page

    def add(self, page, *files):
        page.set_input_files("#file", files=[{"name": n, "mimeType": m, "buffer": b} for n, m, b in files])

    def epub(self, **kw):
        return make_epub(**kw)

    def rows(self, p):
        return p.locator("#list .dh-book").count()

    def test_loads_without_errors_or_outside_requests_in_both_languages(self):
        for lang, add, empty in (("en", "Add books", "Your library is empty"), ("de", "Bücher hinzufügen", "Deine Bibliothek ist leer")):
            p = self.open(lang=lang)
            self.assertEqual(p.errors, [])
            self.assertEqual(p.external, [])
            self.assertEqual(p.locator("#b-add span").inner_text().strip(), add)
            self.assertIn(empty, p.locator("#empty").inner_text())
            self.assertEqual(p.evaluate("() => document.documentElement.scrollWidth <= innerWidth"), True)

    def test_tool_json_is_valid(self):
        with open(os.path.join(ROOT, "tools", "docheinz", "tool.json"), encoding="utf-8") as fh:
            d = json.load(fh)
        self.assertEqual((d["id"], d["entry"], d["status"], d["area"]), ("docheinz", "tools/docheinz/index.html", "beta", "tools"))
        for k in ("name", "desc"):
            self.assertTrue(d[k]["en"] and d[k]["de"])
        self.assertTrue(os.path.isfile(os.path.join(ROOT, d["entry"])))

    def test_add_books_list_search_sort_and_reload(self):
        p = self.open()
        self.add(p, ("zeta.epub", "application/epub+zip", self.epub(title="Zeta Buch", author="Anna")), ("alpha.md", "text/markdown", b"# Alpha\n\nText."), ("notizen.txt", "text/plain", "Nur ein Absatz.".encode()))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 3")
        self.assertIn("3 added", p.locator("#msg").inner_text())
        self.assertEqual(p.locator("#count").inner_text(), "3 books")
        p.select_option("#sort", "title")
        titles = lambda: p.locator("#list .dh-tx b").all_inner_texts()
        self.assertEqual(titles(), ["Alpha", "notizen", "Zeta Buch"])
        self.assertIn("Anna", p.locator("#list .dh-book", has_text="Zeta Buch").inner_text())
        p.fill("#q", "anna")
        self.assertEqual(titles(), ["Zeta Buch"])
        p.fill("#q", "gibtsnicht")
        self.assertEqual(self.rows(p), 0)
        self.assertIn("No book matches", p.locator("#empty").inner_text())
        p.fill("#q", "")
        p.reload()
        p.wait_for_selector("html[data-dh=ready]")
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 3")
        self.assertEqual(p.input_value("#sort"), "title")
        self.assertEqual(p.errors, [])
        self.assertEqual(p.external, [])

    def test_duplicate_and_refused_formats_give_clear_messages(self):
        p = self.open()
        self.add(p, ("a.txt", "text/plain", b"Hallo Welt."))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        self.add(p, ("a.txt", "text/plain", b"Hallo Welt."), ("x.pdf", "application/pdf", b"%PDF-1.4"), ("y.mobi", "application/x-mobipocket-ebook", b"BOOKMOBI"), ("e.epub", "application/epub+zip", self.epub(drm=True)), ("leer.txt", "text/plain", b"   "), ("kaputt.epub", "application/epub+zip", b"kein zip"))
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('kaputt.epub')")
        m = p.locator("#msg").inner_text()
        for part in ("“a.txt” is already in the library", "format .mobi is not supported", "copy-protected", "no readable text", "could not be read"):
            self.assertIn(part, m)
        self.assertEqual(self.rows(p), 1)
        self.assertEqual(p.locator("#msg.err").count(), 1)

    def test_german_messages(self):
        p = self.open(lang="de")
        self.add(p, ("x.pdf", "application/pdf", b"%PDF-1.4"))
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('ließ sich nicht lesen')")
        self.assertIn("ließ sich nicht lesen", p.locator("#msg").inner_text())

    def test_pdf_reflow_and_scan_notice(self):
        import pathlib
        fx = pathlib.Path(__file__).parent / "docheinz" / "fixtures"
        p = self.open()
        self.start_book(p, "text.pdf", "application/pdf", (fx / "text.pdf").read_bytes(), cover=True)
        txt = p.evaluate("() => document.getElementById('r-page').textContent")
        self.assertIn("Kapitel 1", txt)
        self.assertEqual(p.evaluate("() => document.querySelectorAll('#r-page h2, #r-page h3, #r-page h1').length > 0"), True)
        p2 = self.open()
        self.add(p2, ("scan.pdf", "application/pdf", (fx / "scan.pdf").read_bytes()))
        p2.wait_for_function("() => document.getElementById('msg').textContent.includes('text layer')")
        self.assertEqual(self.rows(p2), 1)
        self.assertIn("0 / 1", p2.locator("#list .dh-pct").inner_text())

    def test_pdf_scan_ocr_runs_locally_and_reads(self):
        import pathlib
        fx = pathlib.Path(__file__).parent / "docheinz" / "fixtures"
        p = self.open(lang="de")
        self.add(p, ("scan_text.pdf", "application/pdf", (fx / "scan_text.pdf").read_bytes()))
        p.wait_for_selector("#list .dh-ocr")
        p.click("#list .dh-ocr")
        self.assertEqual(p.locator("#o-lang").input_value(), "deu")
        p.click("#o-go")
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('lesbar')", timeout=90000)
        self.assertEqual(p.locator("#list .dh-ocr").count(), 0)
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
        self.tap(p, "next")
        p.wait_for_function("() => document.getElementById('reader').dataset.cover === '0'")
        p.wait_for_function("() => document.getElementById('r-page').textContent.includes('Energieeffizienzklasse')", timeout=20000)
        self.assertEqual(p.external, [])
        self.assertEqual(p.errors, [])

    def test_pdf_original_view_zoom_and_back(self):
        import pathlib
        fx = pathlib.Path(__file__).parent / "docheinz" / "fixtures"
        p = self.open()
        self.start_book(p, "text.pdf", "application/pdf", (fx / "text.pdf").read_bytes(), cover=True)
        p.click("#r-page", position={"x": 213, "y": 20}); p.wait_for_selector("#r-ov:not([hidden])")
        self.assertEqual(p.locator("#r-orig-b").is_hidden(), False)
        p.click("#r-orig-b")
        p.wait_for_selector("#r-orig:not([hidden])")
        p.wait_for_function("() => document.querySelectorAll('#o-pages .dh-opg.ok').length >= 1")
        self.assertIn("/ 3", p.locator("#o-pos").inner_text())
        w1 = p.evaluate("() => document.querySelector('#o-pages .dh-opg').getBoundingClientRect().width")
        p.click("#o-in")
        w2 = p.evaluate("() => document.querySelector('#o-pages .dh-opg').getBoundingClientRect().width")
        self.assertGreater(w2, w1 * 1.3)
        p.wait_for_function("() => document.querySelector('#o-pages .dh-opg.ok canvas').width > 500")
        self.assertIn("%", p.locator("#o-pos").inner_text())
        p.click("#o-out"); p.click("#o-out")
        w3 = p.evaluate("() => document.querySelector('#o-pages .dh-opg').getBoundingClientRect().width")
        self.assertAlmostEqual(w3, w1, delta=2)
        p.evaluate("() => { const s = document.getElementById('o-scroll'); s.scrollTop = document.querySelectorAll('#o-pages .dh-opg')[2].offsetTop; }")
        p.wait_for_function("() => document.getElementById('o-pos').textContent.startsWith('3 /')")
        p.click("#o-close")
        p.wait_for_selector("#r-orig", state="hidden")
        txt = p.evaluate("() => document.getElementById('r-page').textContent")
        self.assertIn("Dies ist der erste Absatz", txt)
        self.assertEqual(p.errors, [])

    def test_photos_become_one_book_and_are_recognized(self):
        import pathlib
        fx = pathlib.Path(__file__).parent / "docheinz" / "fixtures"
        p = self.open(lang="de")
        self.add(p, ("foto1.jpg", "image/jpeg", (fx / "foto1.jpg").read_bytes()), ("foto2.jpg", "image/jpeg", (fx / "foto2.jpg").read_bytes()))
        p.wait_for_selector("#o-go")                           # Formular der Texterkennung öffnet sich von selbst
        self.assertEqual(self.rows(p), 1)
        self.assertIn("Fotos", p.locator("#list .dh-xh").inner_text())
        p.click("#o-go")
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('lesbar')", timeout=90000)
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
        self.tap(p, "next")
        p.wait_for_function("() => document.getElementById('reader').dataset.cover === '0'")
        txt = p.evaluate("() => document.getElementById('r-body').textContent")
        self.assertIn("Heißluftfritteuse", txt)                # Auswahlreihenfolge bleibt erhalten
        self.assertLess(txt.index("Heißluftfritteuse"), txt.index("Sicherheitshinweisen"))
        self.assertEqual(p.external, [])
        self.assertEqual(p.errors, [])

    def test_photo_book_gets_more_pages_one_by_one(self):
        import pathlib
        fx = pathlib.Path(__file__).parent / "docheinz" / "fixtures"
        p = self.open(lang="de")
        self.add(p, ("foto1.jpg", "image/jpeg", (fx / "foto1.jpg").read_bytes()))
        p.wait_for_selector("#o-go"); p.click("#o-go")
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('lesbar')", timeout=90000)
        self.assertIn("1", p.locator("#list").inner_text())
        p.click("#list [data-act=padd]")
        p.wait_for_selector("#p-cam")
        with p.expect_file_chooser() as fc:
            p.click("#p-cam")
        fc.value.set_files([{"name": "foto2.jpg", "mimeType": "image/jpeg", "buffer": (fx / "foto2.jpg").read_bytes()}])
        p.wait_for_selector("#o-go")                           # Formular der Texterkennung für die neue Seite
        self.assertIn("1 von 2", p.locator("#list .help").first.inner_text())
        p.click("#o-go")
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('lesbar')", timeout=90000)
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
        self.tap(p, "next")
        p.wait_for_function("() => document.getElementById('reader').dataset.cover === '0'")
        txt = p.evaluate("() => document.getElementById('r-body').textContent")
        self.assertIn("Heißluftfritteuse", txt)
        self.assertIn("Sicherheitshinweisen", txt)
        self.assertEqual(p.errors, [])

    def test_cloud_recognition_only_with_online_and_key_and_sends_page_photos(self):
        import base64, pathlib
        fx = pathlib.Path(__file__).parent / "docheinz" / "fixtures"
        # 1) ohne „Online erlauben“: Hinweis statt Knopf, nichts verlässt das Gerät
        p = self.open(lang="de")
        self.add(p, ("foto1.jpg", "image/jpeg", (fx / "foto1.jpg").read_bytes()))
        p.wait_for_selector("#o-go")
        self.assertEqual(p.locator("#c-ask").count(), 0)
        self.assertIn("Online erlauben", p.locator(".dh-cloud").inner_text())
        self.assertEqual(p.external, [])
        # 2) mit Online + Schlüssel: Bestätigung, dann geht nur das Seitenfoto an Gemini
        p.evaluate("() => { localStorage.setItem('heinz_online', 'true'); localStorage.setItem('heinz_keys', JSON.stringify({ google: 'KEY' })); }")
        p.reload(); p.wait_for_selector("html[data-dh=ready]")
        calls = []
        def gem(route):
            url = route.request.url; cors = {"access-control-allow-origin": "*"}
            if route.request.method == "OPTIONS":
                return route.fulfill(status=204, headers={**cors, "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
            if ":streamGenerateContent" in url:
                calls.append(json.loads(route.request.post_data))
                ev = "data: " + json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": "Erste Zeile des Buchs.\n\nZweiter Absatz."}]}, "finishReason": "STOP"}]}) + "\r\n\r\n"
                return route.fulfill(status=200, content_type="text/event-stream", headers=cors, body=ev)
            return route.fulfill(status=200, content_type="application/json", headers=cors, body=json.dumps({"models": [{"name": "models/gemini-3.8-flash", "supportedGenerationMethods": ["generateContent"]}]}))
        p.route("https://generativelanguage.googleapis.com/v1beta/**", gem)
        p.click("#list [data-act=ocr]") if p.locator("#o-go").count() == 0 else None
        p.wait_for_selector("#c-ask")
        p.click("#c-ask")
        p.wait_for_selector("#c-go")
        self.assertIn("verlassen dieses Gerät", p.locator(".dh-cloud").inner_text())
        p.wait_for_function("() => document.getElementById('c-model').value === 'models/gemini-3.8-flash'")
        p.click("#c-go")
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('lesbar')", timeout=60000)
        self.assertEqual(len(calls), 1)
        parts = calls[0]["contents"][-1]["parts"]
        img = [x for x in parts if "inlineData" in x][0]["inlineData"]
        self.assertEqual(img["mimeType"], "image/jpeg")
        self.assertEqual(base64.b64decode(img["data"])[:2], b"\xff\xd8")
        self.assertEqual(self.rows(p), 1)
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
        self.tap(p, "next")
        p.wait_for_function("() => document.getElementById('reader').dataset.cover === '0'")
        self.assertIn("Zweiter Absatz", p.evaluate("() => document.getElementById('r-body').textContent"))
        self.assertEqual(p.errors, [])

    def test_dictionary_import_and_lookup_with_base_form(self):
        p = self.open(lang="de")
        self.add(p, ("w.md", "text/markdown", "# Wort\n\nDie Häuser standen am Fluss.".encode()))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        p.click("#b-dict")
        p.wait_for_selector("#dict:not([hidden])")
        p.wait_for_function("() => /Noch kein Wörterbuch/.test(document.getElementById('dict').innerText)")       # Liste wird asynchron gefüllt
        tsv = "# Beispiel\nHaus\tGebäude zum Wohnen\nFluss\tgroßes fließendes Gewässer\nHaus\tauch: Familie\n".encode()
        p.set_input_files("#file-dict", {"name": "klein.tsv", "mimeType": "text/tab-separated-values", "buffer": tsv})
        p.wait_for_function("() => /3 Einträge/.test(document.getElementById('dict').innerText)")
        self.assertIn("klein", p.inner_text("#dict"))
        p.click("#dict [data-dc=close]")
        p.locator("#list .dh-book").first.click()
        p.wait_for_selector("#reader:not([hidden])")
        self.select_text(p, "Häuser")                                           # Beugung: findet „Haus“ über die Grundform
        p.click("#r-sel [data-sel=dict]")
        p.wait_for_function("() => /Gebäude zum Wohnen/.test(document.getElementById('rs-body').innerText)")
        p.click("#rs-body button:has-text('Mehr anzeigen')")                      # zweiter Eintrag des Wörterbuchs erst nach „Mehr anzeigen“
        p.wait_for_function("() => /auch: Familie/.test(document.getElementById('rs-body').innerText)")
        txt = p.inner_text("#rs-body")
        self.assertIn("Gebäude zum Wohnen", txt); self.assertIn("auch: Familie", txt)
        self.assertEqual(p.external, [])
        p.click("#rs-close") if p.locator("#rs-close").count() else None
        self.select_text(p, "Fluss")
        p.click("#r-sel [data-sel=dict]")
        p.wait_for_function("() => /Gewässer/.test(document.getElementById('rs-body').innerText)")
        self.assertEqual(p.errors, [])

    def test_dictionary_delete_removes_large_dictionary_in_chunks(self):
        p = self.open(lang="de")
        lines = "".join(f"wort{i}\terklaerung {i}\n" for i in range(45000)).encode()
        p.click("#b-dict"); p.wait_for_selector("#dict:not([hidden])")
        p.wait_for_function("() => /Noch kein Wörterbuch/.test(document.getElementById('dict').innerText)")
        p.set_input_files("#file-dict", {"name": "gross.tsv", "mimeType": "text/tab-separated-values", "buffer": lines})
        p.wait_for_function("() => /45000 Einträge/.test(document.getElementById('dict').innerText)", timeout=60000)
        p.click("#dict [data-dc=del]")
        p.wait_for_function("() => /Noch kein Wörterbuch/.test(document.getElementById('dict').innerText)", timeout=60000)
        n = p.evaluate("""() => new Promise(r => { const q = indexedDB.open('docheinz'); q.onsuccess = () => { const c = q.result.transaction('dict').objectStore('dict').count(); c.onsuccess = () => r(c.result); }; })""")
        self.assertEqual(n, 0)
        self.assertEqual(p.errors, [])

    def test_dictionary_sheet_is_compact_and_expands(self):
        p = self.open(lang="de")
        self.add(p, ("w.md", "text/markdown", "# Wort\n\nDie Nachtigall sang.".encode()))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        p.click("#b-dict"); p.wait_for_selector("#dict:not([hidden])")
        p.wait_for_function("() => /Noch kein Wörterbuch/.test(document.getElementById('dict').innerText)")
        import json
        rows = [{"word": "Nachtigall", "lang_code": "de", "pos": "noun", "senses": [{"glosses": ["Singvogel"]}]},
                {"word": "Nachtigall", "lang_code": "de", "pos": "name", "senses": [{"glosses": ["Familienname"]}]}]
        buf = "\n".join(json.dumps(r) for r in rows).encode()
        p.set_input_files("#file-dict", {"name": "n.jsonl", "mimeType": "application/json", "buffer": buf})
        p.wait_for_function("() => /2 Einträge/.test(document.getElementById('dict').innerText)")
        p.click("#dict [data-dc=close]")
        p.locator("#list .dh-book").first.click(); p.wait_for_selector("#reader:not([hidden])")
        self.select_text(p, "Nachtigall")
        p.click("#r-sel [data-sel=dict]")
        p.wait_for_function("() => /Singvogel/.test(document.getElementById('rs-body').innerText)")
        self.assertNotIn("Familienname", p.inner_text("#rs-body"))               # zweiter Eintrag zunächst verborgen
        p.click("#rs-body button:has-text('Mehr anzeigen')")
        self.assertIn("Familienname", p.inner_text("#rs-body"))
        self.assertEqual(p.errors, [])

    def test_dictionary_reads_gzip_jsonl_and_keeps_only_german_and_english(self):
        import gzip, json
        p = self.open(lang="de")
        rows = [{"word": "Hund", "lang_code": "de", "pos": "noun", "senses": [{"glosses": ["Haustier, das bellt"]}]},
                {"word": "chien", "lang_code": "fr", "pos": "noun", "senses": [{"glosses": ["Hund"]}]},
                {"word": "dog", "lang_code": "en", "pos": "noun", "senses": [{"glosses": ["Hund (englisch)"]}]},
                {"word": "leer", "lang_code": "de", "senses": []}]
        data = gzip.compress("\n".join(json.dumps(r) for r in rows).encode())
        p.click("#b-dict")
        p.set_input_files("#file-dict", {"name": "de-extract.jsonl.gz", "mimeType": "application/gzip", "buffer": data})
        p.wait_for_function("() => /2 Einträge/.test(document.getElementById('dict').innerText)")
        self.assertIn("Deutsches Wörterbuch (Wiktionary)", p.inner_text("#dict"))        # lesbarer Name statt Dateiname
        p.click("#dict [data-dc=ren]")
        p.fill("#dict input[type=text]", "Mein Deutsch")
        p.click("#dict [data-dc=rok]")
        p.wait_for_function("() => /Mein Deutsch/.test(document.getElementById('dict').innerText)")
        self.assertEqual(p.errors, [])

    def test_dictionary_shows_base_form_entry_for_inflected_words(self):
        import json
        p = self.open(lang="de")
        self.add(p, ("d.md", "text/markdown", "# D\n\nDie dummen Leute lachten.".encode()))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        rows = [{"word": "dumm", "lang_code": "de", "pos": "adj", "senses": [{"glosses": ["nicht klug"]}]},
                {"word": "dummen", "lang_code": "de", "pos": "adj", "senses": [{"glosses": ["Dativ Plural des Adjektivs dumm"]}, {"glosses": ["Akkusativ Singular Maskulinum des Adjektivs dumm"]}]}]
        p.click("#b-dict")
        p.set_input_files("#file-dict", {"name": "t.jsonl", "mimeType": "application/json", "buffer": "\n".join(json.dumps(r) for r in rows).encode()})
        p.wait_for_function("() => /2 Einträge/.test(document.getElementById('dict').innerText)")
        p.click("#dict [data-dc=close]")
        p.locator("#list .dh-book").first.click()
        p.wait_for_selector("#reader:not([hidden])")
        self.select_text(p, "dummen")
        p.click("#r-sel [data-sel=dict]")
        p.wait_for_function("() => /nicht klug/.test(document.getElementById('rs-body').innerText)")
        txt = p.inner_text("#rs-body")
        self.assertIn("Form von „dumm“", txt)
        self.assertNotIn("Dativ Plural", txt)                                   # keine Formenbeschreibung statt Bedeutung
        self.assertEqual(p.errors, [])

    def test_wikipedia_short_text_is_off_by_default_needs_online_and_is_cached(self):
        import json
        p = self.open(lang="de")
        self.add(p, ("w.md", "text/markdown", "# W\n\nOscar Wilde schrieb Bücher.".encode()))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        calls = []
        def wiki(route):
            calls.append(route.request.url)
            body = {"query": {"pages": [{"title": "Oscar Wilde", "extract": "Oscar Wilde war ein irischer Schriftsteller."}]}}
            route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps(body))
        p.route("https://de.wikipedia.org/**", wiki)
        # ohne „Online erlauben“: Schalter gesperrt, Hinweis, keine Anfrage
        p.click("#b-set")
        self.assertTrue(p.locator("#sw-wiki").is_disabled())
        self.assertIn("Online erlauben", p.inner_text("#wiki-hint"))
        # mit „Online erlauben“ aber Wikipedia aus (Standard): keine Anfrage
        p.evaluate("() => localStorage.setItem('heinz_online', 'true')")
        p.reload(); p.wait_for_selector("html[data-dh=ready]")
        p.locator("#list .dh-book").first.click(); p.wait_for_selector("#reader:not([hidden])")
        self.select_text(p, "Wilde"); p.click("#r-sel [data-sel=dict]")
        p.wait_for_function("() => /Wörterbuch/.test(document.getElementById('rs-body').innerText)")
        self.assertEqual(calls, [])
        # Schalter an: Kurztext erscheint, nur das Wort ging nach außen
        p.evaluate("() => document.getElementById('r-close').click()")
        p.wait_for_selector("#reader", state="hidden")
        p.click("#b-set"); p.check("#sw-wiki")
        p.locator("#list .dh-book").first.click(); p.wait_for_selector("#reader:not([hidden])")
        self.select_text(p, "Wilde"); p.click("#r-sel [data-sel=dict]")
        p.wait_for_function("() => /irischer Schriftsteller/.test(document.getElementById('rs-body').innerText)")
        self.assertEqual(len(calls), 1)
        self.assertIn("gsrsearch=Wilde", calls[0])
        self.assertNotIn("Bücher", calls[0])
        # zweites Mal aus dem Zwischenspeicher
        p.click("#rs-close") if p.locator("#rs-close").count() else None
        self.select_text(p, "Wilde"); p.click("#r-sel [data-sel=dict]")
        p.wait_for_function("() => /auf dem Gerät gemerkt/.test(document.getElementById('rs-body').innerText)")
        self.assertEqual(len(calls), 1)
        self.assertEqual(p.errors, [])

    def test_full_text_search_over_all_books_jumps_to_the_hit(self):
        p = self.open(lang="de")
        self.add(p, ("eins.md", "text/markdown", "# Buch Eins\n\nDer Übermensch kommt zuerst. Später wieder der Übermensch.".encode()),
                 ("zwei.md", "text/markdown", "# Buch Zwei\n\nNur ein Satz ohne Treffer.".encode()),
                 ("drei.md", "text/markdown", "# Buch Drei\n\nEin einziger Übermensch steht hier, mitten im Satz.".encode()))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 3")
        self.assertTrue(p.locator("#ftbar").is_hidden())
        p.fill("#q", "übermensch")
        p.wait_for_selector("#ft-go:visible")
        p.click("#ft-go")
        p.wait_for_function("() => document.querySelectorAll('#ft .dh-fts').length === 3")
        heads = p.locator("#ft .dh-ftb").all_inner_texts()
        self.assertEqual(len(heads), 2)                                        # das Buch ohne Treffer fehlt
        self.assertIn("Buch Eins", heads[0]); self.assertIn("2 Treffer", heads[0])   # nach Trefferzahl sortiert
        self.assertIn("Buch Drei", heads[1]); self.assertIn("1 Treffer", heads[1])
        self.assertEqual(p.external, [])
        p.locator("#ft .dh-fts").nth(2).click()                                # Treffer in Buch Drei
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => CSS.highlights.get('dh-hit') && CSS.highlights.get('dh-hit').size === 1")
        self.assertEqual(p.evaluate("() => String(CSS.highlights.get('dh-hit').values().next().value)"), "Übermensch")
        self.assertIn("einziger", p.evaluate("() => document.getElementById('r-body').textContent"))
        self.assertEqual(p.errors, [])

    FAKE_TTS = """
        window.__said = []; window.__rate = [];
        const voices = [{ name: 'Online-Stimme', lang: 'de-DE', voiceURI: 'on', localService: false, default: false }, { name: 'Offline-Stimme', lang: 'de-DE', voiceURI: 'off', localService: true, default: false }];
        window.SpeechSynthesisUtterance = function (t) { this.text = t; };
        const fake = { speaking: false, cur: null, getVoices: () => voices, addEventListener() {}, cancel() { const c = this.cur; this.cur = null; if (c && c.onerror) setTimeout(() => c.onerror({ error: 'interrupted' }), 0); },
            speak(u) { window.__said.push(u.text); window.__rate.push([u.rate, u.voice && u.voice.voiceURI]); this.cur = u; setTimeout(() => { if (this.cur === u) { this.cur = null; u.onend && u.onend(); } }, window.__speed || 30); } };
        Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    """

    def test_read_aloud_goes_sentence_by_sentence_with_marking_pause_and_offline_voice(self):
        p = self.open(lang="de")
        p.add_init_script(self.FAKE_TTS)
        p.reload(); p.wait_for_selector("html[data-dh=ready]")
        self.start_book(p, "a.md", "text/markdown", "# Kapitel A\n\nDr. Müller kam an. Er ging nach Hause!\n\nZweiter Absatz ohne Punkt\n\n# Kapitel B\n\nNoch ein Satz im zweiten Kapitel.".encode())
        self.tap(p, "top"); p.click("#r-set-b")
        p.click("#r-set [data-tts]")
        p.wait_for_selector("#r-tts:not([hidden])")
        p.wait_for_function("() => window.__said.length >= 4", timeout=8000)
        said = p.evaluate("() => window.__said")
        self.assertEqual(said[:3], ["Kapitel A", "Dr. Müller kam an.", "Er ging nach Hause!"])      # Abkürzung trennt nicht, Überschrift eigener Satz
        self.assertEqual(p.evaluate("() => window.__rate[0]"), [1, "off"])                          # lokale (Offline-)Stimme bevorzugt
        self.assertTrue(p.evaluate("() => CSS.highlights.has('dh-read')"))                          # gelesener Satz ist markiert
        p.wait_for_function("() => window.__said.includes('Noch ein Satz im zweiten Kapitel.')", timeout=8000)   # Kapitelwechsel
        p.wait_for_selector("#r-tts", state="hidden", timeout=8000)                                 # am Ende der Lektüre stoppt es von selbst
        self.assertEqual(p.evaluate("() => CSS.highlights.has('dh-read')"), False)
        # Pause und Fortsetzen, Geschwindigkeit
        p.evaluate("() => { window.__speed = 3000; }")                                             # langsam: Zeit für Pause und Tempo
        self.tap(p, "top"); p.click("#r-set-b"); p.click("#r-set [data-tts]")
        p.wait_for_selector("#r-tts:not([hidden])")
        p.select_option("#tts-rate", "1.4")
        p.click("#tts-play")
        p.wait_for_selector("#tts-voice-row:not([hidden])")
        n = p.evaluate("() => window.__said.length"); p.wait_for_timeout(300)
        self.assertEqual(p.evaluate("() => window.__said.length"), n)                               # pausiert: nichts wird mehr gesprochen
        p.click("#tts-play")
        p.wait_for_function("(n) => window.__said.length > n", arg=n)
        self.assertEqual(p.evaluate("() => window.__rate[window.__rate.length - 1][0]"), 1.4)
        p.click("#tts-stop")
        p.wait_for_selector("#r-tts", state="hidden")
        self.assertEqual(p.errors, [])
        self.assertEqual(p.external, [])

    def test_read_aloud_turns_the_pages_along_and_manual_turn_continues_there(self):
        p = self.open(lang="en")
        p.add_init_script(self.FAKE_TTS)
        p.reload(); p.wait_for_selector("html[data-dh=ready]")
        self.start_book(p, "l.md", "text/markdown", LONG_MD.encode())
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 3")
        self.tap(p, "top"); p.click("#r-set-b"); p.click("#r-set [data-tts]")
        p.wait_for_function("() => +document.getElementById('reader').dataset.page >= 3", timeout=20000)   # Seite blättert mit
        self.assertTrue(p.locator("#r-tts").is_visible())
        n = p.evaluate("() => +document.getElementById('reader').dataset.page")
        self.tap(p, "next")
        self.assertTrue(p.locator("#r-tts").is_visible())                                           # von Hand blättern: Vorlesen läuft weiter
        p.wait_for_function("n => +document.getElementById('reader').dataset.page > n", arg=n)
        p.click("#tts-play")                                                                        # Pause: Stimmenwahl erscheint
        self.assertTrue(p.locator("#tts-voice").is_visible())
        self.assertEqual(p.errors, [])

    def test_always_fullscreen_is_a_setting_default_off(self):
        p = self.open(lang="en")
        p.evaluate("() => { window.__fs = 0; Element.prototype.requestFullscreen = function () { window.__fs++; return Promise.resolve(); }; }")
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nText.")
        self.tap(p, "top")
        self.assertEqual(p.evaluate("() => window.__fs"), 0)                                        # Standard: kein Vollbild
        p.evaluate("() => document.getElementById('r-close').click()")
        p.wait_for_selector("#reader", state="hidden")
        p.click("#b-set"); p.check("#sw-full")                                                      # Einstellung auf der Startseite
        self.assertEqual(p.evaluate("() => localStorage.getItem('heinz_docheinz_full')"), "1")
        p.locator("#list .dh-book").first.click()
        p.wait_for_selector("#reader:not([hidden])")
        self.assertGreaterEqual(p.evaluate("() => window.__fs"), 1)
        self.tap(p, "top")
        p.evaluate("() => document.getElementById('r-fs').click()")                      # Knopf oben schaltet auch den Haken um
        self.assertEqual(p.evaluate("() => localStorage.getItem('heinz_docheinz_full')"), "0")
        p.evaluate("() => document.getElementById('r-fs').click()")
        self.assertEqual(p.evaluate("() => localStorage.getItem('heinz_docheinz_full')"), "1")

    def test_camera_takes_several_pages_in_one_go(self):
        b = self.pw.chromium.launch(args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"])
        self.addCleanup(b.close)
        ctx = b.new_context(viewport={"width": 426, "height": 803}, permissions=["camera"])
        p = ctx.new_page()
        p.errors = []
        p.on("pageerror", lambda e: p.errors.append(str(e)))
        p.add_init_script("if(!localStorage.getItem('heinz_settings'))localStorage.setItem('heinz_settings', JSON.stringify({lang:'de', theme:'dk'}));")
        p.goto(self.srv.base + URL)
        p.wait_for_selector("html[data-dh=ready]")
        p.wait_for_selector("#b-cam:not([hidden])")
        p.click("#b-cam")
        p.wait_for_selector("#cam:not([hidden])")
        self.assertTrue(p.locator("#cam-g").is_visible())                       # Rahmen als Hilfe
        self.assertTrue(p.locator("#cam-l").is_hidden())                        # ohne Sensorwert kein Ring
        tilt = lambda be, ga: p.evaluate("([b, g]) => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: b, gamma: g }))", [be, ga])
        tilt(1.5, -2)
        p.wait_for_selector("#cam-l.ok")                                        # parallel: grün
        tilt(20, 0)
        p.wait_for_selector("#cam-l:not(.ok)")                                  # schräg: nicht grün
        self.assertIn("translate(0px, 18px)", p.evaluate("() => document.getElementById('cam-ld').style.transform"))
        p.wait_for_selector("#cam:not([hidden])")
        p.wait_for_function("() => document.getElementById('cam-v').videoWidth > 0")
        def shoot(n):                                           # Auslöser und warten, bis die Zahl der Aufnahmen stimmt
            for _ in range(5):                                  # ein Druck während der laufenden Aufnahme zählt nicht: erneut drücken
                p.click("#cam-s")
                try:
                    p.wait_for_function("(n) => document.getElementById('cam-n').textContent.startsWith(n + ' ')", arg=n, timeout=4000); return
                except Exception:
                    pass
            self.fail("Aufnahme %d kam nicht an" % n)
        for n in (1, 2, 3):
            shoot(n)
        self.assertIn("3 Seite", p.locator("#cam-n").inner_text())
        p.click("#cam-u")
        self.assertIn("2 Seite", p.locator("#cam-n").inner_text())
        dims = lambda: p.evaluate("() => { const i = [...document.querySelectorAll('#cam-t img')].pop(); return [i.naturalWidth, i.naturalHeight]; }")
        vw, vh = p.evaluate("() => [document.getElementById('cam-v').videoWidth, document.getElementById('cam-v').videoHeight]")
        d = dims()
        if vw != vh:                                           # Handy hochkant: Rohbild quer wird zu Hochformat gedreht (wie die Kamera-App)
            self.assertEqual(d[0] < d[1], vw > vh)
        p.click("#cam-r"); shoot(3)     # ↻ dreht zusätzlich
        d2 = dims()
        if vw != vh:
            self.assertEqual(d2[0] > d2[1], vw > vh)
        p.click("#cam-u")
        p.click("#cam-d")
        p.wait_for_selector("#o-go")
        self.assertEqual(self.rows(p), 1)
        self.assertIn("0 von 2", p.locator("#list .help").first.inner_text())
        self.assertEqual(p.locator("#cam").is_hidden(), True)
        self.assertEqual(p.errors, [])

    def test_delete_asks_first_and_removes_the_book(self):
        p = self.open()
        self.add(p, ("a.txt", "text/plain", b"Hallo."), ("b.txt", "text/plain", b"Welt."))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 2")
        p.click("#list .dh-book:has(.dh-tx b:text-is('a')) .dh-del")
        self.assertIn("Delete “a” from this device?", p.locator("#list .dh-book.ask").inner_text())
        p.click("#list .dh-book.ask button[data-act=no]")
        self.assertEqual(self.rows(p), 2)
        p.click("#list .dh-book:has(.dh-tx b:text-is('a')) .dh-del")
        p.click("#list .dh-book.ask button[data-act=yes]")
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        p.reload()
        p.wait_for_selector("html[data-dh=ready]")
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        self.assertEqual(p.locator("#list .dh-tx b").inner_text(), "b")

    def start_book(self, p, name, mime, data, cover=False):
        self.add(p, (name, mime, data))
        p.wait_for_selector("#list .dh-open")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
        if not cover:
            self.tap(p, "next")                 # Titelseite überspringen
            p.wait_for_function("() => document.getElementById('reader').dataset.cover === '0'")

    def tap(self, p, where):
        w, h = 426, p.evaluate("() => innerHeight")
        x, y = {"next": (w * 0.9, h * 0.5), "prev": (w * 0.1, h * 0.5), "top": (w * 0.5, h * 0.05), "mid": (w * 0.5, h * 0.5)}[where]
        p.mouse.click(x, y)

    def pg(self, p):
        return p.evaluate("() => [+document.getElementById('reader').dataset.page, +document.getElementById('reader').dataset.pages, +document.getElementById('reader').dataset.ch]")

    def test_reader_opens_epub_cleanly_navigates_and_follows_links(self):
        p = self.open()
        self.start_book(p, "t.epub", "application/epub+zip", self.epub(chapters=3))
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Text von Kapitel 1')")
        self.assertIn("Part 1 of 3", p.locator("#r-pos").inner_text())
        self.assertEqual(p.evaluate("() => [document.querySelectorAll('#r-body script, #r-body style, #r-body [onclick], #r-body [style], #r-body a[href]').length, window.__x]"), [0, 0])
        p.click("#r-body a[data-go]")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Text von Kapitel 2')")
        self.tap(p, "next")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Text von Kapitel 3')")
        self.assertTrue(p.locator("#r-next").is_disabled())
        self.tap(p, "top")
        p.click("#r-toc-b")
        self.assertEqual(p.locator("#r-tocl button").count(), 3)
        p.click("#r-tocl button >> nth=0")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Text von Kapitel 1')")
        self.assertTrue(p.locator("#r-ov").is_hidden())
        self.assertEqual(p.errors, [])
        self.assertEqual(p.external, [])

    def test_pages_without_scrollbar_tap_zones_and_overlay(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        page, pages, _ = self.pg(p)
        self.assertEqual(page, 1)
        self.assertGreater(pages, 5)
        self.tap(p, "prev")                     # erste Seite: zurück führt zur Titelseite
        self.assertEqual(p.get_attribute("#reader", "data-cover"), "1")
        self.tap(p, "next")
        # keine Kopfzeile, keine Steuerung, keine Knöpfe im Lesemodus
        self.assertTrue(p.locator("#r-ov").is_hidden())
        self.assertTrue(p.locator("#r-next").is_hidden())
        self.assertTrue(p.evaluate("() => { const b = document.getElementById('r-body'), c = document.getElementById('r-clip'); return b.scrollHeight <= b.clientHeight + 1 && getComputedStyle(c).overflow === 'clip' && c.scrollLeft === 0; }"))
        self.assertTrue(p.evaluate("() => document.querySelector('.dh-header, header') === null || getComputedStyle(document.querySelector('#reader')).position === 'fixed'"))
        self.tap(p, "next"); self.tap(p, "next")
        self.assertEqual(self.pg(p)[0], 3)
        self.tap(p, "mid")
        self.assertEqual(self.pg(p)[0], 3)
        self.tap(p, "prev")
        self.assertEqual(self.pg(p)[0], 2)
        # Steuerung nur bei Tipp oben; Text verschiebt sich dabei nicht
        before = p.evaluate("() => document.getElementById('r-body').getBoundingClientRect().top")
        self.tap(p, "top")
        self.assertTrue(p.locator("#r-ov").is_visible())
        self.assertEqual(p.evaluate("() => document.getElementById('r-body').getBoundingClientRect().top"), before)
        self.tap(p, "next")                       # schließt nur die Steuerung
        self.assertTrue(p.locator("#r-ov").is_hidden())
        self.assertEqual(self.pg(p)[0], 2)
        # Tasten
        p.keyboard.press("ArrowRight")
        self.assertEqual(self.pg(p)[0], 3)
        # Fortschritt gespeichert und wiederhergestellt
        p.wait_for_timeout(700)
        p.click("#r-close") if p.locator("#r-close").is_visible() else (self.tap(p, "top"), p.click("#r-close"))
        p.wait_for_selector("#reader", state="hidden")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.page === '3'")

    def test_cover_page_and_library_preview(self):
        for mode in ("prop", "meta", "page"):
            p = self.open()
            self.start_book(p, "c.epub", "application/epub+zip", self.epub(chapters=2, cover=mode), cover=True)
            self.assertEqual(p.get_attribute("#reader", "data-cover"), "1", mode)
            self.assertTrue(p.locator("#r-cimg").is_visible(), mode)
            self.assertTrue(p.evaluate("() => document.getElementById('r-cimg').naturalWidth > 0"))
            self.assertTrue(p.locator("#r-ctitle").is_hidden())
            self.tap(p, "prev")
            self.assertEqual(p.get_attribute("#reader", "data-cover"), "1")
            self.tap(p, "next")
            self.assertEqual(p.get_attribute("#reader", "data-cover"), "0")
            p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Kapitel 1')")
            self.tap(p, "top"); p.click("#r-close")
            p.wait_for_selector("#reader", state="hidden")
            self.assertEqual(p.locator("#list .dh-cover.has img").count(), 1, mode)
            self.assertTrue(p.evaluate("() => document.querySelector('#list .dh-cover img').naturalWidth > 0"))
            self.assertEqual(p.errors, [])

    def test_title_page_without_cover_image(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# Mein Buch\n\nText.", cover=True)
        self.assertEqual(p.get_attribute("#reader", "data-cover"), "1")
        self.assertTrue(p.locator("#r-ctitle").is_visible())
        self.assertEqual(p.locator("#r-ct").inner_text(), "Mein Buch")

    def test_old_books_get_their_cover_afterwards(self):
        p = self.open()
        self.add(p, ("c.epub", "application/epub+zip", self.epub(chapters=1, cover="prop")))
        p.wait_for_selector("#list .dh-cover.has img")
        p.evaluate("async () => { const m = await import('/tools/docheinz/mod/db.js'); const d = await m.openDb(); const [b] = await d.list(); await d.update(b.id, { cover: null, coverTried: false }); d.close(); }")
        p.reload()
        p.wait_for_selector("html[data-dh=ready]")
        p.wait_for_selector("#list .dh-cover.has img")

    # ---------- Phase 2c: Markierungsleiste ----------
    def select_text(self, p, needle):
        """Eigene Auswahl wie am Handy: langer Druck auf das erste Wort, dann ans Ende der Fundstelle ziehen."""
        pts = p.evaluate("""(needle) => {
            const b = document.getElementById('r-body'), w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
            let n; while ((n = w.nextNode())) { const i = n.nodeValue.indexOf(needle); if (i >= 0) {
                const a = document.createRange(); a.setStart(n, i); a.setEnd(n, i + 1);
                const z = document.createRange(); z.setStart(n, i + needle.length - 1); z.setEnd(n, i + needle.length);
                const ra = a.getClientRects()[0], rz = z.getClientRects()[0];
                return [ra.left + 2, ra.top + ra.height / 2, rz.right - 2, rz.top + rz.height / 2]; } }
            throw new Error('not found');
        }""", needle)
        p.mouse.move(pts[0], pts[1]); p.mouse.down(); p.wait_for_timeout(560)
        p.mouse.move(pts[2], pts[3], steps=4); p.mouse.up()
        p.wait_for_selector("#r-sel:not([hidden])")

    def fake_ollama(self, p, chunks=("Das ist", " die Erklärung.")):
        calls = []
        def handle(route):
            url = route.request.url
            if url.endswith("/api/chat"):
                calls.append(json.loads(route.request.post_data))
                lines = [json.dumps({"message": {"role": "assistant", "content": c}, "done": False}) for c in chunks] + [json.dumps({"done": True, "eval_count": 5})]
                return route.fulfill(status=200, content_type="application/x-ndjson", body="\n".join(lines) + "\n")
            if url.endswith("/api/ps") or url.endswith("/api/tags"):
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"models": [{"name": "qwen:7b"}] if url.endswith("/api/tags") else []}))
            return route.fulfill(status=200, content_type="application/json", body="{}")
        p.route("**/localhost:11434/**", handle)
        p.route("**/127.0.0.1:9379/**", lambda r: r.fulfill(status=200, content_type="application/json", body='{"data": []}'))
        return calls

    def set_active(self, p, provider, model):
        p.evaluate("([a, b]) => localStorage.setItem('heinz_active', JSON.stringify({ provider: a, model: b }))", [provider, model])

    def test_selection_bar_appears_and_search_jumps_to_the_hit(self):
        p = self.open()
        self.start_book(p, "t.epub", "application/epub+zip", self.epub(chapters=3))
        self.assertTrue(p.locator("#r-sel").is_hidden())
        self.select_text(p, "Text von Kapitel 1")
        p.wait_for_selector("#r-sel:not([hidden])")
        self.assertEqual(p.locator("#r-sel button:visible").count(), 6)
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet:not([hidden]) .dh-hit")
        self.assertTrue(p.locator("#r-sel").is_hidden())
        p.click("#rs-close")
        self.select_text(p, "Kapitel")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet .dh-hit")
        n = p.locator("#rs-body .dh-hit").count()
        self.assertGreaterEqual(n, 3)
        p.locator("#rs-body .dh-hit").nth(n - 1).click()
        self.assertTrue(p.locator("#r-sheet").is_hidden())
        p.wait_for_function("() => +document.getElementById('reader').dataset.ch >= 3")
        self.assertTrue(p.evaluate("() => !window.Highlight || (CSS.highlights && CSS.highlights.has('dh-hit'))"))
        self.assertEqual(p.errors, [])

    def test_native_selection_is_off_and_long_press_selects_a_word_with_handles(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('r-body')).userSelect"), "none")
        self.select_text(p, "Langes")
        self.assertEqual(p.evaluate("() => getSelection().toString()"), "")
        self.assertTrue(p.locator("#r-h1").is_visible() and p.locator("#r-h2").is_visible())
        # Tippen hebt die Markierung nur auf, blättert nicht
        before = self.pg(p)[0]
        self.tap(p, "next")
        self.assertTrue(p.locator("#r-sel").is_hidden())
        self.assertEqual(self.pg(p)[0], before)

    def test_dragging_a_handle_extends_the_selection_without_moving_the_layout(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        self.select_text(p, "Langes")
        before = p.evaluate("() => document.getElementById('r-body').getBoundingClientRect().left")
        h = p.locator("#r-h2").bounding_box()
        p.mouse.move(h["x"] + h["width"] / 2, h["y"] + 14); p.mouse.down()
        p.mouse.move(380, h["y"] + 80 + 20, steps=6); p.mouse.move(60, h["y"] + 180 + 20, steps=6); p.mouse.up()
        p.wait_for_selector("#r-sel:not([hidden])")
        self.assertEqual(p.evaluate("() => document.getElementById('r-body').getBoundingClientRect().left"), before)
        p.click("#r-sel [data-sel=copy]")
        self.assertTrue(p.locator("#r-sel").is_hidden())

    def test_bar_floats_above_the_selection_or_below_when_there_is_no_room(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        self.select_text(p, "Langes")
        bar = p.evaluate("() => document.getElementById('r-sel').getBoundingClientRect().toJSON()")
        handle = p.evaluate("() => document.getElementById('r-h1').getBoundingClientRect().top")
        self.assertGreater(bar["top"], handle)          # Titel ganz oben: kein Platz darüber, Leiste unter den Griffen
        self.tap(p, "mid")
        self.select_text(p, "Absatz 3")
        bar = p.evaluate("() => document.getElementById('r-sel').getBoundingClientRect().toJSON()")
        handle = p.evaluate("() => document.getElementById('r-h1').getBoundingClientRect().top")
        self.assertLess(bar["bottom"], handle)          # genug Platz darüber: Leiste über der Markierung
        self.assertGreaterEqual(bar["left"], 0)
        self.assertLessEqual(bar["right"], 426)

    def test_search_without_hits_and_tap_closes_the_sheet(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# Titel\n\nEin kurzer Text.")
        self.select_text(p, "kurzer")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet:not([hidden])")
        self.assertEqual(p.locator("#rs-body .dh-hit").count(), 1)
        p.click("#rs-close")
        self.assertTrue(p.locator("#r-sheet").is_hidden())
        self.select_text(p, "Ein")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet:not([hidden])")
        self.tap(p, "mid")                         # Tipp auf den Text schließt nur das Blatt
        self.assertTrue(p.locator("#r-sheet").is_hidden())

    def test_explain_uses_the_active_local_model_and_sends_only_the_passage(self):
        p = self.open(lang="de")
        calls = self.fake_ollama(p)
        self.start_book(p, "a.md", "text/markdown", "# Ein Titel\n\nDer Übermensch ist der Sinn der Erde.".encode(), )
        self.set_active(p, "ollama", "test:1b")
        self.select_text(p, "Übermensch")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.click("#rs-go")
        p.wait_for_function("() => document.querySelector('#rs-body .dh-sout') && document.querySelector('#rs-body .dh-sout').textContent.includes('Erklärung')")
        self.assertEqual(len(calls), 1)
        body = calls[0]
        self.assertEqual(body["model"], "test:1b")
        self.assertEqual([m["role"] for m in body["messages"]], ["system", "user"])
        self.assertIn("Übermensch", body["messages"][1]["content"])
        self.assertNotIn("Sinn der Erde", body["messages"][1]["content"])
        self.assertIn("Deutsch", body["messages"][0]["content"])
        self.assertIn("test:1b", p.locator("#rs-sub").inner_text())
        self.assertTrue(p.locator("#rs-copy").is_visible())
        self.assertEqual([u for u in p.external if "localhost:11434" not in u], [])

    def test_chapter_summary_and_question_send_the_whole_chapter_text_only(self):
        p = self.open(lang="de")
        calls = self.fake_ollama(p)
        self.start_book(p, "a.md", "text/markdown", "# Ein Titel\n\nDer Übermensch ist der Sinn der Erde. Zweiter Satz des Kapitels.\n\nDritter Absatz mit Zarathustra.".encode())
        self.set_active(p, "ollama", "test:1b")
        self.tap(p, "top"); p.click("#r-set-b")
        p.click("#r-set [data-chap=sum]")
        p.wait_for_function("() => document.querySelector('#rs-body .dh-sout') && document.querySelector('#rs-body .dh-sout').textContent.length > 3")
        self.assertEqual(len(calls), 1)
        u = calls[0]["messages"][1]["content"]
        for part in ("Übermensch", "Zweiter Satz", "Zarathustra"):
            self.assertIn(part, u)
        self.assertTrue(p.locator("#r-set").is_hidden())
        self.assertEqual(p.locator("#rs-note").is_hidden(), True)                 # ohne Markierung keine Notiz
        p.click("#rs-close") if p.locator("#rs-close").count() else p.keyboard.press("Escape")
        p.wait_for_selector("#r-sheet", state="hidden")
        self.tap(p, "top"); p.click("#r-set-b")
        p.click("#r-set [data-chap=ask]")
        p.fill("#rs-q", "Wer ist gemeint?")
        p.click("#rs-go")
        p.wait_for_function("() => document.querySelector('#rs-body .dh-sout') && document.querySelector('#rs-body .dh-sout').textContent.length > 3")
        self.assertEqual(len(calls), 2)
        self.assertIn("Wer ist gemeint?", calls[1]["messages"][1]["content"])
        self.assertIn("Zarathustra", calls[1]["messages"][1]["content"])
        self.assertEqual([u for u in p.external if "localhost:11434" not in u], [])
        self.assertEqual(p.errors, [])

    def word_pt(self, p, needle):
        return p.evaluate("""(needle) => {
            const b = document.getElementById('r-body'), w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
            let n; while ((n = w.nextNode())) { const i = n.nodeValue.indexOf(needle); if (i >= 0) {
                const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + needle.length);
                const q = r.getClientRects()[0]; return [q.left + q.width / 2, q.top + q.height / 2]; } }
            throw new Error('not found');
        }""", needle)

    def hl(self, p, i):
        return p.evaluate("(i) => { const h = CSS.highlights.get('dh-m' + i); return h ? h.size : 0; }", i)

    def mark(self, p, needle):
        self.select_text(p, needle)
        p.click("#r-sel [data-sel=mark]")
        p.wait_for_selector("#r-mk:not([hidden])")

    def open_marks(self, p):
        self.tap(p, "top"); p.click("#r-toc-b"); p.click("#r-tabs [data-tab=marks]")

    def test_mark_color_note_and_persistence_after_reload(self):
        p = self.open(lang="de")
        self.start_book(p, "a.md", "text/markdown", "# Ein Titel\n\nDer Übermensch ist der Sinn der Erde. Weiter geht es mit Text.".encode())
        self.mark(p, "Übermensch")
        self.assertEqual(self.hl(p, 0), 1)
        self.assertEqual(p.locator("#r-sel").is_hidden(), True)
        p.click("#r-mk [data-c='2']")
        self.assertEqual([self.hl(p, 0), self.hl(p, 2)], [0, 1])
        p.click("#r-mk [data-mk=note]")
        p.fill("#rs-note-t", "Meine Notiz")
        p.click("#rs-note-go")
        self.assertTrue(p.locator("#r-sheet").is_hidden())
        p.wait_for_timeout(400)
        p.reload()
        p.wait_for_selector("#list .dh-open")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
        p.wait_for_function("() => { const h = CSS.highlights.get('dh-m2'); return h && h.size === 1; }")
        self.open_marks(p)
        self.assertEqual(p.locator("#r-markl .dh-mi").count(), 1)
        txt = p.locator("#r-markl .dh-mi").inner_text()
        self.assertIn("Übermensch", txt); self.assertIn("Meine Notiz", txt)
        self.assertEqual(p.errors, [])

    def test_tap_on_mark_opens_bar_and_delete_removes_it(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", ("# Titel\n\n" + "\n\n".join("Absatz %d" % i for i in range(8)) + "\n\nDer Übermensch ist der Sinn der Erde. Weiter geht es mit mehr Text für die Seite.").encode())
        self.mark(p, "Übermensch")
        self.tap(p, "mid")                                    # Tippen anderswo schließt nur die Leiste
        p.wait_for_selector("#r-mk", state="hidden")
        x, y = self.word_pt(p, "Übermensch")
        p.mouse.click(x, y)                                   # Tippen auf die Markierung öffnet die Leiste wieder
        p.wait_for_selector("#r-mk:not([hidden])")
        self.assertEqual(self.pg(p)[0], 1)                    # nicht geblättert
        p.click("#r-mk [data-mk=del]")
        self.assertEqual(self.hl(p, 0), 0)
        self.open_marks(p)
        self.assertEqual(p.locator("#r-markl .dh-mi").count(), 0)
        self.assertEqual(p.locator("#mk-export").is_disabled(), True)

    def test_marks_register_jumps_and_exports_markdown(self):
        p = self.open(lang="de")
        self.start_book(p, "a.md", "text/markdown", "# Ein Titel\n\nDer Übermensch ist der Sinn der Erde und das Ende aller Dinge.".encode())
        self.mark(p, "Übermensch")
        p.click("#r-mk [data-mk=note]"); p.fill("#rs-note-t", "Wichtig"); p.click("#rs-note-go")
        self.open_marks(p)
        with p.expect_download() as d:
            p.click("#mk-export")
        md = open(d.value.path(), encoding="utf-8").read()
        self.assertIn("> Übermensch", md); self.assertIn("**Notiz:** Wichtig", md); self.assertIn("1 Markierungen", md)
        self.assertTrue(d.value.suggested_filename.endswith("-notes.md"))
        p.click("#r-markl .dh-mq")
        p.wait_for_selector("#r-toc", state="hidden")
        self.assertGreaterEqual(p.evaluate("() => CSS.highlights.get('dh-hit') ? CSS.highlights.get('dh-hit').size : 0"), 1)

    def test_page_note_without_selection_filter_and_export(self):
        p = self.open(lang="de")
        paras = "\n\n".join(("Absatz %d mit etwas Text zum Lesen auf dieser Seite des Buchs und noch etwas mehr Text. " % i) * 3 for i in range(30))
        self.start_book(p, "a.md", "text/markdown", ("# Ein Titel\n\n" + paras).encode())
        self.open_marks(p)
        p.click("#mk-new")
        p.wait_for_selector("#rs-note-t")
        self.assertIn("Absatz 0", p.locator("#rs-body .dh-nq").inner_text())
        p.fill("#rs-note-t", "Das merke ich mir")
        p.click("#rs-note-go")
        self.assertTrue(p.locator("#r-sheet").is_hidden())
        self.mark(p, "Absatz 1")                              # eine zweite Markierung ohne Notiz
        self.tap(p, "mid")
        self.open_marks(p)
        self.assertEqual(p.locator("#r-markl .dh-mi").count(), 2)
        p.click("#mk-filter")
        self.assertEqual(p.locator("#r-markl .dh-mi").count(), 1)
        self.assertIn("Notiz zur Seite", p.locator("#r-markl .dh-mi").inner_text())
        self.assertIn("Das merke ich mir", p.locator("#r-markl .dh-mi").inner_text())
        with p.expect_download() as d:
            p.click("#mk-export")
        md = open(d.value.path(), encoding="utf-8").read()
        self.assertIn("**Notiz zur Seite:** Das merke ich mir", md)
        p.click("#r-close")                                   # Inhaltsfeld schließen (Pfeil), Steuerung zu, weiterblättern, dann über den Eintrag zurückspringen
        self.tap(p, "mid")
        self.tap(p, "next"); self.tap(p, "next")
        p.wait_for_timeout(200)
        before = self.pg(p)[0]
        self.open_marks(p)
        p.click("#mk-filter") if p.locator("#mk-filter.on").count() == 0 else None
        p.click("#r-markl .dh-mq >> nth=0")
        p.wait_for_selector("#r-toc", state="hidden")
        self.assertEqual(self.pg(p)[0], 1)
        self.assertGreater(before, 1)
        self.assertEqual(p.errors, [])

    def export_book(self, p, fmt, notes=False):
        p.click("#list .dh-exp")
        p.wait_for_selector("#x-fmt")
        self.choose(p, "#x-fmt", fmt)
        if p.locator("#x-notes").count():
            self.switch(p, "#x-notes", notes)
        with p.expect_download() as d:
            p.click("#x-go")
        return d.value

    def lib_book(self, p, chapters=2):
        self.add(p, ("b.epub", "application/epub+zip", make_epub(title="Ein Buch", author="Frau Test", chapters=chapters)))
        p.wait_for_selector("#list .dh-open")

    def test_export_epub_markdown_text_html_keep_title_author_and_chapters(self):
        p = self.open(lang="de")
        self.lib_book(p)
        e = self.export_book(p, "epub")
        self.assertTrue(e.suggested_filename.endswith(".epub"))
        z = zipfile.ZipFile(e.path())
        self.assertEqual(z.read("mimetype"), b"application/epub+zip")
        opf = z.read("OEBPS/content.opf").decode("utf-8")
        self.assertIn("Ein Buch", opf); self.assertIn("Frau Test", opf)
        allx = " ".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist() if n.endswith(".xhtml"))
        for fmt, ext in (("md", ".md"), ("txt", ".txt"), ("html", ".html")):
            e = self.export_book(p, fmt)
            self.assertTrue(e.suggested_filename.endswith(ext), e.suggested_filename)
            txt = open(e.path(), encoding="utf-8").read()
            self.assertIn("Ein Buch", txt); self.assertIn("Frau Test", txt)
        md = open(self.export_book(p, "md").path(), encoding="utf-8").read()
        self.assertTrue(md.startswith("# Ein Buch\n\n*Frau Test*"), md[:60])
        self.assertEqual([u for u in p.external], [])
        self.assertEqual(p.errors, [])

    def test_export_docx_and_pdf_print_frame(self):
        p = self.open(lang="en")
        self.lib_book(p)
        e = self.export_book(p, "docx")
        z = zipfile.ZipFile(e.path())
        self.assertIn("word/document.xml", z.namelist())
        self.assertIn("Ein Buch", z.read("word/document.xml").decode("utf-8"))
        p.click("#list .dh-exp"); p.wait_for_selector("#x-fmt")
        self.choose(p, "#x-fmt", "pdf")
        p.click("#x-go")
        p.wait_for_selector("iframe.dh-printframe", state="attached")
        self.assertIn("Ein Buch", p.evaluate("() => document.querySelector('iframe.dh-printframe').srcdoc"))
        self.assertIn("Save as PDF", p.locator("#msg").inner_text())
        self.assertEqual(p.errors, [])

    def test_export_can_append_marks_and_notes_and_cancel_leaves_the_list(self):
        p = self.open(lang="de")
        self.add(p, ("a.md", "text/markdown", "# Ein Titel\n\nDer Übermensch ist der Sinn der Erde. Weiter geht es mit Text.".encode()))
        p.wait_for_selector("#list .dh-open")
        p.click("#list .dh-exp")
        self.assertEqual(p.locator("#x-notes").count(), 0)          # ohne Markierungen kein Schalter
        p.click("#list [data-act=xno]")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
        self.tap(p, "next")
        p.wait_for_function("() => document.getElementById('reader').dataset.cover === '0'")
        self.mark(p, "Übermensch")
        p.click("#r-mk [data-mk=note]"); p.fill("#rs-note-t", "Merken"); p.click("#rs-note-go")
        p.wait_for_timeout(300)
        self.tap(p, "top"); p.click("#r-close")                      # Reader schließen
        p.wait_for_selector("#reader", state="hidden")
        p.wait_for_selector("#list .dh-exp")
        e = self.export_book(p, "md", notes=True)
        md = open(e.path(), encoding="utf-8").read()
        self.assertIn("# Markierungen und Notizen", md)
        self.assertIn("> Übermensch", md); self.assertIn("**Notiz:** Merken", md)
        e = self.export_book(p, "md", notes=False)
        self.assertNotIn("Markierungen und Notizen", open(e.path(), encoding="utf-8").read())
        self.assertEqual(p.errors, [])

    def test_ai_answer_can_be_saved_as_note(self):
        p = self.open(lang="de")
        self.fake_ollama(p)
        self.start_book(p, "a.md", "text/markdown", "# Ein Titel\n\nDer Übermensch ist der Sinn der Erde.".encode())
        self.set_active(p, "ollama", "test:1b")
        self.select_text(p, "Übermensch")
        p.click("#r-sel [data-sel=explain]")
        p.click("#rs-go")
        p.wait_for_function("() => document.querySelector('#rs-body .dh-sout') && document.querySelector('#rs-body .dh-sout').textContent.includes('Erklärung')")
        p.click("#rs-note")
        self.assertIn("gespeichert", p.locator("#rs-note").inner_text())
        self.assertEqual(self.hl(p, 0), 1)
        p.click("#r-sheet #rs-close")
        self.open_marks(p)
        txt = p.locator("#r-markl .dh-mi").inner_text()
        self.assertIn("KI: Das ist die Erklärung.", txt)
        self.assertEqual(p.errors, [])

    def test_ask_more_opens_the_analysis_window_with_history_and_page_context(self):
        p = self.open(lang="de")
        calls = self.fake_ollama(p, chunks=("Antwort", " eins."))
        self.start_book(p, "a.md", "text/markdown", "# Titel\n\nDer Übermensch ist der Sinn der Erde. Seitenumfeld Zebra.".encode())
        self.set_active(p, "ollama", "test:1b")
        self.select_text(p, "Übermensch")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.click("#rs-go")
        p.wait_for_selector("#rs-more:not([hidden])")
        p.click("#rs-more")
        p.wait_for_selector("#r-ana:not([hidden])")
        self.assertTrue(p.locator("#r-sheet").is_hidden())
        self.assertEqual(p.locator("#ra-pass").inner_text(), "Übermensch")
        self.assertIn("Antwort eins.", p.locator("#ra-body").inner_text())
        # Nachfrage nur mit der Markierung
        p.fill("#ra-q", "Warum?")
        p.click("#ra-send")
        p.wait_for_function("() => document.querySelectorAll('#ra-body .dh-m.a').length === 2 && !document.getElementById('ra-stop').offsetParent")
        self.assertEqual(len(calls), 2)
        self.assertEqual([m["role"] for m in calls[1]["messages"]], ["system", "user", "assistant", "user"])
        self.assertEqual(calls[1]["messages"][3]["content"], "Warum?")
        self.assertNotIn("Zebra", json.dumps(calls[1]))
        # mit Seitentext
        p.click("#ra-seg [data-ctx='1']")
        p.fill("#ra-q", "Und weiter?")
        p.keyboard.press("Enter")
        p.wait_for_function("() => document.querySelectorAll('#ra-body .dh-m.a').length === 3 && !document.getElementById('ra-stop').offsetParent")
        self.assertEqual(len(calls), 3)
        self.assertIn("Zebra", calls[2]["messages"][1]["content"])
        self.assertEqual([m["role"] for m in calls[2]["messages"]], ["system", "user", "assistant", "user", "assistant", "user"])
        # Zurück-Taste schließt nur das Fenster, nicht den Reader
        p.go_back()
        p.wait_for_selector("#r-ana", state="hidden")
        self.assertTrue(p.locator("#reader").is_visible())
        self.assertEqual(self.pg(p)[2], 1)
        self.assertEqual(p.errors, [])

    def test_analysis_close_button_and_stop(self):
        p = self.open()
        self.fake_ollama(p)
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Erklaeren.")
        self.set_active(p, "ollama", "test:1b")
        self.select_text(p, "Satz zum")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=summary]")
        p.click("#rs-go")
        p.wait_for_selector("#rs-more:not([hidden])")
        p.click("#rs-more")
        p.wait_for_selector("#r-ana:not([hidden])")
        p.click("#ra-close")
        p.wait_for_selector("#r-ana", state="hidden")
        self.assertTrue(p.locator("#reader").is_visible())
        self.assertEqual(p.evaluate("() => history.length > 0"), True)

    def test_summary_without_model_gives_a_clear_hint(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Zusammenfassen.")
        self.select_text(p, "Ein Satz zum")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=summary]")
        p.click("#rs-go")
        p.wait_for_selector("#r-sheet:not([hidden]) .dh-sline")
        self.assertIn("Dashboard", p.locator("#rs-body").inner_text())

    def test_online_model_is_blocked_without_allow_online_and_sends_nothing(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Erklaeren.")
        self.set_active(p, "groq", "llama-x")
        sent = []
        p.on("request", lambda r: sent.append(r.url) if "groq.com" in r.url else None)
        self.select_text(p, "Satz zum")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.click("#rs-go")
        p.wait_for_selector("#rs-body .dh-sline.err")
        self.assertIn("Allow online", p.locator("#rs-body").inner_text())
        self.assertEqual(sent, [])

    def test_online_model_shows_what_is_sent_when_online_is_allowed(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Erklaeren.")
        p.evaluate("async () => { const m = await import('/lib/providers.js'); m.HeinzProviders.setOnlineAllowed(true); m.HeinzProviders.setKey('groq', 'k'); m.HeinzProviders.setActiveModel('groq', 'llama-x'); }")
        sent = []
        def route(r):
            sent.append(json.loads(r.request.post_data or "{}")) if r.request.method == "POST" else None
            if r.request.method == "OPTIONS":
                return r.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
            lines = ["data: " + json.dumps({"choices": [{"delta": {"content": "Online-Antwort"}}]}), "data: [DONE]"]
            r.fulfill(status=200, content_type="text/event-stream", headers={"access-control-allow-origin": "*"}, body="\n".join(lines) + "\n")
        p.route("**/api.groq.com/**", route)
        self.select_text(p, "Satz zum")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.click("#rs-go")
        p.wait_for_function("() => document.querySelector('#rs-body .dh-sout') && document.querySelector('#rs-body .dh-sout').textContent.includes('Online-Antwort')")
        self.assertIn("Groq", p.locator("#rs-body .dh-sline.warn").inner_text())
        self.assertEqual(len(sent), 1)
        self.assertEqual(sent[0]["model"], "llama-x")
        self.assertNotIn("Zeitgeist", json.dumps(sent[0]))

    def test_sheet_and_bar_fit_the_small_viewport(self):
        p = self.open(height=400)
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Suchen.")
        self.select_text(p, "Satz")
        p.wait_for_selector("#r-sel:not([hidden])")
        self.assertTrue(p.evaluate("() => { const r = document.getElementById('r-sel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.top >= 0; }"))
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet:not([hidden])")
        self.assertTrue(p.evaluate("() => { const r = document.getElementById('r-sheet').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth; }"))

    def test_page_count_follows_font_size_and_keeps_position(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        n1 = self.pg(p)[1]
        for _ in range(n1 // 2):
            self.tap(p, "next")
        self.tap(p, "top"); p.click("#r-set-b")
        self.go(p, "fmt", "font")
        p.fill("#r-size", "30")
        p.wait_for_function("(n) => +document.getElementById('reader').dataset.pages > n", arg=n1)
        page, pages, _ = self.pg(p)
        self.assertTrue(abs(page / pages - 0.5) < 0.12, (page, pages))

    def test_optional_turn_buttons(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        self.tap(p, "top"); p.click("#r-set-b")
        self.go(p, "fmt", "ctl")
        self.switch(p, "#sw-btns", True)
        self.assertTrue(p.locator("#r-next").is_visible())
        p.click("#r-next")
        self.assertEqual(self.pg(p)[0], 2)

    def test_fonts_are_served_and_selectable(self):
        p = self.open()
        self.fake_ollama(p)
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nText.")
        self.tap(p, "top"); p.click("#r-set-b")
        self.go(p, "fmt", "font")
        self.assertEqual(p.locator("#sel-font option").count(), 7)
        self.choose(p, "#sel-font", "atkinson")
        self.assertEqual(p.get_attribute("#reader", "data-font"), "atkinson")
        p.wait_for_function("() => document.fonts.check('19px \"Atkinson Hyperlegible\"')")
        self.assertEqual(p.errors, [])

    def test_ai_model_assignment_is_used_for_explain_and_gap_setting_persists(self):
        p = self.open()
        calls = self.fake_ollama(p)
        p.evaluate("""() => localStorage.setItem('heinz_configs', JSON.stringify([{ id: 'c9', name: 'Q7', provider: 'ollama', model: 'qwen:7b', person: 'heinz', prompt: '', tone: null, stop: [], runtime: null }]))""")
        self.start_book(p, "a.md", "text/markdown", b"# Titel\n\nEin kurzer Text.")
        self.assertTrue(p.locator("#r-set [data-go=ai]").count() == 0)  # Modellwahl ist Sache der Startseite, nicht des Lesemenüs
        p.evaluate("() => document.getElementById('r-close').click()")
        p.wait_for_selector("#reader", state="hidden")
        p.click("#b-set")
        self.assertEqual(p.locator("#sel-ai option").count(), 2)       # Standard + Konfiguration, keine Modellflut
        self.choose(p, "#sel-ai", "c9")
        self.assertIn("qwen:7b", p.inner_text("#ai-cur"))
        p.locator("#list .dh-book").first.click()
        p.wait_for_selector("#reader:not([hidden])")
        self.tap(p, "top"); p.click("#r-set-b")
        self.go(p, "fmt", "ctl")
        self.assertEqual(p.get_attribute("#reader", "data-gap"), "0")
        self.switch(p, "#sw-gap", True)
        self.assertEqual(p.get_attribute("#reader", "data-gap"), "1")
        self.switch(p, "#sw-gap", False)
        self.assertEqual(p.get_attribute("#reader", "data-gap"), "0")
        p.keyboard.press("Escape")
        self.select_text(p, "kurzer")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.click("#rs-go")
        p.wait_for_function("() => document.getElementById('rs-body').innerText.includes('Erklärung')")
        self.assertEqual(calls[-1]["model"], "qwen:7b")
        self.assertEqual(p.errors, [])

    def test_dashboard_configuration_decides_model_prompt_and_tone(self):
        p = self.open()
        calls = self.fake_ollama(p)
        p.evaluate("""() => localStorage.setItem('heinz_configs', JSON.stringify([{ id: 'c1', name: 'Leser', provider: 'ollama', model: 'qwen:7b', person: 'heinz', prompt: 'Erkläre wie für ein Kind. Buch {title}.', tone: { temperature: 0.2 }, stop: [], runtime: null }]))""")
        self.start_book(p, "a.md", "text/markdown", b"# Titel\n\nEin kurzer Text.")
        p.evaluate("() => document.getElementById('r-close').click()")
        p.wait_for_selector("#reader", state="hidden")
        p.click("#b-set")
        self.choose(p, "#sel-ai", "c1")
        self.assertIn("Leser", p.inner_text("#ai-cur"))
        p.locator("#list .dh-book").first.click()
        p.wait_for_selector("#reader:not([hidden])")
        self.select_text(p, "kurzer")
        p.click("#r-sel [data-sel=explain]")
        p.click("#rs-go")
        p.wait_for_function("() => document.getElementById('rs-body').innerText.includes('Erklärung')")
        body = calls[-1]
        self.assertEqual(body["model"], "qwen:7b")
        self.assertEqual(body["messages"][0]["role"], "system")
        self.assertTrue(body["messages"][0]["content"].startswith("Erkläre wie für ein Kind. Buch "))
        self.assertEqual(body["options"]["temperature"], 0.2)
        self.assertNotIn("Titel", body["messages"][1]["content"])

    def test_answers_render_markdown_and_copy_keeps_the_raw_text(self):
        p = self.open()
        self.fake_ollama(p, chunks=("Das ist **fett** und\n\n", "* eins\n* zwei <script>window.__x=1</script>"))
        self.set_active(p, "ollama", "test:1b")
        self.start_book(p, "a.md", "text/markdown", b"# Titel\n\nEin kurzer Text.")
        self.select_text(p, "kurzer")
        p.click("#r-sel [data-sel=explain]")
        p.click("#rs-go")
        p.wait_for_selector("#rs-body .dh-sout strong")
        self.assertEqual(p.locator("#rs-body .dh-sout li").count(), 2)
        self.assertFalse(p.evaluate("() => !!window.__x"))
        self.assertEqual(p.locator("#rs-body .dh-sout script").count(), 0)
        self.assertIn("**fett**", p.evaluate("() => document.querySelector('#rs-body .dh-sout').dataset.raw"))

    def test_back_from_settings_stays_in_the_book(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        self.tap(p, "top"); p.click("#r-set-b")
        self.assertTrue(p.locator("#r-set").is_visible())
        p.click("#r-close")                                   # Pfeil schließt nur das Feld
        self.assertTrue(p.locator("#r-set").is_hidden())
        self.assertTrue(p.locator("#reader").is_visible())
        p.click("#r-set-b")
        p.go_back()                                           # Zurück-Geste schließt zuerst die Einstellungen
        p.wait_for_function("() => document.getElementById('r-set').hidden")
        self.assertTrue(p.locator("#reader").is_visible())
        p.go_back()                                           # dann erst den Reader
        p.wait_for_function("() => document.getElementById('reader').hidden")

    def test_settings_open_as_bottom_sheet_so_the_text_stays_visible(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        self.tap(p, "top"); p.click("#r-set-b")
        self.go(p, "fmt", "font")
        box = p.locator("#r-set").bounding_box()
        self.assertGreater(box["y"], 300)                     # Blatt unten, obere Hälfte zeigt den Text
        p.fill("#r-size", "30")
        self.assertTrue(p.locator("#r-set").is_visible())
        self.assertEqual(p.get_attribute("#reader", "data-set"), "1")

    def go(self, p, *pages):
        for g in pages:
            p.click("#r-set [data-go=%s]" % g)

    def choose(self, p, sel, value):
        p.evaluate("([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }", [sel, str(value)])

    def switch(self, p, sel, on):
        p.evaluate("([s, v]) => { const e = document.querySelector(s); e.checked = v; e.dispatchEvent(new Event('change', { bubbles: true })); }", [sel, bool(on)])

    def look(self, p, k, v):
        p.evaluate("""([k, v]) => { const i = document.querySelector('#r-set label[data-k=' + k + '] input'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }""", [k, v])

    def seg(self, p, k, v):
        if k == "cols":
            self.choose(p, "#r-set label[data-k=cols] select", v)
        else:
            self.switch(p, "#r-set label[data-k=%s] input" % k, int(v))

    def open_set(self, p):
        self.tap(p, "top"); p.click("#r-set-b")

    def test_spacing_alignment_and_margins_change_the_page(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        n0 = self.pg(p)[1]
        self.open_set(p)
        self.look(p, "lh", 2.4)
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('r-body')).lineHeight"), str(round(2.4 * 19, 2)).rstrip("0").rstrip(".") + "px")
        p.wait_for_function("(n) => +document.getElementById('reader').dataset.pages > n", arg=n0)
        self.seg(p, "just", 1)
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('r-body')).textAlign"), "justify")
        self.seg(p, "hyph", 0)
        self.assertEqual(p.get_attribute("#reader", "data-hyph"), "0")
        self.look(p, "ind", 2)
        self.assertEqual(p.evaluate("() => getComputedStyle(document.querySelector('#r-body p')).textIndent"), "38px")
        self.look(p, "mx", 60)
        self.assertEqual(p.evaluate("() => parseFloat(getComputedStyle(document.getElementById('r-page')).paddingLeft)"), 60)
        self.look(p, "maxw", 300)
        p.wait_for_function("() => document.getElementById('r-clip').getBoundingClientRect().width <= 300")

    def test_two_columns_per_page(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        self.open_set(p)
        self.seg(p, "cols", 2)
        p.wait_for_function("() => getComputedStyle(document.getElementById('r-body')).columnGap === '28px'")
        cw = p.evaluate("() => { const b = document.getElementById('r-body'); return [parseFloat(getComputedStyle(b).columnWidth), parseFloat(getComputedStyle(b).columnGap), b.getBoundingClientRect().width]; }")
        self.assertEqual(round(2 * cw[0] + cw[1]), round(cw[2]))
        p.keyboard.press("Escape")
        before = self.pg(p)[0]
        self.tap(p, "next")
        self.assertEqual(self.pg(p)[0], before + 1)
        self.assertEqual(p.evaluate("() => document.getElementById('r-body').scrollLeft"), 0)

    def test_book_scope_overrides_only_that_book_and_reset_clears_it(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# Buch A\n\n" + b"Absatz mit Text.\n\n" * 40)
        self.open_set(p)
        self.choose(p, "#sel-scope", "1")
        self.look(p, "lh", 2.6)
        self.assertEqual(p.evaluate("() => document.querySelector('#r-set label[data-k=lh] input').value"), "2.6")
        p.click("#r-close"); p.click("#r-close")                       # Feld zu, dann Reader zu
        p.wait_for_selector("#reader", state="hidden")
        self.add(p, ("b.md", "text/markdown", b"# Buch B\n\nAndere Seite."))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-open').length === 2")
        p.locator("#list .dh-open", has_text="Buch B").click()
        p.wait_for_selector("#reader:not([hidden])")
        self.open_set(p)
        self.assertEqual(p.evaluate("() => document.querySelector('#r-set label[data-k=lh] input').value"), "1.65")
        p.click("#r-close"); p.click("#r-close")
        p.wait_for_selector("#reader", state="hidden")
        p.locator("#list .dh-open", has_text="Buch A").click()
        p.wait_for_selector("#reader:not([hidden])")
        self.open_set(p)
        self.assertEqual(p.evaluate("() => document.querySelector('#r-set label[data-k=lh] input').value"), "2.6")
        self.go(p, "fmt")
        p.click("#look-reset")
        self.assertEqual(p.evaluate("() => document.querySelector('#r-set label[data-k=lh] input').value"), "1.65")

    def test_custom_colors_brightness_and_profiles(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# Titel\n\nEin kurzer Text.")
        self.open_set(p)
        self.go(p, "fmt", "color")
        self.assertEqual(p.locator("#r-set label[data-k=bgc] .dh-swb[data-c]").count(), 9)
        p.click("#r-set label[data-k=bgc] .dh-swb[data-c='#f4ecd8']")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('reader')).backgroundColor"), "rgb(244, 236, 216)")
        p.click("#r-set label[data-k=bgc] .dh-swm")
        p.fill("#r-set label[data-k=bgc] .dh-hex", "102030"); p.press("#r-set label[data-k=bgc] .dh-hex", "Enter")
        self.assertEqual(p.get_attribute("#reader", "data-rt"), "custom")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('reader')).backgroundColor"), "rgb(16, 32, 48)")
        self.look(p, "bri", 80)
        self.assertEqual(p.evaluate("() => document.getElementById('r-page').style.filter"), "brightness(0.8)")
        self.look(p, "lh", 2)
        p.click("#rs-back")
        self.go(p, "prof")
        p.fill("#prof-name", "Nacht"); p.click("#prof-save")
        self.assertEqual(p.locator("#prof-list .dh-prow").count(), 1)
        self.look(p, "lh", 1.2)
        p.click("#prof-list .dh-prow button >> nth=0")
        self.assertEqual(p.evaluate("() => document.querySelector('#r-set label[data-k=lh] input').value"), "2")
        p.click("#prof-list .x")
        self.assertEqual(p.locator("#prof-list .dh-prow").count(), 0)
        self.assertEqual(p.errors, [])

    def test_reader_settings_size_and_theme_persist(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nText.")
        self.tap(p, "top")
        p.click("#r-set-b")
        self.go(p, "fmt", "font")
        p.fill("#r-size", "27")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('r-body')).fontSize"), "27px")
        self.choose(p, "#sel-theme", "sepia")
        self.assertEqual(p.get_attribute("#reader", "data-rt"), "sepia")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('reader')).backgroundColor"), "rgb(244, 236, 216)")
        self.choose(p, "#sel-theme", "black")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('reader')).backgroundColor"), "rgb(0, 0, 0)")
        self.choose(p, "#sel-font", "lora")
        p.reload()
        p.wait_for_selector("html[data-dh=ready]")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        self.assertEqual(p.get_attribute("#reader", "data-rt"), "black")
        self.assertEqual(p.get_attribute("#reader", "data-font"), "lora")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('r-body')).fontSize"), "27px")

    def test_back_button_closes_the_reader(self):
        p = self.open()
        self.add(p, ("a.txt", "text/plain", b"Hallo."))
        p.wait_for_selector("#list .dh-open")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.go_back()
        p.wait_for_selector("#reader", state="hidden")
        self.assertIn("/tools/docheinz/", p.url)

    def test_small_viewport_and_both_themes_have_no_overflow(self):
        for theme in ("lt", "dk"):
            p = self.open(theme=theme, height=400)
            self.add(p, ("a.txt", "text/plain", b"Hallo."))
            p.wait_for_selector("#list .dh-open")
            self.assertTrue(p.evaluate("() => document.documentElement.scrollWidth <= innerWidth"))
            p.click("#list .dh-open")
            p.wait_for_selector("#reader:not([hidden])")
            p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
            self.tap(p, "top")
            self.assertTrue(p.evaluate("() => { const r = document.getElementById('r-ovfoot').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.height > 20; }"))


if __name__ == "__main__":
    unittest.main()
