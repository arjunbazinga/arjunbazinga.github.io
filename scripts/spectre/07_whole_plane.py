"""Which rule states give a curve that exhausts the plane? A state that contains itself as child c gives nested
supertiles S_n, each the c-th child of the next, all carrying the same curve. If the c-th grandchild chain sits ever
deeper inside S_n, the union of the S_n is the whole plane. Measured here as tile-distance to the boundary."""
import sys
from collections import deque
from core import *
RULE, start = load_rule(sys.argv[1])
def depth_map(X, n):
    nb, bnd, _, _ = adjacency(NODE[X, n].tiles()); d = [-1]*len(nb); q = deque(i for i, b in enumerate(bnd) if b)
    for i in q: d[i] = 0
    while q:
        i = q.popleft()
        for j in nb[i]:
            if d[j] < 0: d[j] = d[i]+1; q.append(j)
    return d
DM = {(X, n): depth_map(X, n) for X in 'GD' for n in (3, 4, 5)}
def block(X, n, c, k):
    node = NODE[X, n]; off = 0
    for _ in range(k): node.tiles(); a, b = node.slices[cpos(X, c)]; off += a; node = node.children[cpos(X, c)][0]
    return off, off+len(node.tiles())
rows = []
for s in sorted(RULE, key=fstate):
    for i, (c, mu, nu) in enumerate(RULE[s]):
        if (cshape(c), mu, nu) == s:
            X = s[0]; dep = {(n, k): min(DM[X, n][slice(*block(X, n, c, k))]) for n in (3, 4, 5) for k in (1, 2, 3)}
            rows.append((s, c, i, len(RULE[s]), dep))
print('state | self child | position in production | min tile-distance from the k-th nested copy to the boundary, levels 3/4/5')
for s, c, i, m, dep in rows:
    kind = 'two-sided (Z)' if 0 < i < m-1 else 'one-sided (ray)'
    print(f'{fstate(s):22s} child {c}  step {i+1}/{m}  {kind:16s} ' + '  '.join(f'k={k}: ' + '/'.join(str(dep[n, k]) for n in (3, 4, 5)) for k in (1, 2, 3)))
good = [r for r in rows if r[4][5, 2] > r[4][4, 2] > 0 and 0 < r[2] < r[3]-1]
print(f'{len(rows)} self-containing states; {len(good)} are two-sided with the nested copy strictly inside and its depth growing with level')
