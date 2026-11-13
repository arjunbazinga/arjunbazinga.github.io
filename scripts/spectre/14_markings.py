"""Marked tiles: each tile carries one stroke of the thread, from its entry edge to its exit edge.
Neighbouring spectres usually share two or more edges, so which edge the thread crosses is a free choice at most steps.
This finds a small set of markings (a palette) that suffices for a given curve:
  upper bound by reverse deletion with a feasibility DP along the curve, exact minimum on the 4,401-tile patch by CP-SAT.
The palette for a patch is a lower bound for any larger patch of the same curve.   The exact solver can return a different optimal palette on each run, so the one used by the art page is shipped as
results/markings_min30.json and a fresh run writes results/markings_found.json.   usage: python3 14_markings.py [out.json]"""
import sys, json
from collections import Counter, defaultdict
from core import *
from ortools.sat.python import cp_model
_PORT = {}
def shared(X, n):
    if (X, n) not in _PORT:
        own = defaultdict(list)
        for t, poly in enumerate(NODE[X, n].tiles()):
            ks = [key(p) for p in poly]
            for j in range(14): own[tuple(sorted((ks[j], ks[(j+1) % 14])))].append((t, j))
        d = defaultdict(list)
        for v in own.values():
            if len(v) == 2: (t, j), (u, k) = v; d[t, u].append((j, k)); d[u, t].append((k, j))
        for v in d.values(): v.sort()
        _PORT[X, n] = d
    return _PORT[X, n]
MARKS = [(a, b) for a in range(14) for b in range(a+1, 14)]; MID = {m: i for i, m in enumerate(MARKS)}
def tables(seq, X, n):
    """opts[i] = shared edges at step i; tab[i] = [(choice at step i-1, choice at step i, marking id)] for tile i"""
    d = shared(X, n); opts = [d[seq[i], seq[i+1]] for i in range(len(seq)-1)]; tab = [None]
    for i in range(1, len(seq)-1):
        tab.append([(p, c, MID[tuple(sorted((opts[i-1][p][1], opts[i][c][0])))]) for p in range(len(opts[i-1])) for c in range(len(opts[i]))
                    if opts[i-1][p][1] != opts[i][c][0]])
    return opts, tab
def solve_dp(opts, tab, allowed):
    """a choice of crossing edges using only allowed markings, or None"""
    back = [None]; cur = set(range(len(opts[0])))
    for i in range(1, len(tab)):
        nxt = {}
        for p, c, m in tab[i]:
            if p in cur and allowed[m] and c not in nxt: nxt[c] = p
        if not nxt: return None
        back.append(nxt); cur = set(nxt)
    choice = [0]*len(opts); c = next(iter(cur))
    for i in range(len(tab)-1, 0, -1): choice[i] = c; c = back[i][c]
    choice[0] = c; return choice
def used(tab, choice): return Counter(m for i in range(1, len(tab)) for p, c, m in tab[i] if p == choice[i-1] and c == choice[i])
def reverse_delete(opts, tab, rng, trials):
    best = None
    for _ in range(trials):
        allowed = [False]*len(MARKS)
        for t in tab[1:]:
            for _, _, m in t: allowed[m] = True
        order = [m for m in range(len(MARKS)) if allowed[m]]; rng.shuffle(order)
        for m in order:
            allowed[m] = False
            if solve_dp(opts, tab, allowed) is None: allowed[m] = True
        ch = solve_dp(opts, tab, allowed); k = len(used(tab, ch))
        if best is None or k < best[0]: best = (k, ch)
    return best
rng = random.Random(5); RULE, _ = load_rule('results/rule_min30.json'); s = parse_state('D|(5)|0(5)'); t0 = time.time()
seq = path(RULE, s, 4); opts, tab = tables(seq, 'D', 4)
print(f'{sum(len(o) > 1 for o in opts)} of {len(opts)} steps have a choice of crossing edge (up to {max(map(len, opts))} options)')
k, choice = reverse_delete(opts, tab, rng, 12); print(f'4,401 tiles: reverse deletion finds a palette of {k} markings ({time.time()-t0:.0f}s)', flush=True)
m = cp_model.CpModel(); c = [m.NewIntVar(0, len(o)-1, '') for o in opts]; y = [m.NewBoolVar('') for _ in MARKS]
for i in range(1, len(tab)):
    mv = m.NewIntVar(0, len(MARKS)-1, ''); m.AddAllowedAssignments([c[i-1], c[i], mv], tab[i]); m.AddElement(mv, y, 1)
m.Minimize(sum(y))
for i, v in enumerate(choice): m.AddHint(c[i], v)
sol = cp_model.CpSolver(); sol.parameters.max_time_in_seconds = 240; sol.parameters.num_workers = 8; st = sol.Solve(m)
print(f'4,401 tiles: CP-SAT {sol.StatusName(st)}, palette {sol.ObjectiveValue():.0f}, lower bound {sol.BestObjectiveBound():.0f} ({time.time()-t0:.0f}s)', flush=True)
if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) and sol.ObjectiveValue() < k: choice = [sol.Value(v) for v in c]; k = int(sol.ObjectiveValue())
cnt = used(tab, choice); assert len(cnt) == k
seq5 = path(RULE, s, 5); o5, t5 = tables(seq5, 'D', 5); k5, _ = reverse_delete(o5, t5, rng, 2)
allowed = [mm in cnt for mm in range(len(MARKS))]
print(f'34,649 tiles: reverse deletion finds {k5} markings; the 4,401-tile palette {"also suffices" if solve_dp(o5, t5, allowed) else "is not enough"} there ({time.time()-t0:.0f}s)')
pal = [list(MARKS[mm]) + [n] for mm, n in cnt.most_common()]; idx = {mm: i for i, (mm, n) in enumerate(cnt.most_common())}
mk = [-1] + [next(idx[mm] for p, cc, mm in tab[i] if p == choice[i-1] and cc == choice[i]) for i in range(1, len(tab))] + [-1]
out = sys.argv[1] if len(sys.argv) > 1 else 'results/markings_found.json'
json.dump({'state': fstate(s), 'level': 4, 'note': 'palette = [edge a, edge b, tiles using it]; marks = palette index per tile along the curve (-1 at the two ends); cross = edge of tile i through which the thread leaves for tile i+1',
           'palette': pal, 'marks': mk, 'cross': [opts[i][choice[i]][0] for i in range(len(opts))]}, open(out, 'w'), separators=(',', ':'))
print('written', out, 'with', len(pal), 'markings; shares:', [f'{n/len(seq):.1%}' for _, _, n in pal])
