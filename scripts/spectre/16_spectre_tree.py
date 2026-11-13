"""The spectre tree: a one-motif construction.

Facts this script establishes.
  1. Every cluster has four corner points (the key points of the published construction). The tile at each corner has
     a fixed address: corner 0 -> 6(3), corner 1 -> (5), corner 2 -> (3), corner 3 -> 0(5).
  2. The 8 pieces of a cluster form a ring 0-1-2-3-4-5-6-7-0: each piece shares exactly one corner point with the next.
     The same at every level.
  3. At each shared corner, the two corner tiles share an edge, at every level. Call that pair a door.

Construction. Join each piece to the next through the door at their shared corner, leaving the join 1-2 open
(or 2-3, see OPEN_AT), so the ring becomes a chain that ends at piece 2. The mystic cluster has no piece 2 and is
the same chain without its end. The two tiles of a mystic are joined. Nothing else is chosen.

Result. At every level the doors form a spanning tree, so the walk around it is one closed loop that never crosses
itself and passes every tile.   usage: python3 16_spectre_tree.py [open join: 12 or 23]"""
import sys
from collections import defaultdict, Counter
from core import *
OPEN_AT = sys.argv[1] if len(sys.argv) > 1 else '12'
KEY = {0: '6(3)', 1: '(5)', 2: '(3)', 3: '0(5)'}
def corner(j, p, n): return tuple(TS[j][0] @ V[n-1][4*p:4*p+4] + TS[j][1] @ V[n-1])
tabs = []
for n in range(1, 9):
    pts = defaultdict(list)
    for j in range(8):
        for p in range(4): pts[corner(j, p, n)].append((j, p))
    tabs.append(sorted(tuple(v) for v in pts.values() if len(v) > 1))
assert all(t == tabs[0] for t in tabs) and all(len(g) == 2 for g in tabs[0])
RING = tabs[0]; assert sorted(tuple(sorted((a, c))) for (a, p), (c, q) in RING) == sorted([(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (0, 7)])
print('pieces sharing a corner point (piece, corner), identical at levels 1-8:'); [print('   ', g) for g in RING]
drop = {'12': (1, 2), '23': (2, 3)}[OPEN_AT]
DOORS = {X: [(a, c, KEY[p], KEY[q]) for (a, p), (c, q) in RING if (a, c) != drop and a in cidx(X) and c in cidx(X)] for X in 'DG'}
assert len(DOORS['D']) == 7 and len(DOORS['G']) == 6
def door_tiles(X, n):
    out = []
    for a, c, nu, mu in DOORS[X]:
        nu, mu = parse_loc(nu), parse_loc(mu); out.append((tile(((a,) + nu[0], nu[1], nu[2]), X, n), tile(((c,) + mu[0], mu[1], mu[2]), X, n)))
    return out
# ---- certificate for all levels: every door in the ring, not only the 7 used
for (a, p), (c, q) in RING:
    nu, mu = parse_loc(KEY[p]), parse_loc(KEY[q]); assert prove(cshape(a), cshape(c), sibling(a, c), nu, mu), 'door fails at high levels'
    for X in 'DG':
        if a not in cidx(X) or c not in cidx(X): continue
        for n in (1, 2):
            t1 = tile(((a,) + nu[0], nu[1], nu[2]), X, n); t2 = tile(((c,) + mu[0], mu[1], mu[2]), X, n)
            assert t2 in exact_adjacency(X, n)[t1], 'door fails at a low level'
            if n == 2:                                    # the corner point is a vertex of both door tiles
                pt = tuple(np.array(corner(a, p, n), dtype=object)); assert any(tuple(v) == pt for v in ET(X, n)[t1]) and any(tuple(v) == pt for v in ET(X, n)[t2])
assert 1 in exact_adjacency('G', 0)[0]
print(f'all 8 corner doors certified at every level ({len(PROVEN)} closed triples, {len({t[2] for t in PROVEN})} relative positions); both door tiles touch the shared corner. CERTIFIED')
print(f'ring opened at {drop[0]}-{drop[1]}: D chain has {len(DOORS["D"])} doors, G chain has {len(DOORS["G"])}')
_T = {}
def tree(X, n):
    if (X, n) not in _T:
        if n == 0: _T[X, n] = [(0, 1)] if X == 'G' else []
        else:
            node = NODE[X, n]; node.tiles(); E = []
            for j in cidx(X):
                off = node.slices[cpos(X, j)][0]; E += [(a + off, b + off) for a, b in tree(cshape(j), n-1)]
            _T[X, n] = E + door_tiles(X, n)
    return _T[X, n]
def shared_edges(X, n):
    own = defaultdict(list)
    for t, poly in enumerate(NODE[X, n].tiles()):
        ks = [key(p) for p in poly]
        for j in range(14): own[tuple(sorted((ks[j], ks[(j+1) % 14])))].append((t, j))
    d = defaultdict(list)
    for v in own.values():
        if len(v) == 2: (t, j), (u, k) = v; d[t, u].append((j, k)); d[u, t].append((k, j))
    for v in d.values(): v.sort()
    return d
def tour(X, n):
    E = tree(X, n); sh = shared_edges(X, n); N = len(NODE[X, n].tiles()); doors = defaultdict(list)
    for t, u in E:
        assert (t, u) in sh, 'door tiles do not share an edge'
        j, k = sh[t, u][0]; doors[t].append((j, u)); doors[u].append((k, t))
    assert len(E) == N - 1
    for t in doors: doors[t].sort()
    pos = {t: {u: i for i, (j, u) in enumerate(doors[t])} for t in doors}
    t = 0; i = 0; seq = []
    while True:
        j, u = doors[t][i]; seq.append(t); i = (pos[u][t] + 1) % len(doors[u]); t = u
        if (t, i) == (0, 0): break
    assert len(seq) == 2*(N - 1) and len(set(seq)) == N, 'not one loop around a spanning tree'
    return seq, doors
def clusters(node, off=0, out=None):
    if out is None: out = []
    if node.children and node.level >= 0:
        out.append((node.level, off, off + len(node.tiles())))
        for (ch, _), (a, b) in zip(node.children, node.slices): clusters(ch, off + a, out)
    return out
if __name__ == '__main__':
    for n in range(1, 6):
        for X in 'DG':
            seq, doors = tour(X, n); N = len(NODE[X, n].tiles()); L = len(seq); arcs = Counter()
            for lev, a, b in clusters(NODE[X, n]):
                if b - a == N or lev < 1: continue
                arcs[sum(1 for i in range(L) if a <= seq[i] < b and not (a <= seq[i-1] < b))] += 1
            deg = Counter(len(v) for v in doors.values()); marks = len({tuple(j for j, u in v) for v in doors.values()})
            line = f'level {n} {X}: {N:6d} tiles, one closed loop; doors per tile {dict(sorted(deg.items()))}; clusters covered in k arcs {dict(sorted(arcs.items()))}; tile markings {marks}'
            if X == 'D' and n <= 4:
                c = np.array([np.mean(p, axis=0) for p in NODE[X, n].tiles()])[seq]; w = 0
                for i in range(0, L, 1500):
                    blk = c[i:i+1500]; d2 = ((blk[:, None, :] - c[None, :, :])**2).sum(-1)
                    g = np.abs(np.arange(i, i+len(blk))[:, None] - np.arange(L)[None, :]); g = np.minimum(g, L - g).astype(float); g[g == 0] = np.inf
                    w = max(w, float((d2/g).max()))
                line += f'; locality {w/(A0/2):.2f}'
            print(line, flush=True)
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    from matplotlib.collections import PolyCollection, LineCollection
    fig, axs = plt.subplots(1, 3, figsize=(27, 10))
    for ax, n in zip(axs, (1, 2, 3)):
        tiles = NODE['D', n].tiles(); seq, doors = tour('D', n); N = len(tiles); node = NODE['D', n]; node.tiles()
        piece = np.zeros(N)
        for j in cidx('D'):
            a, b = node.slices[cpos('D', j)]; piece[a:b] = j
        ax.add_collection(PolyCollection([np.array(t) for t in tiles], array=piece, cmap='Spectral', edgecolors='white', linewidths=0.8, alpha=0.9))
        cen = [np.mean(t, axis=0) for t in tiles]; segs = []
        for t in doors:
            for j, u in doors[t]:
                P = np.array(tiles[t]); segs.append([cen[t], (P[j] + P[(j+1) % 14])/2])
        lw = {1: 16, 2: 8, 3: 3.6}[n]
        ax.add_collection(LineCollection(segs, colors='#10162a', linewidths=lw, capstyle='round'))
        ax.add_collection(LineCollection(segs, colors='#fbf7ec', linewidths=lw*0.45, capstyle='round'))
        if n <= 2:
            for (a, p), (c, q) in RING:
                x, y = toxy(np.array(corner(a, p, n), dtype=object)); ax.plot(x, y, 'o', ms=13 if n == 1 else 9, mfc='none' if (a, c) == drop else '#d1495b', mec='#d1495b', mew=2.5, zorder=5)
        ax.autoscale(); ax.set_aspect('equal'); ax.axis('off')
        ax.set_title({1: '8 pieces in a ring. Red dots: shared corners (hollow = left open)', 2: 'Replace each piece by a cluster; join at the same corners', 3: 'Again: 559 tiles. The dark outline is one closed loop'}[n], loc='left', fontsize=13)
    fig.tight_layout(); fig.savefig(f'results/spectre_tree{"" if OPEN_AT == "12" else "_open23"}.png', dpi=110, facecolor='white')
