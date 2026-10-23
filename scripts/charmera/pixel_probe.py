#!/usr/bin/env python3
"""Run the stock Pixel filter loop (file offset 0x6E4DC) on test patterns.

Usage: python scripts/charmera/pixel_probe.py /path/to/Original_Firmware.bin

Prints, for selectors 8-11, the VYUY bytes the original ARM code writes for a
luma ramp and for mixed bright/dark pixel pairs. These outputs are what
test_pixel.js checks the essay's JavaScript reimplementation against.
Requires unicorn==2.1.4. Does not modify or emit firmware.
"""
import hashlib
import sys

from unicorn import UC_ARCH_ARM, UC_MODE_ARM, Uc
from unicorn.arm_const import UC_ARM_REG_LR, UC_ARM_REG_R0, UC_ARM_REG_SP

FIRMWARE_SHA256 = "720ed0b65c91b149b0916498732b0ecf40227736ef5e3c126c487a7b5253436c"
LOOP = 0x6E4DC - 0x200          # runtime address = file offset - 0x200
SELECTOR = 0x10FBC5             # runtime address of the photo-look selector byte
BUFFER, STOP = 0x300000, 0xF00000
PAIRS = 400 * 600               # 800x600 VYUY surface, two pixels per four bytes


def run(firmware, selector, pattern):
    u = Uc(UC_ARCH_ARM, UC_MODE_ARM)
    u.mem_map(0, 0x1000000)
    u.mem_write(0, firmware[0x200:])
    u.mem_write(SELECTOR, bytes([selector]))
    u.mem_write(BUFFER, b"".join(pattern(i) for i in range(PAIRS)))
    u.mem_write(STOP, b"\xfe\xff\xff\xea")  # b . (return lands here)
    u.reg_write(UC_ARM_REG_R0, BUFFER)
    u.reg_write(UC_ARM_REG_SP, 0x4F0000)
    u.reg_write(UC_ARM_REG_LR, STOP)
    u.emu_start(LOOP, STOP, count=20_000_000)
    return u


def main():
    firmware = open(sys.argv[1], "rb").read()
    assert hashlib.sha256(firmware).hexdigest() == FIRMWARE_SHA256, "unexpected firmware"
    mixed = [(200, 50), (50, 200), (124, 123), (123, 124)]
    for selector in range(8, 12):
        ramp = run(firmware, selector, lambda i: bytes([128, i % 256, 128, i % 256]))
        out = ramp.mem_read(BUFFER, 256 * 4)
        changes, previous = [], None
        for y in range(256):
            px = tuple(out[y * 4:y * 4 + 4])
            if px != previous:
                changes.append((y, px))
                previous = px
        pairs = run(firmware, selector, lambda i: bytes([90, mixed[i % 4][0], 160, mixed[i % 4][1]]))
        out = pairs.mem_read(BUFFER, 16)
        print(f"selector {selector}: ramp (luma, V Y0 U Y1) {changes}")
        print(f"            mixed pairs {mixed} -> {[tuple(out[k * 4:k * 4 + 4]) for k in range(4)]}")


if __name__ == "__main__":
    main()
