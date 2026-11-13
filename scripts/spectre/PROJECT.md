# A Hilbert-style curve on the spectre tiling

## Start here

| If you want | Read |
|---|---|
| a plain-language explanation | `docs/EXPLAINER.md` |
| the result and its status | `docs/WRITEUP.md` |
| how the project went, with the dead ends and bugs | `docs/JOURNAL.md` |
| conventions, algorithms, and why each certificate is sound | `docs/METHODS.md` |
| prior work and who to ask | `docs/LITERATURE.md` |
| what is open and what to do next | `docs/OPEN.md` |
| to check the main claim in seconds | `python3 independent_check.py results/rule_min30.json` |
| the picture | `results/spectre_curve.png` |
| the smaller form of the object (a tree and the loop around it) | `results/spectre_tree.png`, `docs/JOURNAL.md` sections 18 and 20 |
| the interactive page (thread, build-up animation, marked tiles) | open `art/spectre-thread.html` in a browser |
| email drafts for expert readers | `docs/EMAILS.md` |
| the superseded exploratory scripts | `archive/` |

The rest of this file is the short technical summary and the reproduction instructions.

A finite recursive rule that threads one curve through every tile of a spectre supertile, at every level of the
substitution hierarchy, with a machine-checked certificate that the rule works at all levels.

Status: computer-assisted. Two checkers in this folder that share no code accept the certificate; both were
written in the same session and nobody else has reviewed them. A short literature search found general theory
(Rao and Zhang, ordered graph-directed systems; Ozkaraca, order structures on tiling substitutions) and no
construction for the spectre.

## Claim

Take the spectre supertiles of Smith, Myers, Kaplan and Goodman-Strauss ("A chiral aperiodic monotile", 2023),
built by the substitution in `spectre.py`. For every level n >= 1 and both supertile shapes there is a path that

1. visits every tile exactly once,
2. steps only between tiles sharing an edge,
3. visits every sub-supertile, at every level below n, as one contiguous run.

Levels 1 to 5 are settled by exhaustive search (`01_levels.py`). Levels >= 2 follow from the rule in
`results/rule_min30.json` and the induction below (`03_verify_rule.py`).

## The rule

- **Shapes.** `G` is the Gamma supertile (7 children), `D` is any of the other eight types (8 children, identical geometry).
- **Location.** A tile named by an eventually periodic word of child indices, read from the top level down.
  `5(13)` means child 5, then children 1, 3, 1, 3, ... A trailing `b` picks the second tile when the word ends in a mystic.
  The same word names a tile at every level.
- **State.** `shape|entry location|exit location`.
- **Production.** For each state, an order of its children and a state for each child.
  The first child's entry and the last child's exit are the parent's, one letter shorter.

`rule_min30.json` has 30 states (10 G, 20 D). It is the smallest closed rule among locations with prefix <= 1 and
period 1, proven optimal by CP-SAT. In the larger family with period <= 2 the solver's lower bound is 28.

## Why it holds at every level

1. **Base (level 2).** For each state, an exhaustive dynamic program confirms a hierarchical Hamiltonian path
   between its two tiles.
2. **Junctions.** A production needs the exit tile of each child to share an edge with the entry tile of the next.
   Call this a triple: (relative position of two supertiles, exit location, entry location).
   Descending one level turns a triple into another triple: drop the first letter of each location and take the
   relative position of the two children named by those letters.
3. **Exact relative positions.** Points live in Z[zeta_12], stored as 4 integers. A supertile's quad (4 key points) at
   level n+1 is a fixed integer-linear function of the quad at level n, a 16x16 matrix M. Every relative
   translation is an integer-linear function of the current quad vector, and descending composes it with M.
   Two such functions agree at all levels >= 2 if they agree at 16 consecutive levels (the orbit of the quad
   vector spans a space of dimension 6). That gives a canonical key.
4. **Closure.** Starting from the junctions of the rule, descent visits finitely many triples (32 for the 30-state
   rule, over 24 relative positions). Each is checked at level 2 in integer arithmetic. By induction every
   junction holds at every level >= 2.
5. **Induction on states.** A state at level n is its children's states at level n-1 concatenated across certified
   junctions.

Ten of the 30 states contain themselves as a child, so their curves nest: the level-n curve restricted to that
child is the level-(n-1) curve.

## Files

| File | What it does |
|---|---|
| `spectre.py` | Supertile construction; exhaustive entry/exit search (`solve`); explicit path builder (`build`) |
| `core.py` | Exact arithmetic, locations, junction proof (`prove`), state fixed point, rule I/O, replay, locality |
| `01_levels.py` | Exhaustive search at levels 1-5, plus overlap/gap check of each patch |
| `02_find_rule.py` | Finds closed rules and the provably smallest one in the simplest family |
| `03_verify_rule.py` | Checker for a rule file; this is the certificate |
| `independent_check.py` | Second checker: no shared code, different exact arithmetic, standard library only |
| `04_locality.py` | Worst-case locality of the curve by level |
| `05_locality_search.py` | Optional sampling search for better locality |
| `06_locality_limit.py` | Exact worst-case locality up to level 8 (17 million tiles) by branch and bound |
| `07_whole_plane.py` | Which rule states give a curve that exhausts the plane |
| `08_locality_family.py` | Follows the worst pair's self-similar family to level 40 in exact arithmetic |
| `09_interior.py` | Certificate, for all levels, that the nested copy behind the two-sided curve is strictly interior |
| `10_locality_bound.py` | Upper bound on the locality constant valid at every level (branch and bound) |
| `render.py` | Figure |
| `results/` | Rule files, base paths, logs of a from-scratch run, figure |
| `11_search.py`, `locbound.py` | Local search for better locality, driven by the all-level bound |
| `12_pick_best.py`, `search_parallel.sh` | Rank and verify search results; run one search per core |
| `13_self_drawing.py` | Negative results: no single marked spectre draws the curve |
| `14_markings.py` | Smallest set of marked tiles for a curve (20 for the 30-state rule) |
| `15_art_page.py` | Builds `art/spectre-thread.html` |
| `17_drawing.py` | Compares rules for drawing the line inside the tiles |
| `16_spectre_tree.py` | The spectre tree: join neighbouring pieces at their shared corner; one closed loop at every level |
| `18_bending.py` | Average turn per tile for the shipped rules, random rules and Hilbert |
| `art/` | The page, its template and data, and two stills |
| `docs/` | Explainer, write-up, journal, methods, literature, open questions, email drafts |
| `archive/` | Exploratory scripts from the session, superseded |

## Reproduce

    pip install -r requirements.txt
    ./run_all.sh          # about 12 minutes

or just check the certificate (a few seconds):

    python3 independent_check.py results/rule_min30.json     # standard library only
    python3 03_verify_rule.py results/rule_min30.json        # needs numpy

Tested with Python 3.13, numpy 2.5.3, scipy 1.18.1, matplotlib 3.11.2, ortools 9.15.

`02_find_rule.py` always reports 30 as the optimum. The particular 30-state rule the solver returns can differ
between runs and machines, so the rule from the original session is shipped as `results/rule_min30.json` and the
fresh one is written to `results/rule_found.json`. Both are checked by `03_verify_rule.py`.

## Measured

Exhaustive search, D-shaped supertile:

| Level | Tiles | Boundary tiles | Valid entry tiles | Entry/exit pairs |
|---|---|---|---|---|
| 1 | 9 | 8 | 8 | 30 |
| 2 | 71 | 42 | 39 | 610 |
| 3 | 559 | 186 | 149 | 11,296 |
| 4 | 4,401 | 796 | 561 | 179,904 |
| 5 | 34,649 | 3,380 | 2,149 | 2,754,190 |

Locality of the 30-state rule (max over tile pairs of distance^2 / (tile area x steps along the curve); Hilbert = 6).
Exact maximum at each level:

| Level | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|
| Constant | 5.02 | 6.10 | 8.07 | 8.48 | 8.69 | 8.87 | 8.94 |

At levels 6, 7 and 8 the maximum is attained by one self-similar pair, the tiles at addresses `41(2)` and `440(2)`
in state `D|(2)|0(5)`. Along that pair the ratio increases to 8.97984 (followed to level 40 exactly). That is a
lower bound for the rule's constant.

`10_locality_bound.py` gives the matching upper bound at every level: no pair of tiles in any state's curve exceeds
8.979841. A target of 8.97984 fails, as it must, on an actual pair at level 19. So

    8.979840 <= locality constant of the 30-state rule <= 8.979841

for the level-2 base paths in `results/base_paths_min30.json`. The bound works on nodes (state A, state B, exact
relative position, number of whole supertiles between them on the curve). A node is settled by a bound valid at all
levels (centre distance plus radii, against the tiles in between), or by an exact check at level 2 plus its 49-64
child nodes one level down. Nodes with nothing in between are finitely many (72). About 1,200 nodes are expanded.

Sampling about 4,000 other closed rules found some that score lower at levels 4 and 5 (best 7.5 at level 5), but
the one tested at level 6 came out at 8.68 for its top state, and over all its states that 53-state rule exceeds 9.07.
That sampling ranked rules by low-level values, which mislead. A later search driven by the all-level bound found
better rules: 8.745 with 181 states (`results/rule_best_locality.json`) and 8.766 with 122 (`results/rule_trial122.json`).

## Whole plane

- Any tiling: a tile's chain of supertiles carries a consistent choice of states (finitely many per level), giving
  one hierarchical curve through the union of the chain.
- Explicit: state `D|(5)|0(5)` contains itself as child 6 at step 2 of 8. The copy two levels down is strictly
  interior (2, 4, 10 tiles from the boundary at levels 3, 4, 5), so the nested supertiles exhaust the plane and the
  curve is two-sided. `09_interior.py` certifies the interior claim at every level >= 4 in exact arithmetic: the grandchild is
  surrounded by 6 supertiles, and surrounded-ness descends through a closed set of 17 (shape, environment) pairs.
  Level 3 is checked directly by `07_whole_plane.py`. So this tiling carries one two-sided curve through all its tiles.

## Searching for a better curve (`11_search.py`)

The all-level bound is fast enough to be a search objective (`locbound.py`). `11_search.py` starts from the 30-state
rule and repeatedly replaces one production, preferring the state at the worst pair's lowest common supertile, and
keeps the change if the true constant does not get worse. A four-minute trial reached 8.766 with a 122-state rule, and a 20-minute run reached 8.745 with 181 states.
Both pass both checkers.

Each search is single-threaded, so run one per core:

    ./search_parallel.sh 8 3600        # 8 seeds, one hour each, then ranks and verifies the best

Results land in `results/search_seed<N>.json` with a log beside each. `12_pick_best.py` re-evaluates every result to
five decimals, copies the best to `results/rule_best_locality.json`, and runs both checkers on it. Different seeds
explore different rules, so more seeds and more time both help. Memory use is a few hundred MB per search.


## Marked tiles and the art page

- `13_self_drawing.py`: one stroke per tile cannot be consistent on the spectre, and all 429 seven-arc markings
  produce closed loops.
- `14_markings.py`: the 30-state curve can be drawn with 20 marked tiles, proven minimal for that curve on 4,401 tiles
  and sufficient on 34,649.
- `art/spectre-thread.html`: a self-contained page with the thread, a build-up animation of the hierarchy, and the 32
  marked tiles that match the drawn line (20 is the minimum kit, with crossings chosen for that purpose). It loads three fonts from Google Fonts and falls back to system fonts offline.
  `python3 15_art_page.py` rebuilds it.

## Limits of what is shown

- The certificate is about supertiles as built by this substitution. That every spectre tiling carries this
  hierarchy is the theorem of the paper above and is assumed here.
- Tilings that split into several infinite-level regions get one curve per region. Joining them is not addressed.
- Both checkers read the substitution from the same published algorithm and rely on the same lemma (agreement at
  16 consecutive levels implies agreement at all later levels).
- The DP that settles the base case runs on adjacency computed in floating point, which `03_verify_rule.py`
  asserts is identical to the exact integer adjacency at levels 0-2.
- The locality upper bound runs in double-precision floating point without interval arithmetic, and treats the
  normalised geometry as stationary beyond level 45 (measured change below 4e-15 per two levels). It has one
  implementation. Whether the constant equals the family limit exactly is not proven; the enclosure has width 1e-6.
- The interior certificate is exact and has one implementation.
- The marked-tile results (scripts 13 and 14) have one implementation each. An earlier count of 29 markings was wrong
  and is retracted in `docs/JOURNAL.md`, section 16.
- Only two location families were searched for the smallest rule. A smaller rule may exist with other locations.
