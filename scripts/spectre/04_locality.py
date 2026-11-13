"""Worst-case locality of a rule's curve: max over tile pairs of dist^2 / (tile area * steps along the curve).
The Hilbert curve scores 6. Level 6 (~270k tiles) takes a few minutes."""
import sys
from core import *
from scipy.spatial import ConvexHull
RULE, start = load_rule(sys.argv[1]); ML = int(sys.argv[2]) if len(sys.argv) > 2 else 5
print('state', fstate(start))
for n in range(2, ML+1):
    c = centroids(start[0], n).astype(np.float64); h = c[ConvexHull(c).vertices]
    floor = ((h[:, None, :]-h[None, :, :])**2).sum(-1).max()/(A0*(len(c)-1)); t0 = time.time()
    print(f'level {n}: {len(c):7d} tiles  locality {locality(RULE, start, n, chunk=128 if n > 5 else 1024):.2f}   '
          f'(diameter floor for any supertile-contiguous curve {floor:.2f})  {time.time()-t0:.0f}s', flush=True)
