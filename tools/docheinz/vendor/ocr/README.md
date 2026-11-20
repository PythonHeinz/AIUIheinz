# Texterkennung (OCR) – lokale Kopien

- `tesseract.esm.min.js`, `worker.min.js`: tesseract.js 7.0.0 (Apache-2.0)
- `tesseract-core-simd-lstm.wasm.js`: tesseract.js-core (Apache-2.0, `LICENSE-tesseract-core.txt`), Variante SIMD + nur LSTM
- `deu.traineddata.gz`, `eng.traineddata.gz`: Tesseract-Sprachdaten 4.0.0 `best_int` (Apache-2.0)

Alles wird erst beim Start der Texterkennung geladen, kein Netz nötig. Weitere Sprachen: gleichnamige `.traineddata.gz` aus `@tesseract.js-data/<sprache>/4.0.0_best_int` hierher legen und in `mod/ocr.js` (`LANGS`) und `ui/i18n.js` (`o_l_*`) ergänzen. Ohne SIMD-fähigen Browser (sehr alte Geräte) startet der Kern nicht.
