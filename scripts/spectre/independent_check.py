"""Second, independent checker for a rule file. Shares no code with spectre.py or core.py.
Arithmetic: exact numbers p + q*sqrt(3) with rational p, q (Python Fractions). Geometry: the published
substitution algorithm run literally on those numbers. Relative positions are compared as explicit exact
transforms at 16 consecutive levels, computed by composing concrete placements (no formal matrices).
Standard library only.   usage: python3 independent_check.py results/rule_min30.json"""
import sys, json, time
from fractions import Fraction as F
from functools import lru_cache
T0 = time.time()
# ---------- numbers p + q sqrt3 as pairs
def n(p, q=0): return (F(p), F(q))
ZERO, ONE = n(0), n(1)
def add(a, b): return (a[0]+b[0], a[1]+b[1])
def sub(a, b): return (a[0]-b[0], a[1]-b[1])
def mul(a, b): return (a[0]*b[0]+3*a[1]*b[1], a[0]*b[1]+a[1]*b[0])
def neg(a): return (-a[0], -a[1])
H, R3 = n(F(1, 2)), n(0, F(1, 2))                                   # 1/2 and sqrt3/2
COS = {0: ONE, 30: R3, 60: H, 90: ZERO, 120: neg(H), 150: neg(R3), 180: neg(ONE), 210: neg(R3), 240: neg(H), 270: ZERO, 300: H, 330: R3}
SIN = {0: ZERO, 30: H, 60: R3, 90: ONE, 120: R3, 150: H, 180: ZERO, 210: neg(H), 240: neg(R3), 270: neg(ONE), 300: neg(R3), 330: neg(H)}
# ---------- affine maps (a b c / d e f)
IDENT = (ONE, ZERO, ZERO, ZERO, ONE, ZERO)
def rot(deg): c, s = COS[deg % 360], SIN[deg % 360]; return (c, neg(s), ZERO, s, c, ZERO)
def trans(x, y): return (ONE, ZERO, x, ZERO, ONE, y)
def comp(A, B):
    return (add(mul(A[0], B[0]), mul(A[1], B[3])), add(mul(A[0], B[1]), mul(A[1], B[4])), add(add(mul(A[0], B[2]), mul(A[1], B[5])), A[2]),
            add(mul(A[3], B[0]), mul(A[4], B[3])), add(mul(A[3], B[1]), mul(A[4], B[4])), add(add(mul(A[3], B[2]), mul(A[4], B[5])), A[5]))
def app(A, p): return (add(add(mul(A[0], p[0]), mul(A[1], p[1])), A[2]), add(add(mul(A[3], p[0]), mul(A[4], p[1])), A[5]))
def inv(A):                                                          # linear part is orthogonal
    L = (A[0], A[3], ZERO, A[1], A[4], ZERO); t = app(L, (A[2], A[5])); return (L[0], L[1], neg(t[0]), L[3], L[4], neg(t[1]))
REFLECT = (neg(ONE), ZERO, ZERO, ZERO, ONE, ZERO)
# ---------- the spectre: 14 unit edges, turning by these headings
HEAD = [0, 300, 30, 90, 0, 60, 150, 210, 120, 180, 180, 240, 330, 270]
pts = [(ZERO, ZERO)]
for h in HEAD[:-1]: pts.append((add(pts[-1][0], COS[h]), add(pts[-1][1], SIN[h])))
assert (add(pts[-1][0], COS[HEAD[-1]]), add(pts[-1][1], SIN[HEAD[-1]])) == pts[0]
SPECTRE = tuple(pts)
# ---------- placements of the 8 children at every level, straight from the published rules
RULES = [(60, 3, 1), (0, 2, 0), (60, 3, 1), (60, 3, 1), (0, 2, 0), (60, 3, 1), (-120, 3, 3)]
TOPLEVEL = 60
QUAD = [[SPECTRE[3], SPECTRE[5], SPECTRE[7], SPECTRE[11]]]; PLACE = [None]          # PLACE[L][j]: child j (level L-1) inside level L
for L in range(1, TOPLEVEL+1):
    q = QUAD[-1]; Ts = [IDENT]; total = 0; r = IDENT; tq = list(q)
    for ang, frm, to in RULES:
        total += ang
        if ang: r = rot(total); tq = [app(r, p) for p in q]
        src = app(Ts[-1], q[frm]); Ts.append(comp(trans(sub(src[0], tq[to][0]), sub(src[1], tq[to][1])), r))
    Ts = [comp(REFLECT, T) for T in Ts]; PLACE.append(Ts)
    QUAD.append([app(Ts[6], q[2]), app(Ts[5], q[1]), app(Ts[3], q[2]), app(Ts[0], q[1])])
def kids(X): return list(range(8)) if X == 'D' else [0, 1, 3, 4, 5, 6, 7]
def kshape(j): return 'G' if j == 7 else 'D'
@lru_cache(None)
def tiles(X, L):
    """(tiles, [(child index, start, end)]) for the level-L supertile of shape X"""
    if L == 0:
        if X == 'D': return (SPECTRE,), ()
        M = comp(trans(*SPECTRE[8]), rot(30)); return (SPECTRE, tuple(app(M, p) for p in SPECTRE)), ()
    out = []; spans = []
    for j in kids(X):
        a = len(out); out += [tuple(app(PLACE[L][j], p) for p in t) for t in tiles(kshape(j), L-1)[0]]; spans.append((j, a, len(out)))
    return tuple(out), tuple(spans)
def edges(t): return {frozenset((t[i], t[(i+1) % 14])) for i in range(14)}
@lru_cache(None)
def neighbours(X, L):
    own = {}; ts = tiles(X, L)[0]
    for i, t in enumerate(ts):
        for e in edges(t): own.setdefault(e, []).append(i)
    nb = [set() for _ in ts]
    for v in own.values():
        assert len(v) <= 2
        if len(v) == 2: nb[v[0]].add(v[1]); nb[v[1]].add(v[0])
    return nb
# ---------- locations
def ploc(t):
    g = t.endswith('b'); t = t.rstrip('b'); pre, per = t[:-1].split('('); return (tuple(map(int, pre)), tuple(map(int, per)), int(g))
def letter(loc, i): pre, per, g = loc; return pre[i] if i < len(pre) else per[(i-len(pre)) % len(per)]
def shift(loc):
    pre, per, g = loc; return (pre[1:], per, g) if pre else ((), per[1:]+per[:1], g)
def canon(loc):
    """same infinite word <=> same canonical form"""
    pre, per, g = loc
    for d in range(1, len(per)+1):
        if len(per) % d == 0 and per[:d]*(len(per)//d) == per: per = per[:d]; break
    while pre and pre[-1] == per[-1]: per = per[-1:]+per[:-1]; pre = pre[:-1]
    return (pre, per, g)
def tile_of(loc, X, L):
    off = 0; sh = X
    for i in range(L):
        j = letter(loc, i); spans = tiles(sh, L-i)[1]; assert j in kids(sh), 'location leaves the supertile'
        off += next(a for jj, a, b in spans if jj == j); sh = kshape(j)
    return off + (loc[2] if sh == 'G' else 0)
# ---------- hierarchical Hamiltonian paths at the base level, by plain recursive search
BASE = 2
def node(X, L, off=0): return (X, L, off)
@lru_cache(None)
def exits(X, L, e, topX):
    """tiles x (local index) such that a path e -> x visits each child cluster of (X, L) contiguously, recursively.
    adjacency is taken inside the level-BASE supertile of shape topX that contains this cluster at offset 0 semantics: local."""
    ts, spans = tiles(X, L)
    if len(ts) == 1: return frozenset([0])
    nb = neighbours(X, L)
    if L == 0: return frozenset(x for x in (0, 1) if x != e and x in nb[e])
    which = {}
    for j, a, b in spans:
        for i in range(a, b): which[i] = (j, a)
    res = set(); full = frozenset(j for j, _, _ in spans)
    def go(done, j, a, ent):
        for z in exits(kshape(j), L-1, ent-a, None):
            z += a
            if done == full: res.add(z); continue
            for y in nb[z]:
                k, ka = which[y]
                if k not in done: go(done | {k}, k, ka, y)
    j, a = which[e]; go(frozenset([j]), j, a, e)
    return frozenset(res)
# ---------- relative positions as explicit exact transforms at many consecutive levels
KEYLEN = 16
def sibling(a, c, hi): return {l: comp(inv(PLACE[l+1][a]), PLACE[l+1][c]) for l in range(BASE, hi+1)}
def descend(cfg, a, c): return {l: comp(comp(inv(PLACE[l+1][a]), cfg[l+1]), PLACE[l+1][c]) for l in cfg if l+1 in cfg}
def keyof(cfg): return tuple(cfg[l] for l in range(BASE, BASE+KEYLEN))
CLOSED = set(); POSITIONS = set()
def junction(XA, XB, cfg, nu, mu):
    """exit tile nu of A and entry tile mu of B share an edge at every level >= BASE"""
    chain = []; seen = set()
    while True:
        assert max(cfg) >= BASE+KEYLEN-1, 'ran out of levels'
        trip = (XA, XB, keyof(cfg), canon(nu), canon(mu))
        if trip in CLOSED or trip in seen: CLOSED.update(chain); POSITIONS.update(t[2] for t in chain); return True
        ta = tiles(XA, BASE)[0][tile_of(nu, XA, BASE)]; tb = tiles(XB, BASE)[0][tile_of(mu, XB, BASE)]
        if not (edges(ta) & edges(tuple(app(cfg[BASE], p) for p in tb))): return False
        chain.append(trip); seen.add(trip)
        a, c = letter(nu, 0), letter(mu, 0)
        cfg = descend(cfg, a, c); XA, XB, nu, mu = kshape(a), kshape(c), shift(nu), shift(mu)
# ---------- check the rule
d = json.load(open(sys.argv[1])); assert d['base_level'] == BASE
def pstate(t): X, a, b = t.split('|'); return (X, ploc(a), ploc(b))
def cstate(s): return (s[0], canon(s[1]), canon(s[2]))
RULE = {}
for k, prod in d['rule'].items():
    items = []
    for it in prod: c, st = it.split(':'); items.append((int(c), pstate(st)))
    RULE[cstate(pstate(k))] = items
nj = 0
for (X, lin, lout), prod in RULE.items():
    e, x = tile_of(lin, X, BASE), tile_of(lout, X, BASE)
    assert x in exits(X, BASE, e, None), 'no base path'
    assert sorted(c for c, _ in prod) == kids(X), 'children are not a permutation'
    for c, st in prod: assert st[0] == kshape(c) and cstate(st) in RULE, 'child state missing from the rule'
    assert letter(lin, 0) == prod[0][0] and canon(shift(lin)) == canon(prod[0][1][1]), 'entry does not descend'
    assert letter(lout, 0) == prod[-1][0] and canon(shift(lout)) == canon(prod[-1][1][2]), 'exit does not descend'
    for (a, sa), (c, sc) in zip(prod, prod[1:]):
        assert junction(kshape(a), kshape(c), sibling(a, c, TOPLEVEL-1), sa[2], sc[1]), 'junction fails'; nj += 1
print(f'{sys.argv[1]}: {len(RULE)} states; base paths found by plain search; {nj} junctions certified through '
      f'{len(CLOSED)} closed triples over {len(POSITIONS)} relative positions')
# ---------- replay the rule at levels 2..4 on the exact geometry
def path(s, L):
    X, lin, lout = s
    if L == BASE: return base_path(X, tile_of(lin, X, L), tile_of(lout, X, L))
    out = []; spans = {j: a for j, a, b in tiles(X, L)[1]}
    for c, st in RULE[s]: out += [spans[c] + t for t in path(cstate(st), L-1)]
    return out
def base_path(X, e, x, L=BASE):
    ts, spans = tiles(X, L)
    if len(ts) == 1: return [0]
    if L == 0: return [e, x]
    nb = neighbours(X, L); which = {}
    for j, a, b in spans:
        for i in range(a, b): which[i] = (j, a)
    full = frozenset(j for j, _, _ in spans)
    def go(done, j, a, ent):
        for z in sorted(exits(kshape(j), L-1, ent-a, None)):
            seg = lambda: [a + t for t in base_path(kshape(j), ent-a, z, L-1)]
            if done == full:
                if z + a == x: return seg()
                continue
            for y in sorted(nb[z + a]):
                k, ka = which[y]
                if k not in done:
                    rest = go(done | {k}, k, ka, y)
                    if rest is not None: return seg() + rest
        return None
    j, a = which[e]; return go(frozenset([j]), j, a, e)
def contiguous(X, L, pos, off=0):
    ts, spans = tiles(X, L)
    if len(ts) > 1:
        ps = pos[off:off+len(ts)]; assert max(ps)-min(ps) == len(ts)-1, 'a supertile is not contiguous'
    for j, a, b in spans: contiguous(kshape(j), L-1, pos, off+a)
for L in (2, 3, 4):
    for s in RULE:
        seq = path(s, L); nb = neighbours(s[0], L); N = len(tiles(s[0], L)[0])
        assert sorted(seq) == list(range(N)) and all(seq[i+1] in nb[seq[i]] for i in range(N-1))
        assert seq[0] == tile_of(s[1], s[0], L) and seq[-1] == tile_of(s[2], s[0], L)
        pos = [0]*N
        for i, t in enumerate(seq): pos[t] = i
        contiguous(s[0], L, pos)
    print(f'replay at level {L}: all {len(RULE)} states valid on exact geometry ({time.time()-T0:.0f}s)', flush=True)
print('INDEPENDENT CHECK OK')
