/**
 * fontSupport.js
 *
 * Centralized handling of the Malayalam print font. Content is converted
 * from Unicode to legacy ML-TT glyph codes (see converter/unicode2ascii.js)
 * and rendered with a patched copy of ML-TT Pooram bundled with the app
 * (src/font/files/NiyokkamPooram.ttf, built by tools/build-font.py).
 *
 * The font is embedded into every export (.docx and .pdf), so output never
 * depends on which fonts are installed on the device that generates, opens
 * or prints the document.
 */

import { unicode2ascii } from "../converter/unicode2ascii.js";

/** Family name inside NiyokkamPooram.ttf — must match exactly for Word/CSS. */
export const PRINT_FONT_NAME = "NiyokkamPooram";

export const PRINT_FONT_URL = new URL("./files/NiyokkamPooram.ttf", import.meta.url).href;

/**
 * Converts Malayalam Unicode text to the glyph codes of the print font.
 *
 * @param {string} text
 * @returns {string}
 */
export function toPrintText(text) {
  return unicode2ascii(text ?? "");
}

let fontBytesPromise = null;

/**
 * Fetches the bundled print font once and caches the bytes for later exports.
 *
 * @returns {Promise<Uint8Array>}
 */
export function loadPrintFontBytes() {
  if (!fontBytesPromise) {
    fontBytesPromise = fetch(PRINT_FONT_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load print font (${res.status})`);
        return res.arrayBuffer();
      })
      .then((buf) => new Uint8Array(buf))
      .catch((err) => {
        fontBytesPromise = null; // allow a retry on the next export
        throw err;
      });
  }
  return fontBytesPromise;
}
