/* tools/wikiheinz/ui/base.js – Brücke zum Fundament (nur lesen): Heinz (lib/core.js), HeinzStore, HeinzMarkdown. Modellzugriff kommt erst mit „Fragen“ (HeinzProviders). */
import { HeinzStore } from '../../../lib/store.js';
import { HeinzMarkdown } from '../../../lib/shared/markdown.js';
export const Heinz = window.Heinz;
export { HeinzStore, HeinzMarkdown };
export const $ = (id) => document.getElementById(id);
