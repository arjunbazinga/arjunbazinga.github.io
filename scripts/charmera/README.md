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

The project's own documents say a public "rabbit hole" write-up should come later and must not drive engineering choices. This essay is that write-up.

A third strand never made it into the archive. Arjun also researched the business in separate ChatGPT and Claude conversations, five of which were exported and pasted into the essay's working session on 24 October 2026 (bill of materials, aesthetics and product, firmware verification, firmware fork analysis, and a 21 October catalog of about 120 findings). They cover Reto's history, the Kodak licence, the sell-out and Japanese distribution, Kodak's filings as a rough volume signal (brand-licensing margin could not be isolated), competitors such as Camp Snap, and a factory-price estimate that fell over four passes to about $3.60 FOB for launch builds and $3.95 now. On 24 October 2026 Arjun dictated the vision behind all of it. The essay's opening and its compiler and customisation-plane sections come from that:

- **The bet.** Reto's growth model is the next hit; the Millennium Edition is the same hardware with new frames and filters. The alternative is raising the lifetime value of cameras already sold with software: a VSCO-style look system, as Camp Snap's custom filter files already do.
- **A customisation plane.** Map each data object's lifecycle (who creates, reads, updates and resets it). Then decouple what owners customise from the compiled binary, so customisation is data with formats, slots and checksums, and nobody has to fear patching the wrong thing.
- **A style compiler.** A large teacher that understands colour and taste learns a style from a few examples. An optimiser then searches the camera's own parameter space through a simulator of its pipeline (light, sensor, AE, gamma, hook, JPEG), not on finished JPEGs. One teacher, many hardware targets.

The volume and factory-price figures are estimates and are stated as such. Business strategy discussed in those chats, and the names of company staff other than public spokespeople, are deliberately left out of the essay and this README. Nothing has been patched or flashed. A verified backup and restore path for the physical camera comes before any installation.

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
| `posts/tiny-camera-better-taste/inside.qmd` | "The Charmera, Inside and Out" (added 24 Oct 2026): the reference companion. Spec sheet vs reality, parts and relatives, cost table, sales, Reto timeline, why it hit. Linked from the essay's opening; not in the Writing listing, which only takes `*/index.qmd`. |
| `posts/tiny-camera-better-taste/index.qmd` | The essay. Interactive figures are raw HTML blocks; scripts load at the end. |
| `posts/tiny-camera-better-taste/thumbnail.webp` | Listing image: one scene as original, B&W, FILM and VIVID slices. |
| `static/charmera/film-core.js` | Shared rendering: LUT lookup, curve + matrix student (with the camera's YUV and RGB clips), the student fitter (`createFit`, `fitStudent`, a port of `fit_students.py`), stock Pixel filter, NIGHT halation, EXPIRED drift. |
| `static/charmera/compiler.js` | "Compile one yourself" (25 Oct 2026): fits a student to a film LUT or to a reference photo live, animated step by step; scores across the cube and on a test photo; toggles for photo weighting (held out) and clipping. |
| `static/charmera/pipeline.js` | "What happens when you press the shutter": six-stage explorer with loupe and photo-size menu. |
| `static/charmera/darkroom.js` | The darkroom: simulated capture, seven film modes, four stock Pixel filters, LUT vs student difference view, reader's own photo (processed locally). Develops only when scrolled near. |
| `static/charmera/exposure.js` | Stacked chart of the 50/60 Hz AE program lines, with keyboard readout and a table view. |
| `static/charmera/meter.js` | "The curve that meters": stock gamma curve against the AE target, with executed engine cases. |
| `static/charmera/charmera.css` | Styles, using the site's `--site-*` tokens; dark mode via `body.quarto-dark`. |
| `static/charmera/luts.bin` | Seven 17³ RGB8 LUTs, 14,739 bytes each, red fastest (.cube order). |
| `static/charmera/students.json` | Per mode: Q8.8 3×3 matrix, 256-entry luma curve, PSNR against the full LUT across the cube. Written by `fit_students.py` (every colour, clipping simulated). |
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
# Rebuild every data file and image above except students.json (numpy, Pillow). Byte-identical to the committed files as of this README.
python scripts/charmera/build_assets.py /path/to/charmera-aesthetics-handoff-2026-09-29-v20

# Run the original Pixel filter loop in Unicorn (pip install unicorn==2.1.4).
python scripts/charmera/pixel_probe.py /path/to/charmera-aesthetics-handoff-2026-09-29-v20/firmware-imaging/original/Original_Firmware.bin

# Check the JavaScript Pixel filter against those recorded outputs.
node scripts/charmera/test_pixel.js

# Fit the seven hardware students (writes static/charmera/students.json). --report prints the
# four fits the compiler offers, scored across the cube and on held-out photos (about a minute).
python scripts/charmera/fit_students.py --report

# Check the browser fitter reproduces students.json exactly.
node scripts/charmera/test_students.js

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
| Student table, "First fit" column | The archive's students (`firmware-imaging/scaler_fit_current_luts.json`, fitted uniformly over the 17³ grid by `fit_scaler_student.py`), re-scored through the camera's clips with `fit_students.render`. Within 0.1 dB of the archive's own figures. |
| Student table, "Fitter knows the camera clips" column; 274 bytes | `fit_students.py` (new, not in the archive). 274 = 256 curve bytes + nine 16-bit Q8.8 coefficients. |
| VIVID first student loses contrast on photos (9–18 levels too bright in shadows, 8–15 too dark in highlights; mean error 10–17) | `vivid_error.py` on the archive's students |
| Clip-aware VIVID student's mean error 3–5 levels on the same four photos | `vivid_error.py` on the committed `students.json` |
| Held-out photo scores (B&W 41.9 → 49.3, PEOPLE 38.3 → 40.4, VIVID 33.4 → 34.0; cube scores fall) | `fit_students.py --report`: each photo fit uses the other eight scenes, sampled at 160×120. The widget samples photos through the browser's own resize, so its live numbers differ slightly. |
| 56% of Hakone unseen with the Asahikawa reference | Measured live by the compiler (`unseenIn` in `compiler.js`); a NumPy reimplementation gives 52% at PIL's resampling |
| 27-candidate film bank | `docs/15_CANDIDATE_FILM_BANK.md`; `prior-artifacts/charmera-film-bank-v0.1.zip` |
| Updater: `JH_5408` name, byte-sum checksum, final erase at `0x210000` | *prior* `Charmera-firmware-findings.md`, `LATEST_FINDINGS_2026-09-27.md` |
| Final erase as intentional settings reset for a `0x169000` package | *prior* `UPDATE_CONTRACT_FINDINGS.md` (supersedes the earlier "bug" reading) |
| Dump contains settings at `0x170000`, photo index `0x17F000`, two 960×720 JPEGs | *prior* `UPDATE_CONTRACT_FINDINGS.md` §1 |
| EXIF extra colon; frames in row-pair layout; 12 strips recompress | *prior* `Charmera-firmware-findings.md`, "Assets" and "Date formatting" |
| USB access level 1 vs 2; one-byte `mov r0, #1` → `#2` in emulation | *prior* `LATEST_FINDINGS_2026-09-27.md` §1 |
| Kodak's 1888 "You press the button, we do the rest" | General history, not from the archive |
| Reto: Hong Kong, started 2019 with the Reto3D three-lens 3D film camera on Kickstarter, then licensed Kodak | Kodak brand-licensing case study (`kodak.com/content/pdfs/brand-licensing/reto-case-study.pdf`); Kosmo Foto and The Phoblographer on the Reto3D Kickstarter (2019) |
| Charmera launch 9 September 2025, $29.99 blind boxes, seven designs, secret edition about 1 in 48, sold out within 24 hours, demand ~10× expectations | [PetaPixel](https://petapixel.com/2025/09/18/the-kodak-charmera-blind-boxes-sold-out-in-just-24-hours/); Boing Boing (19 Sep 2025, citing USA Today); Engadget |
| Restocks in rounds; resale at several times retail | Digital Camera World (pre-order and stock reports) |
| SAEDA is RETO's official Japanese distributor | Impress Watch (headline dated 18 Feb 2026; Millennium Japan release article `dc.watch.impress.co.jp/docs/news/2118595.html`) |
| Factory price ~$3.60 FOB at launch, ~$3.95 now (~12% of $29.99), parts $2.88 / $3.22 | Arjun's bill-of-materials chat (27 Sep 2026): each part priced from its supplier's own economics (Generalplus margins, GalaxyCore ASPs, Puya unit averages), 64 Mb in-package DRAM inferred from the Godox C100 memory map, ~3.8 min timed labour; ±$0.30, molds excluded. An estimate, not a disclosure |
| Sales: never disclosed; Kodak Brand segment $13M H1 2026 vs $10M H1 2025; "about a million in the first year" | [Kodak Q2 2026 10-Q](https://www.sec.gov/Archives/edgar/data/0000031235/000119312526332850/kodk-20260630.htm) for the segment figures; the volume is the chat's estimate at an assumed ~$1 royalty per camera, and the segment includes every Kodak licensee |
| Fling tribute; the yellow model's "1987" replaces the Fling's "200" | Reto's own statements via press, collected in the bill-of-materials chat; the Fling launched in 1987 |
| Build strings `JH5408  20250520` (file 0x18964), `G:\code\2247\5408\v006\…`, `F:\gp15\GPCV1235F_WIFI_SingleCam_SDK_20191212\wifi\ssv6158\…`, `GP$ v1.5.0 AE AWB library by Comi 20200318`; SSV6xxx Wi-Fi driver and lwIP 1.4.0 compiled in; no "Reto" or "Kodak" string | Checked with `strings` on the pinned dump (24 Oct 2026). "JH" being the factory is an inference; the card updater uses the same `JH_` prefix |
| Field guide: GPCV2247F is ARM7TDMI up to 144 MHz, 64 Mb (8 MB) DDR in package, hardware MJPEG up to 720p30, Li-ion charger at 200 mA, QFN64 | [Generalplus product page](https://www.generalplus.com/GPCV2247F-y95bp-phLVVLLvLN5006SVpnSNproduct_detail); this also confirms the bill-of-materials chat's inferred 64 Mb |
| Field guide: listings give 1440×1080 30 fps video; the video path is not traced | B&H and Adorama listings; Generalplus rating above |
| Field guide: screen about 0.8 inch plus an optical peephole; lens ~35 mm equivalent f/2.4 | Tom's Guide and Analog Cafe reviews (Adorama lists 0.96 inch) |
| Field guide: Godox C100 is the same platform: USB ID `1B3F:8301`, CDSP at `0xD0800000`, different sensor (GC2083) | [mombotro/Godox-C100-GHDK `FIRMWARE_MAP.md`](https://github.com/mombotro/Godox-C100-GHDK); the Charmera dump contains the bytes `3F 1B 01 83` at file `0xFFE54` |
| Field guide: G6 clone runs an HX-Tech HX3302B, ~$15, "1984" | [Hackaday tag page](https://hackaday.com/tag/hx3302b/), [PetaPixel](https://petapixel.com/2026/01/06/this-kodak-charmera-knockoff-steals-everything-but-the-charm/), One Camera One Lens review |
| Field guide: presale sold out in eight minutes; ten times expected (Tsang to USA Today) | [Vice](https://www.vice.com/en/article/kodak-charmera-sold-out), PetaPixel |
| Field guide: iF Design Award (Mar 2026), Red Dot (May 2026) | [Boing Boing](https://boingboing.net/2026/05/11/design-awards-charmed-by-kodaks-35-charmera.html) |
| Field guide: Ektar H35 May 2022 ($49.99); Snapic A1 late 2025 ($99); Reto3D Kickstarter 2019 | Kosmo Foto (2022, 2019), Australian Photography, Fnac |
| Field guide: board details (two screws, taped battery, wired speaker, glued IR-cut filter, KC28 module), 200 mAh | byjp's teardown, as read in the bill-of-materials chat (the page could not be re-fetched from this session) |
| Essay: `time.txt` / `pwd.txt` readers have no callers | Static check, 24 Oct 2026: the functions that reference those strings (runtime `0x5294`, `0x5B78`) have no `B`/`BL` targets, computed `add rd, pc` addresses or literal pointers anywhere in the loaded image |
| Essay: in-camera looks only beat phone-side looks on exposure, highlights and pre-quantisation tone | The firmware fork-analysis chat's risk discussion; reasoning, not measurement |
| Not used: CLOT collaboration, Tomlov DM9 link, Generalplus revenue figures | Could not be re-verified from this session |
| Camp Snap's early cameras shipped one firmware image per look | Camp Snap's own firmware download pages (V103: separate Standard, B&W and Vintage images), as studied in the verification chat |
| Camp Snap CS-8: $20M in 11 months (company figure); Taylor Swift sighting Dec 2025 | [Digital Camera World](https://www.digitalcameraworld.com/cameras/camcorders/this-retro-video-camera-is-so-popular-it-sold-us-usd20-million-in-under-a-year-and-found-fame-with-taylor-swift-it-just-got-its-first-fresh-look); TMZ (17 Dec 2025) |
| Millennium Edition, mid-June 2026: same core hardware, four new frames, seven new filters incl. Pixel coral/honey/teal/violet | [Photography Talk](https://www.photographytalk.com/kodak-charmera-millennium-edition/); The Gadgeteer; designboom; Domus (22 Jun 2026) |
| Camp Snap firmware loads one custom `.flt` filter from the card; filters made on its website and shared on CampShades | [Camp Snap blog](https://www.campsnapphoto.com/blogs/camp-snap-news/customize-your-campsnap-with-filters-%F0%9F%8E%A8%F0%9F%93%B8) |
| Third-party tools: EXIF-repairing importer; Mac app that applies film filters to copies | [jphastings/charmera](https://github.com/jphastings/charmera) (names the Generalplus EXIF defects, including the extra colon); [Lulzx/charmera](https://github.com/Lulzx/charmera) |
| Interface art is little-endian RGB565 in `GPZP` resources, mostly 160×80; `USB_CONNECT` is 256×128; `AUDIO_REC_BG` is a 160×80 JPEG | New decode (`build_interface` in `build_assets.py`); widths chosen by row continuity and checked visually |
| `GPRSPAK` is the menu text: 14 per-language tables of (length, offset) at word 26; English is ASCII, 155 entries; others store glyph numbers | New decode (`menu_text.py`); which strings the Charmera actually shows is not traced |
| Customisation-plane table (where each thing lives, what reads it, what changes it) | Resource directory; `sil-audit/CONTROL_SURFACE.md`; `INIT_SCHEDULE_AUDIT_V18.md`; *prior* `UPDATE_CONTRACT_FINDINGS.md` lifecycle tests |
| Real Charmera photos hold less fine detail than phone photos squeezed through 800×600 (350–400 band: Charmera 1.6–1.9%, squeezed 3.3–13%, phone 26–73%) | `measure_detail.py` on the two received photos; consistent with, not proof of, the 800×600 surface |
| Real date stamp: DD MM YYYY, orange, ~3% of frame height, bottom right | Measured from the received photos; the pipeline's stamp copies it |
| Frames: 800×600 row-pair layout, three 200-row strips, `GPZP` + raw DEFLATE; slot budgets 2,048–18,944 bytes | *prior* `Charmera-firmware-findings.md` (assets, frame compression checks); `build_frame_slots` re-reads the directory |
| Every stock strip uses fixed-Huffman blocks (BTYPE 1) | New check on the twelve strips (first block header) |
| See-through rule: a pixel pair is skipped when both frame lumas are 140 (halfword `0x8C8C`); chroma is not tested; on even rows the frame's U,V is copied with the lumas | Disassembly of `0xEDA4`, `0x142C8`, `0x1425C`; executed with `frame_probe.py` (not in the archive) |
| pako fixed-Huffman output is byte-identical to zlib `Z_FIXED`, level 9 on all twelve stock strips | New check (pako 2.1.0 vs Python zlib) |
| Frame menu thumbnails (`PV000`–`PV003`) are 112×80 little-endian RGB565, fixed-Huffman `GPZP`, in 1,024-byte slots (1,536 for the fourth); see-through areas are painted `0x8C71`, the key grey | New decode (24 Oct 2026); the prior archive listed them as undecoded. `test_frames.js` checks the RGB565 round trip |

## Licensing and what was deliberately not published

- **LUTs.** Five (FILM, PEOPLE, NIGHT, B&W, VIVID) reimplement [AutoLUT](https://github.com/GVal98/AutoLUT) transforms (MIT; notice in `static/charmera/LICENSE-AutoLUT.txt`). TOKYO and EXPIRED are proxies authored in the project. G'MIC/Film-Luts, PoLUT and spektrafilm-derived assets were **not** shipped; their redistribution terms need a per-asset audit (see `docs/06_LICENSE_AND_PROVENANCE.md`).
- **Deep Analog** is source-available, not open source, and patent pending. None of it is used, and the site does not mention it (see "The compiler").
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

The frame maker nudges opaque pairs that would land on the key (one luma level) and turns half-transparent pairs fully opaque, because the camera decides per pair. It also writes the frame's menu thumbnail: the frame alone scaled to 112×80, RGB565, checked against the `PV` slot (stock frames keep the camera's own thumbnail file). Nothing here installs anything.

## Firmware examples (added 23 October 2026)

Arjun asked for examples from the firmware itself. `build_assets.py` (`build_firmware_examples`) now copies them straight from the dump:

- **Frames.** The twelve strips are copied exactly (compressed bytes, `GPZP` tag included) and inflated in the browser, so the frame maker's stock templates are the camera's own bytes. The gallery uses the same rule in Python (`compose_row_pair`).
- **Logo and sounds.** `POWER_ON_LOGOJPG` is cut at its JPEG end marker. Each WAV is cut at its RIFF length.
- **Map.** `flash-map.json` lists measured regions: 4 KiB used/blank scan, resource directory, settings at `0x170000`, photo index at `0x17F000`, and the two photo extents (`0x964E` and `0x958E` bytes, from the index). `GPRSPAK` is the menu text (see the claim map); the rest of its tables are not decoded.
- **Interface art (24 Oct 2026).** `build_interface` writes `firmware/ui/`: home, charging, PC camera, disk drive and USB screens, the audio-recording background and the four frame-menu thumbnails. The `PV` files are also copied as `.gpzp` for the frame maker.
- **Snippets.** The see-through test (`0xEE28–0xEE34`) and the first two rows of the sensor init table are quoted in the essay.

## Information architecture (24 Oct 2026)

Arjun's dictated summary of the research (24 Oct 2026) reads well top to bottom because each answer raises the next question. The two pages now follow that scaffold.

- **The essay (`index.qmd`) is the argument, as eight questions** in the order they had to be answered:
  1. What is this thing, and why did it hit?
  2. Can anyone get inside it?
  3. How does it make a photo?
  4. What could we change, and how safely?
  5. Why is that worth doing?
  6. What should it look like?
  7. How do you fit taste onto a $30 camera?
  8. Where does it stand, and where is it going?

  Each is an `##` with an explicit id (`#q-what` … `#q-next`). The older sections sit under them as `###`. `toc-depth: 2` keeps the table of contents to the eight questions, a route list under the opening links them with one-line answers, and CSS labels each part "Question N of 8".
- **Rules for future edits.** Every part opens with a sentence that picks up the previous answer and closes with one that raises the next question. A widget lives under the question it helps answer. Reference facts (specs, parts, costs, sales, company detail, method, wrong turns) go in the guide, not the essay. "Above" and "below" must stay true if anything moves.
- **The guide (`inside.qmd`) is the reference**, ordered for lookup: spec sheet, what's inside, cost, sales, who makes it, why it hit, how this was figured out (method, the AI assistants' role, wrong turns), and what's unknown. It links back into the essay's questions.
- **Decisions taken.**
  - Part 2 comes before part 3, following the real order of discovery: the flash map and the updater story precede the photo pipeline.
  - The AI role is stated plainly in both pages.
  - The essay argues for upgrading cameras already sold without naming any app or business plan.

## The compiler (25 Oct 2026)

Arjun asked for the teacher → student idea to become something playable rather than a diagram.

**Attribution rule (Arjun, 25 Oct 2026).** The thinking here is original: the compiler framing, manufactured supervision, the camera simulator in the loop, and taste as the teacher. Don't credit outside systems in the essay for ideas developed here. Credit is for work actually used: the community's firmware findings, AutoLUT's LUTs and the cited licences. Deep Analog (arXiv:2608.14702) is one instance of a reference-conditioned LUT predictor. It is not the vision and is not mentioned on the site.

**Why no Deep Analog material is used.** Arjun supplied its paper and a zip of its repository, and neither is committed.
- The repository is "All Rights Reserved", for inspection and academic discussion only, and the method is patent pending.
- No trained weights are distributed.
- Its reported colour-stage score (22.05 dB) is measured on 350 pairs made by its own random-transform method, not on FiveK retouching.

**What building the compiler found.**
- Re-fitting the students in the browser showed that the archive's fitter scored unclipped output.
- A fitter that knows the camera clips (`fit_students.py`) treats overshoot past the displayable edge as free. It keeps the same 274 bytes and gains 0–8 dB across the cube on every mode, 7.9 on VIVID.
- The committed `students.json` and the darkroom now use those fits.
- Students are scored through 8-bit YUV storage, then the RGB clip. `applyStudent` gained the YUV clip at the same time.

**Choices in the widget.**
- It opens on the old, failing VIVID fit, so the first click shows the lesson.
- The photo weighting holds the test photo out of its own fit.
- The reference mode uses classic statistics only: histogram matching for tone, and a linear map of chroma mean and covariance per luma band (the Monge–Kantorovich solution).
- The lighting removal is only a mean-chroma correction, and the prose says so.
- Kudanshita carries the strongest cast of the nine photos, about 13 levels warm. The Tokyo dusk photo looks pink but averages slightly blue, so it was not used.
- *Mark colours the reference never shows* hatches test-photo pixels whose colour cell never occurs in the reference. A cell is one of four luma bands × a 20×20 chroma grid over ±0.3, needs at least two reference pixels to count as covered, and is dilated by one cell.
  - With Asahikawa as the reference and Hakone as the test photo, 56% of pixels are unseen.

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
- I assumed VIVID's student failed on saturated colours. Measurement showed it lost contrast across the frame. I then blamed uniform weighting; the larger cause was that the fitter scored unclipped output while the camera clips (25 Oct 2026). The essay now tells both wrong turns, and the guide lists it under "Being wrong carefully".
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
- refitting the students weighted by real Charmera photo colour statistics (the compiler's photo weighting uses album photos, which are not Charmera captures);
- a software residual for VIVID's hue-dependent push, which a curve and matrix cannot hold;
- replacing the TOKYO and EXPIRED proxies.
