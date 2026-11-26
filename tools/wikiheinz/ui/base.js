/* tools/wikiheinz/ui/base.js – Brücke zum Fundament (nur lesen): Heinz (lib/core.js), HeinzStore, HeinzMarkdown, HeinzPostfach (Merkzettel anderer Werkzeuge). Modellzugriff nur über HeinzProviders (Reiter „Fragen“). */
import { HeinzStore } from '../../../lib/store.js';
import { HeinzMarkdown } from '../../../lib/shared/markdown.js';
import { HeinzProviders } from '../../../lib/providers.js';
import { HeinzPostfach } from '../../../lib/shared/postfach.js';
export const Heinz = window.Heinz;
export { HeinzStore, HeinzMarkdown, HeinzProviders, HeinzPostfach };
export const $ = (id) => document.getElementById(id);
