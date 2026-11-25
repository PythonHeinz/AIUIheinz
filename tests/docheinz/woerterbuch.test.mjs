import test from 'node:test';
import assert from 'node:assert/strict';
import { keyOf, candidates, detect, parseLine, parseJson, words, shortDef } from '../../tools/docheinz/mod/woerterbuch.js';

test('Schlüssel: klein, ß = ss, Satzzeichen am Rand weg', () => {
    assert.equal(keyOf('„Straße!“'), 'strasse');
    assert.equal(keyOf('  Müde, '), 'müde');
    assert.equal(keyOf("don’t"), "don't");
});
test('Grundform-Versuche deutsch und englisch', () => {
    assert.equal(candidates('Häuser', 'de')[0], 'häuser');
    assert.ok(candidates('Häuser', 'de').includes('haus'));
    assert.ok(candidates('wanderte', 'de').includes('wander'));
    assert.ok(candidates('Katzen', 'de').includes('katz'));
    assert.ok(candidates('studies', 'en').includes('study'));
    assert.ok(candidates('making', 'en').includes('make'));
    assert.ok(candidates('stopped', 'en').includes('stop'));
    assert.deepEqual(candidates('an', 'de'), ['an']);
});
test('Format erkennen und Zeilen lesen', () => {
    assert.equal(detect('# Kommentar\nHaus\tGebäude\nBaum\tPflanze'), 'tsv');
    assert.equal(detect('Haus;Gebäude\nBaum;Pflanze'), 'csv');
    assert.equal(detect('{"word":"a","senses":[{"glosses":["x"]}]}\n{"word":"b","senses":[{"glosses":["y"]}]}'), 'jsonl');
    assert.equal(detect('{"Haus":"Gebäude"}'), 'json');
    assert.equal(detect('[{"word":"a","definition":"x"}]'), 'json');
    assert.deepEqual(parseLine('Haus\tGebäude zum Wohnen', 'tsv'), ['haus', 'Gebäude zum Wohnen', 'Haus']);
    assert.deepEqual(parseLine('"Baum";"Pflanze\\nmit Stamm"', 'csv'), ['baum', 'Pflanze\nmit Stamm', 'Baum']);
    assert.equal(parseLine('# nur Kommentar', 'tsv'), null);
    assert.equal(parseLine('ohne trenner', 'tsv'), null);
});
test('Wiktionary-Zeile (kaikki) und JSON-Formen', () => {
    const e = parseLine('{"word":"Haus","pos":"noun","senses":[{"glosses":["house"]},{"glosses":["home","dwelling"]}]}', 'jsonl');
    assert.equal(e[0], 'haus'); assert.match(e[1], /\(noun\) 1\. house\n2\. home; dwelling/);
    assert.deepEqual(parseJson('{"Haus":"house","Baum":{"definition":"tree"}}').map(x => x[0] + '=' + x[1]), ['haus=house', 'baum=tree']);
    assert.equal(parseJson('kaputt').length, 0);
});
test('Wörter der Auswahl', () => {
    assert.deepEqual(words(' „Guten Tag,“ sagte er. '), ['Guten', 'Tag', 'sagte', 'er']);
    assert.equal(words('a b c d e f g h').length, 6);
});
import { wanted } from '../../tools/docheinz/mod/woerterbuch.js';
test('Sprachfilter: deutsch und englisch bleiben, andere Sprachen fallen weg, ohne Angabe bleibt', () => {
    assert.equal(wanted(parseLine('{"word":"Hund","lang_code":"de","senses":[{"glosses":["Tier"]}]}', 'jsonl')), true);
    assert.equal(wanted(parseLine('{"word":"chien","lang_code":"fr","senses":[{"glosses":["Hund"]}]}', 'jsonl')), false);
    assert.equal(wanted(parseLine('Haus\tGebäude', 'tsv')), true);
    assert.equal(parseLine('{"word":"x","senses":[{"glosses":["' + 'a'.repeat(3000) + '"]}]}', 'jsonl')[1].length, 1500);
});
import { refOf } from '../../tools/docheinz/mod/woerterbuch.js';
test('Beugungsformen verweisen auf die Grundform', () => {
    const f = (g) => ({ senses: [{ glosses: [g] }] });
    assert.equal(refOf({ senses: [{ form_of: [{ word: 'dumm' }], glosses: ['x'] }] }), 'dumm');
    assert.equal(refOf({ senses: [{ glosses: ['Genitiv Singular Maskulinum der starken Deklination des Adjektivs dumm'] }, { glosses: ['Dativ Plural des Adjektivs dumm'] }] }), 'dumm');
    assert.equal(refOf(f('1. Person Singular Präsens Indikativ des Verbs gehen')), 'gehen');
    assert.equal(refOf(f('Tier mit vier Beinen')), '');
    assert.equal(refOf({ senses: [{ glosses: ['des Adjektivs dumm'] }, { glosses: ['Tier'] }] }), '');
    const e = parseLine(JSON.stringify({ word: 'dummen', lang_code: 'de', senses: [{ glosses: ['Dativ Plural des Adjektivs dumm'] }] }), 'jsonl');
    assert.deepEqual([e[0], e[1], e[4]], ['dummen', '→ dumm', 'dumm']);
});

test('Kompaktansicht: zwei Bedeutungen plus deutsche Zeile, lange Zeilen gekürzt', () => {
    const d = '(noun) 1. eins\n2. zwei\n3. drei\n4. vier\n5. DE: Nachtigall, Sprosser';
    assert.equal(shortDef(d), '(noun) 1. eins\n2. zwei\n5. DE: Nachtigall, Sprosser');
    assert.equal(shortDef('kurz'), 'kurz');
    const lang = shortDef('x '.repeat(200));
    assert.ok(lang.length <= 165 && lang.endsWith('…'));
});
