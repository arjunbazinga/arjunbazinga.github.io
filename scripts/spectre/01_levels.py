"""Exhaustive level-by-level search (no rule, no induction): for each supertile, every (entry, exit) pair of
boundary tiles joined by a hierarchical Hamiltonian path. Builds and re-verifies one explicit path per level."""
import sys, time
from core import *
ML = int(sys.argv[1]) if len(sys.argv) > 1 else 5
S_ = systems(ML); mm = {}
def area(poly): return 0.5*sum(poly[i][0]*poly[(i+1) % len(poly)][1]-poly[(i+1) % len(poly)][0]*poly[i][1] for i in range(len(poly)))
for L in range(1, ML+1):
    for lab in ('Gamma', 'Delta'):
        node = S_[L][lab]; t0 = time.time(); d = solve(node, mm); tiles = node.tiles()
        nb, bnd, bad, edges = adjacency(tiles); b = [e for e, ts in edges.items() if len(ts) == 1]
        nxt = defaultdict(list)
        for a, c in b: nxt[a].append(c); nxt[c].append(a)
        assert bad == 0 and all(len(v) == 2 for v in nxt.values())
        loop = [b[0][0]]; prev = None; cur = loop[0]
        while True:
            n = [v for v in nxt[cur] if v != prev][0] if prev is not None else nxt[cur][0]
            if n == loop[0]: break
            loop.append(n); prev, cur = cur, n
        assert len(loop) == len(nxt) and abs(abs(area([(x/1000, y/1000) for x, y in loop])) - len(tiles)*A0) < 1e-3*len(tiles)
        pairs = sum(bin(v).count('1') for v in d['feas'].values()); e = min(d['feas']); x = next(bits(d['feas'][e]))
        seq = build(node, e, x, mm); pos = [0]*len(seq)
        assert sorted(seq) == list(range(len(tiles))) and all(seq[i+1] in nb[seq[i]] for i in range(len(seq)-1))
        for i, t in enumerate(seq): pos[t] = i
        cl = clusters(node)
        for a, c in cl: assert max(pos[a:c])-min(pos[a:c]) == c-a-1
        print(f'L{L} {lab:5s} tiles={len(seq):6d} boundary={sum(bnd):5d} entries={len(d["feas"]):5d} pairs={pairs:8d} '
              f'child-orders={len(d["perms"]):3d}  path verified over {len(cl)} clusters  {time.time()-t0:.0f}s', flush=True)
