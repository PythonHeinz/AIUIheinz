/* tools/convert2/ui/base.js – Brücke zum Fundament (nur lesen): Kernbibliothek Heinz (lib/core.js, klassischer Kopf-Block) und HeinzStore. */
import { HeinzStore } from '../../../lib/store.js';
export const Heinz = window.Heinz;
export { HeinzStore };
export const $ = (id) => document.getElementById(id);
