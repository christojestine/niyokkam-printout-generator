/**
 * downloadBlob.js
 *
 * Triggers a browser file download for any Blob via an object URL.
 * Shared by downloadDocx.js and downloadPdf.js.
 */

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Release the object URL after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * @param {string} extension - file extension without the dot, e.g. "docx" or "pdf"
 */
export function defaultFilename(extension) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `niyokkam-${yyyy}${mm}${dd}.${extension}`;
}

/**
 * "<first item date> to <last item date>.<ext>", with characters that are
 * illegal in filenames (e.g. "/" in 01/10/2026) replaced by "-".
 * @param {Array<{date:string}>} items
 * @param {string} extension - file extension without the dot, e.g. "pdf"
 */
export function dateRangeFilename(items, extension) {
  if (items.length === 0) return defaultFilename(extension);
  const clean = (s) => String(s).trim().replace(/[\\/:*?"<>|]+/g, "-");
  const first = clean(items[0].date);
  const last = clean(items[items.length - 1].date);
  const name = items.length === 1 || first === last ? first : `${first} to ${last}`;
  return `${name}.${extension}`;
}
