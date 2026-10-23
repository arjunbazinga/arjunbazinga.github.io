#!/usr/bin/env python3
"""Measure where each hardware student departs from its full LUT on the darkroom scenes.

Usage, from the repository root: python scripts/charmera/vivid_error.py [mode ...]

Modes are indices into the seven LUTs (default: 5 = VIVID and 0 = FILM). Prints
mean absolute error by brightness and saturation band, and the signed error in
shadows and highlights. The essay's VIVID numbers (student 9-18 levels too
bright in shadows, 8-15 too dark in highlights) come from this script on the
first four scenes. Requires numpy and Pillow.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_assets import LUT_ORDER, apply_lut  # noqa: E402

SCENES = ["akama-jingu", "hakone-torii", "kudanshita", "otaru-window"]


def apply_student(img, fit):
    """Curve on luma, then a Q8.8 3x3 matrix on (Y, U, V); matches film-core.js."""
    m = np.array(fit["matrix"]) / 256
    curve = np.array(fit["curve"]) / 255
    r, g, b = (img[..., k] / 255 for k in range(3))
    y = 0.299 * r + 0.587 * g + 0.114 * b
    u, v = (b - y) / 1.772, (r - y) / 1.402
    yc = curve[np.clip(np.round(y * 255), 0, 255).astype(int)]
    Y = m[0, 0] * yc + m[0, 1] * u + m[0, 2] * v
    U = m[1, 0] * yc + m[1, 1] * u + m[1, 2] * v
    V = m[2, 0] * yc + m[2, 1] * u + m[2, 2] * v
    R, B = Y + 1.402 * V, Y + 1.772 * U
    G = (Y - 0.299 * R - 0.114 * B) / 0.587
    return np.clip(np.stack([R, G, B], -1) * 255, 0, 255)


def main(modes):
    luts = np.frombuffer((REPO / "static/charmera/luts.bin").read_bytes(), np.uint8).reshape(7, 17, 17, 17, 3).astype(np.float32)
    students = json.loads((REPO / "static/charmera/students.json").read_text())
    for mode in modes:
        print(f"== {LUT_ORDER[mode]}")
        for scene in SCENES:
            img = np.asarray(Image.open(REPO / f"static/charmera/scenes/{scene}.webp").convert("RGB")).astype(np.float32)
            full = apply_lut(img, luts[mode]).astype(np.float32)
            student = apply_student(img, students[LUT_ORDER[mode]])
            err = np.abs(full - student).mean(-1)
            signed = (student - full).mean(-1)
            luma = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]
            sat = (img.max(-1) - img.min(-1)) / np.maximum(img.max(-1), 1)
            band = lambda mask: f"{err[mask].mean():5.1f}" if mask.any() else "   - "
            print(f"{scene:13s} mean {err.mean():5.1f} | luma <64 {band(luma < 64)} 64-160 {band((luma >= 64) & (luma < 160))} >=160 {band(luma >= 160)}"
                  f" | sat <.25 {band(sat < .25)} .25-.5 {band((sat >= .25) & (sat < .5))} >=.5 {band(sat >= .5)}")
            print(f"{'':13s} student minus LUT: shadows {signed[luma < 64].mean():+.1f}, highlights {signed[luma >= 160].mean():+.1f}")


if __name__ == "__main__":
    main([int(a) for a in sys.argv[1:]] or [5, 0])
