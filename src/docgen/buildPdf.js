/**
 * buildPdf.js
 *
 * Builds a PDF Blob directly from an array of NiyokkamItems — an
 * alternative export format to the .docx produced by buildDocument.js.
 *
 * Rendering strategy: each item is laid out in a page-sized container,
 * rasterized with html2canvas (so the browser's own text-shaping engine
 * correctly renders complex Malayalam conjuncts/vowel reordering), then
 * placed as a full-bleed image on a jsPDF page.
 *
 * Isolation: the container is built inside a hidden, same-origin `<iframe>`
 * whose footprint on the host page is 0×0 (width/height: 0). This guarantees
 * the render can never visually appear on top of the app UI, no matter what
 * CSS stacking contexts exist in the host page — a plain `z-index` trick on
 * a body-level div is not reliable if any ancestor establishes its own
 * stacking context (e.g. via transform/position), which is what caused the
 * capture page to visibly flash over the UI previously. html2canvas can
 * still fully capture the iframe's internal content at full size, since it
 * works from the iframe's own document/layout, independent of the iframe
 * element's collapsed size on the host page.
 *
 * Page layout  : Landscape A4, one date-content item per page
 * Date heading : TW Cen MT, Bold, 36pt, Centered
 * Content      : Malayalam text converted to legacy ML-TT ASCII glyph codes
 *                (see converter/unicode2ascii.js + converter/mapTable.js),
 *                rendered with the "ML-TT Pooram" font, Bold, 36pt, Centered.
 *                Requires the ML-TT Pooram font to be installed in the browser
 *                environment generating the PDF.
 */

import { unicode2ascii } from "../converter/unicode2ascii.js";
import {
  getMalayalamExportText,
  getMalayalamFontStack,
  hasLegacyMalayalamFont,
} from "../font/fontSupport.js";

// CSS px at 96dpi for A4 landscape (11.69in x 8.27in) — kept in the same
// aspect ratio as the PDF page so the rasterized image fills it exactly.
const PAGE_WIDTH_PX  = 1123;
const PAGE_HEIGHT_PX = 794;
const MARGIN_PX       = 48; // 0.5in narrow margin, matches buildDocument.js

/**
 * Creates a hidden, same-origin iframe with a zero footprint on the host
 * page and returns its document, ready for building capture pages in.
 * @returns {{ iframe: HTMLIFrameElement, iframeDoc: Document }}
 */
function createHiddenRenderFrame() {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    border: 0;
    visibility: hidden;
  `;
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument;
  iframeDoc.open();
  iframeDoc.write("<!DOCTYPE html><html><head></head><body></body></html>");
  iframeDoc.close();
  iframeDoc.body.style.margin = "0";

  return { iframe, iframeDoc };
}

/**
 * @param {Document} iframeDoc
 * @param {{id:string, date:string, content:string}} item
 * @returns {HTMLDivElement}
 */
function createPageElement(iframeDoc, item) {
  const legacyFontEnabled = hasLegacyMalayalamFont();
  const contentFontStack = getMalayalamFontStack(legacyFontEnabled);
  const page = iframeDoc.createElement("div");
  page.style.cssText = `
    width: ${PAGE_WIDTH_PX}px;
    height: ${PAGE_HEIGHT_PX}px;
    box-sizing: border-box;
    padding: ${MARGIN_PX}px;
    border: 4px double #000000;
    background: #ffffff;
    color: #000000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  `;

  const dateEl = iframeDoc.createElement("div");
  dateEl.textContent = item.date;
  dateEl.style.cssText = `
    font-family: "TW Cen MT", sans-serif;
    font-weight: bold;
    font-size: 36pt;
    color: #000000;
    margin-bottom: 12pt;
  `;

  // Two blank lines between date and content, matching pressing Enter twice.
  const spacerEl = iframeDoc.createElement("div");
  spacerEl.innerHTML = "<br><br>";
  spacerEl.style.cssText = `
    font-size: 12pt;
    line-height: 1.3;
  `;

  const contentEl = iframeDoc.createElement("div");
  contentEl.textContent = legacyFontEnabled ? unicode2ascii(item.content) : getMalayalamExportText(item.content, false);
  contentEl.style.cssText = `
    font-family: ${contentFontStack};
    font-weight: bold;
    font-size: 36pt;
    color: #000000;
    line-height: 1.3;
    white-space: pre-wrap;
    max-width: 100%;
  `;

  page.appendChild(dateEl);
  page.appendChild(spacerEl);
  page.appendChild(contentEl);
  return page;
}

/**
 * @param {Array<{id:string, date:string, content:string}>} items
 * @returns {Promise<Blob>}
 */
export async function buildPdf(items) {
  const { jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidthPt = doc.internal.pageSize.getWidth();
  const pageHeightPt = doc.internal.pageSize.getHeight();

  const { iframe, iframeDoc } = createHiddenRenderFrame();

  try {
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const pageEl = createPageElement(iframeDoc, item);
      iframeDoc.body.appendChild(pageEl);

      try {
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          backgroundColor: "#ffffff",
          width: PAGE_WIDTH_PX,
          height: PAGE_HEIGHT_PX,
          windowWidth: PAGE_WIDTH_PX,
          windowHeight: PAGE_HEIGHT_PX,
        });
        const imgData = canvas.toDataURL("image/png");

        if (idx > 0) {
          doc.addPage("a4", "landscape");
        }
        doc.addImage(imgData, "PNG", 0, 0, pageWidthPt, pageHeightPt);
      } finally {
        iframeDoc.body.removeChild(pageEl);
      }
    }
  } finally {
    document.body.removeChild(iframe);
  }

  return doc.output("blob");
}
