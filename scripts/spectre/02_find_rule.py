"""Search for a self-reproducing rule and minimise it.
1. exact integer geometry cross-check; 2. which location families admit a closed rule;
3. provably smallest closed rule in the family prefix<=1, period<=1 (CP-SAT)."""
import sys
from core import *
from fractions import Fraction
from ortools.sat.python import cp_model
t0 = time.time(); check_exact([0, 1, 2, 3, 4])
print(f'exact integer tiles agree with the float construction; adjacency identical at levels 0-4 ({time.time()-t0:.0f}s)')
def rank(rows):
    rows = [[Fraction(int(x)) for x in r] for r in rows]; rk = 0
    for c in range(len(rows[0])):
        p = next((i for i in range(rk, len(rows)) if rows[i][c] != 0), None)
        if p is None: continue
        rows[rk], rows[p] = rows[p], rows[rk]
        for i in range(len(rows)):
            if i != rk and rows[i][c] != 0:
                f = rows[i][c]/rows[rk][c]; rows[i] = [x - f*y for x, y in zip(rows[i], rows[rk])]
        rk += 1
    return rk
print('dimension of the quad-vector orbit (<= 16 levels suffice to identify a configuration):', rank([V[k] for k in range(B0, B0+16)]))
for fam in [(0, 1), (0, 2), (1, 2)]: compute(*fam)
LOCS, J, VAL, PERMS = compute(1, 1); sts = states(VAL); rng = random.Random(7)
greedy = min((extract(s, VAL, J, PERMS, rng=rng) for s in rng.sample(sts, min(300, len(sts)))), key=len)
print('greedy rule:', len(greedy), 'states', flush=True)
m = cp_model.CpModel(); x = {s: m.NewBoolVar('') for s in sts}
for s in sts:
    X, lin, lout = s; h, hl = head(lin), head(lout); t_in, t_out = tail(lin), tail(lout); zs = []
    for p in PERMS[X]:
        if p[0] != h or p[-1] != hl: continue
        k = len(p); lay = []
        for i in range(k):
            va = VAL[cshape(p[i])]
            ents = [t_in] if i == 0 else sorted({mu2 for (mu, nu) in lay[-1] for mu2 in J.get((X, p[i-1], p[i]), {}).get(nu, ()) if mu2 in va}, key=str)
            lay.append([(mu, nu) for mu in ents for nu in sorted(va.get(mu, ()), key=str) if i < k-1 or nu == t_out])
        ok = [set(lay[-1])]
        for i in range(k-2, -1, -1):
            jj = J.get((X, p[i], p[i+1]), {}); nxt = {mu for mu, _ in ok[0]}
            ok.insert(0, {(mu, nu) for (mu, nu) in lay[i] if jj.get(nu, set()) & nxt})
        if not all(ok): continue
        z = m.NewBoolVar(''); zs.append(z); y = [{t: m.NewBoolVar('') for t in sorted(o, key=str)} for o in ok]
        m.AddBoolOr(list(y[0].values())).OnlyEnforceIf(z)
        for i in range(k):
            jj = J.get((X, p[i], p[i+1]), {}) if i < k-1 else None
            for (mu, nu), v in y[i].items():
                m.AddImplication(v, x[(cshape(p[i]), mu, nu)])
                if i < k-1: m.AddBoolOr([w for (mu2, _), w in y[i+1].items() if mu2 in jj.get(nu, ())]).OnlyEnforceIf(v)
    m.AddBoolOr(zs).OnlyEnforceIf(x[s])
m.AddBoolOr(list(x.values())); m.Minimize(sum(x.values()))
for s in sts: m.AddHint(x[s], int(s in greedy))
sol = cp_model.CpSolver(); sol.parameters.max_time_in_seconds = 600; sol.parameters.num_workers = 8; sol.parameters.random_seed = 1
st = sol.Solve(m); chosen = [s for s in sts if sol.Value(x[s])]
VR = gfp(restrict(chosen), J, PERMS); R = {s: decompose(*s, VR, J, PERMS) for s in states(VR)}
print(f'smallest closed rule: {sol.StatusName(st)}, {len(R)} states (solver objective {sol.ObjectiveValue():.0f}, '
      f'lower bound {sol.BestObjectiveBound():.0f})', {X: sum(1 for s in R if s[0] == X) for X in 'GD'}, flush=True)
out = sys.argv[1] if len(sys.argv) > 1 else 'results/rule_found.json'
save_rule(R, top_state(R), out); print('written', out)
