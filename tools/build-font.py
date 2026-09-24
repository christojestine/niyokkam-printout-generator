"""
build-font.py

Builds the Malayalam print font bundled with the app
(src/font/files/NiyokkamPooram.ttf) from an ML-TT Pooram TTF.

Why a patched copy instead of the original file:
  1. Two conjuncts in the converter's glyph table (mapTable.js) are encoded
     at code points ML-TT Pooram does not map:
        ണ്ട -> "ï" (U+00EF)   but Pooram draws it at U+00AD (soft hyphen)
        മ്ല -> "Ÿ" (U+0178)   but Pooram draws it at U+00BE
     U+00AD can't be used directly — Word and browsers treat it as an
     invisible optional hyphen — so the missing code points are added to the
     font's cmap, pointing at the existing glyphs.
  2. The family is renamed so the copy embedded in .docx/.pdf exports always
     wins over any (unpatched) ML-TT Pooram installed on the viewing device.

Usage (dev-only, requires `pip install fonttools`):
  python tools/build-font.py "%LOCALAPPDATA%/Microsoft/Windows/Fonts/ML_TT_Pooram_Normal.ttf"
"""

import sys
from pathlib import Path

from fontTools.ttLib import TTFont

# No spaces: docx uses the family name as the embedded font's part name,
# and a space there makes Word reject the file as corrupted.
FAMILY = "NiyokkamPooram"
POSTSCRIPT = "NiyokkamPooram-Regular"
OUT = Path(__file__).resolve().parent.parent / "src" / "font" / "files" / "NiyokkamPooram.ttf"

# new code point -> existing code point whose glyph it should reuse
EXTRA_MAPPINGS = {
    0x00EF: 0x00AD,  # ï -> ണ്ട
    0x0178: 0x00BE,  # Ÿ -> മ്ല
}


def main(src):
    font = TTFont(src)

    for table in font["cmap"].tables:
        if not table.isUnicode():
            continue
        for new_cp, existing_cp in EXTRA_MAPPINGS.items():
            glyph = table.cmap.get(existing_cp)
            if glyph is None:
                sys.exit(f"source font has no glyph at U+{existing_cp:04X}")
            table.cmap[new_cp] = glyph

    names = font["name"]
    for record in list(names.names):
        if record.nameID in (1, 16):
            names.setName(FAMILY, 1 if record.nameID == 1 else 16,
                          record.platformID, record.platEncID, record.langID)
        elif record.nameID == 2:
            names.setName("Regular", 2, record.platformID, record.platEncID, record.langID)
        elif record.nameID == 4:
            names.setName(f"{FAMILY} Regular", 4, record.platformID, record.platEncID, record.langID)
        elif record.nameID == 6:
            names.setName(POSTSCRIPT, 6, record.platformID, record.platEncID, record.langID)
        elif record.nameID == 3:
            names.setName(f"{POSTSCRIPT};niyokkam", 3, record.platformID, record.platEncID, record.langID)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUT)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
