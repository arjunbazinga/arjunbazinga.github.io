"""Search for a rule with a smaller locality constant, using the all-level bound as the objective.
Moves: replace the production of the state at the worst pair's lowest common supertile (or of a random state) by
another valid production, re-close the rule, keep the change if the constant does not get worse.
usage: python3 11_search.py [seconds=900] [seed=1]"""
import sys
from locbound import *
LIMIT = float(sys.argv[1]) if len(sys.argv) > 1 else 900; SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 1; rng = random.Random(SEED)
T0 = time.time()
LOCS, J, VAL, PERMS = compute(1, 2); sts = states(VAL)
def random_production(s):
    """a uniformly-ish random valid production of state s"""
    X, lin, lout = s; h, hl = head(lin), head(lout); t_in, t_out = tail(lin), tail(lout)
    perms = [p for p in PERMS[X] if p[0] == h and p[-1] == hl]; rng.shuffle(perms)
    for p in perms:
        layers = [{t_in: []}]; ok = True
        for i in range(len(p)-1):
            a, c = p[i], p[i+1]; jj = J.get((X, a, c), {}); nxt = {}; va, vc = VAL[cshape(a)], VAL[cshape(c)]
            for mu in layers[-1]:
                for nu in va.get(mu, ()):
                    for mu2 in jj.get(nu, ()):
                        if mu2 in vc: nxt.setdefault(mu2, []).append((mu, nu))
            if not nxt: ok = False; break
            layers.append(nxt)
        if not ok: continue
        ends = [mu for mu in layers[-1] if t_out in VAL[cshape(p[-1])].get(mu, ())]
        if not ends: continue
        mu = rng.choice(ends); seq = [(p[-1], mu, t_out)]
        for i in range(len(p)-1, 0, -1):
            pm, pn = rng.choice(layers[i][mu]); seq.append((p[i-1], pm, pn)); mu = pm
        return seq[::-1]
    return None
def close(R, start):
    """complete R to a closed rule reachable from start, reusing existing states where possible"""
    out = {}; todo = [start]
    while todo:
        s = todo.pop()
        if s in out: continue
        out[s] = R[s] if s in R else decompose(*s, VAL, J, PERMS, pref=set(R) | set(out), rng=rng)
        for c, mu, nu in out[s]:
            t = (cshape(c), mu, nu)
            if t not in out: todo.append(t)
    return out
BASE, start0 = load_rule('results/rule_min30.json')
lo, up, cul = constant(BASE, 8.9)
print(f'start: 30-state rule, constant in [{lo:.5f}, {up:.5f}]  ({time.time()-T0:.0f}s setup)', flush=True)
best = (up, lo, BASE, start0); cur = (up, lo, BASE, start0, cul); tries = 0; accepted = 0; hist = []
# phase 1: random rules scored by the true constant
pool = []
while time.time()-T0 < LIMIT*0.03:
    s0 = rng.choice(sts); R = extract(s0, VAL, J, PERMS, rng=rng); lo, up, cul = constant(R, 6.0, 1.01); pool.append((up, lo, R, s0, cul))
pool.sort(key=lambda t: t[0])
print(f'phase 1: {len(pool)} random rules; true constants: best {pool[0][0]:.3f}, median {pool[len(pool)//2][0]:.3f}, worst {pool[-1][0]:.3f}', flush=True)
if pool[0][0] < cur[0]: cur = pool[0]; best = cur[:4]
# phase 2: local search
while time.time()-T0 < LIMIT:
    up, lo, R, s0, cul = cur; tries += 1
    target = cul if (cul in R and rng.random() < 0.7) else rng.choice(list(R))
    prod = random_production(target)
    if prod is None or prod == R[target]: continue
    R2 = dict(R); R2[target] = prod
    try: R2 = close(R2, s0)
    except Exception: continue
    res = check(R2, up)                       # fails fast when the candidate is worse than the incumbent
    if res[0] != 'proven': continue
    lo2, up2, cul2 = constant(R2, max(5.0, res[1]*0.999), 1.001)
    if cul2 is None: cul2 = check(R2, lo2*0.9995)[2] if lo2 > 5.7 else None
    cur = (up2, lo2, R2, s0, cul2); accepted += 1
    if up2 < best[0] - 1e-4:
        best = (up2, lo2, R2, s0); print(f'  {time.time()-T0:5.0f}s: constant in [{lo2:.4f}, {up2:.4f}] with {len(R2)} states (try {tries})', flush=True)
print(f'search done: {tries} moves tried, {accepted} accepted')
up, lo, R, s0 = best; lo, up, _ = constant(R, max(5.0, lo*0.9999), 1.00002)
replay(R, (2, 3, 4)); save_rule(R, s0 if s0 in R else top_state(R), 'results/search_seed%s.json' % SEED)
json.dump({'note': 'level-2 base paths used for the locality figures', 'paths': {fstate(s): [int(t) for t in path(R, s, B0)] for s in sorted(R, key=fstate)}}, open('results/search_seed%s_base_paths.json' % SEED, 'w'))
print(f'BEST: {len(R)} states, locality constant in [{lo:.5f}, {up:.5f}]  (30-state rule: 8.97984). written results/search_seed%s.json' % SEED)
