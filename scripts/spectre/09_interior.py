"""Certificate that a nested supertile is strictly interior at every level.
Claim: in a D supertile of level n >= 4, no tile of the grandchild at address 6,6 has an edge on the boundary.
Method: a supertile is SURROUNDED by an environment (a set of same-level supertiles at exact relative positions) if
every edge of each of its tiles is shared with a tile of itself or of the environment. Surrounded-ness descends:
a child is surrounded by its siblings and the children of its parent's environment. The set of (shape, environment)
pairs reached is finite and each is checked at level 2 in exact integer arithmetic.
usage: python3 09_interior.py [child=6] [grandchild=6]"""
import sys
from core import *
c1 = int(sys.argv[1]) if len(sys.argv) > 1 else 6; c2 = int(sys.argv[2]) if len(sys.argv) > 2 else 6
_BE = {}
def bedges(X, k=None):
    """boundary edges of the level-B0 supertile of shape X, optionally moved by relative position k"""
    if (X, k) not in _BE:
        cnt = {}
        for T in ET(X, B0):
            if k is not None: L, C = REP[k]; T = T @ L.T + C @ V[B0]
            for e in ekeys(T): cnt[e] = cnt.get(e, 0) + 1
        _BE[X, k] = frozenset(e for e, n in cnt.items() if n == 1)
    return _BE[X, k]
def touching(X, cands):
    mine = bedges(X); return frozenset((Y, k) for Y, k in cands if mine & bedges(Y, k))
def child_env(X, E, a):
    cands = {(cshape(c), sibling(a, c)) for c in cidx(X) if c != a}
    cands |= {(cshape(c), descend(k, a, c)) for Y, k in E for c in cidx(Y)}
    return touching(cshape(a), cands)
def surrounded_at_base(X, E):
    cover = set()
    for Y, k in E: cover |= bedges(Y, k)
    return bedges(X) <= cover
t0 = time.time()
E1 = frozenset((cshape(c), sibling(c1, c)) for c in cidx('D') if c != c1)      # child c1 with its siblings
start = (cshape(c2), child_env(cshape(c1), E1, c2))                             # grandchild with what touches it
CLOSED = set(); todo = [start]; fail = None
while todo:
    st = todo.pop()
    if st in CLOSED: continue
    X, E = st
    if not surrounded_at_base(X, E): fail = st; break
    CLOSED.add(st)
    for a in cidx(X): todo.append((cshape(a), child_env(X, E, a)))
if fail: print(f'NOT surrounded: child {c1}, grandchild {c2} fails after {len(CLOSED)} environments'); sys.exit(1)
envs = {E for _, E in CLOSED}
print(f'grandchild {c1},{c2} of a D supertile: its environment has {len(start[1])} supertiles; the closure has {len(CLOSED)} '
      f'(shape, environment) pairs, environment sizes {min(map(len, envs))}-{max(map(len, envs))}, '
      f'{len({k for E in envs for _, k in E})} relative positions; every one is surrounded at level {B0}.')
print(f'Hence at every level n >= {B0+2} each tile of that grandchild has all 14 edges inside the supertile. INTERIOR CERTIFIED ({time.time()-t0:.0f}s)')
