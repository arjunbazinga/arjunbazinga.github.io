"""How to draw the line inside the tiles. The mathematics fixes only the order of the tiles; this compares drawing
rules by three measures of how evenly the drawn line fills the patch:
  outside   share of the line lying outside the two tiles it is passing between (should be 0)
  clearance smallest distance between two parts of the line that are at least 2 tiles apart along it (bigger is better)
  reach     largest distance from any tile corner to the line (smaller is better: nothing is left far from the line)
usage: python3 17_drawing.py"""
import json
from collections import defaultdict
from matplotlib.path import Path
from scipy.spatial import cKDTree
from core import *
RULE, _ = load_rule('results/rule_min30.json'); s = parse_state('D|(5)|0(5)'); MK = json.load(open('results/markings_min30.json'))
tiles = NODE['D', 4].tiles(); seq = path(RULE, s, 4); N = len(seq); P = [np.array(tiles[t]) for t in seq]
C = np.array([p.mean(axis=0) for p in P]); paths = [Path(p) for p in P]; K = 10
def shared(i):
    kb = set(key(p) for p in P[i+1]); ks = [key(p) for p in P[i]]
    return [j for j in range(14) if ks[j] in kb and ks[(j+1) % 14] in kb]
def mid(i, j): return (P[i][j] + P[i][(j+1) % 14])/2
def border_middle(i):
    """middle edge of the run of edges tile i shares with tile i+1 (even run: the middle edge nearer the direct line)"""
    js = shared(i); start = next((j for j in js if (j-1) % 14 not in js), js[0]); run = [(start + d) % 14 for d in range(len(js))]
    if set(run) != set(js): run = js
    c = (C[i] + C[i+1])/2; m = len(run); cand = [run[m//2]] if m % 2 else [run[m//2 - 1], run[m//2]]
    return min(cand, key=lambda j: np.linalg.norm(mid(i, j) - c))
RULES = {
 'centres only': None,
 'centres + palette crossing edge': lambda i: MK['cross'][i],
 'centres + middle of the shared border': border_middle,
 'centres + shared edge nearest the direct line': lambda i: min(shared(i), key=lambda j: np.linalg.norm(mid(i, j) - (C[i] + C[i+1])/2)),
}
def catmull(pts):
    p = np.vstack([pts[0], pts, pts[-1]]); out = []
    for i in range(len(pts)-1):
        p0, p1, p2, p3 = p[i], p[i+1], p[i+2], p[i+3]; b1 = p1 + (p2-p0)/6; b2 = p2 - (p3-p1)/6
        for t in np.arange(K)/K: out.append((1-t)**3*p1 + 3*(1-t)**2*t*b1 + 3*(1-t)*t*t*b2 + t**3*p2)
    return np.array(out + [pts[-1]])
def crossings(Q):
    A, B = Q[:-1], Q[1:]; grid = defaultdict(list)
    for i in range(len(A)):
        for gx in range(int(min(A[i][0], B[i][0])), int(max(A[i][0], B[i][0]))+1):
            for gy in range(int(min(A[i][1], B[i][1])), int(max(A[i][1], B[i][1]))+1): grid[gx, gy].append(i)
    ccw = lambda a, b, c: (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]); hits = set()
    for cell in grid.values():
        for x in range(len(cell)):
            for y in range(x+1, len(cell)):
                i, j = cell[x], cell[y]
                if abs(i-j) > 1 and ccw(A[i], B[i], A[j])*ccw(A[i], B[i], B[j]) < 0 and ccw(A[j], B[j], A[i])*ccw(A[j], B[j], B[i]) < 0: hits.add((min(i, j), max(i, j)))
    return len(hits)
corners = np.unique(np.round(np.vstack(P), 4), axis=0); print(f'{N} tiles; shared borders have {sorted(set(len(shared(i)) for i in range(N-1)))} edges')
print(f'{"drawing rule":48s} crossings  outside  clearance  reach  length/tile')
for name, f in RULES.items():
    if f is None: pts = C; per = 1
    else:
        pts = np.empty((2*N-1, 2)); pts[0::2] = C; pts[1::2] = [mid(i, f(i)) for i in range(N-1)]; per = 2
    Q = catmull(pts); ti = (np.arange(len(Q))/(K*per))                                 # position along the line in tiles
    out = sum(1 for q, t in zip(Q, ti) if not any(paths[u].contains_point(q, radius=r) for u in {min(N-1, int(t)), min(N-1, int(t)+1)} for r in (1e-9, -1e-9)))/len(Q)
    tree = cKDTree(Q); clear = 1e9
    for a, b in tree.query_pairs(2.2):
        if abs(ti[a] - ti[b]) >= 2: clear = min(clear, float(np.linalg.norm(Q[a]-Q[b])))
    reach = float(tree.query(corners)[0].max()); length = float(np.linalg.norm(np.diff(Q, axis=0), axis=1).sum())/N
    print(f'{name:48s} {crossings(Q):6d}   {out:6.2%}   {clear:7.3f}   {reach:5.2f}   {length:6.2f}', flush=True)
