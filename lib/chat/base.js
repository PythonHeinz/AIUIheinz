/* lib/chat/base.js – Brücke zu den klassischen Bibliotheken (window.*) und kleine Helfer des Heinz Chat.
 * ES module (docs/MODULE.md). Imports only the libraries under lib/. The only place of the chat that reads window.* globals of the classic libraries
 * (lib/core.js, providers.js, store.js); every other file imports from here. When a library becomes a module
 * (docs/agent/AUFTRAG_Fundament.md step 4), only these lines change to imports. */

import { HeinzProviders as PV } from '../providers.js';
import { HeinzStore } from '../store.js';
import { savedRow } from '../shared/conversations.js';
import { HeinzMarkdown, onCodeCopy } from '../shared/markdown.js';

export { PV, HeinzStore };
export const Heinz = window.Heinz;   // lib/core.js: classic head script (theme and language before the first paint)

export const $ = function (id) { return document.getElementById(id); };
export const esc = Heinz.esc;

// Markdown wie im Dashboard (lib/shared/markdown.js)
export const md = HeinzMarkdown.parse;
export { onCodeCopy, savedRow };
