"""Test des PC-Skripts tools/docheinz/skripte/zim_zu_woerterbuch.py (Strang AIUIheinz-docHeinz). Braucht `pip install libzim`, sonst übersprungen."""
import gzip, json, os, sys, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'docheinz', 'skripte'))
import zim_zu_woerterbuch as z

HTML = ('<html><body><table><tr><td><p>Infobox-Text, der nicht erscheinen darf, ok</p></td></tr></table>'
        '<p>Die Bezeichnung <b>Küchenschabe</b> wird für eine Reihe von Arten verwendet.[1] Sie leben in Behausungen.</p>'
        '<p>Zweiter Absatz mit genug Text für den Test.</p></body></html>')


class Intro(unittest.TestCase):
    def test_intro_skips_infobox_and_footnotes(self):
        t = z.intro_text(HTML)
        self.assertTrue(t.startswith('Die Bezeichnung Küchenschabe'))
        self.assertNotIn('Infobox', t); self.assertNotIn('[1]', t)

    def test_cut_at_sentence_end(self):
        t = z.intro_text('<p>' + 'Erster Satz hier. ' * 3 + 'Zweiter ganz langer Satz ohne Ende ' * 20 + '</p>', 80)
        self.assertTrue(t.endswith('.')); self.assertLessEqual(len(t), 80)
        self.assertEqual(z.cut('kurz', 80), 'kurz')


class Zim(unittest.TestCase):
    def test_zim_to_jsonl(self):
        try:
            from libzim.writer import Creator, Item, StringProvider, Hint
        except ImportError:
            self.skipTest('libzim fehlt')

        class It(Item):
            def __init__(s, p, t, h): super().__init__(); s.p, s.t, s.h = p, t, h
            def get_path(s): return s.p
            def get_title(s): return s.t
            def get_mimetype(s): return 'text/html'
            def get_contentprovider(s): return StringProvider(s.h)
            def get_hints(s): return {Hint.FRONT_ARTICLE: True}
        with tempfile.TemporaryDirectory() as d:
            a, b = os.path.join(d, 't.zim'), os.path.join(d, 'o.jsonl.gz')
            with Creator(a).config_indexing(False, 'de') as c:
                c.set_mainpath('Kuechenschabe')
                c.add_item(It('Kuechenschabe', 'Küchenschabe', HTML))
                c.add_redirection('Kakerlake', 'Kakerlake', 'Kuechenschabe', {Hint.FRONT_ARTICLE: True})
            n = z.run(a, b, 'de')
            self.assertGreaterEqual(n, 2)
            rows = [json.loads(l) for l in gzip.open(b, 'rt', encoding='utf-8')]
            by = {r['word']: r for r in rows}
            self.assertEqual(by['Kakerlake']['senses'][0]['form_of'][0]['word'], 'Küchenschabe')
            self.assertIn('Behausungen', by['Küchenschabe']['senses'][0]['glosses'][0])
            self.assertEqual(by['Küchenschabe']['lang_code'], 'de')
            n2 = z.run(a, b, 'fr', redirects=False)
            self.assertEqual([json.loads(l)['word'] for l in gzip.open(b, 'rt', encoding='utf-8')], ['Küchenschabe'])
            self.assertNotIn('lang_code', json.loads(gzip.open(b, 'rt', encoding='utf-8').readline()))


if __name__ == '__main__':
    unittest.main()
