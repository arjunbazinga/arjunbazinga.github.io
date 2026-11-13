"""The worst pair found at levels 6, 7, 8 is one self-similar family: the tiles at two fixed eventually periodic
addresses. This follows that family to high levels with exact positions and exact step counts, giving the value
the ratio converges to along the family.
usage: python3 08_locality_family.py rule.json "D|(2)|0(5)" "41(2)" "440(2)" [maxlevel=40]"""
import sys
from fractions import Fraction
from core import *
RULE, _ = load_rule(sys.argv[1]); s0 = parse_state(sys.argv[2]); la, lb = parse_loc(sys.argv[3]), parse_loc(sys.argv[4])
ML = int(sys.argv[5]) if len(sys.argv) > 5 else 40
while len(V) <= ML: V.append(M @ V[-1])
SZ = {}
def size(X, n):
    if (X, n) not in SZ: SZ[X, n] = (1 if X == 'D' else 2) if n == 0 else sum(size(cshape(j), n-1) for j in cidx(X))
    return SZ[X, n]
def centre(loc, n):
    """exact centroid (times 14) of the tile at this address in a level-n supertile, as an integer 4-vector"""
    L = I(4); t = np.array([0, 0, 0, 0], dtype=object); sh = None
    for k, j in enumerate(letters(loc, n)):
        Lj, tau = TS[j]; t = t + L @ (tau @ V[n-1-k]); L = L @ Lj; sh = cshape(j)
    P = P0 if not (sh == 'G' and loc[2]) else P0 @ rotp(1).T + P0[8]
    return 14*t + L @ P.sum(axis=0)
def step(s, loc, n):
    """position of that tile along the curve of state s at level n"""
    if n == B0: return path(RULE, s, n).index(tile(loc, s[0], n))
    off = 0
    for c, mu, nu in RULE[s]:
        if c == head(loc): return off + step((cshape(c), mu, nu), tail(loc), n-1)
        off += size(cshape(c), n-1)
prev = []
for n in range(6, ML+1):
    d = centre(la, n) - centre(lb, n); x, y = toxy(d); gap = abs(step(s0, la, n) - step(s0, lb, n))
    r = (x*x + y*y)/196/(gap*A0); prev.append(r)
    if n <= 12 or n % 4 == 0: print(f'level {n:2d}: gap {gap:.6e} steps  ratio {r:.8f}', flush=True)
print(f'limit along this family: {prev[-1]:.6f}  (last change {abs(prev[-1]-prev[-2]):.1e})')
