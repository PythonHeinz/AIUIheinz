/* lib/dashboard/base.js – Brücke zu den Bibliotheken unter lib/ und kleine Helfer der Seite.
 * ES module (docs/MODULE.md). Imports only the libraries under lib/ (which import nothing). This is the only place of the dashboard that imports the libraries or reads window.Heinz (lib/core.js, the classic head script);
 * every other file imports from here. */

import { HeinzProviders as PV, HeinzCaps } from '../providers.js';
import { HeinzStore } from '../store.js';
import { HeinzSeries } from '../testreihe.js';
import { HeinzPersonas } from '../personas.js';
import { HeinzDashboardData } from '../dashboarddata.js';
import { HeinzMarkdown } from '../markdown.js';
import '../pixel.js';   // adds Heinz.Pixel (lib/core.js stays the classic head script: theme and language before the first paint)

export { PV, HeinzCaps, HeinzStore, HeinzSeries, HeinzPersonas, HeinzDashboardData };
export const Heinz = window.Heinz;

// Markdown und Syntaxfärbung: lib/markdown.js
export const esc = HeinzMarkdown.esc;
export const parseOfflineMarkdown = HeinzMarkdown.parse;

export const $ = id => document.getElementById(id);
