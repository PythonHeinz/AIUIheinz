/* lib/dashboard/base.js – Brücke zu den klassischen Bibliotheken (window.*) und kleine Helfer der Seite.
 * ES module (docs/MODULE.md). Leaf: imports nothing. This is the only place of the dashboard that reads window.* globals of the classic
 * libraries (lib/core.js, providers.js, store.js, …); every other file imports from here. When a library becomes a module
 * (docs/agent/AUFTRAG_Fundament.md step 4), only these lines change to imports. */

export const PV = window.HeinzProviders;
export const Heinz = window.Heinz;
export const HeinzStore = window.HeinzStore;
export const HeinzCaps = window.HeinzCaps;
export const HeinzSeries = window.HeinzSeries;
export const HeinzPersonas = window.HeinzPersonas;
export const HeinzDashboardData = window.HeinzDashboardData;

// Markdown und Syntaxfärbung: lib/markdown.js
export const esc = window.HeinzMarkdown.esc;
export const parseOfflineMarkdown = window.HeinzMarkdown.parse;

export const $ = id => document.getElementById(id);
