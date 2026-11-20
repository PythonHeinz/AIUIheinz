# vendor/ – pdf.js (lokal, ohne Netz)
- pdfjs-dist 6.5.438, Lizenz Apache-2.0 (`LICENSE-pdfjs.txt`), Quelle: npm `pdfjs-dist@6.5.438`, Dateien `build/pdf.min.mjs` und `build/pdf.worker.min.mjs`.
- Unverändert kopiert, nur umbenannt auf `.js` (`pdf.min.js`, `pdf.worker.min.js`), weil `server.py` `.mjs` nicht sicher als JavaScript ausliefert (Fundament, nicht angefasst). Beide sind ES-Module.
- Geladen nur von `mod/pdf-lesen.js` und nur, wenn ein PDF geöffnet wird. Update: neue Version von npm holen, beide Dateien ersetzen, Versionszeile hier ändern, `bash tests/run_all.sh docheinz`.
