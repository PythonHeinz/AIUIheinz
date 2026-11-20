/* tools/filter/ui/base.js – Brücke zum Fundament (nur lesen): Heinz (lib/core.js), HeinzStore, HeinzProviders. */
import { HeinzStore } from '../../../lib/store.js';
import { HeinzProviders } from '../../../lib/providers.js';
export const Heinz = window.Heinz;
export { HeinzStore, HeinzProviders };
export const $ = (id) => document.getElementById(id);
