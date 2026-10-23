#!/usr/bin/env python3
"""Rebuild the data and images behind posts/tiny-camera-better-taste/.

Usage, from the repository root:

    python scripts/charmera/build_assets.py /path/to/charmera-aesthetics-handoff-2026-09-29-v20 [--hero /path/to/camera-photo.jpg]

The argument is the extracted v20 handoff directory (see README.md in this
folder for the archive's identity and hashes). Album photographs are read from
static/album/, real Charmera photos from scripts/charmera/source/. The hero
photo of the camera is rebuilt only when its original is supplied; the original
is not in the repository because it shows a house key. Outputs are written into
static/charmera/ and the post folder. Requires numpy and Pillow.
"""
import csv
import json
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "static" / "charmera"
POST = REPO / "posts" / "tiny-camera-better-taste"

# The seven v0.1 film LUTs in mode order: FILM, PEOPLE, TOKYO, NIGHT, B&W, VIVID, EXPIRED.
LUT_ORDER = ["01_GOLD_200", "02_PORTRA", "03_SUPERIA_400_PROXY", "04_800T", "05_TRI_X", "06_VELVIA", "07_EXPIRED_PROXY"]

# Darkroom scenes: album photo -> vertical centre of the 4:3 crop (None keeps the top of a 4:3 source).
SCENES = {"hakone-torii": None, "akama-jingu": 0.47, "kudanshita": None, "otaru-window": None,
          "kyu-nakagawa": 0.5, "hakone-night": 0.4, "asahikawa": None}


def read_cube(path):
    rows = []
    for line in path.read_text().splitlines():
        parts = line.split()
        if len(parts) == 3:
            try:
                rows.append([float(v) for v in parts])
            except ValueError:
                pass
    assert len(rows) == 17 ** 3, path
    return rows


def build_scenes():
    """800x600 darkroom scenes and their picker thumbnails."""
    (OUT / "scenes").mkdir(parents=True, exist_ok=True)
    for name, cy in SCENES.items():
        im = Image.open(REPO / "static" / "album" / f"{name}-1600.webp").convert("RGB")
        w, h = im.size
        ch = round(w * 3 / 4)
        top = 0 if cy is None else min(max(round(cy * h - ch / 2), 0), h - ch)
        im = im.crop((0, top, w, top + ch)).resize((800, 600), Image.LANCZOS)
        im.save(OUT / "scenes" / f"{name}.webp", quality=88, method=6)
        im.resize((160, 120), Image.LANCZOS).save(OUT / "scenes" / f"{name}-thumb.webp", quality=80, method=6)


def build_real_scenes():
    """Darkroom versions of the two real Charmera photos, at the 800x600 detail they actually hold."""
    for name in ("street", "park"):
        im = Image.open(Path(__file__).resolve().parent / "source" / f"charmera-{name}-as-received.jpg").convert("RGB")
        im = im.resize((800, 600), Image.LANCZOS)
        im.save(OUT / "scenes" / f"charmera-{name}.webp", quality=90, method=6)
        im.resize((160, 120), Image.LANCZOS).save(OUT / "scenes" / f"charmera-{name}-thumb.webp", quality=80, method=6)


def build_hero(original):
    """The camera on a keyring, with the key's blade and stamped code blurred so it cannot be copied."""
    im = Image.open(original).convert("RGB").crop((40, 330, 1120, 960))
    mask = Image.new("L", im.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([(700, 385), (1015, 395), (1020, 485), (700, 480)], fill=255)
    draw.polygon([(600, 340), (720, 330), (730, 480), (600, 495)], fill=255)
    im = Image.composite(im.filter(ImageFilter.GaussianBlur(14)), im, mask.filter(ImageFilter.GaussianBlur(10)))
    im.save(OUT / "charmera-on-keys-1080.webp", quality=84, method=6)
    im.resize((720, 420), Image.LANCZOS).save(OUT / "charmera-on-keys-720.webp", quality=84, method=6)


def build_sensor_frame():
    """A 16:9 1280x720 stand-in for the sensor mode, used by the pipeline explorer."""
    (OUT / "sensor").mkdir(parents=True, exist_ok=True)
    im = Image.open(REPO / "static" / "album" / "hakone-torii-1600.webp").convert("RGB")
    w, h = im.size
    ch = round(w * 9 / 16)
    top = round((h - ch) * 0.62)
    im = im.crop((0, top, w, top + ch)).resize((1280, 720), Image.LANCZOS)
    im.save(OUT / "sensor" / "hakone-torii-1280x720.webp", quality=78, method=6)


def build_data(handoff):
    """luts.bin, students.json, ae-tables.json and meter.json from the handoff."""
    blob = bytearray()
    for name in LUT_ORDER:
        for rgb in read_cube(handoff / "luts" / "selected" / f"{name}.cube"):  # red varies fastest
            blob += bytes(min(255, max(0, round(v * 255))) for v in rgb)
    (OUT / "luts.bin").write_bytes(bytes(blob))

    fits = json.loads((handoff / "firmware-imaging" / "scaler_fit_current_luts.json").read_text())
    students = {name: {"psnr": round(fits[name + ".cube"]["psnr_db"], 1),
                       "matrix": fits[name + ".cube"]["matrix_q8_8_int"],
                       "curve": fits[name + ".cube"]["y_gamma_u8"]} for name in LUT_ORDER}
    (OUT / "students.json").write_text(json.dumps(students, separators=(",", ":")))

    ae = {}
    for hz in ("50Hz", "60Hz"):
        with open(handoff / "firmware-imaging" / "ae-re" / f"AE_TABLE_{hz}.csv") as f:
            ae[hz] = [[int(r["exposure_lines"]), int(r["analog_gain_q8"]), int(r["third_stage_q6"])] for r in csv.DictReader(f)]
    (OUT / "ae-tables.json").write_text(json.dumps(ae, separators=(",", ":")))

    # The AE engine samples every fourth value of the decoded 1,024-entry stock curve.
    gamma = json.loads((handoff / "firmware-imaging" / "control-audit" / "results_gamma.json").read_text())["stock_expanded"]
    runs = json.loads((handoff / "firmware-imaging" / "ae-runtime-audit" / "results_active_gamma.json").read_text())
    cases = [[c["curve"], c["raw_statistic"], c["measured"], c["delta"]] for c in runs["full_engine_cases"] if c["curve"] in ("identity", "stock")]
    stock = gamma[::4]
    for curve, raw, measured, _ in cases:  # the sampled curve must reproduce every executed reading
        assert (raw if curve == "identity" else stock[raw]) == measured, (curve, raw)
    with open(OUT / "meter.json", "w") as f:
        json.dump({"stock": stock, "cases": cases, "target": 100, "deadband": 4}, f, separators=(",", ":"))


def build_frame_slots(handoff):
    """Frame strip slots from the firmware's resource directory: name, flash offset and byte budget."""
    fw = (handoff / "firmware-imaging" / "original" / "Original_Firmware.bin").read_bytes()
    entries = []
    for p in range(0x120018, 0x120420, 24):  # 24-byte entries: 20-byte name, sector offset from 0x120000
        name = fw[p:p + 20].split(b"\0")[0].decode("ascii")
        entries.append((name, 0x120000 + struct.unpack_from("<I", fw, p + 20)[0] * 512))
    slots = []
    for n in range(4):
        strips = []
        for s in range(3):
            i = next(k for k, (name, _) in enumerate(entries) if name == f"F_{n}_{s:03d}GPZP")
            assert fw[entries[i][1]:entries[i][1] + 4] == b"GPZP"
            strips.append({"name": entries[i][0], "offset": entries[i][1], "budget": entries[i + 1][1] - entries[i][1]})
        slots.append({"slot": n, "strips": strips})
    (OUT / "frame-slots.json").write_text(json.dumps(slots, separators=(",", ":")))


def apply_lut(img, lut):
    """Trilinear lookup, matching applyLut in static/charmera/film-core.js."""
    x = img.astype(np.float32) * 16 / 255
    i0 = np.minimum(x.astype(int), 15)
    f = x - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]

    def at(db, dg, dr):
        return lut[b0 + db, g0 + dg, r0 + dr]
    c0 = (at(0, 0, 0) * (1 - fr) + at(0, 0, 1) * fr) * (1 - fg) + (at(0, 1, 0) * (1 - fr) + at(0, 1, 1) * fr) * fg
    c1 = (at(1, 0, 0) * (1 - fr) + at(1, 0, 1) * fr) * (1 - fg) + (at(1, 1, 0) * (1 - fr) + at(1, 1, 1) * fr) * fg
    return np.clip(c0 * (1 - fb) + c1 * fb, 0, 255).astype(np.uint8)


def build_thumbnail():
    """Listing thumbnail: one scene in four vertical slices (original, B&W, FILM, VIVID)."""
    luts = np.frombuffer((OUT / "luts.bin").read_bytes(), np.uint8).reshape(7, 17, 17, 17, 3).astype(np.float32)
    src = np.asarray(Image.open(OUT / "scenes" / "hakone-torii.webp").convert("RGB").resize((690, 518)))[11:507]
    out = src.copy()
    w = 690 // 4
    for k, mode in enumerate([None, 4, 0, 5]):
        cols = slice(k * w, 690 if k == 3 else (k + 1) * w)
        out[:, cols] = src[:, cols] if mode is None else apply_lut(src[:, cols], luts[mode])
        if k:
            out[:, k * w:k * w + 2] = 244
    Image.fromarray(out).save(POST / "thumbnail.webp", quality=82, method=6)


if __name__ == "__main__":
    args = sys.argv[1:]
    hero = None
    if "--hero" in args:
        i = args.index("--hero")
        hero = args[i + 1]
        del args[i:i + 2]
    if len(args) != 1:
        sys.exit(__doc__)
    handoff = Path(args[0])
    build_scenes()
    build_real_scenes()
    if hero:
        build_hero(hero)
    build_sensor_frame()
    build_data(handoff)
    build_frame_slots(handoff)
    build_thumbnail()
    print("Rebuilt Charmera essay assets.")
