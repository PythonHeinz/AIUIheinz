"""WikiHeinz Variante B: wikizim.py (ZIM lesen, Artikel in Abschnitte zerlegen) und die Endpunkte /api/wiki/* des Servers. Nur Standardbibliothek."""
import http.client, json, os, sys, tempfile, unittest, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from helpers import Server
from zimbau import baue_zim
import wikizim

KOELN = """<html><body>
<table class="infobox vcard"><tr><th colspan="2">Köln</th></tr><tr><th>Einwohner</th><td>1.083.498</td></tr><tr><th>Fläche</th><td>405,02 km²</td></tr></table>
<p><b>Köln</b> ist eine Großstadt am Rhein.<sup>[1]</sup></p><p>Sie ist die viertgrößte Stadt Deutschlands.</p>
<h2>Geschichte</h2><p>Die Stadt wurde als <i>Colonia</i> gegründet.</p><table><tr><td>Tabelle, fällt weg</td></tr></table>
<h3>Römerzeit</h3><p>Im Jahr 50 n. Chr. erhielt der Ort Stadtrechte.</p>
<h2>Weblinks</h2><p>Das gehört nicht mehr dazu.</p></body></html>"""
OHNE = "<html><body><p>Nur eine Einleitung ohne Tabelle und ohne Abschnitte.</p></body></html>"


def zim_datei(d):
    pfad = os.path.join(d, "wikipedia.zim")
    baue_zim(pfad, [("Köln", "Köln", KOELN), ("Colonia", "Colonia", ("->", "Köln")), ("Kurz", "Kurz", OHNE), ("Zebra", "Zebra", OHNE)])
    return pfad


class ZerlegenTests(unittest.TestCase):
    def test_article_is_split_into_intro_sections_and_infobox(self):
        a = wikizim.zerlege("Köln", KOELN)
        self.assertEqual(a["intro"], "Köln ist eine Großstadt am Rhein. Sie ist die viertgrößte Stadt Deutschlands.")
        self.assertNotIn("[1]", a["intro"])
        self.assertEqual([x["h"] for x in a["abschnitte"]], ["Geschichte", "Römerzeit"])
        self.assertIn("Colonia", a["abschnitte"][0]["text"]); self.assertNotIn("Tabelle", a["abschnitte"][0]["text"])
        self.assertNotIn("Weblinks", json.dumps(a)); self.assertNotIn("nicht mehr dazu", json.dumps(a))
        self.assertIn(["Einwohner", "1.083.498"], a["infobox"]); self.assertIn(["Fläche", "405,02 km²"], a["infobox"])
        self.assertGreater(a["zeichen"], 100)

    def test_infobox_skips_hidden_parts_joins_lists_and_drops_rows_without_value(self):
        html = ('<table class="infobox"><tr><th colspan="2">Grünten</th></tr><tr><td colspan="2">Blick von Westen</td></tr>'
                '<tr><th>Koordinaten</th><td><span class="geo-default"><span>47° 33′ N, 10° 19′ O</span></span>'
                '<span class="geo-multi-punct"> / </span><span class="geo-nondefault">47.55°N 10.32°O</span>'
                '<span style="display:none">; <span class="geo">47.55; 10.32</span></span></td></tr>'
                '<tr><th>Besonderheiten</th><td><ul><li>Haus</li><li>Hütte</li></ul></td></tr>'
                '<tr><th>Typ</th><td>Berg</td></tr><tr><th>Typ</th><td>Berg</td></tr></table><p>Der Grünten ist ein Berg.</p>')
        ib = wikizim.zerlege("Grünten", html)["infobox"]
        self.assertEqual(ib, [["Koordinaten", "47° 33′ N, 10° 19′ O"], ["Besonderheiten", "Haus · Hütte"], ["Typ", "Berg"]])

    def test_article_without_infobox_or_sections(self):
        a = wikizim.zerlege("Kurz", OHNE)
        self.assertEqual(a["infobox"], []); self.assertEqual(a["abschnitte"], []); self.assertIn("Einleitung", a["intro"])

    def test_zim_reader_finds_titles_follows_redirects_and_normalizes_the_first_letter(self):
        with tempfile.TemporaryDirectory() as d:
            z = wikizim.Zim(zim_datei(d))
            try:
                self.assertEqual(wikizim.artikel(z, "Köln")["titel"], "Köln")
                self.assertEqual(wikizim.artikel(z, "Colonia")["titel"], "Köln")
                self.assertEqual(wikizim.artikel(z, "kurz")["titel"], "Kurz")
                self.assertIsNone(wikizim.artikel(z, "Gibt es nicht"))
                self.assertEqual(z.status()["eintraege"], 4)
            finally:
                z.close()

    def test_not_a_zim_file_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "x.zim")
            with open(p, "wb") as f:
                f.write(b"kein zim" * 20)
            with self.assertRaises(wikizim.ZimFehler) as c:
                wikizim.Zim(p)
            self.assertEqual(c.exception.code, "format")


class EndpunktTests(unittest.TestCase):
    def get(self, srv, pfad):
        c = http.client.HTTPConnection("127.0.0.1", srv.port, timeout=10)
        c.request("GET", pfad); r = c.getresponse(); body = r.read()
        return r.status, json.loads(body.decode("utf-8"))

    def test_without_a_zim_file_the_endpoints_say_so(self):
        srv = Server().start()
        try:
            st, j = self.get(srv, "/api/wiki/status")
            self.assertEqual(st, 200); self.assertFalse(j["available"]); self.assertEqual(j["error"], "none")
            st, j = self.get(srv, "/api/wiki/artikel?titel=K%C3%B6ln")
            self.assertEqual(st, 503); self.assertEqual(j["error"], "none")
            self.assertEqual(self.get(srv, "/api/wiki/artikel")[0], 400)
        finally:
            srv.stop()

    def test_with_a_zim_file_in_data_wiki_whole_articles_are_served(self):
        srv = Server()
        os.makedirs(os.path.join(srv.data, "wiki")); zim_datei(os.path.join(srv.data, "wiki"))
        srv.start()
        try:
            st, j = self.get(srv, "/api/wiki/status")
            self.assertTrue(j["available"]); self.assertEqual(j["eintraege"], 4); self.assertEqual(j["datei"], "wikipedia.zim")
            self.assertNotIn(os.sep + "wiki", j["datei"])                       # nur der Dateiname, kein Pfad
            st, j = self.get(srv, "/api/wiki/artikel?titel=" + urllib.parse.quote("Colonia"))
            self.assertEqual(st, 200); self.assertEqual(j["titel"], "Köln"); self.assertEqual(len(j["abschnitte"]), 2); self.assertTrue(j["infobox"])
            self.assertEqual(self.get(srv, "/api/wiki/artikel?titel=Nirgends")[0], 404)
            self.assertEqual(self.get(srv, "/api/wiki/artikel?titel=" + "x" * 300)[0], 400)
            c = http.client.HTTPConnection("127.0.0.1", srv.port, timeout=5); c.request("GET", "/wikizim.py"); self.assertEqual(c.getresponse().status, 404)
        finally:
            srv.stop()


if __name__ == "__main__":
    unittest.main()
