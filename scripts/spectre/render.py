"""Figure: the rule's curve at level 3 (drawn) and level 4 (tiles coloured by position)."""
import sys, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
from core import *
RULE, s = load_rule(sys.argv[1]); out = sys.argv[2] if len(sys.argv) > 2 else 'results/spectre_curve.png'
def panel(ax, n, curve, title):
    tiles = NODE[s[0], n].tiles(); seq = path(RULE, s, n); N = len(seq); pos = np.empty(N); pos[seq] = np.arange(N)/(N-1)
    ax.add_collection(PolyCollection([np.array(t) for t in tiles], array=pos, cmap='viridis', edgecolors='white', linewidths=0.5 if curve else 0.08))
    if curve:
        cen = [np.mean(t, axis=0) for t in tiles]; pts = [cen[seq[0]]]
        for a, b in zip(seq, seq[1:]):
            ka = [key(p) for p in tiles[a]]; kb = set(key(p) for p in tiles[b])
            i = [i for i in range(14) if ka[i] in kb and ka[(i+1) % 14] in kb][0]
            pts += [(np.array(tiles[a][i])+np.array(tiles[a][(i+1) % 14]))/2, cen[b]]
        pts = np.array(pts); ax.plot(pts[:, 0], pts[:, 1], color='#1a1a1a', lw=1.1, solid_joinstyle='round')
        ax.plot(*pts[0], 'o', color='#1a1a1a', ms=5); ax.plot(*pts[-1], 's', color='#1a1a1a', ms=5)
    ax.autoscale(); ax.set_aspect('equal'); ax.axis('off'); ax.set_title(title.format(N), fontsize=13, loc='left')
fig, axs = plt.subplots(1, 2, figsize=(20, 10.5))
panel(axs[0], 3, True, '{:,} spectres, one curve from the rule (circle = start, square = end)')
panel(axs[1], 4, False, '{:,} spectres coloured by position along the curve')
fig.tight_layout(); fig.savefig(out, dpi=130, facecolor='white'); print('written', out)
