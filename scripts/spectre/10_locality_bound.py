"""Upper bound on the locality constant of a rule, valid at every level, by branch and bound over pairs of
sub-supertiles.

A node is (state A, state B, relative position, n) with the claim: at every level m >= 2, for every tile u on A's
curve and v on B's curve,   dist(u,v)^2 <= T * area * gap,   gap = (tiles after u in A) + n + (tiles before v in B) + 1,
where n is a fixed number of whole D and G supertiles lying between A and B on the curve.
A node is settled either by a bound that holds at all levels (centre distance + radii, against the tiles in between),
or by checking level 2 exactly and passing the claim to its 49-64 child nodes one level down.
Floating point throughout (double precision, values normalised per level).
usage: python3 10_locality_bound.py rule.json T [time limit s]"""
import sys
from core import *
RULE, _ = load_rule(sys.argv[1]); T = float(sys.argv[2]); LIMIT = float(sys.argv[3]) if len(sys.argv) > 3 else 3000
MCAP, DMAX = 45, 40; LTOP = MCAP + DMAX; NL = LTOP - B0 + 1; SLACK = 1e-9
while len(V) <= LTOP + 2: V.append(M @ V[-1])
lam = math.sqrt(4 + math.sqrt(15)); mu = lam*lam
def lin2(L):
    c0 = toxy(L[:, 0]); c1 = toxy(L[:, 3]); return np.array([[c0[0], c1[0]], [c0[1], c1[1]]])
LIN = np.array([lin2(TS[j][0]) for j in range(8)]); LINV = np.array([np.linalg.inv(l) for l in LIN])
def xyn(z, m): x, y = toxy(z); return (x/lam**m, y/lam**m)
levels = list(range(B0, LTOP+1))
TRC = np.array([[xyn(TS[j][1] @ V[m], m) for m in levels] for j in range(8)]).transpose(0, 2, 1)       # (8, 2, NL): child j at level m in its parent
CTR = np.array([xyn(V[m][0:4] + V[m][4:8] + V[m][8:12] + V[m][12:16], m) for m in levels]).T/4            # (2, NL): centre = mean of the quad
SZ = {('D', 0): 1, ('G', 0): 2}
for m in range(1, LTOP+1):
    SZ['D', m] = 7*SZ['D', m-1] + SZ['G', m-1]; SZ['G', m] = 6*SZ['D', m-1] + SZ['G', m-1]
NN = {X: np.array([SZ[X, m]/mu**m for m in levels]) for X in 'GD'}; INV = np.array([mu**-m for m in levels])
# ---- radii: exact by enumeration up to level 6, then a rigorous three-level recursion
_C = {}
def cen(X, n):
    if (X, n) not in _C:
        if n <= B0: _C[X, n] = np.array([np.mean(p, axis=0) for p in NODE[X, n].tiles()])
        else: _C[X, n] = np.concatenate([cen(cshape(j), n-1) @ LIN[j].T + np.array(toxy(TS[j][1] @ V[n-1])) for j in cidx(X)])
    return _C[X, n]
def ctr_raw(m): return CTR[:, m-B0]*lam**m
def place(j, m): return LIN[j], TRC[j][:, m-B0]*lam**m                                                   # child j (level m) in parent (level m+1)
RAD = {}
for X in 'GD':
    for m in range(B0, 7): RAD[X, m] = float(np.sqrt(((cen(X, m) - ctr_raw(m))**2).sum(1).max()))
for m in range(7, LTOP+1):
    for X in 'GD':
        best = 0.0
        for j1 in cidx(X):
            L1, t1 = place(j1, m-1)
            for j2 in cidx(cshape(j1)):
                L2, t2 = place(j2, m-2)
                for j3 in cidx(cshape(j2)):
                    L3, t3 = place(j3, m-3)
                    p = L1 @ (L2 @ (L3 @ ctr_raw(m-3) + t3) + t2) + t1
                    best = max(best, float(np.linalg.norm(p - ctr_raw(m))) + RAD[cshape(j3), m-3])
        RAD[X, m] = best
RN = {X: np.array([RAD[X, m]/lam**m for m in levels]) for X in 'GD'}
def drift(a): return float(np.abs(a[..., MCAP-B0+2:MCAP-B0+12] - a[..., MCAP-B0:MCAP-B0+10]).max())
print(f'normalised quantities are stationary beyond level {MCAP}: max change over two levels '
      f'{max(drift(TRC), drift(CTR), drift(RN["D"]), drift(RN["G"]), drift(NN["D"]), drift(NN["G"])):.1e}', flush=True)
print(f'normalised radius D: exact level 6 {RN["D"][4]:.4f}, bound at level {MCAP} {RN["D"][MCAP-B0]:.4f}', flush=True)
# ---- exact relative positions: a translation is stored by its values at levels B0..B0+5 (the quad orbit has dimension 6)
from fractions import Fraction
B6 = np.array([V[B0+i] for i in range(6)], dtype=object).T                      # 16 x 6
def solve_rec():
    rows = [[Fraction(int(x)) for x in list(B6[r]) + [V[B0+6][r]]] for r in range(16)]; piv = []; rk = 0
    for c in range(6):
        p = next(i for i in range(rk, 16) if rows[i][c] != 0); rows[rk], rows[p] = rows[p], rows[rk]
        rows[rk] = [x/rows[rk][c] for x in rows[rk]]
        for i in range(16):
            if i != rk and rows[i][c] != 0: rows[i] = [x - rows[i][c]*y for x, y in zip(rows[i], rows[rk])]
        rk += 1
    assert all(all(x == 0 for x in r) for r in rows[6:]), 'orbit dimension is not 6'
    sol = [rows[i][6] for i in range(6)]; assert all(x.denominator == 1 for x in sol); return [int(x) for x in sol]
REC = solve_rec()
SH = np.zeros((6, 6), dtype=np.int64)
for i in range(5): SH[i+1, i] = 1
SH[:, 5] = REC
COEF = [np.array([int(i == k) for i in range(6)], dtype=object) for k in range(6)]
while len(COEF) < NL + 2: COEF.append(SH.astype(object) @ COEF[-1])
for k in (7, 20, 60): assert (B6 @ COEF[k] == V[B0+k]).all()
COEF = np.array(COEF, dtype=object).T                                           # 6 x levels
TBK = np.array([(TS[j][1] @ B6).astype(np.int64) for j in range(8)])            # (8, 4, 6)
L4 = np.array([TS[j][0].astype(np.int64) for j in range(8)]); L4I = np.array([TSI[j].astype(np.int64) for j in range(8)])
SCALE = np.array([lam**-m for m in levels]); R3 = S3/2
def floats(K, nl):
    z = K.astype(object) @ COEF[:, :nl]
    x = np.array([float(a) + float(b)*R3 + float(c)/2 for a, b, c in zip(z[0], z[1], z[2])]); y = np.array([float(b)/2 + float(c)*R3 + float(d) for b, c, d in zip(z[1], z[2], z[3])])
    return np.vstack([x, y])*SCALE[:nl]
def lin2i(L): return np.array([[L[0, 0] + L[1, 0]*R3 + L[2, 0]/2, L[0, 3] + L[1, 3]*R3 + L[2, 3]/2], [L[1, 0]/2 + L[2, 0]*R3 + L[3, 0], L[1, 3]/2 + L[2, 3]*R3 + L[3, 3]]])
# ---- rule tables
ST = sorted(RULE, key=fstate); SID = {s: i for i, s in enumerate(ST)}
PROD = [[(c, SID[(cshape(c), mu_, nu)]) for c, mu_, nu in RULE[s]] for s in ST]
SHAPE = [s[0] for s in ST]
BASEP = [cen(s[0], B0)[np.array(path(RULE, s, B0))] for s in ST]
A0_ = A0
def counts(shapes): return (sum(1 for x in shapes if x == 'D'), sum(1 for x in shapes if x == 'G'))
TAB = []
for s in range(len(ST)):
    ch = [c for c, _ in PROD[s]]; sh = [cshape(c) for c in ch]
    TAB.append(dict(ch=np.array(ch), st=[t for _, t in PROD[s]], linv=LINV[ch], lin=LIN[ch], tr=TRC[ch], l4=L4[ch], l4i=L4I[ch], tbk=TBK[ch],
                    rn=np.array([RN[x] for x in sh]), after=np.array([counts(sh[i+1:]) for i in range(len(ch))]),
                    before=np.array([counts(sh[:i]) for i in range(len(ch))])))
# pairs inside one level-2 curve
w2 = 0
for s in range(len(ST)):
    P = BASEP[s]; N = len(P); d2 = ((P[:, None]-P[None])**2).sum(-1); g = np.abs(np.arange(N)[:, None]-np.arange(N)[None]).astype(float); g[g == 0] = np.inf
    w2 = max(w2, float((d2/g).max())/A0_)
print(f'pairs inside a level-{B0} curve: worst {w2:.4f}', flush=True); assert w2 <= T
stack = []
for s in range(len(ST)):
    tb = TAB[s]; k = len(tb['ch'])
    for i in range(k):
        for j in range(i+1, k):
            a, c = tb['ch'][i], tb['ch'][j]; K = L4I[a] @ (TBK[c] - TBK[a]); Lq = L4I[a] @ L4[c]
            stack.append((tb['st'][i], tb['st'][j], Lq, K, floats(K, NL), 0,
                          int(tb['after'][i][0]-tb['after'][j][0]-(SHAPE[tb['st'][j]] == 'D')), int(tb['after'][i][1]-tb['after'][j][1]-(SHAPE[tb['st'][j]] == 'G')), 0))
print(f'{len(stack)} root nodes', flush=True)
t0 = time.time(); nodes = 0; pruned = 0; worst = (0.0, None); maxdepth = 0; nxt = 5; SEEN = set(); junction = 0
while stack:
    sa, sb, Lq, K, t, age, nD, nG, depth = stack.pop()
    if nD == 0 and nG == 0:                                   # consecutive blocks: finitely many such nodes, visit each once
        kk = (sa, sb, Lq.tobytes(), K.tobytes())
        if kk in SEEN: continue
        SEEN.add(kk); junction += 1
    nl = NL - depth
    if age >= 6: t = floats(K, nl); age = 0                   # refresh the floats from the exact integers
    nodes += 1; maxdepth = max(maxdepth, depth); L = lin2i(Lq)
    PA, PB = BASEP[sa], BASEP[sb] @ L.T + t[:, 0]*lam**B0
    d2 = ((PA[:, None]-PB[None])**2).sum(-1)
    gap = (len(PA)-1-np.arange(len(PA)))[:, None] + nD*SZ['D', B0] + nG*SZ['G', B0] + np.arange(len(PB))[None] + 1
    r = float((d2/gap).max())/A0_
    if r > worst[0]: worst = (r, (fstate(ST[sa]), fstate(ST[sb]), int(nD), int(nG), depth))
    if r > T: print(f'VIOLATION: ratio {r:.5f} > {T} at depth {depth} (an actual pair at level {B0+depth+1})  {worst[1]}'); sys.exit(1)
    if nl-1 < MCAP-B0+1: print('ran out of levels: raise DMAX'); sys.exit(2)
    A, B = TAB[sa], TAB[sb]; m = nl-1
    Kc = np.einsum('ixy,ijyl->ijxl', A['l4i'], np.einsum('xy,jyl->jxl', Lq, B['tbk'])[None] + (K @ SH)[None, None] - A['tbk'][:, None])
    Lqc = np.einsum('ixy,yz,jzw->ijxw', A['l4i'], Lq, B['l4'])
    base = np.einsum('xy,jyl->jxl', L, B['tr'][:, :, :m])[None] + lam*t[None, None, :, 1:nl] - A['tr'][:, None, :, :m]
    tc = np.einsum('ixy,ijyl->ijxl', A['linv'], base)
    Lc = np.einsum('ixy,yz,jzw->ijxw', A['linv'], L, B['lin'])
    dist = np.sqrt(((np.einsum('ijxy,yl->ijxl', Lc, CTR[:, :m]) + tc - CTR[None, None, :, :m])**2).sum(2))
    nDc = A['after'][:, None, 0] + 7*nD + 6*nG + B['before'][None, :, 0]; nGc = A['after'][:, None, 1] + nD + nG + B['before'][None, :, 1]
    den = A0_*(INV[:m] + nDc[..., None]*NN['D'][:m] + nGc[..., None]*NN['G'][:m])
    f = ((dist + A['rn'][:, None, :m] + B['rn'][None, :, :m])**2/den).max(-1)*(1+SLACK)
    keep = np.argwhere(f > T); pruned += f.size - len(keep)
    for i, j in keep: stack.append((A['st'][i], B['st'][j], Lqc[i, j], Kc[i, j], tc[i, j], age+1, int(nDc[i, j]), int(nGc[i, j]), depth+1))
    if time.time()-t0 > nxt:
        print(f'  {time.time()-t0:5.0f}s: {nodes} nodes expanded, {pruned} pruned by the all-level bound, stack {len(stack)}, max depth {maxdepth}, worst exact ratio {worst[0]:.5f}', flush=True); nxt *= 2
    if time.time()-t0 > LIMIT: print('time limit reached, not proven'); sys.exit(3)
print(f'PROVEN: locality <= {T} at every level. {nodes} nodes expanded ({junction} with consecutive blocks), {pruned} pruned by the all-level bound, '
      f'max depth {maxdepth}; largest exact ratio met {worst[0]:.5f} {worst[1]}  ({time.time()-t0:.0f}s)')
