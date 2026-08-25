/**
 * fontSupport.js
 *
 * Centralized font handling for Malayalam export. The app relies on the
 * legacy Karthika/ML-TT font mapping for the generated document, but some
 * devices don't have that font installed. This helper provides a safe fallback
 * so export still works without crashing or silently rendering broken glyphs.
 */

export const LEGACY_MALAYALAM_FONT_NAMES = [
  "ML-TTPooram",
  "ML-TT Pooram",
  "Karthika",
  "Kartika",
  "Rachana",
];

export const FALLBACK_MALAYALAM_FONT_STACK = [
  "Noto Sans Malayalam",
  "Nirmala UI",
  "FreeSerif",
  "sans-serif",
];

/**
 * Detect whether a font name is available in the current browser/OS font list.
 * Falls back to a conservative approximation for non-browser runtimes.
 *
 * @param {string} fontName
 * @returns {boolean}
 */
export function isFontAvailable(fontName) {
  if (typeof document === "undefined") return false;

  if (document.fonts && typeof document.fonts.check === "function") {
    const parsedName = fontName.includes(" ") ? `"${fontName}"` : fontName;
    return document.fonts.check(`12px ${parsedName}`);
  }

  return false;
}

/**
 * Determine whether the legacy Karthika/ML-TT font is usable.
 *
 * @returns {boolean}
 */
export function hasLegacyMalayalamFont() {
  return LEGACY_MALAYALAM_FONT_NAMES.some((fontName) => isFontAvailable(fontName));
}

/**
 * Returns the export text: when the legacy font is unavailable, keep the
 * original Unicode text instead of converting to the ASCII glyph set.
 *
 * @param {string} text
 * @param {boolean} [legacyFontEnabled=true]
 * @returns {string}
 */
export function getMalayalamExportText(text, legacyFontEnabled = true) {
  if (!text || legacyFontEnabled || typeof text !== "string") {
    return text;
  }

  return text;
}

/**
 * Returns a CSS font stack suitable for a Malayalam export page.
 *
 * @param {boolean} [legacyFontEnabled=true]
 * @returns {string}
 */
export function getMalayalamFontStack(legacyFontEnabled = true) {
  if (legacyFontEnabled) {
    return '"ML-TTPooram", "Karthika", "Noto Sans Malayalam", sans-serif';
  }

  return '"Noto Sans Malayalam", "Nirmala UI", "FreeSerif", sans-serif';
}
