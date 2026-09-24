/**
 * buildPdf.js
 *
 * Builds a PDF Blob directly from an array of NiyokkamItems — an
 * alternative export format to the .docx produced by buildDocument.js.
 *
 * Rendering strategy: content is converted to ML-TT glyph codes (see
 * converter/unicode2ascii.js) and written as real, vector PDF text using the
 * bundled "NiyokkamPooram" font, which jsPDF embeds into the file. Because
 * ML-TT text is already in visual glyph order, no complex-script shaping is
 * needed, so the output is identical on every device — no dependency on
 * installed fonts or the browser's text rendering, and no rasterization.
 *
 * Page layout  : Landscape A4, one date-content item per page
 * Date heading : Helvetica (built into every PDF viewer), Bold, 36pt, Centered
 * Content      : Niyokkam Pooram, Bold (simulated with a thin outline stroke,
 *                as the font has no bold face), 36pt, Centered
 */

import { PRINT_FONT_NAME, loadPrintFontBytes, toPrintText } from "../font/fontSupport.js";

const MARGIN_PT       = 36;   // 0.5in narrow margin, matches buildDocument.js
const BORDER_INSET_PT = 12;   // page border distance from the page edge
const BORDER_GAP_PT   = 3;    // gap between the two lines of the double border
const FONT_SIZE_PT    = 36;
const DATE_LINE_PT    = FONT_SIZE_PT * 1.15;
const DATE_GAP_PT     = 6 + 2 * 14; // spacing after date + two blank lines
const CONTENT_LINE_PT = FONT_SIZE_PT * 1.3;
const FAUX_BOLD_STROKE_PT = 0.9;

const FONT_VFS_NAME = "NiyokkamPooram.ttf";

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function toBase64(bytes) {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} width
 * @param {number} height
 */
function drawPageBorder(doc, width, height) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.75);
  for (const inset of [BORDER_INSET_PT, BORDER_INSET_PT + BORDER_GAP_PT]) {
    doc.rect(inset, inset, width - 2 * inset, height - 2 * inset, "S");
  }
}

/**
 * @param {Array<{id:string, date:string, content:string}>} items
 * @returns {Promise<Blob>}
 */
export async function buildPdf(items) {
  const [{ jsPDF }, fontBytes] = await Promise.all([
    import("jspdf"),
    loadPrintFontBytes(),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.addFileToVFS(FONT_VFS_NAME, toBase64(fontBytes));
  doc.addFont(FONT_VFS_NAME, PRINT_FONT_NAME, "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxTextWidth = pageWidth - 2 * MARGIN_PT;
  const centerX = pageWidth / 2;

  items.forEach((item, idx) => {
    if (idx > 0) doc.addPage("a4", "landscape");
    drawPageBorder(doc, pageWidth, pageHeight);

    doc.setFontSize(FONT_SIZE_PT);
    doc.setFont(PRINT_FONT_NAME, "normal");
    const contentLines = String(toPrintText(item.content))
      .split("\n")
      .flatMap((line) => doc.splitTextToSize(line, maxTextWidth));

    // Vertically center the date + gap + content block, like the .docx layout.
    const blockHeight = DATE_LINE_PT + DATE_GAP_PT + contentLines.length * CONTENT_LINE_PT;
    let y = Math.max(MARGIN_PT, (pageHeight - blockHeight) / 2);

    doc.setFont("helvetica", "bold");
    doc.text(item.date, centerX, y, { align: "center", baseline: "top" });
    y += DATE_LINE_PT + DATE_GAP_PT;

    doc.setFont(PRINT_FONT_NAME, "normal");
    doc.setLineWidth(FAUX_BOLD_STROKE_PT);
    for (const line of contentLines) {
      doc.text(line, centerX, y, {
        align: "center",
        baseline: "top",
        renderingMode: "fillThenStroke",
      });
      y += CONTENT_LINE_PT;
    }
  });

  return doc.output("blob");
}
