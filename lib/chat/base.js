/* lib/chat/base.js – Brücke zu den klassischen Bibliotheken (window.*) und kleine Helfer des Heinz Chat.
 * ES module (docs/MODULE.md). Leaf: imports nothing. The only place of the chat that reads window.* globals of the classic libraries
 * (lib/core.js, providers.js, store.js); every other file imports from here. When a library becomes a module
 * (docs/agent/AUFTRAG_Fundament.md step 4), only these lines change to imports. */

export const PV = window.HeinzProviders;
export const Heinz = window.Heinz;
export const HeinzStore = window.HeinzStore;

export const $ = function (id) { return document.getElementById(id); };
export const esc = Heinz.esc;
