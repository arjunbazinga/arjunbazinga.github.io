# Literature notes

Collected 10-11 November 2026 from about ten web searches. This is a first pass, short of a proper review.
"Read" means the page was opened; "snippet" means only search-result text was seen; "title only" means not even that. Author names are given only where a source confirmed them.

## The tiling

- **Smith, Myers, Kaplan, Goodman-Strauss, "A chiral aperiodic monotile" (2023).** https://arxiv.org/pdf/2305.17743
  The spectre, its substitution into nine supertile types, and the theorem that every spectre tiling carries this
  hierarchy. Everything here rests on it. (snippet; the algorithm was taken from Kaplan's implementation as ported in
  the next item)
- **shrx/spectre**, a Python port of Kaplan's construction. https://github.com/shrx/spectre
  Used once, to find a coordinate typo in our tile (see `JOURNAL.md`, bug 1). (read)
- **Smith et al., "An aperiodic monotile" (the hat).** https://arxiv.org/pdf/2303.10798 (snippet)
- **"On the long-range order of the Spectre tilings" (arXiv 2411.15503).** https://arxiv.org/pdf/2411.15503
  Self-similar relatives of the spectre tiling, model-set description. Relevant if one wants the exactly self-similar
  version, where the Rao-Zhang theory applies directly. (snippet)

## Curves through vertices of aperiodic tilings

- **Singh, Lloyd, Flicker, "Hamiltonian cycles on Ammann-Beenker tilings" (Phys. Rev. X 2024).**
  https://arxiv.org/html/2302.01940v4
  Constructive Hamiltonian cycles through the vertices. States that Penrose tilings cannot have them (no perfect
  dimer matching) and that it is hard to name a special case covering one and not the other. (snippet, substantial)
- **Singh, Flicker, "Exact solution to the quantum and classical dimer models on the spectre aperiodic monotiling"
  (Phys. Rev. B 2024).** https://journals.aps.org/prb/abstract/10.1103/PhysRevB.109.L220303
  Perfect matchings on the spectre vertex graph. A necessary ingredient for a vertex Hamiltonian cycle; no such cycle
  was found in the literature. (snippet)
- **S. Singh, PhD thesis, Cardiff 2025.** https://orca.cardiff.ac.uk/id/eprint/181483/1/SSinghPhD25.pdf
  Covers both of the above. (snippet: table of contents)

## Space-filling curves from substitution rules: the general theory

- **Rao, Zhang, "Space-filling curves of self-similar sets (I): iterated function systems with order structures".**
  https://ar5iv.labs.arxiv.org/html/1509.06276
  Main theorem: invariant sets of a *linear* graph-directed IFS (an order on the pieces such that consecutive pieces
  intersect) with the open set condition admit optimal parametrizations: onto, measure-preserving, Holder 1/s.
  A chain condition on heads and tails characterises linearity. Companion papers extend to connected self-similar
  sets with finite skeletons. (read, first 100k characters)
  **Relation to this project.** Our rule is exactly an order structure with a chain condition: states are (piece,
  head, tail), junctions are "tail of one meets head of the next". The spectre substitution is combinatorial, with
  supertiles that are not scaled copies of each other, so the theorem does not apply as stated. It would apply to the
  self-similar relatives. This is the first thing an expert should be asked about.
- **Ozkaraca, PhD thesis, Glasgow 2021.** https://theses.gla.ac.uk/81993/7/2021OzkaracaPhD.pdf
  An order structure for tiling substitutions of the plane, giving a space-filling curve and a factor map to a
  one-dimensional tiling. Worked example: 2D Thue-Morse. (snippet: abstract and introduction)
- **Tilings Encyclopedia glossary, "FASS curve".** https://tilings.math.uni-bielefeld.de/glossary
  Notes that FASS curves can be derived from aperiodic substitution tilings by decoration, and often conversely.
  (snippet)

## Explicit curves on other tilings

- **Hassell, "A Plane-Filling Curve Using Ammann A5 Tiles" (Bridges 2014).**
  https://archive.bridgesmathart.org/2014/bridges2014-389.pdf
  A FASS curve on an aperiodic two-tile set, defined by marked tiles and substitution, shown by figures. (read)
- **"Recursive tilings and space-filling curves with little fragmentation" (arXiv 1002.1843).**
  https://arxiv.org/pdf/1002.1843 Periodic and rep-tile settings; a source for locality measures. (title only)
- **"Reptilings and space-filling curves for acute triangles" (arXiv 1603.01382).**
  https://arxiv.org/pdf/1603.01382 (title only)
- **"Space-Filling, Self-Similar Curves of Regular Pentagons, Heptagons" (Bridges 2021).**
  https://archive.bridgesmathart.org/2021/bridges2021-157.pdf (title only)

## Checked and found unrelated

- "Fractal Path Strategies for Efficient 2D DMRG Simulations" (arXiv 2507.11820): Hamiltonian paths on square grids
  only. (read)

## Not found

- Any Hamiltonian path or space-filling curve through the tiles of a spectre or hat tiling.
- Any vertex Hamiltonian cycle on the spectre or hat.
- Any locality (dilation) constant for a curve on an aperiodic tiling.

## Who could settle novelty quickly

- Felix Flicker (Hamiltonian cycles on Ammann-Beenker; dimers on the spectre).
- Craig Kaplan (co-author of the spectre; maintains the reference implementation).
- The authors of the Rao-Zhang papers (space-filling curves of self-similar sets).
- The authors of the "little fragmentation" paper (locality measures for space-filling curves).
