"""Exact machinery: Z[zeta12] arithmetic, locations, certified junctions, state fixed point.
Every geometric fact used by the induction is checked in integer arithmetic."""
import sys, os, math, itertools, pickle, time, random
import numpy as np
from spectre import *
sys.setrecursionlimit(100000)
B0 = 2
def I(n): return np.array([[int(i == j) for j in range(n)] for i in range(n)], dtype=object)
def Z(r, c): return np.array([[0]*c for _ in range(r)], dtype=object)
ROT1 = np.array([[0, 0, 0, -1], [1, 0, 0, 0], [0, 1, 0, 1], [0, 0, 1, 0]], dtype=object)
REFL = np.array([[-1, 0, -1, 0], [0, -1, 0, 0], [0, 0, 1, 0], [0, 1, 0, 1]], dtype=object)
def rotp(k):
    m = I(4)
    for _ in range(k % 12): m = ROT1 @ m
    return m
def Esel(i):
    m = Z(4, 16)
    for r in range(4): m[r, 4*i+r] = 1
    return m
TSF = [(I(4), Z(4, 16), 0)]; _tot = 0; _rot = I(4); _rk = 0
for _ang, _frm, _to in [(60, 3, 1), (0, 2, 0), (60, 3, 1), (60, 3, 1), (0, 2, 0), (60, 3, 1), (-120, 3, 3)]:
    _tot += _ang
    if _ang: _rk = (_tot//30) % 12; _rot = rotp(_rk)
    TSF.append((_rot, TSF[-1][0] @ Esel(_frm) + TSF[-1][1] - _rot @ Esel(_to), _rk))
TS = [(REFL @ L, REFL @ t) for L, t, _ in TSF]
TSI = [rotp(-k) @ REFL for _, _, k in TSF]
M = np.vstack([TS[6][0] @ Esel(2) + TS[6][1], TS[5][0] @ Esel(1) + TS[5][1],
               TS[3][0] @ Esel(2) + TS[3][1], TS[0][0] @ Esel(1) + TS[0][1]])
_p = [np.array([0, 0, 0, 0], dtype=object)]
for i in range(13):
    k = round(math.degrees(math.atan2(SPECTRE[i+1][1]-SPECTRE[i][1], SPECTRE[i+1][0]-SPECTRE[i][0]))/30) % 12
    _p.append(_p[-1] + rotp(k)[:, 0])
P0 = np.array(_p, dtype=object)                                   # exact spectre, 14 x 4
def toxy(z): return (float(z[0]) + float(z[1])*S3/2 + float(z[2])/2, float(z[1])/2 + float(z[2])*S3/2 + float(z[3]))
V = [np.concatenate([P0[3], P0[5], P0[7], P0[11]])]
for _ in range(B0 + 24): V.append(M @ V[-1])
BAS = np.array([V[B0+k] for k in range(16)], dtype=object).T
KRYLOV_RANK = None
def cshape(j): return 'G' if j == 7 else 'D'
def cpos(X, j): return j if X == 'D' else (j if j < 2 else j-1)
def cidx(X): return list(range(8)) if X == 'D' else [0, 1, 3, 4, 5, 6, 7]
S = systems(B0+4); memo = {}
NODE = {('G', n): S[n]['Gamma'] for n in range(B0+5)}; NODE.update({('D', n): S[n]['Delta'] for n in range(B0+5)})
_ET = {}
def ET(X, n):
    """exact tiles of the level-n supertile of shape X, same order as NODE[X,n].tiles()"""
    if (X, n) not in _ET:
        if n == 0: out = [P0] if X == 'D' else [P0, P0 @ rotp(1).T + P0[8]]
        else:
            out = []
            for j in cidx(X):
                L, tau = TS[j]; t = tau @ V[n-1]
                out += [T @ L.T + t for T in ET(cshape(j), n-1)]
        _ET[X, n] = out
    return _ET[X, n]
def ekeys(T): 
    ks = [tuple(p) for p in T]
    return frozenset(tuple(sorted((ks[i], ks[(i+1) % 14]))) for i in range(14))
def exact_adjacency(X, n):
    owner = {}; nb = [set() for _ in ET(X, n)]
    for i, T in enumerate(ET(X, n)):
        for e in ekeys(T): owner.setdefault(e, []).append(i)
    for e, ts in owner.items():
        assert len(ts) <= 2
        if len(ts) == 2: nb[ts[0]].add(ts[1]); nb[ts[1]].add(ts[0])
    return nb
def check_exact(levels):
    """exact tiles agree with the float construction, and float adjacency equals exact adjacency"""
    for n in levels:
        for X in 'GD':
            ft = NODE[X, n].tiles(); et = ET(X, n); assert len(ft) == len(et)
            for a, b in zip(ft, et):
                for p, q in zip(a, b):
                    x, y = toxy(q); assert abs(x-p[0]) < 1e-6 and abs(y-p[1]) < 1e-6
            assert exact_adjacency(X, n) == solve(NODE[X, n], memo)['nb']
# ---- locations
def norm(pre, per):
    per = tuple(per); pre = tuple(pre)
    for d in range(1, len(per)+1):
        if len(per) % d == 0 and per[:d]*(len(per)//d) == per: per = per[:d]; break
    while pre and pre[-1] == per[-1]: per = per[-1:] + per[:-1]; pre = pre[:-1]
    return pre, per
def letters(loc, n):
    pre, per, g = loc; out = list(pre[:n])
    while len(out) < n: out.append(per[(len(out)-len(pre)) % len(per)])
    return out
def head(loc): return loc[0][0] if loc[0] else loc[1][0]
def tail(loc):
    pre, per, g = loc
    p, q = norm(pre[1:], per) if pre else norm((), per[1:] + per[:1])
    return (p, q, g)
def valid(loc, X):
    w = letters(loc, len(loc[0]) + 2*len(loc[1]) + 1)
    return not (X == 'G' and w[0] == 2) and not any(a == 7 and b == 2 for a, b in zip(w, w[1:]))
_TI = {}
def tile(loc, X, n):
    if (loc, X, n) not in _TI:
        node = NODE[X, n]; node.tiles(); off = 0; sh = X
        for j in letters(loc, n):
            off += node.slices[cpos(sh, j)][0]; node = node.children[cpos(sh, j)][0]; node.tiles(); sh = cshape(j)
        _TI[loc, X, n] = off + (loc[2] if sh == 'G' else 0)
    return _TI[loc, X, n]
def fmt(l): return ''.join(map(str, l[0])) + '(' + ''.join(map(str, l[1])) + ')' + ('b' if l[2] else '')
# ---- exact relative configurations, coinductive adjacency proof
REP = {}
def ckey(L, C):
    k = (tuple(L.flatten()), tuple((C @ BAS).flatten())); REP.setdefault(k, (L, C)); return k
def descend(k, a, c):
    L, C = REP[k]
    return ckey(TSI[a] @ L @ TS[c][0], TSI[a] @ (L @ TS[c][1] + C @ M - TS[a][1]))
def sibling(a, c): return ckey(TSI[a] @ TS[c][0], TSI[a] @ (TS[c][1] - TS[a][1]))
_EK = {}
def edges_at_base(X, t, k=None):
    if (X, t, k) not in _EK:
        T = ET(X, B0)[t]
        if k is not None: L, C = REP[k]; T = T @ L.T + C @ V[B0]
        _EK[X, t, k] = ekeys(T)
    return _EK[X, t, k]
PROVEN = set(); FAILED = set()
def prove(XA, XB, k, nu, mu):
    chain = []; seen = set(); cur = (XA, XB, k, nu, mu)
    while True:
        if cur in PROVEN or cur in seen: PROVEN.update(chain); return True
        if cur in FAILED or len(chain) > 60: FAILED.update(chain); return False
        XA_, XB_, k_, nu_, mu_ = cur
        if not (valid(nu_, XA_) and valid(mu_, XB_)) or \
           not (edges_at_base(XA_, tile(nu_, XA_, B0)) & edges_at_base(XB_, tile(mu_, XB_, B0), k_)):
            FAILED.update(chain); FAILED.add(cur); return False
        chain.append(cur); seen.add(cur)
        a, c = head(nu_), head(mu_)
        cur = (cshape(a), cshape(c), descend(k_, a, c), tail(nu_), tail(mu_))
def compute(PRE, PER, verbose=True):
    """locations, certified junctions J, and the greatest fixed point VAL of valid states"""
    PROVEN.clear(); FAILED.clear(); REP.clear(); _EK.clear()
    LEVS = [B0, B0+1, B0+2]
    for n in LEVS:
        for X in 'GD': solve(NODE[X, n], memo)
    words = set()
    for a in range(PRE+1):
        for pre in itertools.product(range(8), repeat=a):
            for b in range(1, PER+1):
                for per in itertools.product(range(8), repeat=b): words.add(norm(pre, per))
    LOCS = {}
    for X in 'GD':
        LOCS[X] = {}
        for pre, per in words:
            for g in ((0, 1) if 7 in pre+per else (0,)):
                loc = (pre, per, g)
                if not valid(loc, X): continue
                ti = tuple(tile(loc, X, n) for n in LEVS)
                if all(memo[NODE[X, n]]['bnd'][t] for n, t in zip(LEVS, ti)): LOCS[X][loc] = ti
    J = {}
    for X in 'GD':
        node = NODE[X, B0+1]; d = memo[node]; nb = d['nb']; idx = cidx(X)
        bytile = {sh: {} for sh in 'GD'}
        for sh in 'GD':
            for loc, ti in LOCS[sh].items(): bytile[sh].setdefault(ti[0], []).append(loc)
        for a in idx:
            oa = node.slices[cpos(X, a)][0]
            for nu, ti in LOCS[cshape(a)].items():
                for u in nb[oa + ti[0]]:
                    c = idx[d['child_of'][u]]
                    if c == a: continue
                    oc = node.slices[cpos(X, c)][0]
                    for mu in bytile[cshape(c)].get(u - oc, ()):
                        if prove(cshape(a), cshape(c), sibling(a, c), nu, mu):
                            J.setdefault((X, a, c), {}).setdefault(nu, set()).add(mu)
    VAL = {}
    for X in 'GD':
        st = {}; fe = [memo[NODE[X, n]]['feas'] for n in LEVS]
        for mu, ti in LOCS[X].items():
            if not all(t in f for t, f in zip(ti, fe)): continue
            for nu, tj in LOCS[X].items():
                if all(f[t] >> u & 1 for f, t, u in zip(fe, ti, tj)): st.setdefault(mu, set()).add(nu)
        VAL[X] = st
    PERMS = {X: [tuple(cidx(X)[p] for p in perm) for perm in memo[NODE[X, B0+1]]['perms']] for X in 'GD'}
    ncand = sum(len(v) for X in 'GD' for v in VAL[X].values())
    VAL = gfp(VAL, J, PERMS)
    if verbose:
        print(f'family pre<={PRE} per<={PER}: locations', {X: len(LOCS[X]) for X in 'GD'},
              'junction facts', sum(len(s) for v in J.values() for s in v.values()), 'configs', len(REP),
              'closed triples', len(PROVEN), 'candidate states', ncand, '-> surviving', nstates(VAL), flush=True)
    return LOCS, J, VAL, PERMS
def nstates(VAL): return sum(len(v) for X in 'GD' for v in VAL[X].values())
def states(VAL): return [(X, a, b) for X in 'GD' for a in VAL[X] for b in VAL[X][a]]
def decompose(X, lin, lout, VAL, J, PERMS, pref=None, rng=None):
    """a production for state (X, lin, lout) using child states from VAL; minimises states outside pref"""
    h, hl = head(lin), head(lout); t_in, t_out = tail(lin), tail(lout); best = None
    perms = PERMS[X] if rng is None else rng.sample(PERMS[X], len(PERMS[X]))
    for p in perms:
        if p[0] != h or p[-1] != hl: continue
        layers = [{t_in: (0, None)}]; ok = True
        for i in range(len(p)-1):
            a, c = p[i], p[i+1]; jj = J.get((X, a, c), {}); nxt = {}
            va, vc = VAL[cshape(a)], VAL[cshape(c)]
            for mu, (cost, _) in layers[-1].items():
                for nu in va.get(mu, ()):
                    c2 = cost + (pref is not None and (cshape(a), mu, nu) not in pref)
                    for mu2 in jj.get(nu, ()):
                        if mu2 in vc and (mu2 not in nxt or nxt[mu2][0] > c2): nxt[mu2] = (c2, (mu, nu))
            if not nxt: ok = False; break
            layers.append(nxt)
        if not ok: continue
        for mu, (cost, _) in layers[-1].items():
            if t_out in VAL[cshape(p[-1])].get(mu, ()):
                c2 = cost + (pref is not None and (cshape(p[-1]), mu, t_out) not in pref)
                if best is None or c2 < best[0]:
                    seq = [(p[-1], mu, t_out)]; m = mu
                    for i in range(len(p)-1, 0, -1):
                        pm, pn = layers[i][m][1]; seq.append((p[i-1], pm, pn)); m = pm
                    best = (c2, seq[::-1])
                    if pref is None or c2 == 0: return best[1]
    return best[1] if best else None
def gfp(VAL, J, PERMS):
    VAL = {X: {a: set(s) for a, s in VAL[X].items()} for X in 'GD'}
    while True:
        drop = [s for s in states(VAL) if decompose(*s, VAL, J, PERMS) is None]
        if not drop: return VAL
        for X, a, b in drop: VAL[X][a].discard(b)
        VAL = {X: {a: s for a, s in VAL[X].items() if s} for X in 'GD'}
def restrict(sts):
    out = {'G': {}, 'D': {}}
    for X, a, b in sts: out[X].setdefault(a, set()).add(b)
    return out
def extract(start, VAL, J, PERMS, rng=None):
    R = {}; todo = [start]
    while todo:
        s = todo.pop()
        if s in R: continue
        R[s] = decompose(*s, VAL, J, PERMS, pref=set(R) | set(todo), rng=rng)
        for c, mu, nu in R[s]:
            t = (cshape(c), mu, nu)
            if t not in R and t not in todo: todo.append(t)
    return R
_BASE = {}
def path(RULE, s, n):
    X, lin, lout = s; node = NODE[X, n]
    if n == B0:
        if s not in _BASE: solve(node, memo); _BASE[s] = build(node, tile(lin, X, n), tile(lout, X, n), memo)
        return _BASE[s]
    node.tiles(); out = []
    for c, mu, nu in RULE[s]:
        off = node.slices[cpos(X, c)][0]; out += [off + t for t in path(RULE, (cshape(c), mu, nu), n-1)]
    return out
A0 = 0.5*abs(sum(SPECTRE[i][0]*SPECTRE[(i+1) % 14][1]-SPECTRE[(i+1) % 14][0]*SPECTRE[i][1] for i in range(14)))
_CEN = {}
def centroids(X, n):
    if (X, n) not in _CEN: _CEN[X, n] = np.array([np.mean(p, axis=0) for p in NODE[X, n].tiles()], dtype=np.float32)
    return _CEN[X, n]
def locality(RULE, s, n, chunk=1024):
    c = centroids(s[0], n)[path(RULE, s, n)]; N = len(c); w = 0.0; idx = np.arange(N, dtype=np.float32)
    for i in range(0, N-1, chunk):
        blk = c[i:i+chunk]; j0 = i+1
        d2 = (blk[:, None, 0]-c[None, j0:, 0])**2 + (blk[:, None, 1]-c[None, j0:, 1])**2
        gap = idx[None, j0:] - idx[i:i+len(blk), None]
        np.divide(d2, gap, out=d2, where=gap > 0); d2[gap <= 0] = 0
        w = max(w, float(d2.max()))
    return w / A0

# ---- rule files, replay, helpers
import json
def parse_loc(t):
    g = t.endswith('b'); t = t.rstrip('b'); pre, per = t[:-1].split('(')
    return (tuple(map(int, pre)), tuple(map(int, per)), int(g))
def fstate(s): return f'{s[0]}|{fmt(s[1])}|{fmt(s[2])}'
def parse_state(t):
    X, a, b = t.split('|'); return (X, parse_loc(a), parse_loc(b))
def save_rule(RULE, start, fname):
    json.dump({'base_level': B0, 'start': fstate(start),
               'note': 'state = shape|entry|exit (shape G = Gamma supertile, D = any other). location = prefix(repeating part) '
                       'word of child indices read from the top level down; trailing b = second tile of a mystic. '
                       'production = ordered children written index:state. At the base level a state is any hierarchical '
                       'Hamiltonian path between its two tiles.',
               'rule': {fstate(s): [f'{c}:{fstate((cshape(c), mu, nu))}' for c, mu, nu in RULE[s]] for s in RULE}},
              open(fname, 'w'), indent=1)
def load_rule(fname):
    d = json.load(open(fname)); assert d['base_level'] == B0; RULE = {}
    for k, prod in d['rule'].items():
        out = []
        for item in prod:
            c, st = item.split(':'); X, mu, nu = parse_state(st); assert X == cshape(int(c)); out.append((int(c), mu, nu))
        RULE[parse_state(k)] = out
    return RULE, parse_state(d['start'])
def reach(RULE, s):
    seen = set(); todo = [s]
    while todo:
        t = todo.pop()
        if t in seen: continue
        seen.add(t); todo += [(cshape(c), mu, nu) for c, mu, nu in RULE[t]]
    return seen
def top_state(RULE):
    """a state whose curve contains every state of the rule, self-containing if possible"""
    cand = [s for s in sorted(RULE, key=fstate) if len(reach(RULE, s)) == len(RULE)]
    selfc = [s for s in cand if any((cshape(c), mu, nu) == s for c, mu, nu in RULE[s])]
    return (selfc or cand or sorted(RULE, key=fstate))[0]
def clusters(node, off=0, out=None):
    if out is None: out = []
    if node.children:
        out.append((off, off+len(node.tiles())))
        for (ch, _), (a, b) in zip(node.children, node.slices): clusters(ch, off+a, out)
    return out
def replay(RULE, levels):
    """generate every state's path at explicit levels and check it from scratch"""
    for n in levels:
        nbn = {X: adjacency(NODE[X, n].tiles())[0] for X in 'GD'}; cl = {X: clusters(NODE[X, n]) for X in 'GD'}
        for s in RULE:
            seq = path(RULE, s, n); N = len(seq)
            assert sorted(seq) == list(range(N)), 'not a permutation of the tiles'
            assert all(seq[i+1] in nbn[s[0]][seq[i]] for i in range(N-1)), 'consecutive tiles do not share an edge'
            assert seq[0] == tile(s[1], s[0], n) and seq[-1] == tile(s[2], s[0], n), 'wrong endpoints'
            pos = [0]*N
            for i, t in enumerate(seq): pos[t] = i
            for a, b in cl[s[0]]:
                ps = pos[a:b]; assert max(ps)-min(ps) == b-a-1, 'a supertile is not contiguous'
