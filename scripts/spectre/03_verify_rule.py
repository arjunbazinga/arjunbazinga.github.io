"""Stand-alone checker for a rule file. Uses none of the search code paths that produced the rule.
Checks, in exact integer arithmetic at the base level:
  (a) every state has a hierarchical Hamiltonian path between its two tiles at level 2;
  (b) every production is well formed: children are a permutation, entry/exit locations descend correctly,
      every child state is in the rule;
  (c) every junction (exit tile of one child shares an edge with entry tile of the next) holds at ALL levels >= 2,
      via a closed set of (relative position, exit location, entry location) triples;
then replays every state at levels 2-5 and checks the paths from scratch."""
import sys
from core import *
RULE, start = load_rule(sys.argv[1]); t0 = time.time()
check_exact([0, 1, 2])                                    # exact adjacency at the base level == adjacency used by the search
nj = 0
for s, prod in RULE.items():
    X, lin, lout = s; d = solve(NODE[X, B0], memo)
    assert valid(lin, X) and valid(lout, X)
    assert d['feas'].get(tile(lin, X, B0), 0) >> tile(lout, X, B0) & 1, f'no base path for {fstate(s)}'
    assert sorted(c for c, _, _ in prod) == cidx(X)
    assert head(lin) == prod[0][0] and tail(lin) == prod[0][1] and head(lout) == prod[-1][0] and tail(lout) == prod[-1][2]
    for c, mu, nu in prod: assert (cshape(c), mu, nu) in RULE
    for (a, _, nu), (c, mu, _) in zip(prod, prod[1:]):
        assert prove(cshape(a), cshape(c), sibling(a, c), nu, mu), f'junction fails in {fstate(s)}'; nj += 1
print(f'{sys.argv[1]}: {len(RULE)} states', {X: sum(1 for s in RULE if s[0] == X) for X in "GD"},
      f'| {nj} junctions certified through {len(PROVEN)} closed triples over {len({t[2] for t in PROVEN})} relative positions')
replay(RULE, (2, 3, 4, 5))
selfc = [s for s in RULE if any((cshape(c), mu, nu) == s for c, mu, nu in RULE[s])]
print(f'replayed all states at levels 2-5 (up to {len(NODE["D", 5].tiles())} tiles): permutation, edge-adjacency, endpoints, '
      f'contiguity of every supertile all hold. {len(selfc)} states contain themselves. CERTIFICATE OK ({time.time()-t0:.0f}s)')
