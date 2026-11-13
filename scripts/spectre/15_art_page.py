"""Builds the art page. Exports the curve of the self-containing state D|(5)|0(5) on 4,401 tiles, the cluster
boundaries at each nesting level (for the build-up animation) and the marked tiles, then fills art/tmpl.html to make
art/spectre-thread.html, one self-contained file. The thread passes through each tile centre and the middle of each
shared border; a tile's marking is the pair of edges that rule gives it.   usage: python3 15_art_page.py"""
import sys, json, math
from core import *
RULE, _ = load_rule('results/rule_min30.json'); s = parse_state('D|(5)|0(5)'); assert s in RULE
from collections import Counter
node = NODE['D', 4]; tiles = node.tiles(); seq = path(RULE, s, 4); S0 = np.array(SPECTRE)
def border_middle(P, Q):
    """middle edge of the run of edges P shares with Q (even run: the middle edge nearer the line between centres)"""
    kb = set(key(p) for p in Q); ks = [key(p) for p in P]; js = [j for j in range(14) if ks[j] in kb and ks[(j+1) % 14] in kb]
    start = next((j for j in js if (j-1) % 14 not in js), js[0]); run = [(start + d) % 14 for d in range(len(js))]
    if set(run) != set(js): run = js
    c = (P.mean(axis=0) + Q.mean(axis=0))/2; m = len(run); cand = [run[m//2]] if m % 2 else [run[m//2 - 1], run[m//2]]
    return min(cand, key=lambda j: np.linalg.norm((P[j] + P[(j+1) % 14])/2 - c))
def addr(t):
    nd = node; out = []
    while nd.children:
        nd.tiles()
        for pos, (a, b) in enumerate(nd.slices):
            if a <= t < b: out.append(pos); t -= a; nd = nd.children[pos][0]; break
    return tuple(out)
A = [addr(t) for t in seq]; ends = {}; sizes = [1]
for m in (1, 2, 3, 4):
    top = A[0][:4-m]; n = 0
    while n < len(A) and A[n][:4-m] == top: n += 1            # the level-m supertile holding the first tile is a prefix of the curve
    runs = [i for i in range(1, n) if A[i][:5-m] != A[i-1][:5-m]] + [n]
    assert len(runs) == 8 and runs[0] == sizes[-1]; ends[str(m)] = runs; sizes.append(n)
assert sizes == [1, 9, 71, 559, 4401]
rows = []; out_edge = []; in_edge = []      # edge by which the thread leaves tile i, and enters tile i+1
for i, t in enumerate(seq):
    P = np.array(tiles[t]); k = round(math.degrees(math.atan2(P[1][1]-P[0][1], P[1][0]-P[0][0]))/30) % 12
    c, sn = math.cos(k*math.pi/6), math.sin(k*math.pi/6)
    assert np.abs(S0 @ np.array([[c, -sn], [sn, c]]).T + P[0] - P).max() < 1e-6      # every tile is a rotated copy, none mirrored
    if i < len(seq)-1:
        Q = tiles[seq[i+1]]; jb = border_middle(P, np.array(Q)); mid = (P[jb] + P[(jb+1) % 14])/2      # where the thread crosses
        e = tuple(sorted((key(P[jb]), key(P[(jb+1) % 14]))))
        out_edge.append(jb); in_edge.append(next(q for q in range(14) if tuple(sorted((key(Q[q]), key(Q[(q+1) % 14])))) == e))
    else: mid = P.mean(axis=0)
    rows += [round(P[0][0]*100), round(P[0][1]*100), k, round(mid[0]*100), round(mid[1]*100)]
mk = [tuple(sorted((in_edge[i-1], out_edge[i]))) for i in range(1, len(seq)-1)]; assert all(a != b for a, b in mk)
cnt = Counter(mk); idx = {m: n for n, (m, _) in enumerate(cnt.most_common())}
palette = [list(m) + [c] for m, c in cnt.most_common()]; marks = [-1] + [idx[m] for m in mk] + [-1]
data = json.dumps({'rows': rows, 'ends': ends, 'shape': [[round(x, 5), round(y, 5)] for x, y in SPECTRE], 'palette': palette, 'marks': marks}, separators=(',', ':'))
open('art/data.json', 'w').write(data)
open('../../static/spectre/thread-data.json', 'w').write(data)      # the essay's figures (posts/spectre-thread/) read this copy
open('art/spectre-thread.html', 'w').write(open('art/tmpl.html').read().replace('__DATA__', data))
print(f'written art/spectre-thread.html ({len(data)//1024} KB of data, {len(palette)} marked tiles, nested sizes {sizes})')
