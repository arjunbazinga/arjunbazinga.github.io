"""Can one marked spectre draw the curve by itself? Two negative results.
(a) One stroke per tile (enter by one edge, leave by another): needs two edges that only ever meet each other.
(b) Truchet style: 7 non-crossing arcs pairing all 14 edges, so strands never end. Counts closed loops per marking.
A closed loop found in a 559-tile supertile occurs in every spectre tiling, because every tiling contains that supertile."""
from collections import defaultdict
from core import *
def ports(n):
    tiles = NODE['D', n].tiles(); own = defaultdict(list)
    for t, poly in enumerate(tiles):
        ks = [key(p) for p in poly]
        for j in range(14): own[tuple(sorted((ks[j], ks[(j+1) % 14])))].append((t, j))
    partner = {}
    for v in own.values():
        if len(v) == 2: partner[v[0]] = v[1]; partner[v[1]] = v[0]
    return tiles, partner
tiles, partner = ports(4); meets = defaultdict(set)
for (t, j), (u, k) in partner.items(): meets[j].add(k)
print('edges each edge meets across the tiling (4,401 tiles):')
for j in range(14): print(f'   edge {j:2d} meets {sorted(meets[j])}')
print('even edges meet only odd edges:', all((j + k) % 2 == 1 for j in meets for k in meets[j]))
ok = [(a, b) for a in range(14) for b in range(a+1, 14) if meets[a] <= {a, b} and meets[b] <= {a, b}]
print(f'(a) pairs of edges that only ever meet each other: {len(ok)}  -> no single one-stroke marking is consistent')
closed = {0}; grew = True
while grew:
    new = set().union(*(meets[j] for j in closed)) | closed; grew = new != closed; closed = new
print(f'    smallest set of edges containing edge 0 that is closed under meeting: {len(closed)} of 14 -> partial markings are ruled out too')
def matchings(pts):
    if not pts: yield []; return
    for i in range(1, len(pts), 2):
        for L in matchings(pts[1:i]):
            for R in matchings(pts[i+1:]): yield [(pts[0], pts[i])] + L + R
ALL = list(matchings(list(range(14))))
def strands(tiles, partner, m):
    mate = {}
    for a, b in m: mate[a] = b; mate[b] = a
    lengths = []
    for start in ((t, j) for t in range(len(tiles)) for j in range(14)):
        if start in partner: continue                      # open strands start at the patch boundary
        cur = start; L = 0
        while True:
            o = (cur[0], mate[cur[1]]); L += 1
            if o not in partner: break
            cur = partner[o]
        lengths.append(L)
    lengths = sorted(lengths)[::2]                          # each open strand was walked from both ends
    total = len(tiles)*7
    return (total - sum(lengths))/total, max(lengths)/total
t3, p3 = ports(3); res = [strands(t3, p3, m) for m in ALL]
print(f'(b) {len(ALL)} markings with 7 non-crossing arcs, on 559 tiles: {sum(1 for f, b in res if f == 0)} are free of closed loops')
print(f'    share of arcs lying in closed loops: min {min(f for f, b in res):.1%}, median {sorted(f for f, b in res)[len(res)//2]:.1%}; '
      f'longest open strand: at most {max(b for f, b in res):.1%} of the arcs')
