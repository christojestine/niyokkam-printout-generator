/**
 * downloadDocx.js
 *
 * Packs a docx.Document into a Blob and triggers a browser file download.
 * Uses URL.createObjectURL so no server round-trip is needed.
 */

import { downloadBlob, defaultFilename } from "./downloadBlob.js";

/**
 * @param {import("docx").Document} doc
 * @param {string} [filename]
 */
export async function downloadDocx(doc, filename) {
  const { Packer } = await import("docx");

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename ?? defaultFilename("docx"));
}
