/**
 * unicode2ascii.js
 *
 * Converts a Malayalam Unicode string to the legacy ASCII glyph codes
 * required by the Karthika font, implementing the reordering rules
 * documented in conversionlogic.md.
 *
 * Pure function — no globals, no side effects.
 * Runs as-is under Node (node --test) and in the browser as an ES module.
 */

import { mapTable } from "./mapTable.js";

const map = mapTable;

// Characters that trigger "insert before last consonant" logic
const BEFORE_CONSONANT = new Set(["െ", "േ", "്ര"]);
// Characters that trigger "wrap around consonant" logic (2-glyph value)
const WRAP_AROUND = new Set(["ൊ", "ോ", "ൌ"]);
// 2-glyph combos that wrap (conjunct + vowel)
const WRAP_COMBO = new Set(["്യേ", "്യെ"]);

/**
 * @param {string} strText  - Malayalam Unicode input
 * @returns {string}        - ASCII glyph string for Karthika font
 */
export function unicode2ascii(strText) {
  let ascii_text = "";
  let bRepham = false; // true when the last emitted glyph was the reph "{" (്ര)
  let index = 0;

  while (index < strText.length) {
    let matched = false;

    // Greedy longest-match: try 3, then 2, then 1 character(s)
    for (let lenChar = 3; lenChar >= 1; lenChar--) {
      const chUnicode = strText.substring(index, index + lenChar);

      if (!(chUnicode in map)) {
        if (lenChar === 1) {
          // No mapping at all — passthrough
          ascii_text += chUnicode;
          bRepham = false;
          index += 1;
          matched = true;
        }
        continue;
      }

      const chAscii = map[chUnicode];

      // ── Rule 4.1: ൈ (vowel sign AI) → "ss" ─────────────────────────────
      if (chUnicode === "ൈ") {
        if (bRepham) {
          // reph + consonant are last 2 chars; insert before both
          ascii_text =
            ascii_text.slice(0, -2) +
            chAscii +
            ascii_text.slice(-2);
          bRepham = false;
        } else {
          // insert before last char (the consonant)
          ascii_text =
            ascii_text.slice(0, -1) +
            chAscii +
            ascii_text.slice(-1);
        }
      }

      // ── Rule 4.2: ോ / ൊ / ൌ → two-glyph wrap ───────────────────────────
      else if (WRAP_AROUND.has(chUnicode)) {
        if (bRepham) {
          // first glyph before reph+consonant, second glyph after consonant
          ascii_text =
            ascii_text.slice(0, -2) +
            chAscii[0] +
            ascii_text.slice(-2) +
            chAscii[1];
          bRepham = false;
        } else {
          ascii_text =
            ascii_text.slice(0, -1) +
            chAscii[0] +
            ascii_text.slice(-1) +
            chAscii[1];
        }
      }

      // ── Rule 4.3: ്യേ / ്യെ → two-glyph wrap (no reph expected) ─────────
      else if (WRAP_COMBO.has(chUnicode)) {
        bRepham = false; // unconditionally reset
        ascii_text =
          ascii_text.slice(0, -1) +
          chAscii[0] +
          ascii_text.slice(-1) +
          chAscii[1];
      }

      // ── Rule 4.4: െ / േ / ്ര → insert before consonant ──────────────────
      else if (BEFORE_CONSONANT.has(chUnicode)) {
        if (bRepham) {
          // insert before last 2 chars (reph + consonant), reset reph flag
          ascii_text =
            ascii_text.slice(0, -2) +
            chAscii[0] +
            ascii_text.slice(-2);
          bRepham = false;
        } else {
          ascii_text =
            ascii_text.slice(0, -1) +
            chAscii[0] +
            ascii_text.slice(-1);
        }
        // If this is the reph itself, set the flag so the NEXT character knows
        if (chUnicode === "്ര") {
          bRepham = true;
        }
      }

      // ── Rule 4.5: Default — plain append ────────────────────────────────
      else {
        bRepham = false;
        ascii_text += chAscii;
      }

      index += lenChar;
      matched = true;
      break;
    }

    // Safety guard (shouldn't reach here, but prevents infinite loop)
    if (!matched) {
      ascii_text += strText[index];
      index += 1;
      bRepham = false;
    }
  }

  return ascii_text;
}
