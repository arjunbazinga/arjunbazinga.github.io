"""Exact worst-case locality at high levels by branch and bound over index blocks (bounding boxes prune pairs),
with centroids and the curve built recursively in numpy so level 8 (17 million tiles) fits in memory.
usage: python3 06_locality_limit.py rule.json [maxlevel=7] [state]"""
import sys
from core import *
RULE, start = load_rule(sys.argv[1]); ML = int(sys.argv[2]) if len(sys.argv) > 2 else 7
if len(sys.argv) > 3: start = parse_state(sys.argv[3])
def lin2(L): 
    c0 = toxy(L[:, 0]); c1 = toxy(L[:, 3]); return np.array([[c0[0], c1[0]], [c0[1], c1[1]]])
LIN = [lin2(TS[j][0]) for j in range(8)]
_C = {}
def cen(X, n):
    if (X, n) not in _C:
        if n <= B0: _C[X, n] = np.array([np.mean(p, axis=0) for p in NODE[X, n].tiles()])
        else: _C[X, n] = np.concatenate([cen(cshape(j), n-1) @ LIN[j].T + np.array(toxy(TS[j][1] @ V[n-1])) for j in cidx(X)])
    return _C[X, n]
SIZE = {}
def size(X, n):
    if (X, n) not in SIZE: SIZE[X, n] = len(NODE[X, n].tiles()) if n <= B0 else sum(size(cshape(j), n-1) for j in cidx(X))
    return SIZE[X, n]
_P = {}
def perm(s, n):
    if (s, n) in _P: return _P[s, n]
    if n == B0: out = np.array(path(RULE, s, n), dtype=np.int64)
    else:
        offs = {}; o = 0
        for j in cidx(s[0]): offs[j] = o; o += size(cshape(j), n-1)
        out = np.concatenate([offs[c] + perm((cshape(c), mu, nu), n-1) for c, mu, nu in RULE[s]])
    if n <= ML-1: _P[s, n] = out
    return out
def worst(P, s0=64):
    N = len(P); H = 0
    while -(-N // (s0 << H)) > 48: H += 1
    top = s0 << H; pad = (-N) % top
    if pad: P = np.concatenate([P, np.repeat(P[-1:], pad, axis=0)])
    M = len(P); best = 0.0; bi = (0, 1)
    for g in sorted(set([1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64] + [int(1.25**k) for k in range(20, 80) if int(1.25**k) < N])):
        r = ((P[g:N]-P[:N-g])**2).sum(1)/g; k = int(r.argmax())
        if r[k] > best: best, bi = float(r[k]), (k, k+g)
    seed = best
    box = {}; x = P[:, 0].reshape(-1, s0); y = P[:, 1].reshape(-1, s0)
    b = (x.min(1), x.max(1), y.min(1), y.max(1)); box[0] = b
    for h in range(1, H+1):
        b = (np.minimum(b[0][0::2], b[0][1::2]), np.maximum(b[1][0::2], b[1][1::2]), np.minimum(b[2][0::2], b[2][1::2]), np.maximum(b[3][0::2], b[3][1::2])); box[h] = b
    nt = M // top; A, B = np.triu_indices(nt); A = A.astype(np.int64); B = B.astype(np.int64); visited = 0
    for h in range(H, -1, -1):
        S = s0 << h; x0, x1, y0, y1 = box[h]; off = A != B
        dx = np.maximum(x1[A]-x0[B], x1[B]-x0[A]); dy = np.maximum(y1[A]-y0[B], y1[B]-y0[A])
        bound = (dx*dx+dy*dy)/np.maximum((B-A-1)*S+1, 1)
        keep = (~off) | (bound > best); A, B = A[keep], B[keep]; visited += len(A)
        if h > 0:
            d = A == B; Ao, Bo = A[~d], B[~d]; Ad = A[d]
            A = np.concatenate([2*Ao, 2*Ao, 2*Ao+1, 2*Ao+1, 2*Ad, 2*Ad, 2*Ad+1]); B = np.concatenate([2*Bo, 2*Bo+1, 2*Bo, 2*Bo+1, 2*Ad, 2*Ad+1, 2*Ad+1])
    PB = P.reshape(-1, s0, 2); ii = np.arange(s0)
    for c in range(0, len(A), 3000):
        a, b_ = A[c:c+3000], B[c:c+3000]
        d2 = ((PB[a][:, :, None, :]-PB[b_][:, None, :, :])**2).sum(-1)
        gap = ((b_-a)*s0)[:, None, None] + (ii[None, :]-ii[:, None])[None]
        r = np.where(gap > 0, d2/np.maximum(gap, 1), 0.0); k = int(r.argmax())
        if r.flat[k] > best:
            best = float(r.flat[k]); m, i, j = np.unravel_index(k, r.shape); bi = (int(a[m]*s0+i), int(b_[m]*s0+j))
    return best/A0, bi, seed/A0, visited
print('state', fstate(start), flush=True); prev = []
for n in range(B0, ML+1):
    t0 = time.time(); P = cen(start[0], n)[perm(start, n)]; w, (i, j), seed, vis = worst(P)
    prev.append(w); ext = ''
    if len(prev) >= 3 and (prev[-1]-2*prev[-2]+prev[-3]) != 0:
        ext = f'  Aitken extrapolation {prev[-1]-(prev[-1]-prev[-2])**2/(prev[-1]-2*prev[-2]+prev[-3]):.3f}'
    print(f'level {n}: {len(P):9d} tiles  locality {w:.4f}  attained at steps {i}..{j} (gap {j-i}, {100*(j-i)/len(P):.1f}% of the curve)'
          f'  [{vis} block pairs, {time.time()-t0:.0f}s]{ext}', flush=True)
    del P
