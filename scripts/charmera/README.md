# Charmera essay: context, provenance and how to rebuild

This folder explains where [`posts/tiny-camera-better-taste/`](../../posts/tiny-camera-better-taste/index.qmd) ("Better Taste for a Tiny Camera") came from. It also holds the scripts that rebuild its data and check its independent claims. It is written for someone who has the research archive but not the conversation that produced the essay.

Quarto does not render `scripts/`, so nothing here is published.

## Why the essay exists

The Charmera is Kodak's keychain-sized digital camera: fixed lens, small sensor, direct flash, almost no settings. A long research project, recorded in the archive below, asked one question: **how do you make this one camera a joy to carry, so that photographs taken without ceremony are worth keeping?** The project's slogan is "Don't remove the Charmera from the photograph. Give the Charmera better taste."

The project had two strands:

1. **Aesthetics.**
   - It asked why film looks feel coherent, separating real image properties from nostalgia and brand signalling.
   - It chose seven job-oriented modes (FILM, PEOPLE, TOKYO, NIGHT, B&W, VIVID, EXPIRED), each with a film stock as its starting teacher.
   - It adopted a teacher → student architecture: expensive rendering offline, tiny deterministic tables on the camera.
2. **Firmware.**
   - It disassembled the public 2 MiB dump and executed selected original ARM routines in Unicorn with explicitly modelled hardware.
   - This recovered the still pipeline, the sensor (SP140A family), the auto-exposure tables, the gamma → AE feedback, the stock filters, the post-capture hook, and the updater's behaviour.

The project's own documents say a public "rabbit hole" write-up should come later and must not drive engineering choices. This essay is that write-up. Nothing has been patched or flashed. A verified backup and restore path for the physical camera comes before any installation.

## Source archive

| Item | Value |
|---|---|
| File as uploaded | `Charmera-Aesthetics-Handoff-2026-09-29-v201.zip` |
| Size | 6,264,749 bytes |
| SHA256 | `c3273ec2aa2fde3e64f1f228fdcf60196fbb8b6972beb9d0b8ca60e8d339339e` |
| Top-level directory | `charmera-aesthetics-handoff-2026-09-29-v20/` (handoff v20, 2026-09-29) |
| Pinned firmware inside it | `firmware-imaging/original/Original_Firmware.bin`, SHA256 `720ed0b65c91b149b0916498732b0ecf40227736ef5e3c126c487a7b5253436c`, from [Project Sirius](https://github.com/Khimira/Project-Sirius) commit `8d64da5ca8ab0f1cff06f99a3488ca01afba17b2` |

The archive also contains three nested zips under `prior-artifacts/`. These cover the earlier updater/USB/assets research (`Charmera-Update-Contract-2026-09-27-111618-JST.zip`), the 27-candidate film bank and the v0.1 film set. Read `START_HERE.md`, then `docs/CURRENT_STATE.md`, then the per-version audits under `firmware-imaging/`. Superseded beliefs are kept on purpose in `docs/CORRECTIONS_AND_DEAD_ENDS.md`.

Archive inputs the build uses (SHA256):

| Path in the v20 directory | SHA256 |
|---|---|
| `luts/selected/01_GOLD_200.cube` | `491954dab6291e1e95c4230f1552b250bd27bfd2d2011590673ead57a784504f` |
| `luts/selected/02_PORTRA.cube` | `3c6a3e9616a3119ef62ef49a9b36230a7dee521b6177a2ab9c2f73ce57d64833` |
| `luts/selected/03_SUPERIA_400_PROXY.cube` | `3765ffab8653ddb84bc0deb166a5680c9ebd538b34d3e92a5b0f7444eb0d61ae` |
| `luts/selected/04_800T.cube` | `a0ee193f98ae5e751bb2d250bbdcd1ffb3326e324a815cdf8cce3ce34eb721fc` |
| `luts/selected/05_TRI_X.cube` | `b9c4f2c5e3cce52601ea852d89e002df338a9cd7d6f3b301e0547aa4accc27c3` |
| `luts/selected/06_VELVIA.cube` | `d2d66d7f85a2da144b2f5e99100d7b81931540f9327d1b4e433e4f78c1ed6ee5` |
| `luts/selected/07_EXPIRED_PROXY.cube` | `82a7dc595550a44c08cfedc9174e41a0dce7304fc3ae4de4280d13707c624dba` |
| `firmware-imaging/scaler_fit_current_luts.json` | `e20ae85994ac4fd67c05936f6833c7267eaa9eab8ee89e7a3ad0007ba5c9630f` |
| `firmware-imaging/ae-re/AE_TABLE_50Hz.csv` | `52e23dba8217d0aecf79c6c205fc0b5e09517d81628e430f5cd01ba7e3804eef` |
| `firmware-imaging/ae-re/AE_TABLE_60Hz.csv` | `dc75394f0996e4e32556712dc5f54baeb114f8dc2fefd1d1d331b83b48c058ea` |
| `firmware-imaging/control-audit/results_gamma.json` | `b5b5459152a2b5877eda075e29c3354ddac1e7be81013ad68b166bcd5af206f1` |
| `firmware-imaging/ae-runtime-audit/results_active_gamma.json` | `44d50ad0accdc262a67957f383e2c98b7431c55bbf202b27f82f52c0a53facfa` |

The archive's own `manifests/SHA256SUMS.txt` covers every other file.

## What is in the repository

| Path | What it is |
|---|---|
| `posts/tiny-camera-better-taste/index.qmd` | The essay. Interactive figures are raw HTML blocks; scripts load at the end. |
| `posts/tiny-camera-better-taste/thumbnail.webp` | Listing image: one scene as original, B&W, FILM and VIVID slices. |
| `static/charmera/film-core.js` | Shared rendering: LUT lookup, curve + matrix student, stock Pixel filter, NIGHT halation, EXPIRED drift. |
| `static/charmera/pipeline.js` | "What happens when you press the shutter": six-stage explorer with loupe and photo-size menu. |
| `static/charmera/darkroom.js` | The darkroom: simulated capture, seven film modes, four stock Pixel filters, LUT vs student difference view, reader's own photo (processed locally). Develops only when scrolled near. |
| `static/charmera/exposure.js` | Stacked chart of the 50/60 Hz AE program lines, with keyboard readout and a table view. |
| `static/charmera/meter.js` | "The curve that meters": stock gamma curve against the AE target, with executed engine cases. |
| `static/charmera/charmera.css` | Styles, using the site's `--site-*` tokens; dark mode via `body.quarto-dark`. |
| `static/charmera/luts.bin` | Seven 17³ RGB8 LUTs, 14,739 bytes each, red fastest (.cube order). |
| `static/charmera/students.json` | Per mode: Q8.8 3×3 matrix, 256-entry luma curve, PSNR against the full LUT across the cube. |
| `static/charmera/ae-tables.json` | 50/60 Hz program lines: `[exposure_lines, analog_gain_q8, global_gain_q6]` per index. |
| `static/charmera/meter.json` | The 256-entry stock AE curve, the executed identity/stock cases and the test's target/deadband. |
| `static/charmera/scenes/`, `sensor/` | Album photographs cropped to 800×600 (darkroom) and 1280×720 (pipeline sensor stage), plus 800×600 versions of the two real Charmera photos (`charmera-street`, `charmera-park`). |
| `static/charmera/real/` | The two real Charmera photos, byte-identical to the copies received (no further recompression). |
| `static/charmera/charmera-on-keys-*.webp` | Hero and social image: the camera on Arjun's keys, with the key's blade and stamped code blurred. |
| `static/charmera/spectrum.json`, `detail.js` | The "What comes out" detail measurement and its chart. |
| `scripts/charmera/source/` | The two Charmera JPEGs as received, inputs to `build_assets.py` and `measure_detail.py`. |
| `static/charmera/firmware/` | Examples copied byte for byte from the public dump: the twelve stock frame strips (`F_n_00sGPZP.gpzp`), the startup logo and the five sounds. Also the four stock frames composited onto the street photo (`frame-n-on-street.webp`). |
| `static/charmera/flash-map.json`, `flashmap.js` | The "Inside the 2 MiB" region map and its final-erase toggle. |
| `static/charmera/frames.js`, `frame-slots.json` | The frame maker and the twelve frame-strip slots (name, flash offset, byte budget) read from the firmware's resource directory. |
| `static/charmera/vendor/pako.min.js` | [pako](https://github.com/nodeca/pako) 2.1.0 (MIT and Zlib licences, header kept), used for fixed-Huffman DEFLATE in the frame maker. Loaded only when the frame maker nears the viewport. |
| `static/charmera/LICENSE-AutoLUT.txt` | MIT notice for the five LUTs derived from AutoLUT. |
| `scripts/charmera/` | This README and the scripts below. |

`_quarto.yml` publishes `static/charmera/**` as resources. The homepage album section (`_includes/album-preview.qmd`) and the end of `album/index.qmd` link to the essay.

## Rebuild and verify

From the repository root, with the archive extracted somewhere:

```sh
# Rebuild every data file and image above (numpy, Pillow). Byte-identical to the committed files as of this README.
python scripts/charmera/build_assets.py /path/to/charmera-aesthetics-handoff-2026-09-29-v20

# Run the original Pixel filter loop in Unicorn (pip install unicorn==2.1.4).
python scripts/charmera/pixel_probe.py /path/to/charmera-aesthetics-handoff-2026-09-29-v20/firmware-imaging/original/Original_Firmware.bin

# Check the JavaScript Pixel filter against those recorded outputs.
node scripts/charmera/test_pixel.js

# Recompute the VIVID (and FILM) student-error measurements quoted in the essay.
python scripts/charmera/vivid_error.py 5 0

# Recompute the fine-detail measurement behind "What comes out" (writes static/charmera/spectrum.json).
python scripts/charmera/measure_detail.py

# Run the camera's own frame compositor (file 0xEE80 -> 0xEDA4) on test pairs.
python scripts/charmera/frame_probe.py /path/to/Original_Firmware.bin

# Check the frame maker's compositing rule against those outputs.
node scripts/charmera/test_frames.js
```

To rebuild the hero, pass the original camera photo: `build_assets.py <handoff> --hero /path/to/photo.jpg`. The original is deliberately not in the repository because its key is sharp enough to copy.

`build_assets.py` asserts that the sampled stock curve reproduces every executed metering value (16→63, 64→149, 100→177, 160→207, 240→250).

## Where each claim comes from

Paths are relative to the v20 directory unless marked *prior* (the update-contract zip).

| Essay claim | Source |
|---|---|
| Photo path 1280×720 → crop 960×720 at (160,0) → 800×600 → 1440×1080 | `firmware-imaging/binary-audit/BINARY_AUDIT_V14.md` §1 |
| Seven photo-size configurations up to 4960×3720, all from 800×600; UI reachability unproven | `firmware-imaging/system-audit/SYSTEM_AUDIT_V15.md`, mode matrix |
| 720,000-byte row-pair 4:2:0 capture surface | `docs/CURRENT_STATE.md`; `firmware-imaging/control-audit/CONTROL_AUDIT_V16.md` |
| JPEG quality 85/80/75; no-storage forces 45 and 960×720 | `SYSTEM_AUDIT_V15.md`; `sil-audit/CONTROL_SURFACE.md` |
| Standard's adaptive saturation codes 40, 37, 35, 32, 30 | `BINARY_AUDIT_V14.md` §2 |
| Pixel filters: luma ≥ 124 → palette, else black; per-pixel chroma half | Palette in `BINARY_AUDIT_V14.md` §4; threshold, dark branch and fringe found with `pixel_probe.py` (not in the archive) |
| Candidate insertion point after Pixel cleanup, before overlays | `firmware-imaging/color-render-audit/COLOR_RENDER_AUDIT_V20.md` |
| SP140A identification from SCCB bus and 61-write init table | `firmware-imaging/sensor-re/REVERSE_ENGINEERING_RESULT_2026-09-28.md` |
| Program lines, ~1/20 stop per index, plateaus, third word = CDSP global gain, 140→141 dip | `firmware-imaging/ae-re/*.md`, `BINARY_AUDIT_V14.md` §5 |
| Milliseconds are inferred from assumed anti-flicker alignment | `BINARY_AUDIT_V14.md` §5, "Important timing correction" |
| Gamma: 128 packed words, 1,024 decoded values, 256-entry AE table | `CONTROL_AUDIT_V16.md`; `ae-runtime-audit/AE_RUNTIME_AUDIT_V17.md` |
| Same scene, opposite AE decisions (identity +3 / stock −3 at 64) | `AE_RUNTIME_AUDIT_V17.md`, `results_active_gamma.json` |
| Flip survives stock configuration (target 120, mode 5) | `init-schedule-audit/INIT_SCHEDULE_AUDIT_V18.md` |
| 13-step target table, 205 … 47, default selector 6 = 120 | `INIT_SCHEDULE_AUDIT_V18.md`; `sil-audit/SIL_AUDIT_V19.md` |
| Student PSNR table | `firmware-imaging/scaler_fit_current_luts.json` (fit uniform over the 17³ grid; `fit_scaler_student.py`) |
| VIVID student loses contrast on photos | `vivid_error.py` (new measurement, not in the archive) |
| 27-candidate film bank | `docs/15_CANDIDATE_FILM_BANK.md`; `prior-artifacts/charmera-film-bank-v0.1.zip` |
| Updater: `JH_5408` name, byte-sum checksum, final erase at `0x210000` | *prior* `Charmera-firmware-findings.md`, `LATEST_FINDINGS_2026-09-27.md` |
| Final erase as intentional settings reset for a `0x169000` package | *prior* `UPDATE_CONTRACT_FINDINGS.md` (supersedes the earlier "bug" reading) |
| Dump contains settings at `0x170000`, photo index `0x17F000`, two 960×720 JPEGs | *prior* `UPDATE_CONTRACT_FINDINGS.md` §1 |
| EXIF extra colon; frames in row-pair layout; 12 strips recompress | *prior* `Charmera-firmware-findings.md`, "Assets" and "Date formatting" |
| USB access level 1 vs 2; one-byte `mov r0, #1` → `#2` in emulation | *prior* `LATEST_FINDINGS_2026-09-27.md` §1 |
| Kodak's 1888 "You press the button, we do the rest" | General history, not from the archive |
| Real Charmera photos hold less fine detail than phone photos squeezed through 800×600 (350–400 band: Charmera 1.6–1.9%, squeezed 3.3–13%, phone 26–73%) | `measure_detail.py` on the two received photos; consistent with, not proof of, the 800×600 surface |
| Real date stamp: DD MM YYYY, orange, ~3% of frame height, bottom right | Measured from the received photos; the pipeline's stamp copies it |
| Frames: 800×600 row-pair layout, three 200-row strips, `GPZP` + raw DEFLATE; slot budgets 2,048–18,944 bytes | *prior* `Charmera-firmware-findings.md` (assets, frame compression checks); `build_frame_slots` re-reads the directory |
| Every stock strip uses fixed-Huffman blocks (BTYPE 1) | New check on the twelve strips (first block header) |
| See-through rule: a pixel pair is skipped when both frame lumas are 140 (halfword `0x8C8C`); chroma is not tested; on even rows the frame's U,V is copied with the lumas | Disassembly of `0xEDA4`, `0x142C8`, `0x1425C`; executed with `frame_probe.py` (not in the archive) |
| pako fixed-Huffman output is byte-identical to zlib `Z_FIXED`, level 9 on all twelve stock strips | New check (pako 2.1.0 vs Python zlib) |
| Frame menu thumbnails (`PV000`–`PV003`, 17,920 bytes) have an undecoded layout | *prior* `Charmera-firmware-findings.md` |

## Licensing and what was deliberately not published

- **LUTs.** Five (FILM, PEOPLE, NIGHT, B&W, VIVID) reimplement [AutoLUT](https://github.com/GVal98/AutoLUT) transforms (MIT; notice in `static/charmera/LICENSE-AutoLUT.txt`). TOKYO and EXPIRED are proxies authored in the project. G'MIC/Film-Luts, PoLUT and spektrafilm-derived assets were **not** shipped; their redistribution terms need a per-asset audit (see `docs/06_LICENSE_AND_PROVENANCE.md`).
- **Deep Analog** is source-available, not open source. It is only cited.
- **Firmware examples.** At Arjun's request (23 October 2026), the essay shows Kodak's four stock frames, the startup logo (Kodak's K mark) and the five sounds, copied unmodified from the public Project Sirius dump as research examples. The two photographs inside the dump are still not shown; the flash map marks where they sit.
- **Not published:**
  - the firmware binary, full disassembly and research scripts (short snippets appear in the essay);
  - the two photographs found inside the public dump, which belong to whoever owned that camera;
  - community members' details beyond public handles and links.
- **Photographs.** The darkroom and pipeline use Arjun's own album photographs. They were not taken on a Charmera, and the essay says so.

## Real Charmera photos (added 23 October 2026)

Arjun supplied two Charmera photos (Tokyo street and a park, both stamped 27 09 2026) and a phone photo of the camera on Arjun's keys. All three arrived through a messaging app: progressive JPEGs, no EXIF, IJG quality-75 tables, and the Charmera shots resized to 1280×960 rather than the camera's 1440×1080. Consequences:

- They cannot confirm the 1440×1080 output size or the EXIF date-colon bug. Originals copied straight off the SD card are still needed for that, and for the 12-scene calibration set.
- They can bound detail, because recompression cannot add any. `measure_detail.py` compares them with four album photos sent through the same path, with and without an 800×600 squeeze.
- The darkroom's capture simulation was checked against them for fine detail only: one blur pass already falls in the real range. Adding sharpening (the real photos show halos) did not fit two scenes reliably, so it was not tuned; colour and noise remain uncalibrated.
- Privacy and safety: the phone photo had no location metadata. The key's cuts and stamped code are blurred, and the original is not committed. The street photo shows passers-by, including a cyclist, at a public crossing; Arjun supplied it for the essay.

## Frames (added 23 October 2026)

Arjun asked whether the frames from the earlier research could be used. The stock four (a film strip, a desktop-software window, pixel-art hearts and sparkles, and a yellow "1987" camera) are Kodak's artwork. The essay describes them but does not reproduce them; they were decoded locally only to find the see-through value.

New findings, from the original binary:

- **See-through rule.** `0xEDA4` walks each 200-row strip one horizontal pixel pair at a time. It loads the pair's two luma bytes as a halfword (addressed by `0x142C8`) and skips the pair if it equals `0x8C8C`. Otherwise `0x1425C` copies the lumas, and on even rows the pair's U,V too. Chroma never affects the decision, so an opaque colour whose luma rounds to 140 in both pixels is a hole. `frame_probe.py` runs the routine and confirms this, including a saturated pair at luma 140 staying transparent.
- **Compression.** All twelve stock strips are fixed-Huffman DEFLATE, so that is the only kind the camera is known to decode. The frame maker emits only fixed-Huffman (pako with `strategy: 4`), which matches zlib byte for byte.
- **Budgets.** Slot sizes come straight from the resource directory, so a frame that fits changes no other resource's offset. The middle strips of slots 1 and 3 have only 2,048 bytes.

The frame maker nudges opaque pairs that would land on the key (one luma level) and turns half-transparent pairs fully opaque, because the camera decides per pair. It does not generate the menu thumbnail, and nothing here installs anything.

## Firmware examples (added 23 October 2026)

Arjun asked for examples from the firmware itself. `build_assets.py` (`build_firmware_examples`) now copies them straight from the dump:

- **Frames.** The twelve strips are copied exactly (compressed bytes, `GPZP` tag included) and inflated in the browser, so the frame maker's stock templates are the camera's own bytes. The gallery uses the same rule in Python (`compose_row_pair`).
- **Logo and sounds.** `POWER_ON_LOGOJPG` is cut at its JPEG end marker. Each WAV is cut at its RIFF length.
- **Map.** `flash-map.json` lists measured regions: 4 KiB used/blank scan, resource directory, settings at `0x170000`, photo index at `0x17F000`, and the two photo extents (`0x964E` and `0x958E` bytes, from the index). `GPRSPAK` starts with a `GPRS` tag (version 2); its format is not decoded.
- **Snippets.** The see-through test (`0xEE28–0xEE34`) and the first two rows of the sensor init table are quoted in the essay.

## Design decisions

- **Social image.** The post's `image` is the camera-on-keys hero, which reads better in listings and link previews than the four-slice thumbnail (still built, now unused).
- **Placement.** The essay is `featured: true` (Writing index, homepage "More writing") but not in the homepage's three Featured slots. Those carry the site's AI/systems positioning. It is linked from the homepage Album section and the Album page, because the darkroom uses those photographs.
- **No libraries.** Plain JavaScript and canvas/SVG on the site's own type and colour tokens. The chart palette (blue, orange, aqua) was checked with a colour-blindness validator; light mode needs the direct labels and the table view, which are present.
- **Honesty in the interactives.**
  - The capture simulation is labelled illustrative.
  - Meter verdicts between executed points are labelled as curve-versus-target comparisons.
  - The pipeline's date stamp is labelled illustrative.
  - Per-photo student scores are computed live.
- **Performance.** The darkroom loads its LUTs and develops only near the viewport. The page transfers about 1.2 MB, most of it the real photos, which load lazily.
- **Accessibility.** Every control is a native button, range input or checkbox. The canvases carry live `aria-label`s, the charts are keyboard-readable, and there are no-JS notes. An axe scan (axe-core 4.10.2) finds no violations on the essay, the homepage, the album or the other posts. Fixing that took two site-wide changes: the category chips and the "Published" heading in `styles.css` no longer inherit Quarto's reduced opacity, and `_includes/reading-layout.lua` names each scrollable table region from its caption (or "Table N") instead of labelling them all "Table".

## Corrections made while writing

- The first draft said the updater "could compute erase addresses beyond the flash and erase on short reads, which fits community reports of bricked cameras". That repeated an interpretation the archive later superseded; the essay now tells the reset story.
- The first draft called the sensor identification a "handshake". It is a 61-write register initialisation program.
- I assumed VIVID's student failed on saturated colours. Measurement showed it lost contrast across the frame; the essay reports the measurement.
- NIGHT's first halation blew out bright skies. It now keeps only the halo past each highlight and screens it in.

## Archive material not used, and why

- **AWB preset gains for modes 5–10** (`COLOR_RENDER_AUDIT_V20.md`): solid, but the UI names and the real-scene estimator are unknown, so there is no reader-facing story yet.
- **Capture event ordering and the absence of a proven AE/AWB freeze at the shutter** (`AE_RUNTIME_AUDIT_V17.md`, `SIL_AUDIT_V19.md`): important for implementation, too fine-grained for the essay.
- **Video configurations** (one is configured from the full 1280×720 source): not traced far enough to claim video keeps more detail.
- **Settings persistence (CRC32 over 252 bytes)**, **sound assets**, **boot header and `0x1B0000`**, **SD read-guard experiments**: covered by the reset story or not needed by it.
- **Visual evidence ledger and source atlas**: useful if a future piece covers how the seven films were chosen, with the candidate comparison images.

Natural follow-ups (the first needs Arjun):

- copy the 12-scene set straight off the card (no messaging apps) to verify 1440×1080, the EXIF colon, colour and noise, and to refit the students on real Charmera colour statistics;

- a piece on the physical calibration set (`capture-study/CHARMERA_EVALUATION_SET.md`) once real Charmera photos exist;
- refitting the students weighted by real photo colour statistics;
- replacing the TOKYO and EXPIRED proxies.
