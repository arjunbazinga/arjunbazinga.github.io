"""The all-level locality bound of 10_locality_bound.py as a library, so it can serve as a search objective.
check(RULE, T) -> ('proven', worst exact ratio met) or ('violation', ratio, state at the pair's lowest common supertile)."""
from core import *
from fractions import Fraction
MCAP, DMAX = 45, 40; LTOP = MCAP + DMAX; NL = LTOP - B0 + 1; SLACK = 1e-9
while len(V) <= LTOP + 2: V.append(M @ V[-1])
lam = math.sqrt(4 + math.sqrt(15)); mu = lam*lam; R3 = S3/2
def lin2(L):
    c0 = toxy(L[:, 0]); c1 = toxy(L[:, 3]); return np.array([[c0[0], c1[0]], [c0[1], c1[1]]])
LIN = np.array([lin2(TS[j][0]) for j in range(8)]); LINV = np.array([np.linalg.inv(l) for l in LIN])
def xyn(z, m): x, y = toxy(z); return (x/lam**m, y/lam**m)
levels = list(range(B0, LTOP+1))
TRC = np.array([[xyn(TS[j][1] @ V[m], m) for m in levels] for j in range(8)]).transpose(0, 2, 1)
CTR = np.array([xyn(V[m][0:4] + V[m][4:8] + V[m][8:12] + V[m][12:16], m) for m in levels]).T/4
SZ = {('D', 0): 1, ('G', 0): 2}
for m in range(1, LTOP+1):
    SZ['D', m] = 7*SZ['D', m-1] + SZ['G', m-1]; SZ['G', m] = 6*SZ['D', m-1] + SZ['G', m-1]
NN = {X: np.array([SZ[X, m]/mu**m for m in levels]) for X in 'GD'}; INV = np.array([mu**-m for m in levels])
_C = {}
def cen(X, n):
    if (X, n) not in _C:
        if n <= B0: _C[X, n] = np.array([np.mean(p, axis=0) for p in NODE[X, n].tiles()])
        else: _C[X, n] = np.concatenate([cen(cshape(j), n-1) @ LIN[j].T + np.array(toxy(TS[j][1] @ V[n-1])) for j in cidx(X)])
    return _C[X, n]
def ctr_raw(m): return CTR[:, m-B0]*lam**m
def place(j, m): return LIN[j], TRC[j][:, m-B0]*lam**m
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
                    best = max(best, float(np.linalg.norm(L1 @ (L2 @ (L3 @ ctr_raw(m-3) + t3) + t2) + t1 - ctr_raw(m))) + RAD[cshape(j3), m-3])
        RAD[X, m] = best
RN = {X: np.array([RAD[X, m]/lam**m for m in levels]) for X in 'GD'}
B6 = np.array([V[B0+i] for i in range(6)], dtype=object).T
def _rec():
    rows = [[Fraction(int(x)) for x in list(B6[r]) + [V[B0+6][r]]] for r in range(16)]; rk = 0
    for c in range(6):
        p = next(i for i in range(rk, 16) if rows[i][c] != 0); rows[rk], rows[p] = rows[p], rows[rk]
        rows[rk] = [x/rows[rk][c] for x in rows[rk]]
        for i in range(16):
            if i != rk and rows[i][c] != 0: rows[i] = [x - rows[i][c]*y for x, y in zip(rows[i], rows[rk])]
        rk += 1
    return [int(rows[i][6]) for i in range(6)]
SH = np.zeros((6, 6), dtype=np.int64)
for i in range(5): SH[i+1, i] = 1
SH[:, 5] = _rec()
COEF = [np.array([int(i == k) for i in range(6)], dtype=object) for k in range(6)]
while len(COEF) < NL + 2: COEF.append(SH.astype(object) @ COEF[-1])
COEF = np.array(COEF, dtype=object).T
TBK = np.array([(TS[j][1] @ B6).astype(np.int64) for j in range(8)])
L4 = np.array([TS[j][0].astype(np.int64) for j in range(8)]); L4I = np.array([TSI[j].astype(np.int64) for j in range(8)])
SCALE = np.array([lam**-m for m in levels])
def floats(K, nl):
    z = K.astype(object) @ COEF[:, :nl]
    x = np.array([float(a) + float(b)*R3 + float(c)/2 for a, b, c in zip(z[0], z[1], z[2])]); y = np.array([float(b)/2 + float(c)*R3 + float(d) for b, c, d in zip(z[1], z[2], z[3])])
    return np.vstack([x, y])*SCALE[:nl]
def lin2i(L): return np.array([[L[0, 0] + L[1, 0]*R3 + L[2, 0]/2, L[0, 3] + L[1, 3]*R3 + L[2, 3]/2], [L[1, 0]/2 + L[2, 0]*R3 + L[3, 0], L[1, 3]/2 + L[2, 3]*R3 + L[3, 3]]])
def counts(shapes): return (sum(1 for x in shapes if x == 'D'), sum(1 for x in shapes if x == 'G'))
_BP = {}
def basep(RULE, s):
    if s not in _BP: _BP[s] = cen(s[0], B0)[np.array(path(RULE, s, B0))]
    return _BP[s]
_ROOTF = {}
def check(RULE, T, maxnodes=60000):
    ST = sorted(RULE, key=fstate); SID = {s: i for i, s in enumerate(ST)}; SHAPE = [s[0] for s in ST]
    BASEP = [basep(RULE, s) for s in ST]; TAB = []
    for s in ST:
        ch = [c for c, _, _ in RULE[s]]; sh = [cshape(c) for c in ch]
        TAB.append(dict(ch=np.array(ch), st=[SID[(cshape(c), a, b)] for c, a, b in RULE[s]], linv=LINV[ch], lin=LIN[ch], tr=TRC[ch], l4=L4[ch], l4i=L4I[ch], tbk=TBK[ch],
                        rn=np.array([RN[x] for x in sh]), after=np.array([counts(sh[i+1:]) for i in range(len(ch))]), before=np.array([counts(sh[:i]) for i in range(len(ch))])))
    worst = 0.0
    for i, P in enumerate(BASEP):
        N = len(P); d2 = ((P[:, None]-P[None])**2).sum(-1); g = np.abs(np.arange(N)[:, None]-np.arange(N)[None]).astype(float); g[g == 0] = np.inf
        r = float((d2/g).max())/A0; worst = max(worst, r)
        if r > T: return ('violation', r, ST[i])
    stack = []
    for s in range(len(ST)):
        tb = TAB[s]; k = len(tb['ch'])
        for i in range(k):
            for j in range(i+1, k):
                a, c = int(tb['ch'][i]), int(tb['ch'][j])
                if (a, c) not in _ROOTF:
                    K = L4I[a] @ (TBK[c] - TBK[a]); _ROOTF[a, c] = (L4I[a] @ L4[c], K, floats(K, NL))
                Lq, K, t = _ROOTF[a, c]
                stack.append((tb['st'][i], tb['st'][j], Lq, K, t, 0, int(tb['after'][i][0]-tb['after'][j][0]-(SHAPE[tb['st'][j]] == 'D')),
                              int(tb['after'][i][1]-tb['after'][j][1]-(SHAPE[tb['st'][j]] == 'G')), 0, s))
    nodes = 0; SEEN = set()
    while stack:
        sa, sb, Lq, K, t, age, nD, nG, depth, root = stack.pop()
        if nD == 0 and nG == 0:
            kk = (sa, sb, Lq.tobytes(), K.tobytes())
            if kk in SEEN: continue
            SEEN.add(kk)
        nl = NL - depth
        if age >= 6: t = floats(K, nl); age = 0
        nodes += 1; L = lin2i(Lq)
        PA, PB = BASEP[sa], BASEP[sb] @ L.T + t[:, 0]*lam**B0
        d2 = ((PA[:, None]-PB[None])**2).sum(-1)
        gap = (len(PA)-1-np.arange(len(PA)))[:, None] + nD*SZ['D', B0] + nG*SZ['G', B0] + np.arange(len(PB))[None] + 1
        r = float((d2/gap).max())/A0; worst = max(worst, r)
        if r > T: return ('violation', r, ST[root])
        if nl-1 < MCAP-B0+1 or nodes > maxnodes: return ('limit', worst, ST[root])
        A, B = TAB[sa], TAB[sb]; m = nl-1
        Kc = np.einsum('ixy,ijyl->ijxl', A['l4i'], np.einsum('xy,jyl->jxl', Lq, B['tbk'])[None] + (K @ SH)[None, None] - A['tbk'][:, None])
        Lqc = np.einsum('ixy,yz,jzw->ijxw', A['l4i'], Lq, B['l4'])
        tc = np.einsum('ixy,ijyl->ijxl', A['linv'], np.einsum('xy,jyl->jxl', L, B['tr'][:, :, :m])[None] + lam*t[None, None, :, 1:nl] - A['tr'][:, None, :, :m])
        Lc = np.einsum('ixy,yz,jzw->ijxw', A['linv'], L, B['lin'])
        dist = np.sqrt(((np.einsum('ijxy,yl->ijxl', Lc, CTR[:, :m]) + tc - CTR[None, None, :, :m])**2).sum(2))
        nDc = A['after'][:, None, 0] + 7*nD + 6*nG + B['before'][None, :, 0]; nGc = A['after'][:, None, 1] + nD + nG + B['before'][None, :, 1]
        den = A0*(INV[:m] + nDc[..., None]*NN['D'][:m] + nGc[..., None]*NN['G'][:m])
        f = ((dist + A['rn'][:, None, :m] + B['rn'][None, :, :m])**2/den).max(-1)*(1+SLACK)
        for i, j in np.argwhere(f > T): stack.append((A['st'][i], B['st'][j], Lqc[i, j], Kc[i, j], tc[i, j], age+1, int(nDc[i, j]), int(nGc[i, j]), depth+1, root))
    return ('proven', worst, None)
def constant(RULE, start=5.0, step=1.002):
    """(lower, upper, culprit): the rule's locality constant lies in [lower, upper]"""
    T = start; lo = 0.0; cul = None
    while True:
        res = check(RULE, T)
        if res[0] == 'proven': return max(lo, res[1]), T, cul
        if res[0] == 'limit': return max(lo, res[1]), float('inf'), res[2]
        lo = max(lo, res[1]); cul = res[2]; T = res[1]*step
