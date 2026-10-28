# Bake spektrafilm LUTs for the Charmera essay's modes and check them against full renders.
# Outputs, already-present files are reused: <film>-17.f32 / -33.f32 LUTs, <film>-33.cube,
# luts-spektrafilm.bin (six 17^3 RGB8 tables in luts.bin layout), per-scene renders, results.json.
import json, os, subprocess, sys, time
import numpy as np
from PIL import Image

# usage: python3 bake_and_check.py <patched spektrafilm-rs checkout> <site root> <output dir>
R, SITE, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
BAKE, DATA = f'{R}/target/release/charmera-bake', f'{R}/data'
ENV = {**os.environ, 'SPEKTRAFILM_BACKEND': 'cpu', 'RUST_LOG': 'warn'}
STOCKS = [  # essay mode, spektrafilm film, paper ("scan" for slide film)
    ('FILM', 'kodak_gold_200', 'kodak_portra_endura'),
    ('PEOPLE', 'kodak_portra_400', 'kodak_portra_endura'),
    ('TOKYO', 'fujifilm_xtra_400', 'fujifilm_crystal_archive_typeii'),
    ('NIGHT', 'kodak_vision3_500t', 'kodak_2383'),
    ('B&W', 'kodak_doublex', 'kodak_2302'),
    ('VIVID', 'fujifilm_velvia_100', 'scan'),
]
SCENES = ['charmera-street', 'charmera-park', 'hakone-torii', 'akama-jingu', 'kudanshita',
          'otaru-window', 'kyu-nakagawa', 'hakone-night', 'asahikawa']

def run(*args):
    if os.path.exists(str(args[-1])): return float('nan')  # already baked
    t = time.time(); subprocess.run([BAKE, *map(str, args)], env=ENV, check=True, capture_output=True); return time.time() - t

def read(path, shape): return np.clip(np.fromfile(path, '<f4').reshape(shape), 0, 1)

def apply_lut(src, lut, n):  # trilinear, same arithmetic as film-core.js applyLut
    x = src.astype(np.float64) * (n - 1) / 255
    i0 = np.minimum(x.astype(int), n - 2); f = x - i0
    out = 0
    for dr in (0, 1):
        for dg in (0, 1):
            for db in (0, 1):
                w = (f[..., 0] if dr else 1 - f[..., 0]) * (f[..., 1] if dg else 1 - f[..., 1]) * (f[..., 2] if db else 1 - f[..., 2])
                out = out + w[..., None] * lut[i0[..., 2] + db, i0[..., 1] + dg, i0[..., 0] + dr]
    return out

def psnr(a, b): return float(10 * np.log10(255 ** 2 / np.mean((a - b) ** 2)))

scenes = {s: np.asarray(Image.open(f'{SITE}/static/charmera/scenes/{s}.webp').convert('RGB')) for s in SCENES}
for s, img in scenes.items(): img.tofile(f'{OUT}/{s}.rgb8')
H, W = next(iter(scenes.values())).shape[:2]
results, timings, luts_bin = {}, {}, bytearray()
for mode, film, paper in STOCKS:
    luts = {}
    for n in (17, 33):
        timings[f'{mode} lut{n}'] = run('lut', DATA, film, paper, 'colour', n, 1, f'{OUT}/{film}-{n}.f32')
        luts[n] = read(f'{OUT}/{film}-{n}.f32', (n, n, n, 3)) * 255  # [b][g][r]
    lut8 = np.round(luts[17]).astype(np.uint8)
    luts_bin += lut8.tobytes()
    with open(f'{OUT}/{film}-33.cube', 'w') as f:
        f.write(f'TITLE "spektrafilm {film} / {paper}, colour only"\nLUT_3D_SIZE 33\n')
        f.writelines(f'{r:.6f} {g:.6f} {b:.6f}\n' for r, g, b in (luts[33] / 255).reshape(-1, 3))
    rows = []
    for s, img in scenes.items():
        renders = {}
        for m in ('colour', 'full'):
            timings[f'{mode} render {m} {s}'] = run('render', DATA, film, paper, m, W, H, f'{OUT}/{s}.rgb8', f'{OUT}/{film}-{s}-{m}.f32')
            renders[m] = read(f'{OUT}/{film}-{s}-{m}.f32', (H, W, 3)) * 255
        l17 = np.clip(apply_lut(img, lut8.astype(np.float64), 17), 0, 255)
        l33 = np.clip(apply_lut(img, luts[33], 33), 0, 255)
        rows.append({'scene': s, 'lut17_vs_colour': psnr(l17, renders['colour']), 'lut33_vs_colour': psnr(l33, renders['colour']),
                     'colour_vs_full': psnr(renders['colour'], renders['full'])})
        for name, im in (('colour', renders['colour']), ('full', renders['full']), ('lut17', l17)):
            Image.fromarray(np.round(im).astype(np.uint8)).save(f'{OUT}/{film}-{s}-{name}.png')
    results[mode] = rows
open(f'{OUT}/luts-spektrafilm.bin', 'wb').write(luts_bin)
json.dump({'results': results, 'timings': timings}, open(f'{OUT}/results.json', 'w'), indent=1)
for mode, rows in results.items():
    k = lambda key: np.median([r[key] for r in rows])
    print(f'{mode:7} LUT17 vs render {k("lut17_vs_colour"):5.1f} dB | LUT33 {k("lut33_vs_colour"):5.1f} dB | colour-only vs full look {k("colour_vs_full"):5.1f} dB (median of 9)')
lut_t = [v for k, v in timings.items() if 'lut17' in k]; ren = [v for k, v in timings.items() if 'render colour' in k]; full = [v for k, v in timings.items() if 'render full' in k]
print(f'time: 17³ LUT {np.nanmedian(lut_t):.2f}s, 33³ LUT {np.nanmedian([v for k, v in timings.items() if "lut33" in k]):.2f}s, 800x600 colour render {np.nanmedian(ren):.2f}s, full render {np.nanmedian(full):.2f}s (each incl. ~setup)')
