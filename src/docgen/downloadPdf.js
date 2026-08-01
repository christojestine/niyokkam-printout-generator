/**
 * downloadPdf.js
 *
 * Triggers a browser file download for a PDF Blob built by buildPdf.js.
 */

import { downloadBlob, defaultFilename } from "./downloadBlob.js";

/**
 * @param {Blob} blob
 * @param {string} [filename]
 */
export function downloadPdf(blob, filename) {
  downloadBlob(blob, filename ?? defaultFilename("pdf"));
}
