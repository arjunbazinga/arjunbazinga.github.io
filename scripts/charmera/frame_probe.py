# Run the original per-strip frame compositor (file 0xEE80 -> 0xEDA4) on test pairs.
import struct, sys, hashlib
from unicorn import Uc, UC_ARCH_ARM, UC_MODE_ARM
from unicorn.arm_const import *
fw = open(sys.argv[1], "rb").read()
assert hashlib.sha256(fw).hexdigest() == "720ed0b65c91b149b0916498732b0ecf40227736ef5e3c126c487a7b5253436c"
R = lambda f: f - 0x200
gl = struct.unpack_from("<I", fw, 0xEFF4)[0]
print("frame state global (runtime):", hex(gl))
u = Uc(UC_ARCH_ARM, UC_MODE_ARM)
u.mem_map(0, 0x2000000)
u.mem_write(0, fw[0x200:])
STOP, DST, SRC = 0x1F00000, 0x1000000, 0x1400000
u.mem_write(STOP, b"\xfe\xff\xff\xea")
u.mem_write(R(0xEC9C), b"\x1e\xff\x2f\xe1")  # stub the strip loader: bx lr (strip is pre-placed)
u.mem_write(gl + 4, struct.pack("<II", SRC, 0))
# Photo surface: Y=10 everywhere, chroma U=20, V=30 (row-pair layout).
photo = bytearray()
for p in range(300):
    photo += bytes([10]) * 800 + bytes([20, 30]) * 400 + bytes([10]) * 800
u.mem_write(DST, bytes(photo))
# Frame strip 0 (rows 0-199): test pairs along the first row pair, chroma set per pair.
tests = [((140, 140), (128, 128)), ((140, 140), (85, 255)), ((140, 141), (128, 128)), ((139, 140), (128, 128)),
         ((200, 200), (128, 128)), ((76, 76), (85, 255))]
strip = bytearray()
for p in range(100):
    yrow, uv = bytearray(), bytearray()
    for k in range(400):
        (y0, y1), (uu, vv) = tests[k % len(tests)]
        yrow += bytes([y0, y1]); uv += bytes([uu, vv])
    strip += yrow + uv + yrow
u.mem_write(SRC, bytes(strip))
u.reg_write(UC_ARM_REG_SP, 0x1E00000); u.reg_write(UC_ARM_REG_LR, STOP)
u.reg_write(UC_ARM_REG_R0, DST); u.reg_write(UC_ARM_REG_R1, 0); u.reg_write(UC_ARM_REG_R2, 800)  # destination row width in bytes
u.emu_start(R(0xEE80), STOP, count=50_000_000)
out = u.mem_read(DST, 2400)
for k, ((y0, y1), (uu, vv)) in enumerate(tests):
    ye = tuple(out[2 * k:2 * k + 2]); ch = tuple(out[800 + 2 * k:800 + 2 * k + 2]); yo = tuple(out[1600 + 2 * k:1600 + 2 * k + 2])
    verdict = "photo kept (transparent)" if ye == (10, 10) else "frame drawn"
    print(f"frame Y{(y0, y1)} UV{(uu, vv)} -> even Y{ye} UV{ch} odd Y{yo}: {verdict}")
