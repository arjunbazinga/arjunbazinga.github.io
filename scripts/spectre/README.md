# Spectre Thread essay: context, provenance and how to rebuild

This folder holds the research behind [`posts/spectre-thread/`](../../posts/spectre-thread/index.qmd) ("Spectre Thread"), a Hilbert-style curve through the tiles of the spectre tiling. It is written for someone who has this repository but not the conversation that produced it.

Quarto does not render `scripts/`, so nothing here is published as a page. The essay links here so readers can run the checker.

## What is here

This is the research package as it stood on 12 November 2026, uploaded as `spectre-curve_9.zip`. Start with [`PROJECT.md`](PROJECT.md), which was the package's own README: claim, rule, proof outline, file table, measured results and the limits of what is shown.

| If you want | Read |
|---|---|
| a plain-language explanation (most of the essay comes from this) | `docs/EXPLAINER.md` |
| the result and its status | `docs/WRITEUP.md` |
| how the project went, with the dead ends and bugs | `docs/JOURNAL.md` |
| conventions, algorithms, and why each certificate is sound | `docs/METHODS.md` |
| prior work | `docs/LITERATURE.md` |
| what is open | `docs/OPEN.md` |
| to check the main claim in seconds | `python3 independent_check.py results/rule_min30.json` |

Left out of the upload on purpose:

- `docs/EMAILS.md`, unsent drafts to named researchers. Private correspondence does not belong in a public repository. `JOURNAL.md` and `OPEN.md` still mention it.
- `archive/`, the superseded exploratory scripts.
- The PNG figures in `results/` and `art/stills/` (about 5 MB). `render.py` and `16_spectre_tree.py` regenerate them. `static/spectre/spectre-tree-1600.webp` is a WebP copy of the tree figure, kept for the companion material though the essay no longer shows it.
- `art/spectre-thread.html`, the standalone art page. `python3 15_art_page.py` rebuilds it from `art/tmpl.html`.

## How the essay relates to the package

The first version of the essay (13 November 2026) was assembled from `docs/EXPLAINER.md`, `docs/WRITEUP.md` and `docs/JOURNAL.md`. It read as a collage of documents written for different readers, and on 14 November it was rewritten as one short narrative for a reader new to both Hilbert's curve and the spectre. The rewrite keeps the explainer's facts and drops the notation, the proof details, the locality table, the status table, the spectre tree and the account of wrong turns. Those all remain here, in `docs/`, for anyone who follows the essay's link.

| Essay | Source |
|---|---|
| Hilbert figure | `hilbert_figure.py` prints the inline SVG |
| The three interactive figures (thread, build-up, marked tiles) | `static/spectre/thread.js`, the art page's script (`art/tmpl.html`) made into a function that mounts each figure from one shared copy of the data, in the site's fonts and colours, following the site's dark-mode toggle and reduced-motion setting |
| Figure data | `static/spectre/thread-data.json`, written by `15_art_page.py` (the same bytes as `art/data.json`) |
| Still image and social card | `art/stills/spectre_thread_light_559.png`, converted to WebP |
| "Thirty routes", "200 joins", "32 claims" | `PROJECT.md`, `docs/WRITEUP.md` |
| "A hundred steps apart, about thirty tile-widths" | the locality constant 8.97984 (`docs/WRITEUP.md`): distance² ≤ 8.98 × tile area × steps, so 100 steps gives about 30 √(tile area); Hilbert's 6 gives about 24.5 cells |
| 32 and 20 strokes | `docs/JOURNAL.md` sections 16 and 19 |

## Rebuild

    pip install -r requirements.txt
    python3 independent_check.py results/rule_min30.json   # standard library only, about 10 s
    python3 15_art_page.py                                  # rebuilds the figure data for the essay
    ./run_all.sh                                            # everything, about 12 minutes

Run them from this folder. `15_art_page.py` writes `../../static/spectre/thread-data.json`.

## Status

Computer-assisted and unreviewed. Two checkers that share no code accept the certificate; both were written in the same session. Whether the result is new is unconfirmed: the next step in `docs/OPEN.md` is to ask an expert.
