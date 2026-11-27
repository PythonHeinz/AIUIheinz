/* tools/docheinz/ui/base.js – Brücke zum Fundament (nur lesen): Kernbibliothek Heinz (lib/core.js, klassischer Kopf-Block), HeinzStore und HeinzPostfach (Merkzettel an WikiHeinz, Stufe 4 des Strangs AIUIheinz-Wissen). */
import { HeinzStore } from '../../../lib/store.js';
import { HeinzPostfach } from '../../../lib/shared/postfach.js';
import { HeinzWissen } from '../../../lib/wissen/index.js';
export const Heinz = window.Heinz;
export { HeinzStore, HeinzPostfach, HeinzWissen };
export const $ = (id) => document.getElementById(id);
