# Unicode Malayalam → ASCII (Karthika Font) Conversion Logic

This document explains how the `unicode2ascii()` function converts Malayalam Unicode text
into the legacy ASCII glyph codes used by the **Karthika** font (a non-Unicode Malayalam
typeface where each visual glyph is mapped to an ASCII/extended-ASCII character). This
logic is used to generate printouts where the target rendering environment doesn't support
Unicode Malayalam fonts directly, and instead needs pre-transliterated glyph sequences.

## 1. Overview

Malayalam Unicode text is stored as a sequence of **logical** Unicode code points (base
consonants, vowel signs, virama/chandrakala, conjunct-forming sequences, etc.). Legacy
Malayalam fonts like Karthika, however, are **glyph-based**: each printable shape (glyph)
in the font is assigned to a single ASCII or extended-ASCII character code (0–255), and
several Unicode code point sequences must be _reordered_ when converted to glyph codes
because Malayalam vowel signs are pronounced/typed after the consonant but are visually
rendered _before_ it (or wrap around it).

The conversion therefore needs to:

1. Match the **longest possible Unicode sequence** first (to correctly identify conjunct
   consonants like ക്ക, ണ്ട, ന്റ, etc., which must map to a single glyph).
2. Apply special **reordering rules** for vowel signs that visually appear before, around,
   or split across the consonant glyph (e.g., െ, േ, ൈ, ൊ, ോ, ൌ).
3. Track a special one-character lookback flag (`bRepham`) to correctly handle the
   "reph" form (്ര, pronounced "rr"/chillu-ra conjunct) which itself gets rendered
   _before_ the consonant that follows it, requiring insertion logic to be adjusted when
   it's immediately followed by another glyph that also needs to be inserted before the
   base consonant.

## 2. Data structure: `mapTable`

```js
var mapTable = {
    "font": "karthika",
    "map": {
        "ം": "w",
        ...
        "ണ്ട": "ï",     // 2-character conjunct → single glyph
        "സ്റ്റ": "Ì",   // 3-character conjunct → single glyph
        "െ": "s",        // vowel sign that moves before the consonant
        "േ": "t",
        "ൈ": "ss",       // 2-glyph vowel sign that moves before the consonant
        "ൊ": "sm",       // 2-glyph vowel sign that wraps around consonant
        "ോ": "tm",
        "ൌ": "su",
        "്ര": "{",       // reph / "combining ra" that flips before consonant
        "്യേ": "ty",     // special combined conjunct + vowel sign
        "്യെ": "sy",
        ...
    }
};
```

- **Keys** are Unicode Malayalam substrings, 1 to 3 characters long.
- **Values** are the corresponding ASCII/extended-ASCII glyph code(s) in the target font.
  Some values are a **single character** (simple 1:1 glyph substitution), others are a
  **string of 2 characters** representing two glyphs that must be placed on _either side_
  of the previously-emitted base consonant glyph (used for vowel signs that visually
  surround the consonant).

## 3. Main algorithm (`unicode2ascii`)

```
for each position `index` in strText:
    for lenChar = 3 down to 1:
        chUnicode = substring(strText, index, index+lenChar)
        if mapTable.map[chUnicode] exists:
            chAscii = mapTable.map[chUnicode]
            → apply one of the special-case rules below to build ascii_text
            index += lenChar
            break out of the lenChar loop
        else if lenChar == 1:
            // no mapping found even for a single character
            ascii_text += chUnicode   // passthrough (e.g. spaces, punctuation, digits)
            index++
return ascii_text
```

### Key points

- **Greedy longest-match**: it always tries a 3-character lookahead first, then 2, then 1.
  This ensures multi-character conjuncts (`സ്റ്റ`, `ണ്ട`, `ക്ഷ`, ...) and special vowel
  combos (`്യേ`, `്യെ`) are matched before falling back to shorter/simpler mappings.
- **Passthrough for unmapped characters**: if not even a single character matches (e.g.
  space, digits, Latin letters, punctuation not in the map — except `-` which _is_
  mapped), it is copied to the output unchanged.
- A **`bRepham`** flag remembers that the previous glyph emitted was the "reph" form
  (്ര → `{`), which itself needs to appear _before_ the base consonant it's attached to.
  If the _next_ character is also a "before-consonant" vowel sign, the insertion position
  has to account for both glyphs now sitting in front of the base consonant.

## 4. Special-case rendering rules (glyph reordering)

Malayalam vowel signs fall into different categories based on where their glyph visually
renders relative to the base consonant. Below, "base consonant" refers to the **last
glyph(s) already appended to `ascii_text`** before the current vowel sign is processed
(consonant glyphs are always emitted immediately as soon as they're matched, so by the
time a following vowel sign is processed, the consonant's ASCII code is already the tail
of `ascii_text`).

### 4.1 `ൈ` (vowel sign AI) → `ss`

Renders as a single glyph placed **before** the base consonant.

- Normal case: insert `chAscii` ("ss") before the last character of `ascii_text`.
  ```
  ascii_text = ascii_text[:-1] + chAscii + ascii_text[-1]
  ```
- If `bRepham` was set (previous glyph was reph `{`): the reph glyph and the consonant
  glyph are both already at the tail; insert before _both_ of them, keeping order but
  removing/reset `bRepham`.
  ```
  ascii_text = ascii_text[:-2] + chAscii + ascii_text[-2] + ascii_text[-1]
  ```

### 4.2 `ോ`, `ൊ`, `ൌ` (vowel signs O, O-short, AU) → two-glyph split (e.g. `tm`, `sm`, `su`)

These vowel signs render as **two glyphs that wrap around** the base consonant: the first
part before, the second part after.

- Normal case:
  ```
  ascii_text = ascii_text[:-1] + chAscii[0] + ascii_text[-1] + chAscii[1]
  ```
- With `bRepham` set (reph precedes the consonant): the first glyph part goes before the
  reph+consonant pair, and the second glyph part still goes after the consonant:
  ```
  ascii_text = ascii_text[:-2] + chAscii[0] + ascii_text[-2] + ascii_text[-1] + chAscii[1]
  ```
  `bRepham` is reset to 0.

### 4.3 `്യേ`, `്യെ` (conjunct + vowel sign combos) → two-glyph split (`ty`, `sy`)

Same wrap-around pattern as 4.2, but `bRepham` is unconditionally reset to 0 beforehand
(these combos are not expected to follow a reph in valid text):

```
ascii_text = ascii_text[:-1] + chAscii[0] + ascii_text[-1] + chAscii[1]
```

### 4.4 `െ`, `േ` (vowel signs E, EE) and `്ര` (reph / RA-virama) → glyph before consonant + set reph flag

These three share handling because `്ര` (reph) also renders before the consonant, just
like `െ`/`േ`, but ്ര must additionally set `bRepham = 1` because the following character
in the text is the _actual_ base consonant that hasn't been appended to `ascii_text` yet
at the time reph is processed — i.e. reph appears in the source **before** its consonant,
opposite to vowel signs.

- Normal case:
  ```
  ascii_text = ascii_text[:-1] + chAscii[0] + ascii_text[-1]
  ```
- If `bRepham` was already set from a previous iteration: insert before the last **two**
  characters instead of one, then reset `bRepham`:
  ```
  ascii_text = ascii_text[:-2] + chAscii[0] + ascii_text[-2] + ascii_text[-1]
  ```
- If the matched character is specifically `്ര`, set `bRepham = 1` afterward (regardless
  of which branch above ran) so the _next_ processed character knows a reph glyph is
  sitting immediately before the most recent consonant.

### 4.5 All other mappings (plain consonants, independent vowels, conjuncts, virama, etc.)

Simple append, no reordering:

```
bRepham = 0
ascii_text += chAscii
```

`bRepham` is reset because a plain consonant/character breaks any pending reph
relationship.

### 4.6 No match found (any length)

When even a single character doesn't exist in `mapTable.map` (lenChar == 1 case fails),
the character is appended unchanged, `index` advances by 1, and `bRepham` is reset to 0.

## 5. Why the reordering is necessary

Malayalam script (like other Brahmic scripts) is logically encoded in **phonetic/typing
order** in Unicode: consonant, then vowel sign, even though visually some vowel signs
(and the reph form of ര) are drawn to the _left_ of, or _wrapped around_, the consonant
glyph. Legacy non-Unicode fonts like Karthika don't do this reordering themselves — the
font just draws whatever glyph code is given, in the order given. So the conversion logic
must perform the **visual reordering manually** before handing the ASCII string off to be
rendered with the Karthika font, by moving the "before" part of split vowel signs (or
reph) to just before the last-emitted consonant glyph in the output buffer.

## 6. Reimplementation checklist

To reproduce this logic in the application:

1. Load/port the `mapTable.map` dictionary (Unicode Malayalam substring → ASCII glyph
   code, values may be a 1-character string or a 2-character string).
2. Iterate the input string by Unicode code point (careful with JS `.length`/`substring`
   using UTF-16 code units — Malayalam base characters are within the BMP so this is
   generally fine, but be careful if porting to a language with different string
   indexing, e.g. Python should be fine too since Malayalam block is BMP).
3. At each position, try matching 3, then 2, then 1 character substrings against the map,
   preferring the longest match (this order matters — do not sort/shortcut it).
4. Maintain a single boolean/flag `bRepham` across iterations (starts `false`).
5. Implement the 4 special-case branches in this exact priority order:
   1. exact match `ൈ`
   2. exact match `ോ` / `ൊ` / `ൌ`
   3. exact match `്യേ` / `്യെ`
   4. exact match `െ` / `േ` / `്ര`
   5. default (plain append)
6. For unmatched single characters, passthrough append and advance by 1.
7. Return the accumulated `ascii_text`.

## 7. Source reference

Original implementation lives in the legacy conversion script (`unicode2ascii` function)
using a global `mapTable` object with `font: "karthika"` and a `map` dictionary of
Unicode-to-ASCII glyph mappings, as provided in the project source.
