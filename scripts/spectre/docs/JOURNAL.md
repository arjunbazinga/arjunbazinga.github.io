# Project journal

How the project went, in order, including the wrong turns. Written 10-11 November 2026, in one working session
between Arjun and Claude. Numbers here match the logs in `results/`.

## 1. The idea

Starting question: build a "space-filling curve + aperiodic tiling combo".

Three readings were on the table:

1. A Hilbert-style curve that visits every tile of an aperiodic tiling, built from the substitution rule.
2. Curve segments drawn on each prototile so that any valid tiling joins them into one path (Truchet-style).
3. Curve first, tiling second (Gosper curve, Fibonacci word fractal).

Reading 1 was chosen. Reading 2 is untouched and is listed in `OPEN.md`.

## 2. What looked open

- Ammann-Beenker tilings have Hamiltonian cycles through their vertices (Singh, Lloyd, Flicker).
- Penrose rhombus tilings have none, because they have no perfect dimer matching.
- The authors say they know no criterion separating the two cases.
- For the hat and spectre monotiles nothing was found, only the dimer model on the spectre.

The spectre was picked as the target: one tile, no reflections, known substitution, small search space.

A distinction made early and kept throughout: the published results visit **vertices**. A Hilbert-style curve
visits **tiles**, which is a Hamiltonian path on the dual graph plus a contiguity condition on supertiles.

## 3. Generating the tiling

- `spectre.py` implements the Smith-Myers-Kaplan-Goodman-Strauss substitution (Kaplan's algorithm: nine supertile
  labels, eight child placements chained through four "quad" key points, a reflection at every level).
- **Bug 1.** The tile was first typed from memory with wrong y-coordinates for vertices 3, 4, 5 (-0.5 and 0.5 in place of
  0.5 - sqrt(3)/2 and 1.5 - sqrt(3)/2). Symptom: correct tile counts (9, 71, 559) but no two tiles shared an edge. Found
  by plotting a level-1 cluster and comparing with the reference port at github.com/shrx/spectre.
- Validation since then: every edge belongs to at most two tiles, the patch boundary is one closed loop, and the area
  inside it equals the number of tiles times the tile area.

## 4. Exhaustive search by level

For each supertile, a dynamic program computes every (entry tile, exit tile) pair joined by a hierarchical
Hamiltonian path. It builds level n from level n-1, so it is exact and fast.

| Level | Tiles (D) | Boundary tiles | Valid entries | Entry/exit pairs |
|---|---|---|---|---|
| 1 | 9 | 8 | 8 | 30 |
| 2 | 71 | 42 | 39 | 610 |
| 3 | 559 | 186 | 149 | 11,296 |
| 4 | 4,401 | 796 | 561 | 179,904 |
| 5 | 34,649 | 3,380 | 2,149 | 2,754,190 |

Observations that shaped the next step:

- The eight non-Gamma supertile types have identical geometry, so there are two shapes, called D and G.
- From level 2 on, exactly 48 child orders work for D and 34 for G. That stability suggested a finite rule.

## 5. From evidence to a rule

The question became: is there a finite recursive rule, and can it be proven at all levels?

Key design decisions:

- **Locations.** Name an entry or exit tile by an eventually periodic word of child indices. Any finite-state rule
  must have entry and exit tiles of this form, and the same word names a tile at every level.
- **Junction triples.** A production needs "exit tile of child i shares an edge with entry tile of child i+1" at every
  level. That is a claim about (relative position, exit location, entry location), and it descends one level by
  dropping a letter from each location.
- **Canonical relative positions.** Positions are exact in Z[zeta_12]. A relative translation is an integer-linear
  function of the quad vector, and the quad vector obeys a fixed linear recurrence. Agreement at 16 consecutive levels
  implies agreement at all later ones. This is what makes the set of triples finite and comparable across levels.
- **Greatest fixed point.** Start from all states that work at levels 2-4, repeatedly drop any state with no
  production into surviving states. What remains is the set of valid states.

Results in order:

1. First run (`archive/closure.py`): family "one letter then a repeating pair", 5,876 candidate states, 3,480 survive.
   First rule extracted: 91 states. Greedy preference for reused states: 66.
2. Base-case adjacency moved from floating point to exact integers (`core.py`).
3. Family comparison: no rule exists with purely periodic locations of period 1 or 2. The family "one letter then one
   repeating letter" has 642 candidate states and all survive.
4. Reverse deletion brought the rule to 36 states. CP-SAT then proved 30 is optimal in that family. In the larger
   family the solver's bound is 28 to 30.

## 6. Locality, first pass

Locality = max over tile pairs of distance^2 / (tile area x steps along the curve). Hilbert scores 6.

- Brute force gave 5.02, 6.10, 8.07, 8.48, 8.69 at levels 2-6 for the 30-state rule.
- **Dead end.** A local search that banned the state responsible for the worst pair and re-solved emptied the valid
  set after 32 bans without improving anything (`archive/step4.py`). Some states are structurally necessary.
- Sampling 4,195 closed rules found level-4 values down to 6.46 and level-5 values down to 7.51.
- **Lesson.** Low-level rankings do not predict the limit. The best sampled rule scored 8.68 at level 6 for its top
  state, and later turned out to exceed 9.07 once all its states were counted.

## 7. Packaging and second checker

- Clean numbered scripts, `run_all.sh`, logs from a from-scratch rerun.
- `independent_check.py`: no shared code, numbers of the form p + q sqrt(3) with rational p and q, relative positions
  compared as explicit transforms at 16 levels, plain recursive search for the base case. It reports the same counts:
  200 junctions, 32 closed triples, 24 relative positions.

## 8. Literature check

About ten searches. See `LITERATURE.md`. Outcome: the general method is known (Rao and Zhang; Ozkaraca), a curve on
another aperiodic tile set exists (Hassell, Ammann A5), and nothing specific to the spectre or hat turned up.

## 9. Whole plane

- Compactness gives a curve through the union of any tile's chain of supertiles.
- State `D|(5)|0(5)` contains itself as child 6 at step 2 of 8. Its copy two levels down is 2, 4, 10 tiles from the
  boundary at levels 3, 4, 5.
- `09_interior.py` then certified the interior property at all levels with a second closure argument:
  6 neighbours, 17 cases.

## 10. Locality, second pass

- `06_locality_limit.py` computes the exact maximum by branch and bound over index blocks: level 6 in 3 s (brute force
  took 228 s), level 8 with 16.9 million tiles in under 3 minutes. Values 8.87 and 8.94.
- At levels 6, 7, 8 the worst pair is the same self-similar pair, at addresses `41(2)` and `440(2)`.
  `08_locality_family.py` follows it to level 40 exactly: the ratio rises to 8.97984027.
- `10_locality_bound.py` gives an upper bound at every level by branch and bound on pairs of sub-supertiles.
  - **Bug 2.** The first version carried relative positions in floating point down the tree. The error grows by the
    scaling factor 2.8 per level, and the chain of consecutive blocks never ends, so at depth 34 it reported a
    nonsense violation of 56. Fix: carry exact integers (values at six levels, using the dimension-6 recurrence),
    refresh floats from them, and visit each consecutive-block node once (there are 72).
  - Result: no pair exceeds 8.979841. Targets 8.9, 8.97 and 8.97984 fail on actual pairs at the expected levels.

## 11. State at the end of the session

Proven by exact computation, with two independent checkers:

- the 30-state rule gives a hierarchical curve on every supertile at every level.

Proven by exact computation, one implementation:

- the two-sided curve of `D|(5)|0(5)` covers every tile of its tiling;
- 30 states is minimal in the simplest location family.

Established in floating point, one implementation:

- the locality constant of the 30-state rule lies in [8.979840, 8.979841].

Not done: expert review, interval arithmetic for the locality bound, a better rule, the hat, vertex cycles.

## 12. Search for a better curve (added at the end of the session)

- `locbound.py` wraps the all-level bound as a function, and `11_search.py` uses it as the objective of a local search
  over productions. This replaces the misleading level-4 and level-5 rankings of section 6.
- Ten random closed rules have true constants between 9.07 and 9.44. The 30-state rule (8.980) is better than typical.
- A four-minute trial found a 122-state rule with constant in [8.76557, 8.76574]. It is saved as
  `results/rule_best_locality.json`, passes `independent_check.py`, and its bound is logged in
  `results/10_best_locality.log`. This is the first rule that beats the 30-state rule by the true measure.
- Two 20-minute runs then finished. Seed 1 found a 181-state rule with constant in [8.74504, 8.74522], now
  `results/rule_best_locality.json`, accepted by both checkers (`results/12_pick_best.log`). Seed 2 found no
  improvement and returned the 30-state rule. The 122-state trial rule is kept as `results/rule_trial122.json`.
- The background job reported a failure at the end. That was a typo in the command that printed the logs; both
  searches had completed and saved their results.
- Pattern so far: better locality comes with many more states. Whether a small rule can beat 8.98, and how low the
  constant can go, is open. Nothing here is a lower bound.
- Not yet checked for the 122-state or 181-state rule: whether it has a two-sided self-containing state with an interior nested
  copy (`07_whole_plane.py`, `09_interior.py`), and what its curve looks like (`render.py`).
- Email drafts to three possible expert readers are in `EMAILS.md`. None has been sent.

**To continue:** run `./search_parallel.sh 8 3600` on a multi-core machine, then `12_pick_best.py` ranks and verifies.

## 13. Saying what the object is

Several rounds of plain-language explanation produced a clearer statement of the question. It is recorded in
`EXPLAINER.md`. The points that changed how the project is framed:

- "A space-filling curve that never repeats" is too weak: Hilbert's curve already never repeats, and a spiral covers
  a page without crossing or repeating. What is special here is that the cell shape forces non-repetition (aperiodic
  in the tiling sense), the curve keeps Hilbert-style locality at every scale, and a finite recipe generates it.
- A ladder of four versions of the question, ending in "one marked tile that forces the line" (section 15).
- Fractal character: cluster outlines have dimension about 1.40. Estimate from boundary tile counts
  (796 to 3,380 per level, ratio 4.246) against the linear scale factor sqrt(4 + sqrt(15)) = 2.806.

## 14. The art page

`art/spectre-thread.html` is a self-contained page, also published as a private Claude artifact named "Spectre Thread".

- **Thread view.** Tiles coloured by position along the curve, the curve drawn as one white thread, a slider to scrub,
  559 or 4,401 tiles, three colour schemes.
- **Build it up.** The Hilbert-style construction: one tile, then four rounds of "treat it as one piece, join eight".
- **Marked tiles.** The 20 strokes of section 16, each clickable to show where it is used.

Design decision: the page uses state `D|(5)|0(5)`, whose production starts with itself as child 5. So the curve on
4,401 tiles begins with the curve on 559, which begins with the curve on 71, then 9, then 1. The build-up animation
is therefore one curve revealed in nested prefixes. `15_art_page.py` asserts the sizes [1, 9, 71, 559, 4401].

`15_art_page.py` rebuilds the page byte for byte from `art/tmpl.html`, the rule and `results/markings_min30.json`.
The stills in `art/stills/` were rendered from this version of the page.

Checks made: light theme at desktop width for all three features, phone width for overflow only. The build-up was not
viewed in the dark theme.

## 15. Can one marked tile draw the curve? (negative results)

`13_self_drawing.py`, log in `results/13_self_drawing.log`.

- **Edge-meeting table.** Each of the 14 edges of a spectre meets three to five different edges of neighbouring tiles.
  Even-numbered edges only ever meet odd-numbered ones.
- **One stroke per tile is impossible.** It would need two edges that only ever meet each other. No such pair exists.
- **Using only some edges is impossible.** The smallest set of edges closed under "meets" is all 14.
- **Seven non-crossing arcs pairing all 14 edges:** 429 candidates. On the 559-tile supertile every one has closed
  loops (at least 2.2% of arcs, median 65%), and no open strand is longer than 11% of the arcs. That supertile occurs
  in every spectre tiling, so none of the 429 gives a single line in any tiling.

Not tried: arcs that cross, arcs that end at vertices instead of edge midpoints, and other monotiles.

## 16. Marked tiles: how many strokes are needed

`14_markings.py`, log in `results/14_markings.log`.

A marking is an unordered pair of edges: where the thread enters a tile and where it leaves.

- **Bug 3, and a retraction.** A first count gave 29 markings and was reported to Arjun. It was wrong. Neighbouring
  spectres usually share two or more edges, and that script chose the crossing edge separately for each tile, so the
  two tiles at a join could disagree about which edge the thread crossed. A second attempt (32) had the same flaw.
- **Correct setup.** 4,252 of the 4,400 steps have a choice of crossing edge, with up to 4 options. The choice at each
  step affects the markings of both tiles, so minimising the number of markings is a chain-structured optimisation.
- **Results for the 30-state rule, state `D|(5)|0(5)`.** Always crossing at the first shared edge: 47 markings.
  Greedy choice: 41. Reverse deletion with a feasibility pass along the curve: 25. CP-SAT: 20, proven optimal on
  4,401 tiles. The same 20 suffice on 34,649 tiles, so 20 is also the minimum there. Higher levels are not checked.
- **The solver can return a different optimal palette each run.** The one behind the page is shipped as
  `results/markings_min30.json`; a fresh run writes `results/markings_found.json`.
- **Other rules.** A few hundred sampled rules, scored with the weaker greedy method, varied only by a handful
  (42 to 49 against 41). Rule choice alone moves the count little. The larger freedom is the level-2 base paths,
  which were taken as the first ones found.
- **Guess, labelled as a guess:** low teens may be reachable. The only proven floor over all curves is 2.
- **Enough versus forcing.** Twenty marked tiles are enough to draw this thread. Whether they force it, so that no
  other arrangement of the same marked tiles exists, is untested.

## 17. Where things stand (11 November 2026, end of the second day)

Exact computation, two independent checkers:

- The 30-state rule gives a hierarchical curve on every supertile at every level. The 122-state and 181-state rules too.

Exact computation, one implementation:

- The two-sided curve of `D|(5)|0(5)` covers every tile of its tiling (interior certificate).
- 30 states is minimal in the simplest location family.
- No single one-stroke marking and no seven-arc marking makes the spectre draw a single line.
- 20 marked tiles are the minimum for the 30-state curve on 4,401 tiles, and suffice on 34,649.

Floating point, one implementation:

- Locality constants: 8.97984 (30 states), 8.766 (122 states), 8.745 (181 states), each bounded at every level.

Made:

- A reproducible package, an interactive page with a build-up animation and the marked tiles, two stills,
  a plain-language explainer, and three unsent email drafts.

Not done: expert review, the longer locality search on more cores, a search for fewer marked tiles, interval
arithmetic for the locality bound, the hat, vertex cycles.

## 18. What makes an object loved, and a smaller form: the spectre tree

**The standard we set.** Hilbert's curve and the spectre share five traits: a question a child can ask, a
description that fits in one picture, no arbitrary choices, something you can make by hand, and depth out of
proportion to the description. Our 30-route curve meets the first and last. It fails "one picture" and "no arbitrary
choices": it is a table of 30 routes built on level-2 paths taken as the first ones found. So "simplest" was restated
as: the form whose full description a person can hold in their head and draw.

**Regularity inside the 30 routes.**

- Every route's reverse is also a route, so there are 15 routes up to direction (10 for D, 5 for G).
- 20 visiting orders in all (14 for D, 6 for G).
- Between almost every pair of neighbouring pieces the routes always cross at the same pair of tiles: one door per
  pair, with two exceptions (4-5 and 4-7 have two).
- The 8 pieces of a cluster sit in a ring 0-1-2-3-4-5-6-7-0, with two chords (1-3, 4-6).

**The idea.** The 30 states exist because a path has two ends that must sit in particular places. A tree has no ends.
So: join the pieces of each cluster into a tree through fixed doors, and take the walk around the tree as the curve.
The walk around any tree is one closed loop that never crosses itself.

**The rule (`16_spectre_tree.py`).**

- Chain the pieces 7-0-1-2-3-4-5-6. The mystic cluster has no piece 2: 7-0-1-3-4-5-6.
- Door kind A: tile `(7)` of the first piece to tile `5(2)` of the second. Used for 0-7, 0-1, 2-3, 3-4, 5-6.
- Door kind B: tile `(2)` to tile `(7)`. Used for 1-2 and 4-5.
- Skip door: tile `(2)` to tile `5(2)`. Used for 1-3 in the mystic cluster.
- The two tiles of a mystic are joined.

That is the whole description. It starts from single tiles, so there are no base paths to choose.

**Results.**

- Certified at every level: 13 doors, 10 closed triples, 9 relative positions, plus exact checks at levels 1 and 2.
- Levels 1 to 5 built explicitly: a spanning tree each time, and the walk around it is one closed loop.
- Each tile is passed 1 to 4 times (its number of doors). About 60% of tiles have 2 doors.
- Each cluster is visited in at most 3 separate arcs (observed through level 5, unproven beyond).
- 20 distinct tile markings, stable from level 3 to 5.
- Locality 18.5 at level 4, counting each step as half a tile. The 30-route curve scores 8.98.

**What was given up.** The loop passes a tile up to four times where the path visited each tile once, and a cluster
is covered in up to three arcs where the path finished it in one. Locality is about twice as loose.

**What freedom remains.** Other chains and other doors are valid. This choice uses the fewest door kinds available
among locations with one letter then one repeating letter: two for D, and the mystic cluster forces a third.
Whether some natural condition singles out one tree is open.

**As far as I know** Hilbert's curve has the same relationship to a tree: its closed form is the outline of a spanning
tree of the coarser grid. I have not checked a reference for that.

## 19. How the line is drawn inside the tiles

Arjun asked why some strokes were straight and some curved, then why the line ran edge to edge when the object is
tile to tile, then what "space-filling" should imply for the free choices. Outcome:

- Only the order of tiles is mathematics. Crossing edge, crossing point and interior path are drawing choices.
- The page now draws one spline through each tile centre and the middle of each shared border (`17_drawing.py`,
  `docs/METHODS.md` section 11). No self-crossings, never outside its own tiles, widest clearance of the rules tried.
- A retraction: I told Arjun the old edge-to-edge arcs visibly cut across neighbouring tiles. Measured, they did not.
- The centre-only spline he proposed has no self-crossings and leaves its tiles for 0.15% of its length.
- Not done: the thickest-ribbon rule, which would decide the interior path with no convention at all.
- The marked tiles on the page now follow the same rule as the drawn line, so the two agree everywhere. Under this
  rule there are 32 markings (same at 4,401 and 34,649 tiles). The minimum of 20 from section 16 needs crossing edges
  chosen for kit size, which makes the line longer and brings it closer to itself. `15_art_page.py` no longer reads
  `results/markings_min30.json`; that file remains the record of the 20-tile kit.

## 20. The doors sit at the corners (12 November)

Arjun restated the goal: Hilbert's curve is periodic underneath; is there a recursive construction as simple as
Hilbert's whose curve is aperiodic, built from one object iterated the way the spectre is? The tree of section 18 was
close, but its three door kinds were found by search. The question for this step: is there a picture behind the doors?

**Finding.** Yes. Each cluster has four corner points (Kaplan's key points). The tiles at them have fixed addresses
`6(3)`, `(5)`, `(3)`, `0(5)`. Sibling pieces share exactly eight corner points, the same at levels 1 to 8, and those
eight pairs are the ring 0-1-2-3-4-5-6-7-0. At every shared corner the two corner tiles share an edge at every level.

**New rule (`16_spectre_tree.py`).** Join neighbouring pieces at their shared corner. The mystic cluster lacks piece 2
so its ring is already a chain. The full cluster leaves one join beside piece 2 open. Certified at all levels: 8
doors, 8 closed triples, 8 relative positions.

**Measured, open at 1-2 / open at 2-3.** Doors per tile 1 to 3 in both. Clusters in up to 3 arcs in both (through
level 5). Markings 18 / 22. Locality at level 4: 20.10 / 20.23. The hand-picked tree of section 18 had 20 markings,
up to 4 doors per tile and locality 18.5, so the corner rule costs a little locality and removes the arbitrary doors.

**What freedom remains.** One binary choice (1-2 or 2-3). Opening any other join would make the two cluster shapes
follow different chains. Open at 1-2 is the default because it needs fewer markings.

**Not done.** The tree is not on the page yet. The claim that Hilbert's closed curve is the outline of a tree is
still unchecked against a reference.

## 21. Stepping back: what the object is, and bending (12 November)

**Arjun's reaction to the tree.** "We are losing what made this good." The tree gives up each-tile-once and
finish-a-region-before-leaving, which are the Hilbert properties. Agreed outcome: the thread (the 30-route curve) is
the object. The tree and the corner fact stay as side results.

**The goal in his words.** The spectre tiles the plane and cannot be periodic. He wants the same for a space-filling
curve: iterate a construction, cover the whole plane, and get something with no regular structure or symmetry. The
construction should be as small as Hilbert's. A line being drawn continuously does not show how it is built.

**Where that leaves us.**
- The thread meets "fills the plane, cannot repeat, no symmetry". Its construction needs 30 routes (minimum in the
  family searched), so it is a result with a complicated recipe.
- The tree has a one-sentence recipe and loses each-tile-once.
- On the spectre these two requirements pull against each other. Hilbert reuses one motif because the square has
  symmetry; a shape with no symmetry needs each variant written out.
- Proposed and not started: run the same search on other aperiodic tilings and minimise the number of routes.
  Candidates: pinwheel (one triangle, 5 copies), Penrose triangles, Ammann-Beenker, chair. Literature not checked.

**Bending (`18_bending.py`).** Arjun asked for the smoothest curve, the one that bends least. Average turn per tile,
centre to centre, 4,401 tiles: Hilbert 72.0 degrees; the 30-route rule 75.5; the 181-route rule 75.5; 200 random
closed rules 74.3 to 76.3 (median 74.9). Bending does not separate the rules. Caveat: all rules share the same routes
below 71 tiles (the base paths come from one deterministic search), and most bending happens there.

**Not done.** A search for least-bending base paths at 71 tiles, then a rule rebuilt on those. If the range stays
near 75 degrees, a different energy is needed, such as how tightly the line packs against itself.
