# spektrafilm as the essay's teacher: feasibility check (28 Oct 2026)

Can [spektrafilm-rs](https://github.com/turbasvin/spektrafilm-rs) (commit `9dd59b0`) produce the
essay's LUTs, and can it run in a reader's browser? Yes to both, with one caveat about DIR couplers.
Nothing here is published or shipped: no LUTs or renders are committed, because spektrafilm is GPLv3
and its profiles are CC BY-SA 4.0 (see the licence note in `../README.md`).

## Results

**Spektrafilm's colour fits in a LUT.** With every spatial stage off, a 17³ LUT reproduces the full
spectral render to 55.9 dB (max error 2/255, which is 8-bit rounding). Shrine scene, Gold 200.

**DIR couplers are the part a LUT can't hold.** They change colour, but they also spread spatially
(local contrast at edges). With couplers on and grain, halation, glare and sharpening off, LUT vs
render, median of the essay's 9 scenes:

| Mode | Stock → paper | 17³ LUT | 33³ LUT | Colour-only vs full look |
|---|---|---|---|---|
| FILM | Kodak Gold 200 → Portra Endura | 37.1 dB | 37.3 dB | 29.2 dB |
| PEOPLE | Kodak Portra 400 → Portra Endura | 37.3 | 37.6 | 29.2 |
| TOKYO | Fujifilm X-Tra 400 (Superia) → Crystal Archive II | 33.5 | 33.7 | 27.7 |
| NIGHT | Kodak Vision3 500T (CineStill's base) → 2383 | 40.1 | 40.4 | 31.1 |
| B&W | Kodak Double-X → 2302 | 39.5 | 44.9 | 31.6 |
| VIVID | Fujifilm Velvia 100 (slide, scanned) | 37.1 | 37.9 | 26.7 |

A bigger LUT barely helps (except B&W), so the remaining gap is the couplers' spread, not
resolution. "Full look" adds grain, halation, glare and the scanner's sharpening. Auto-exposure is off
everywhere, so LUTs and renders see the same exposure. Each LUT samples every grid colour as a
uniform patch: 1×1 and 16×16 patches agree to 6e-8.

Notes: the Tri-X profile is the reversal film 7266 and blows out under this exposure; Double-X is
used for B&W. Vision3 500T is tungsten-balanced, so NIGHT turns blue in daylight, as the film does.

**It runs as wasm.** The bake tool builds for `wasm32-wasip1` (1.4 MB) and matches native output to
0.0002/255. Single-threaded under wasmtime, 800 × 600:

| Job | Native, 4 threads | wasm, 1 thread |
|---|---|---|
| 33³ LUT, baked as one image | 0.14 s | 0.45 s |
| Colour-only render | 0.74 s | 3.6 s |
| Full render (grain, halation…) | 0.94 s | 4.1 s |

Baking a 33³ LUT one colour at a time takes 16 s natively, so bake it as a single 35,937 × 1 image.
That needs the couplers' spread set to zero (`grid` mode): it then matches the per-colour bake to
0.002/255, because a uniform patch has nothing to spread into.

A browser build would need about 12 MB of data: `irradiance_xy_tc.npy` (5.7 MB),
`arctic2026alpha02/reflectance_xy_tc.npy` (5.1 MB), the chosen profile JSONs (~200 KB each) and
`filters/`.

**Node's WASI crashes; the wasm doesn't.** Node 22 segfaults on these builds under every compiler
tier, at points that move between runs. wasmtime runs the same file correctly. A browser build would
use `wasm32-unknown-unknown` with wasm-bindgen and no WASI, so this shouldn't carry over, but it's
untested.

## What the patch changes

`spektrafilm-rs.patch` applies to `9dd59b0` with `git apply`:

- BLAS only on macOS. Everywhere else uses the pure-Rust matrix multiply the code already uses on
  Windows (OpenBLAS doesn't build for wasm). Results then differ from the Linux/OpenBLAS build at
  rounding level only.
- `getrandom` with `wasm_js` for `wasm32-unknown-unknown`, needed for a browser build.
- The workspace takes `spektrafilm-gpu` without default features, so no wgpu. The GUI and the GPU CLI
  then lack their wgpu backend; this is for the bake tool only.
- New crate `crates/charmera-bake`: `lut` (per-colour patches) and `render` (an RGB8 image), in modes
  `colour`, `pure` (couplers off too), `grid` (couplers' spread zeroed) and `full`.

## Rebuild

```bash
git clone https://github.com/turbasvin/spektrafilm-rs && cd spektrafilm-rs && git checkout 9dd59b0
git apply /path/to/scripts/charmera/spektrafilm/spektrafilm-rs.patch
cargo build --release -p charmera-bake
python3 /path/to/scripts/charmera/spektrafilm/bake_and_check.py "$PWD" /path/to/site /tmp/spektra-bake
```

The bake tool needs `SPEKTRAFILM_BACKEND=cpu`; the script sets it. For wasm:
`cargo build --release -p charmera-bake --target wasm32-wasip1`, then run it with `wasi_run.py`
(`pip install wasmtime`), mapping the checkout as `/`.

## Next

1. A `wasm-bindgen` wrapper exposing `bake_lut(film, paper, params, size)`, run in a Web Worker and
   loaded only when the reader asks for it.
2. Feed its 17³ LUT to `film-core.js` as another teacher, so the compiler figure can distil a real
   film stock into 274 bytes.
3. Decide the licence question before any of it ships.
