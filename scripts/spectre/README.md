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
- The PNG figures in `results/` and `art/stills/` (about 5 MB). The essay's images were made from them and live in `static/spectre/`. `render.py` and `16_spectre_tree.py` regenerate the PNGs.
- `art/spectre-thread.html`, the standalone art page. `python3 15_art_page.py` rebuilds it from `art/tmpl.html`.

## How the essay maps to the package

| Essay | Source |
|---|---|
| Most prose: ingredients, question, build-up, aperiodic vs non-periodic, ladder, order without symmetry, fractal, marked tiles, tree, "So what?" | `docs/EXPLAINER.md` |
| "Why it works at every size", "From a patch to the whole plane", locality table, status table | `docs/WRITEUP.md`, `PROJECT.md` |
| "How this was figured out" and "Being wrong carefully" | `docs/JOURNAL.md` sections 3, 6, 10, 16 and 19 |
| What is open | `docs/OPEN.md` |
| Footnotes and credits | `docs/LITERATURE.md` |
| Both interactive figures | `static/spectre/thread.js`, the art page's script (`art/tmpl.html`) made into a function that mounts each figure from one shared copy of the data, in the site's fonts and colours, and following the site's dark-mode toggle |
| Figure data | `static/spectre/thread-data.json`, written by `15_art_page.py` (the same bytes as `art/data.json`) |
| Still images and social card | `art/stills/spectre_thread_light_559.png` and `results/spectre_tree.png`, converted to WebP |

## Rebuild

    pip install -r requirements.txt
    python3 independent_check.py results/rule_min30.json   # standard library only, about 10 s
    python3 15_art_page.py                                  # rebuilds the figure data for the essay
    ./run_all.sh                                            # everything, about 12 minutes

Run them from this folder. `15_art_page.py` writes `../../static/spectre/thread-data.json`.

## Status

Computer-assisted and unreviewed. Two checkers that share no code accept the certificate; both were written in the same session. Whether the result is new is unconfirmed: the next step in `docs/OPEN.md` is to ask an expert.
