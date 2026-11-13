"""Optional: sample many closed rules and rank them by locality at level 4, then level 5.
Result in the session that produced this package: level-4/5 gains did not survive at level 6."""
import sys
from core import *
LIMIT = float(sys.argv[1]) if len(sys.argv) > 1 else 300; T0 = time.time(); pool = []; rng = random.Random(11)
for fam, frac in [((1, 2), .5), ((1, 1), 1)]:
    LOCS, J, VAL, PERMS = compute(*fam); sts = states(VAL); k = 0
    while time.time()-T0 < LIMIT*frac:
        R = extract(rng.choice(sts), VAL, J, PERMS, rng=rng); s = top_state(R); k += 1; pool.append((locality(R, s, 4), len(R), fam, R, s))
    print(f'family {fam}: sampled {k} rules; best level-4 constant so far {min(p[0] for p in pool):.2f}', flush=True)
pool.sort(key=lambda t: t[0]); print('median level-4 constant', f'{pool[len(pool)//2][0]:.2f}')
best = None
for w4, sz, fam, R, s in pool[:6]:
    w5 = locality(R, s, 5); print(f'  {sz} states {fam}: level 4 {w4:.2f}, level 5 {w5:.2f}', flush=True)
    if best is None or w5 < best[0]: best = (w5, R, s)
replay(best[1], (2, 3, 4)); save_rule(best[1], best[2], 'results/rule_locality_search.json'); print('written results/rule_locality_search.json')
