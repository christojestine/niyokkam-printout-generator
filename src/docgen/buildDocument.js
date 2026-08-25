/**
 * buildDocument.js
 *
 * Builds a docx.Document from an array of NiyokkamItems.
 *
 * Page layout  : Landscape (A4), one date-content item per page
 * Date heading : TW Cen MT, Bold, 36pt, Centered
 * Content      : Plain Malayalam Unicode text rendered with the self-hosted
 *                Noto Sans Malayalam font (see src/font/files/) — no legacy
 *                ML-TT/Karthika font or device-installed font dependency.
 *
 * Depends on the `docx` ES module (loaded via import map from esm.sh).
 */

// A4 dimensions in twentieths-of-a-point (twips). 1 inch = 1440 twips.
// A4 portrait: width=11906, height=16838
//
// NOTE: docx's PageSize component automatically swaps width/height when
// orientation is LANDSCAPE, so we must pass the natural PORTRAIT dimensions
// here — passing already-swapped values would cause a double-flip and
// produce a portrait page instead of landscape.
const A4_WIDTH  = 11906; //  8.27 in
const A4_HEIGHT = 16838; // 11.69 in

// Page margins in twips (1 inch = 1440 twips).
// "Narrow" preset (matches Word's built-in Narrow margins option): 0.5 in all sides
const MARGIN = 720; // 0.5 inch all sides

/**
 * @param {Array<{id:string, date:string, content:string}>} items
 * @param {{ dateFontSize?: number, contentFontSize?: number }} [options]
 * @returns {Promise<import("docx").Document>}
 */
export async function buildDocument(items, options = {}) {
  const {
    Document,
    Paragraph,
    TextRun,
    AlignmentType,
    PageBreak,
    PageOrientation,
    BorderStyle,
    PageBorderOffsetFrom,
  } = await import("docx");

  const {
    dateFontSize   = 72,   // half-points → 36pt
    contentFontSize = 72,  // half-points → 36pt
  } = options;

  // Always render plain Malayalam Unicode text with the bundled Noto Sans
  // Malayalam font. Detecting a legacy ML-TT/Karthika font by name is
  // unreliable — many devices ship an unrelated system font sharing that
  // name, which previously caused perfectly valid Unicode text to be
  // mangled into ASCII glyph codes it could never render correctly.
  const contentFontName = "Noto Sans Malayalam";
  const children = [];

  items.forEach((item, idx) => {
    // ── Date heading — TW Cen MT, Bold ────────────────────────────────────
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: item.date,
            bold: true,
            size: dateFontSize,
            font: { ascii: "TW Cen MT", hAnsi: "TW Cen MT", cs: "TW Cen MT", eastAsia: "TW Cen MT", hint: "default" },
          }),
        ],
        spacing: { after: 120 }, // small gap below date
      })
    );

    // ── Two blank lines between date and content ──────────────────────────
    children.push(new Paragraph({ children: [] }));
    children.push(new Paragraph({ children: [] }));

    // ── Content — plain Malayalam Unicode, Noto Sans Malayalam font ─────
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            // hint:"default" forces Word to render with the ascii/hAnsi font immediately,
            // instead of leaving stale glyph metrics that only refresh once the font is
            // manually reselected in the Font box.
            text: item.content,
            bold: true,
            noProof: true,
            size: contentFontSize,
            font: {
              ascii: contentFontName,
              hAnsi: contentFontName,
              cs: contentFontName,
              eastAsia: contentFontName,
              hint: "default",
            },
          }),
        ],
        spacing: { after: 240 },
      })
    );

    // ── Each date-content item stands alone on its own page ──────────────
    if (idx < items.length - 1) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }
  });

  return new Document({
    // Also override the doc-default run font so the paragraph mark (¶) matches the
    // content font — otherwise Word can re-layout/re-substitute glyphs on first edit.
    styles: {
      default: {
        document: {
          run: {
            font: {
              ascii: contentFontName,
              hAnsi: contentFontName,
              cs: contentFontName,
              eastAsia: contentFontName,
              hint: "default",
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width:  A4_WIDTH,
              height: A4_HEIGHT,
            },
            margin: {
              top:    MARGIN,
              bottom: MARGIN,
              left:   MARGIN,
              right:  MARGIN,
            },
            borders: {
              pageBorders: {
                offsetFrom: PageBorderOffsetFrom.PAGE,
              },
              pageBorderTop:    { style: BorderStyle.DOUBLE, size: 6, color: "000000", space: 12 },
              pageBorderBottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000", space: 12 },
              pageBorderLeft:   { style: BorderStyle.DOUBLE, size: 6, color: "000000", space: 12 },
              pageBorderRight:  { style: BorderStyle.DOUBLE, size: 6, color: "000000", space: 12 },
            },
          },
        },
        children,
      },
    ],
  });
}
