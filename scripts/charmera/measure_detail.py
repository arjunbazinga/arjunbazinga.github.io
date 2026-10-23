#!/usr/bin/env python3
"""Measure how much fine detail real Charmera photos contain.

Usage, from the repository root: python scripts/charmera/measure_detail.py

The two Charmera JPEGs in scripts/charmera/source/ arrived recompressed by a
messaging app (1280x960, progressive, IJG quality 75, no EXIF). So every
comparison image goes through the same path: resize to 1280x960, then JPEG
quality 75. For each image the script takes the horizontal power spectrum of
luma (the bottom 100 rows are excluded so the date stamp does not count),
normalises it to the 100-200 cycles-per-picture-width band, and writes the
averaged curves to static/charmera/spectrum.json for the essay's chart.

An 800-pixel-wide image cannot hold detail finer than 400 cycles per picture
width. Recompression cannot add detail, so the received copies still bound
what the camera captured. The result is consistent with the firmware's
800x600 capture surface; it does not by itself separate that surface from lens
softness or in-camera noise reduction. Requires numpy and Pillow.
"""
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent / "source"
PHONE = ["kudanshita", "hakone-torii", "otaru-window", "asahikawa"]
BIN = 8          # cycles per picture width per bin
MAX = 640        # Nyquist of a 1280-wide image


def received_path(image):
    """Resize to 1280x960 and recompress at quality 75, like the received Charmera copies."""
    buffer = io.BytesIO()
    image.convert("RGB").resize((1280, 960), Image.LANCZOS).save(buffer, "JPEG", quality=75, progressive=True)
    buffer.seek(0)
    return Image.open(buffer)


def spectrum(image):
    a = np.asarray(image.convert("RGB")).astype(np.float64)
    y = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[:860]
    y = y - y.mean()
    window = np.outer(np.hanning(y.shape[0]), np.hanning(y.shape[1]))
    power = (np.abs(np.fft.rfft(y * window, axis=1)) ** 2).mean(0)
    reference = power[100:200].mean()
    return np.array([power[f:f + BIN].mean() / reference for f in range(BIN, MAX, BIN)])


def band(curve, lo, hi):
    """Mean relative power between lo and hi cycles per picture width, in percent."""
    freqs = np.arange(BIN, MAX, BIN)
    return round(float(curve[(freqs >= lo) & (freqs < hi)].mean() * 100), 1)


def main():
    charmera = {name: spectrum(Image.open(SOURCE / f"charmera-{name}-as-received.jpg")) for name in ("street", "park")}
    phone = {name: spectrum(received_path(Image.open(REPO / f"static/album/{name}-1600.webp"))) for name in PHONE}
    squeezed = {name: spectrum(received_path(Image.open(REPO / f"static/album/{name}-1600.webp").convert("RGB")
                                             .resize((800, 600), Image.LANCZOS).resize((1440, 1080), Image.BILINEAR)))
                for name in PHONE}
    series = {
        "charmera": np.mean(list(charmera.values()), axis=0),
        "squeezed": np.mean(list(squeezed.values()), axis=0),
        "phone": np.mean(list(phone.values()), axis=0),
    }
    table = []
    for label, group in (("Charmera", charmera), ("Phone, through 800 × 600", squeezed), ("Phone", phone)):
        for name, curve in group.items():
            table.append([label, name, band(curve, 200, 300), band(curve, 350, 400), band(curve, 400, 500)])
    out = {
        "bin": BIN,
        "frequencies": list(range(BIN, MAX, BIN)),
        "series": {key: [round(float(v), 6) for v in curve] for key, curve in series.items()},
        "table": table,
    }
    (REPO / "static/charmera/spectrum.json").write_text(json.dumps(out, separators=(",", ":")))
    for row in table:
        print(f"{row[0]:26s} {row[1]:13s} 200-300 {row[2]:5.1f}%  350-400 {row[3]:5.1f}%  400-500 {row[4]:5.1f}%")


if __name__ == "__main__":
    main()
