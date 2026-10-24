"""Print the camera's English menu text from the GPRS pack in the firmware.

Usage: python3 scripts/charmera/menu_text.py <Original_Firmware.bin>

The pack sits at 0x141400. Word 26 onward holds 14 per-language tables of (length, offset)
pairs, offsets relative to the pack. English is plain ASCII; the other 13 languages store
glyph numbers. Presence in this table does not show that the Charmera ever displays a string.
"""
import struct
import sys

PACK, END, LANGUAGES = 0x141400, 0x15F600, 14


def strings(pack, table, stop):
    out = []
    for p in range(table, stop, 8):
        length, offset = struct.unpack_from("<II", pack, p)
        out.append(pack[offset:offset + length].rstrip(b"\0").decode("ascii", "replace"))
    return out


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pack = open(sys.argv[1], "rb").read()[PACK:END]
    tables = struct.unpack_from(f"<{LANGUAGES}I", pack, 26 * 4)
    for i, text in enumerate(strings(pack, tables[0], tables[1])):
        if text:
            print(i, text)
