#!/usr/bin/env python3
"""Fit the hardware-shaped students to the seven film LUTs and write students.json.

Usage, from the repository root: python scripts/charmera/fit_students.py [--report]

A student is what the camera's own colour hardware could run: a 256-entry curve
on luma, then a Q8.8 3x3 matrix on (Y, U, V). The camera stores the result as
8-bit YUV and the viewer's decoder clips again in RGB, so a student is always
scored through both clips (`render` below, and applyStudent in film-core.js).

The fit alternates two exact least-squares steps: the matrix with the curve
held fixed, then each curve entry with the matrix held fixed. With
`clip=True` the fitter also knows the output is clipped: wherever a prediction
already lands beyond the displayable range on the teacher's side, the excess
costs nothing, so the fit stops spending its budget there. The JavaScript
fitter in film-core.js (fitStudent) is a line-for-line port; the essay's
compiler widget runs it live.

students.json holds the fit over every colour of the 17^3 cube, clipping
simulated. --report also prints the four fits the widget offers (every colour
or photo colours, clipping simulated or not), each scored across the cube and
on every darkroom scene held out of its own photo fit. Requires numpy and Pillow.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_assets import LUT_ORDER, apply_lut  # noqa: E402

SCENES = ["charmera-street", "charmera-park", "hakone-torii", "akama-jingu", "kudanshita",
          "otaru-window", "kyu-nakagawa", "hakone-night", "asahikawa"]
POOL_W, POOL_H = 160, 120  # photo colours are sampled at this size
ITERATIONS = 40

TO_RGB = np.array([[1, 0, 1.402], [1, -0.344136, -0.714136], [1, 1.772, 0]])
TO_YUV = np.linalg.inv(TO_RGB)
YUV_LO, YUV_HI = np.array([0, -0.5, -0.5]), np.array([1, 127 / 255, 127 / 255])


def yuv(rgb):
    r, g, b = (rgb[..., k] / 255 for k in range(3))
    y = 0.299 * r + 0.587 * g + 0.114 * b
    return y, (b - y) / 1.772, (r - y) / 1.402


def bins_of(y):
    return np.clip(np.round(y * 255), 0, 255).astype(int)


def fit(x, t, clip, iterations=ITERATIONS):
    """x, t: (n, 3) inputs and teacher outputs, 0-255. Returns float curve (256) and YUV matrix."""
    y, u, v = yuv(x)
    target = t / 255
    bins = bins_of(y)
    curve = np.arange(256) / 255
    uv = np.stack([u, v], -1)
    for step in range(iterations + 1):
        features = np.stack([curve[bins], u, v], -1)
        effective = target
        if clip and step:
            effective = target + (pred - np.clip(pred, 0, 1))
        G = np.linalg.lstsq(features, effective, rcond=None)[0].T  # RGB = G @ (curve(y), u, v)
        if step == iterations:
            break
        pred = features @ G.T
        if clip:
            effective = target + (pred - np.clip(pred, 0, 1))
        g0 = G[:, 0]
        rest = (effective - uv @ G[:, 1:].T) @ g0
        num = np.bincount(bins, rest, 256)
        den = np.bincount(bins, None, 256) * (g0 @ g0)
        have = den > 1e-12
        curve = np.clip(np.interp(np.arange(256), np.nonzero(have)[0], num[have] / den[have]), 0, 1)
    return curve, TO_YUV @ G


def quantize(curve, matrix):
    return {"curve": np.clip(np.round(curve * 255), 0, 255).astype(int).tolist(),
            "matrix": np.round(matrix * 256).astype(int).tolist()}


def render(x, student):
    """The hardware path: curve, Q8.8 matrix, 8-bit YUV storage, decoder RGB clip."""
    m = np.array(student["matrix"]) / 256
    curve = np.array(student["curve"]) / 255
    y, u, v = yuv(x)
    out = np.stack([curve[bins_of(y)], u, v], -1) @ m.T
    out = np.clip(out, YUV_LO, YUV_HI) @ TO_RGB.T
    return np.clip(out * 255, 0, 255)


def psnr(a, b):
    return 20 * np.log10(255 / np.sqrt(np.mean((a - b) ** 2)))


def cube_inputs():
    """The 17^3 grid in the LUT's own order (red fastest), as RGB 0-255."""
    s = np.linspace(0, 255, 17)
    b, g, r = np.meshgrid(s, s, s, indexing="ij")
    return np.stack([r, g, b], -1).reshape(-1, 3)


def main(report):
    luts = np.frombuffer((REPO / "static/charmera/luts.bin").read_bytes(), np.uint8).reshape(7, 17, 17, 17, 3).astype(np.float32)
    cube = cube_inputs()
    photos = {s: np.asarray(Image.open(REPO / f"static/charmera/scenes/{s}.webp").convert("RGB")
                            .resize((POOL_W, POOL_H), Image.LANCZOS)).astype(np.float64) for s in SCENES}
    students = {}
    if report:
        print(f"{'mode':22s} {'cube, no clip':>16s} {'cube, clip':>16s} {'photos, no clip':>16s} {'photos, clip':>16s}")
        print(f"{'':22s} {'(cube / photo dB)':>16s}")
    for k, name in enumerate(LUT_ORDER):
        lut = luts[k]
        teacher_cube = lut.reshape(-1, 3)
        student = quantize(*fit(cube, teacher_cube, clip=True))
        students[name] = {"psnr": round(psnr(render(cube, student), teacher_cube), 1), **student}
        if not report:
            continue
        teach = {s: apply_lut(p, lut).reshape(-1, 3).astype(np.float64) for s, p in photos.items()}
        cells = []
        for weighting in ("cube", "photos"):
            for clip in (False, True):
                cube_scores, photo_scores = [], []
                fitted = quantize(*fit(cube, teacher_cube, clip)) if weighting == "cube" else None
                for held in SCENES:
                    if weighting == "photos":
                        pool = [s for s in SCENES if s != held]
                        fitted = quantize(*fit(np.concatenate([photos[s].reshape(-1, 3) for s in pool]),
                                               np.concatenate([teach[s] for s in pool]), clip))
                        cube_scores.append(psnr(render(cube, fitted), teacher_cube))
                    photo_scores.append(psnr(render(photos[held].reshape(-1, 3), fitted), teach[held]))
                cube_score = psnr(render(cube, fitted), teacher_cube) if weighting == "cube" else np.mean(cube_scores)
                cells.append(f"{cube_score:6.1f} / {np.mean(photo_scores):5.1f}")
        print(f"{name:22s} " + " ".join(f"{c:>16s}" for c in cells))
    (REPO / "static/charmera/students.json").write_text(json.dumps(students, separators=(",", ":")))
    for name, s in students.items():
        print(f"{name:22s} {s['psnr']:5.1f} dB across the cube, clipping simulated")


if __name__ == "__main__":
    main("--report" in sys.argv[1:])
