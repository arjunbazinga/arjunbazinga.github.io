"""How much does the curve bend? Mean turning angle per tile of the centre-to-centre polyline, for the shipped rules
and for randomly sampled closed rules. Hilbert's curve for reference.   usage: python3 18_bending.py [samples=300]"""
import sys, random, glob, time
import core
from core import *
NS = int(sys.argv[1]) if len(sys.argv) > 1 else 300; LV = 4
CEN = {X: np.array([np.mean(p, axis=0) for p in NODE[X, LV].tiles()]) for X in 'GD'}
def bend(RULE, s):
    c = CEN[s[0]][path(RULE, s, LV)]; d = np.diff(c, axis=0); a = np.arctan2(d[:, 1], d[:, 0]); t = np.abs((np.diff(a) + np.pi) % (2*np.pi) - np.pi)
    return np.degrees(t.mean()), float((t**2).mean()), float((t < np.radians(20)).mean()), float(np.hypot(d[:, 0], d[:, 1]).mean())
def hilbert(n):
    def d2xy(n, d):
        x = y = 0; s = 1
        while s < n:
            rx = 1 & (d // 2); ry = 1 & (d ^ rx)
            if ry == 0:
                if rx == 1: x, y = s-1-x, s-1-y
                x, y = y, x
            x += s*rx; y += s*ry; d //= 4; s *= 2
        return x, y
    c = np.array([d2xy(n, i) for i in range(n*n)], float); d = np.diff(c, axis=0); a = np.arctan2(d[:, 1], d[:, 0]); t = np.abs((np.diff(a) + np.pi) % (2*np.pi) - np.pi)
    return np.degrees(t.mean()), float((t**2).mean()), float((t < 0.1).mean())
h = hilbert(64); print(f'Hilbert, 4096 cells: mean turn {h[0]:.1f} deg, mean turn^2 {h[1]:.3f}, straight-through share {h[2]:.2f}')
for f in sorted(glob.glob('results/rule_*.json')):
    R, start = load_rule(f)[:2] if isinstance(load_rule(f), tuple) else (load_rule(f), None)
    s = top_state(R); s = s if s[0] == 'D' else next(t for t in R if t[0] == 'D'); b = bend(R, s)
    print(f'{f:36s} {len(R):4d} states: mean turn {b[0]:.1f} deg, mean turn^2 {b[1]:.3f}, near-straight share {b[2]:.2f}, mean step {b[3]:.2f}', flush=True)
T = time.time(); LOCS, J, VAL, PERMS = compute(1, 1, verbose=False); sts = [s for s in states(VAL) if s[0] == 'D']; rng = random.Random(1); out = []
for i in range(NS):
    s = rng.choice(sts); R = extract(s, VAL, J, PERMS, rng=rng); core._BASE.clear(); out.append((bend(R, s)[0], len(R), fstate(s)))
out.sort(); v = np.array([o[0] for o in out])
print(f'{NS} random closed rules: mean turn min {v.min():.1f}, median {np.median(v):.1f}, max {v.max():.1f} deg'); print('lowest:', out[:3])
