# Open questions and next steps

## Before claiming anything

1. **Novelty.** Ask an expert (names in `LITERATURE.md`). The specific question: is an explicit, certified order
   structure for the spectre substitution a routine application of Rao and Zhang's linear graph-directed systems,
   or does the combinatorial (non-self-similar) substitution make it new?
2. **Independent review.** Both checkers were written in one session by one author. Someone else should run
   `independent_check.py`, or re-implement the 200-junction check from `METHODS.md` section 4.
3. **Audience.** Decide whether the write-up becomes a blog essay or a short formal note. Two comments asking this
   are open in the working doc.

## Gaps in rigour

- **Locality upper bound.** `10_locality_bound.py` uses double precision and one assumption about levels above 45.
  Redo with interval arithmetic and an explicit tail bound from the eigenvalues of the quad recurrence, and write a
  second implementation.
- **Exact constant.** The enclosure is [8.979840, 8.979841]. Is the constant exactly the limit of the pair at
  addresses `41(2)` and `440(2)`? It should be an algebraic number in a field containing sqrt(15) and sqrt(3);
  it has not been identified.
- **Interior certificate.** Exact, but one implementation.
- **Hierarchy.** That every spectre tiling carries this supertile hierarchy is taken from the paper.

## Mathematics left open

- **Better locality.** A 181-state rule reaches 8.745 and a 122-state rule 8.766, both verified, found by `11_search.py` in minutes. How low can it go, and can a small rule beat 8.98? The only lower bound is 2.84, from
  the diameter of a supertile. A search needs a criterion that predicts the limit; level-4 and level-5 values do not.
  `10_locality_bound.py` now evaluates a rule's true constant in about a second, so it can drive such a search.
- **Smaller rule.** 30 is minimal for locations with one letter then one repeating letter. With a repeating pair the
  bound is 28 to 30. Longer words are unexplored.
- **Split tilings.** Tilings whose hierarchy leaves several infinite regions get one curve per region. Can they be joined?
- **Order type in a generic tiling.** The compactness argument gives a ray or a two-sided curve. Which tilings get which?
- **Vertex cycles.** Is there a Hamiltonian cycle through the vertices of the spectre tiling, the analogue of the
  Ammann-Beenker result? Dimers are solved there, which is necessary.
- **The hat.** Same method, with tiles in two orientations.
- **Decorated monotile.** Ruled out on the spectre for one stroke per tile and for seven non-crossing arcs
  (`13_self_drawing.py`). Still open: arcs that cross, arcs ending at vertices, other monotiles.
- **Fewest marked tiles.** This curve needs exactly 20 strokes. Can another curve do with fewer? Choose the level-2
  base paths with markings in mind and rerun `14_markings.py`. Guess: low teens.
- **Do the marked tiles force the line?** Take the 20 marked tiles with the rule that strokes must meet across edges.
  Is the thread the only arrangement, or do loops and other lines appear?
- **Palette at higher levels.** The 20-stroke palette is verified on 4,401 and 34,649 tiles only.
- **Limit curve.** After rescaling, the curves should converge to a continuous, measure-preserving, Holder-1/2 map onto
  the limit shape. Not written down.

## The spectre tree (newest thread)

- Answered: the doors are read off the corner points. Join neighbouring pieces at the corner they share.
- One binary choice is left (open the ring at 1-2 or at 2-3). Is there a reason to prefer one beyond marking count?
- Prove the bound of 3 arcs per cluster at every level, and compute the loop's locality constant at every level.
- Prove the ring of shared corners at every level (checked at levels 1 to 8; the 16-level argument of METHODS would close it).
- Add the tree and its loop to the art page, with its own build-up.
- Check the claim that Hilbert's closed curve is the outline of a tree against a reference.

## A simple construction and a smoothest curve (newest thread)

- Is there an aperiodic tiling whose Hilbert-style curve needs only a handful of routes? Try pinwheel, Penrose
  triangles, Ammann-Beenker, chair with the same search and minimiser. Check the literature first.
- Least-bending base paths at 71 tiles: does the average turn move away from 75 degrees?
- If bending is fixed by the tiles, which energy does single out one curve?

## Practical next steps, in order

1. Send one of the expert emails in `EMAILS.md` with `WRITEUP.md`, the figure, and the zip.
2. Run the search longer on more cores (`./search_parallel.sh`), then check the best rule for a whole-plane state and render it.
3. Interval-arithmetic version of the locality bound.
4. Search for a curve with fewer marked tiles.
5. Publish: essay on arjunsriva.com or a short arXiv note, depending on step 1. `EXPLAINER.md` and the art page are
   the raw material for the essay.
