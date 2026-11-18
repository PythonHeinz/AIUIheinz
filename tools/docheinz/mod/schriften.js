/* tools/docheinz/mod/schriften.js – Lesefonts als Daten (Insel-Modul, keine Oberfläche).
 * Die Schriftdateien liegen im Werkzeugordner (fonts/*.woff2, Lizenz OFL, siehe fonts/OFL-*.txt), nichts kommt aus dem Netz.
 * Die @font-face-Regeln und die Zuordnung `[data-font=<id>]` stehen in docheinz.css; ein Test prüft, dass beides zu dieser Liste passt.
 *   FONTS: [{ id, label: { en, de }, load: string[] | null }]   load = Angaben für document.fonts.load (null: Systemschrift)
 *   fontOf(id) -> Eintrag (unbekannt: Standard); isFont(id) -> boolean; DEFAULT_FONT */
export const DEFAULT_FONT = 'serif';
export const FONTS = [
    { id: 'serif', label: { en: 'Serif (system)', de: 'Serife (System)' }, load: null },
    { id: 'literata', label: { en: 'Literata', de: 'Literata' }, load: ['400 1em "Literata"', 'italic 400 1em "Literata"', '700 1em "Literata"'] },
    { id: 'lora', label: { en: 'Lora', de: 'Lora' }, load: ['400 1em "Lora"', 'italic 400 1em "Lora"', '700 1em "Lora"'] },
    { id: 'atkinson', label: { en: 'Atkinson Hyperlegible', de: 'Atkinson Hyperlegible' }, load: ['400 1em "Atkinson Hyperlegible"', 'italic 400 1em "Atkinson Hyperlegible"', '700 1em "Atkinson Hyperlegible"'] },
    { id: 'inter', label: { en: 'Inter', de: 'Inter' }, load: ['400 1em "Inter"', 'italic 400 1em "Inter"', '700 1em "Inter"'] },
    { id: 'sans', label: { en: 'Sans (system)', de: 'Serifenlos (System)' }, load: null },
    { id: 'mono', label: { en: 'Mono (system)', de: 'Festbreite (System)' }, load: null },
];
export const isFont = id => FONTS.some(f => f.id === id);
export const fontOf = id => FONTS.find(f => f.id === id) || FONTS[0];
