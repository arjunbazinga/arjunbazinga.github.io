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
import zlib
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
    """luts.bin, ae-tables.json and meter.json from the handoff."""
    blob = bytearray()
    for name in LUT_ORDER:
        for rgb in read_cube(handoff / "luts" / "selected" / f"{name}.cube"):  # red varies fastest
            blob += bytes(min(255, max(0, round(v * 255))) for v in rgb)
    (OUT / "luts.bin").write_bytes(bytes(blob))

    # students.json is fitted from luts.bin by fit_students.py. The archive's own
    # first fits (scaler_fit_current_luts.json) are the essay's "First fit" column.

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


def read_resources(fw):
    """The firmware's resource directory at 0x120000: (name, flash offset), in order."""
    entries = []
    for p in range(0x120018, 0x120420, 24):  # 24-byte entries: 20-byte name, sector offset from 0x120000
        name = fw[p:p + 20].split(b"\0")[0].decode("ascii")
        entries.append((name, 0x120000 + struct.unpack_from("<I", fw, p + 20)[0] * 512))
    return entries


def decode_frame(fw, entries, n):
    """Stock frame n as row-pair 4:2:0 bytes (three inflated GPZP strips)."""
    offsets = dict(entries)
    out = b""
    for s in range(3):
        d = zlib.decompressobj(-15)
        out += d.decompress(fw[offsets[f"F_{n}_{s:03d}GPZP"] + 4:])
    return np.frombuffer(out, np.uint8).reshape(300, 3, 800)


def row_pair_to_rgb(a):
    y = np.stack([a[:, 0, :], a[:, 2, :]], axis=1).reshape(600, 800).astype(float)
    u = np.repeat(np.repeat(a[:, 1, ::2], 2, axis=1), 2, axis=0).astype(float) - 128
    v = np.repeat(np.repeat(a[:, 1, 1::2], 2, axis=1), 2, axis=0).astype(float) - 128
    return np.stack([y + 1.402 * v, y - 0.344136 * u - 0.714136 * v, y + 1.772 * u], -1).clip(0, 255).astype(np.uint8)


def compose_row_pair(photo, frame):
    """The camera's frame rule (file 0xEDA4): copy a pixel pair unless both frame lumas are 140;
    on even rows the pair's U,V travels with it."""
    out = photo.copy()
    for half, row in ((0, 0), (1, 2)):
        fy = frame[:, row, :].reshape(300, 400, 2)
        drawn = ~((fy[..., 0] == 140) & (fy[..., 1] == 140))
        oy = out[:, row, :].reshape(300, 400, 2)
        oy[drawn] = fy[drawn]
        out[:, row, :] = oy.reshape(300, 800)
        if half == 0:
            fc = frame[:, 1, :].reshape(300, 400, 2)
            oc = out[:, 1, :].reshape(300, 400, 2)
            oc[drawn] = fc[drawn]
            out[:, 1, :] = oc.reshape(300, 800)
    return out


def rgb_to_row_pair(rgb):
    rgb = rgb.astype(float)
    y = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    u = -0.168736 * rgb[..., 0] - 0.331264 * rgb[..., 1] + 0.5 * rgb[..., 2] + 128
    v = 0.5 * rgb[..., 0] - 0.418688 * rgb[..., 1] - 0.081312 * rgb[..., 2] + 128
    blk = lambda c: c.reshape(300, 2, 400, 2).mean(axis=(1, 3))
    out = np.zeros((300, 3, 800), np.uint8)
    out[:, 0, :] = np.round(y[0::2]).clip(0, 255)
    out[:, 2, :] = np.round(y[1::2]).clip(0, 255)
    uv = np.stack([blk(u), blk(v)], -1).reshape(300, 800)
    out[:, 1, :] = np.round(uv).clip(0, 255)
    return out


def build_firmware_examples(handoff):
    """Exact resources copied from the public firmware dump: the twelve stock frame strips, the four
    frame-menu thumbnails, the startup logo and the five sounds; the interface art; a gallery of
    the stock frames composited onto a real Charmera photo with the camera's rule; and a region
    map of the 2 MiB image."""
    fw = (handoff / "firmware-imaging" / "original" / "Original_Firmware.bin").read_bytes()
    entries = read_resources(fw)
    dest = OUT / "firmware"
    dest.mkdir(parents=True, exist_ok=True)
    for i, (name, off) in enumerate(entries):
        if name.startswith(("F_", "PV")):
            d = zlib.decompressobj(-15)
            d.decompress(fw[off + 4:])
            used = len(fw) - off - len(d.unused_data)
            (dest / f"{name}.gpzp").write_bytes(fw[off:off + used])
        elif name.endswith("WAV"):
            size = struct.unpack_from("<I", fw, off + 4)[0] + 8
            short = {"BEEPWAV": "beep", "CLICKWAV": "click", "IMGWAV": "img", "POWEROFF_AUDIOWAV": "power-off", "POWERON_AUDIOWAV": "power-on"}[name]
            (dest / f"{short}.wav").write_bytes(fw[off:off + size])
        elif name == "POWER_ON_LOGOJPG":
            end = fw.find(b"\xff\xd9", off) + 2
            (dest / "power-on-logo.jpg").write_bytes(fw[off:end])
    build_interface(fw, entries, dest / "ui")
    photo = np.asarray(Image.open(Path(__file__).resolve().parent / "source" / "charmera-street-as-received.jpg").convert("RGB").resize((800, 600), Image.LANCZOS))
    base = rgb_to_row_pair(photo)
    for n in range(4):
        frame = decode_frame(fw, entries, n)
        Image.fromarray(row_pair_to_rgb(compose_row_pair(base, frame))).resize((400, 300), Image.LANCZOS).save(dest / f"frame-{n}-on-street.webp", quality=86, method=6)
    regions = [
        [0x000000, 0x000200, "header", "Boot header", "SPII tag, load words and a short register-setup list"],
        [0x000200, 0x120000, "code", "ARM program", "Firmware code and data, about 1.1 MiB"],
        [0x120000, 0x124000, "resources", "UI resources", "Resource directory, icons, menu art, beep and click sounds"],
        [0x124000, 0x141400, "frames", "Four frames", "Twelve compressed strips, three per frame"],
        [0x141400, 0x15F600, "resources", "Menu text", "Every on-screen string in 14 languages, and tables not yet decoded"],
        [0x15F600, 0x168E92, "resources", "UI resources", "Startup logo, power sounds, frame thumbnails, more menu art"],
        [0x168E92, 0x170000, "blank", "Blank", "Erased flash"],
        [0x170000, 0x172000, "state", "Settings", "Append-only settings records, checked with CRC32"],
        [0x172000, 0x17F000, "blank", "Blank", "Erased flash"],
        [0x17F000, 0x180000, "state", "Photo index", "Index entries for photos stored in the camera's own flash"],
        [0x180000, 0x180000 + 0x964E, "photos", "Photo", "A 960×720 JPEG taken by the dump's owner (not shown)"],
        [0x180000 + 0x964E, 0x1A5800, "blank", "Blank", "Erased flash"],
        [0x1A5800, 0x1A5800 + 0x958E, "photos", "Photo", "A second 960×720 JPEG (not shown)"],
        [0x1A5800 + 0x958E, 0x200000, "blank", "Blank", "Erased flash"],
    ]
    (OUT / "flash-map.json").write_text(json.dumps({"size": len(fw), "regions": regions}, separators=(",", ":")))


def rgb565_image(data, width):
    """Little-endian RGB565 pixels, as the camera's interface art is stored."""
    a = np.frombuffer(data, "<u2").reshape(-1, width).astype(np.uint32)
    return Image.fromarray(np.stack([(a >> 11 & 31) * 255 // 31, (a >> 5 & 63) * 255 // 63, (a & 31) * 255 // 31], -1).astype(np.uint8))


INTERFACE = {  # resource name -> (published name, width)
    "PV000GPZP": ("frame-menu-0", 112), "PV001GPZP": ("frame-menu-1", 112),
    "PV002GPZP": ("frame-menu-2", 112), "PV003GPZP": ("frame-menu-3", 112),
    "HOME_SMALLGPZP": ("home", 160), "BATTERY00GPZP": ("charging", 160),
    "PC_CAMGPZ": ("pc-cam", 160), "U_DISKGPZ": ("disk-drive", 160),
    "USB_CONNECTGPZP": ("usb-connect", 256),
}


def build_interface(fw, entries, dest):
    """The camera's own interface art: GPZP resources inflated to lossless PNGs at their stored
    size, plus the audio-recording background, a JPEG copied byte for byte."""
    dest.mkdir(parents=True, exist_ok=True)
    for name, off in entries:
        if name in INTERFACE:
            short, width = INTERFACE[name]
            rgb565_image(zlib.decompressobj(-15).decompress(fw[off + 4:]), width).save(dest / f"{short}.png", optimize=True)
        elif name == "AUDIO_REC_BGJPG":
            (dest / "audio-record.jpg").write_bytes(fw[off:fw.find(b"\xff\xd9", off) + 2])


def build_frame_slots(handoff):
    """Frame slots from the firmware's resource directory: name, flash offset and byte budget of
    each strip and of the frame's 112×80 menu thumbnail."""
    fw = (handoff / "firmware-imaging" / "original" / "Original_Firmware.bin").read_bytes()
    entries = read_resources(fw)
    slots = []
    for n in range(4):
        strips = []
        for s in range(3):
            i = next(k for k, (name, _) in enumerate(entries) if name == f"F_{n}_{s:03d}GPZP")
            assert fw[entries[i][1]:entries[i][1] + 4] == b"GPZP"
            strips.append({"name": entries[i][0], "offset": entries[i][1], "budget": entries[i + 1][1] - entries[i][1]})
        i = next(k for k, (name, _) in enumerate(entries) if name == f"PV{n:03d}GPZP")
        thumb = {"name": entries[i][0], "offset": entries[i][1], "budget": entries[i + 1][1] - entries[i][1]}
        slots.append({"slot": n, "strips": strips, "thumb": thumb})
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
    build_firmware_examples(handoff)
    build_thumbnail()
    print("Rebuilt Charmera essay assets.")
