#!/usr/bin/env python3
"""Verkleinert den großen Wiktionary-Auszug (kaikki.org, JSONL, auch .gz) zu einem kleinen Wörterbuch für docHeinz.

Nur Python-Standardbibliothek. Liest zeilenweise (Streaming), die 3-GB-Datei muss nicht in den Speicher.

Beispiel (am PC):
    python filter_wiktionary.py kaikki.org-dictionary-English.jsonl.gz englisch.jsonl.gz
    python filter_wiktionary.py in.jsonl.gz out.jsonl.gz --lang en --max-senses 3 --translate de

Behalten wird je Eintrag: Wort, Sprache, Wortart, die ersten Bedeutungen (kurz gekürzt), Verweise auf Grundformen (form_of)
und auf Wunsch deutsche Übersetzungen. Alles andere (Aussprache, Etymologie, Beispiele, Übersetzungen in andere Sprachen) entfällt.
Das Ergebnis importierst du in docHeinz unter Bibliothek -> Wörterbuch.
"""
import argparse, gzip, io, json, sys


def opener(path, mode):
    return gzip.open(path, mode + 't', encoding='utf-8') if path.endswith('.gz') else open(path, mode, encoding='utf-8')


def slim(o, lang='en', max_senses=4, max_gloss=220, translate='de', max_tr=6):
    """Ein kaikki-Eintrag -> kleiner Eintrag, oder None wenn er nicht gebraucht wird."""
    if not isinstance(o, dict) or not o.get('word'):
        return None
    if lang and o.get('lang_code') != lang:
        return None
    senses = []
    for s in o.get('senses') or []:
        g = [x.strip() for x in (s.get('glosses') or s.get('raw_glosses') or []) if isinstance(x, str) and x.strip()]
        fo = [{'word': f['word']} for f in (s.get('form_of') or []) if isinstance(f, dict) and f.get('word')]
        if not g and not fo:
            continue
        item = {}
        if g:
            item['glosses'] = [g[-1][:max_gloss]]          # letzte Ebene = die eigentliche Bedeutung
        if fo:
            item['form_of'] = fo[:1]
        senses.append(item)
        if len(senses) >= max_senses:
            break
    if not senses:
        return None
    if translate:
        seen, words = set(), []
        for t in o.get('translations') or []:
            if t.get('lang_code') == translate and t.get('word') and t['word'] not in seen:
                seen.add(t['word']); words.append(t['word'])
                if len(words) >= max_tr:
                    break
        if words:
            senses.append({'glosses': [translate.upper() + ': ' + ', '.join(words)]})
    out = {'word': o['word'], 'lang_code': o.get('lang_code', lang), 'senses': senses}
    if o.get('pos'):
        out['pos'] = o['pos']
    return out


def run(src, dst, **kw):
    n_in = n_out = 0
    with opener(src, 'r') as fi, opener(dst, 'w') as fo:
        for line in fi:
            n_in += 1
            try:
                e = slim(json.loads(line), **kw)
            except ValueError:
                continue
            if e:
                fo.write(json.dumps(e, ensure_ascii=False, separators=(',', ':')) + '\n')
                n_out += 1
            if n_in % 200000 == 0:
                print(f'{n_in} gelesen, {n_out} behalten …', file=sys.stderr)
    return n_in, n_out


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    p.add_argument('eingabe'); p.add_argument('ausgabe')
    p.add_argument('--lang', default='en', help='Sprachcode der Einträge (Standard en; leer = alle)')
    p.add_argument('--max-senses', type=int, default=4)
    p.add_argument('--max-gloss', type=int, default=220)
    p.add_argument('--translate', default='de', help='Übersetzungen in diese Sprache anhängen (Standard de; leer = keine)')
    a = p.parse_args(argv)
    n_in, n_out = run(a.eingabe, a.ausgabe, lang=a.lang, max_senses=a.max_senses, max_gloss=a.max_gloss, translate=a.translate)
    print(f'Fertig: {n_in} Zeilen gelesen, {n_out} Einträge geschrieben -> {a.ausgabe}')


if __name__ == '__main__':
    main()
