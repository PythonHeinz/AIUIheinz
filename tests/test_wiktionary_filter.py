"""Test des PC-Skripts tools/docheinz/skripte/filter_wiktionary.py (Strang AIUIheinz-docHeinz)."""
import gzip, json, os, sys, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'docheinz', 'skripte'))
import filter_wiktionary as fw

ROWS = [
    {"word": "cockroach", "lang_code": "en", "pos": "noun", "etymology_text": "lang " * 200, "sounds": [{"ipa": "x"}],
     "senses": [{"glosses": ["An insect", "A brown insect of the order Blattodea"], "examples": [{"text": "ex"}]}, {"tags": ["x"]}],
     "translations": [{"lang_code": "de", "word": "Kakerlake"}, {"lang_code": "fr", "word": "cafard"}, {"lang_code": "de", "word": "Schabe"}]},
    {"word": "Haus", "lang_code": "de", "senses": [{"glosses": ["house"]}]},
    {"word": "ran", "lang_code": "en", "pos": "verb", "senses": [{"glosses": ["simple past of run"], "form_of": [{"word": "run"}]}]},
    {"word": "leer", "lang_code": "en", "senses": []},
]


class Filter(unittest.TestCase):
    def test_slim(self):
        e = fw.slim(ROWS[0])
        self.assertEqual(e['word'], 'cockroach'); self.assertEqual(e['pos'], 'noun')
        self.assertEqual(e['senses'][0]['glosses'], ['A brown insect of the order Blattodea'])
        self.assertEqual(len(e['senses']), 2)                      # Bedeutung + Übersetzungszeile (leere Bedeutung entfällt)
        self.assertEqual(e['senses'][1]['glosses'], ['DE: Kakerlake, Schabe'])
        self.assertNotIn('etymology_text', e); self.assertNotIn('sounds', e)
        self.assertIsNone(fw.slim(ROWS[1])); self.assertIsNone(fw.slim(ROWS[3]))
        self.assertEqual(fw.slim(ROWS[2])['senses'][0]['form_of'], [{'word': 'run'}])
        self.assertNotIn('DE:', json.dumps(fw.slim(ROWS[0], translate='')))

    def test_run_gz(self):
        with tempfile.TemporaryDirectory() as d:
            a, b = os.path.join(d, 'in.jsonl.gz'), os.path.join(d, 'out.jsonl.gz')
            with gzip.open(a, 'wt', encoding='utf-8') as f:
                f.write('\n'.join(json.dumps(r) for r in ROWS) + '\nkaputt\n')
            n_in, n_out = fw.run(a, b)
            self.assertEqual((n_in, n_out), (5, 2))
            with gzip.open(b, 'rt', encoding='utf-8') as f:
                self.assertEqual([json.loads(l)['word'] for l in f], ['cockroach', 'ran'])


if __name__ == '__main__':
    unittest.main()
