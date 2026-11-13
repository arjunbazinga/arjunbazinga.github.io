"""Spectre tiling via the Smith-Myers-Kaplan-Goodman-Strauss substitution,
plus an exact search for hierarchical tile-visiting (Hilbert-style) curves."""
import math, sys, itertools, time
from collections import defaultdict

S3 = math.sqrt(3)
SPECTRE = [(0, 0), (1, 0), (1.5, -S3/2), (1.5+S3/2, 0.5-S3/2), (1.5+S3/2, 1.5-S3/2),
           (2.5+S3/2, 1.5-S3/2), (3+S3/2, 1.5), (3.0, 2.0), (3-S3/2, 1.5),
           (2.5-S3/2, 1.5+S3/2), (1.5-S3/2, 1.5+S3/2), (0.5-S3/2, 1.5+S3/2),
           (-S3/2, 1.5), (0.0, 1.0)]
KEYS = [SPECTRE[3], SPECTRE[5], SPECTRE[7], SPECTRE[11]]
IDENT = (1, 0, 0, 0, 1, 0)
LABELS = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']

def mul(A, B):
    return (A[0]*B[0]+A[1]*B[3], A[0]*B[1]+A[1]*B[4], A[0]*B[2]+A[1]*B[5]+A[2],
            A[3]*B[0]+A[4]*B[3], A[3]*B[1]+A[4]*B[4], A[3]*B[2]+A[4]*B[5]+A[5])
def trot(a):
    c, s = math.cos(a), math.sin(a); return (c, -s, 0, s, c, 0)
def ttrans(x, y): return (1, 0, x, 0, 1, y)
def tp(M, p): return (M[0]*p[0]+M[1]*p[1]+M[2], M[3]*p[0]+M[4]*p[1]+M[5])

class Node:
    def __init__(self, label, level, children, quad):
        self.label, self.level, self.children, self.quad = label, level, children, quad
        self._tiles = None
    def tiles(self):
        """list of 14-gons in local coords, canonical order; also sets self.slices"""
        if self._tiles is None:
            if not self.children:
                self._tiles = [list(SPECTRE)]; self.slices = []
            else:
                out, sl = [], []
                for ch, T in self.children:
                    a = len(out)
                    out += [[tp(T, p) for p in poly] for poly in ch.tiles()]
                    sl.append((a, len(out)))
                self._tiles, self.slices = out, sl
        return self._tiles

def base():
    sys_ = {}
    leaf = lambda l: Node(l, -1, [], KEYS)
    for l in LABELS[1:]:
        sys_[l] = Node(l, 0, [(leaf(l), IDENT)], KEYS)   # level-0 cluster of one tile
    sys_['Gamma'] = Node('Gamma', 0, [(leaf('Gamma1'), IDENT),
        (leaf('Gamma2'), mul(ttrans(*SPECTRE[8]), trot(math.pi/6)))], KEYS)
    return sys_

RULES = {
 'Gamma':  ['Pi', 'Delta', None, 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'],
 'Delta':  ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
 'Theta':  ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
 'Lambda': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
 'Xi':     ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
 'Pi':     ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
 'Sigma':  ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'],
 'Phi':    ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
 'Psi':    ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma']}

def supertiles(sys_, level):
    quad = sys_['Delta'].quad
    R = (-1, 0, 0, 0, 1, 0)
    t_rules = [(60, 3, 1), (0, 2, 0), (60, 3, 1), (60, 3, 1), (0, 2, 0), (60, 3, 1), (-120, 3, 3)]
    Ts = [IDENT]; total = 0; rot = IDENT; tq = list(quad)
    for ang, frm, to in t_rules:
        total += ang
        if ang:
            rot = trot(math.radians(total)); tq = [tp(rot, q) for q in quad]
        src = tp(Ts[-1], quad[frm])
        Ts.append(mul(ttrans(src[0]-tq[to][0], src[1]-tq[to][1]), rot))
    Ts = [mul(R, T) for T in Ts]
    sq = [tp(Ts[6], quad[2]), tp(Ts[5], quad[1]), tp(Ts[3], quad[2]), tp(Ts[0], quad[1])]
    return {lab: Node(lab, level, [(sys_[s], Ts[i]) for i, s in enumerate(subs) if s], sq)
            for lab, subs in RULES.items()}

def key(p): return (round(p[0]*1000), round(p[1]*1000))

def adjacency(tiles):
    """edge-sharing adjacency; returns nbrs (list of sets), boundary flags, stats"""
    edges = defaultdict(list)
    for i, poly in enumerate(tiles):
        ks = [key(p) for p in poly]
        for a in range(14):
            e = tuple(sorted((ks[a], ks[(a+1) % 14])))
            edges[e].append(i)
    nb = [set() for _ in tiles]; bnd = [False]*len(tiles); bad = 0
    for e, ts in edges.items():
        if len(ts) == 1: bnd[ts[0]] = True
        elif len(ts) == 2: nb[ts[0]].add(ts[1]); nb[ts[1]].add(ts[0])
        else: bad += 1
    return nb, bnd, bad, edges

def bits(m):
    while m:
        l = m & -m; yield l.bit_length()-1; m ^= l

def solve(node, memo):
    """feas[e] = bitmask of exit tiles x such that a hierarchical Hamiltonian path of
    this cluster runs e -> x; e and x restricted to cluster-boundary tiles.
    'hierarchical' = every sub-cluster at every level is visited as one contiguous run."""
    if node in memo: return memo[node]
    tiles = node.tiles(); n = len(tiles)
    if n == 1:
        memo[node] = dict(feas={0: 1}, nb=[set()], bnd=[True], perms={(0,): 1}); return memo[node]
    nb, bnd, bad, _ = adjacency(tiles)
    assert bad == 0
    bmask = sum(1 << i for i in range(n) if bnd[i])
    m = len(node.children); sl = node.slices
    cfe = {}                       # entry tile (parent idx) -> exit mask (parent idx)
    child_of = [0]*n
    for j, (ch, _) in enumerate(node.children):
        a, b = sl[j]
        for i in range(a, b): child_of[i] = j
        for e, mask in solve(ch, memo)['feas'].items():
            cfe[a+e] = mask << a
    cmask = [((1 << b) - 1) ^ ((1 << a) - 1) for a, b in sl]
    nbm = [sum(1 << y for y in nb[x]) for x in range(n)]
    cadj = [set() for _ in range(m)]
    for x in range(n):
        for y in nb[x]:
            if child_of[y] != child_of[x]: cadj[child_of[x]].add(child_of[y])
    # enumerate Hamiltonian paths of the child graph
    perms = []
    def rec(p, used):
        if len(p) == m: perms.append(tuple(p)); return
        for k in cadj[p[-1]]:
            if not used >> k & 1: p.append(k); rec(p, used | 1 << k); p.pop()
    for j in range(m): rec([j], 1 << j)
    feas = defaultdict(int); permcount = {}
    suffix = {}                    # perm suffix -> {entry tile: final exit mask}
    def R(suf):
        if suf in suffix: return suffix[suf]
        j = suf[0]; a, b = sl[j]; out = {}
        if len(suf) == 1:
            for e in range(a, b):
                if e in cfe:
                    v = cfe[e] & bmask
                    if v: out[e] = v
        else:
            nxt = R(suf[1:])
            if nxt:
                step = {}          # exit tile z of child j -> final mask
                for e in range(a, b):
                    if e not in cfe: continue
                    acc = 0
                    for z in bits(cfe[e]):
                        if z not in step:
                            v = 0
                            for y in nb[z]:
                                if y in nxt: v |= nxt[y]
                            step[z] = v
                        acc |= step[z]
                    if acc: out[e] = acc
        suffix[suf] = out; return out
    for p in perms:
        r = R(p); c = 0
        for e, v in r.items():
            if bnd[e]: feas[e] |= v; c += bin(v).count('1')
        if c: permcount[p] = c
    memo[node] = dict(feas=dict(feas), nb=nb, bnd=bnd, perms=permcount, cfe=cfe,
                      child_of=child_of, suffix=suffix)
    return memo[node]

def build(node, e, x, memo):
    """explicit tile sequence (local idx) of a hierarchical path e -> x in node"""
    tiles = node.tiles()
    if len(tiles) == 1: return [0]
    d = memo[node]; sl = node.slices; nb = d['nb']; cfe = d['cfe']
    for p in d['perms']:
        r = d['suffix'][p]
        if e in r and r[e] >> x & 1:
            seq = []; cur = e
            for i, j in enumerate(p):
                a, b = sl[j]; ch = node.children[j][0]
                if i == len(p)-1:
                    z = x; assert cfe[cur] >> z & 1
                else:
                    nxt = d['suffix'][p[i+1:]]; z = None
                    for zz in bits(cfe[cur]):
                        for y in nb[zz]:
                            if y in nxt and nxt[y] >> x & 1: z, ynext = zz, y; break
                        if z is not None: break
                seq += [a + t for t in build(ch, cur-a, z-a, memo)]
                if i < len(p)-1: cur = ynext
            return seq
    raise RuntimeError('no path')

def systems(maxlevel):
    out = [base()]
    for L in range(1, maxlevel+1): out.append(supertiles(out[-1], L))
    return out

if __name__ == '__main__':
    maxlevel = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    S = systems(maxlevel); memo = {}
    for L in range(maxlevel+1):
        for lab in LABELS:
            t0 = time.time(); node = S[L][lab]; d = solve(node, memo)
            n = len(node.tiles()); nb = sum(d['bnd'])
            pairs = sum(bin(v).count('1') for v in d['feas'].values())
            print(f"L{L} {lab:7s} tiles={n:6d} boundary={nb:5d} entries={len(d['feas']):5d} "
                  f"pairs={pairs:8d} child-orders={len(d['perms']):4d}  {time.time()-t0:.1f}s", flush=True)
