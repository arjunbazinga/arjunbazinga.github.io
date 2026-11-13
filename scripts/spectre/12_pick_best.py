"""Rank the rules found by 11_search.py by their locality constant, then verify the best with both checkers."""
import glob, subprocess, sys, shutil
from locbound import *
rows = []
for f in sorted(glob.glob('results/search_seed*.json')):
    if f.endswith('_base_paths.json'): continue
    R, s = load_rule(f); lo, up, _ = constant(R, 8.0, 1.00002); rows.append((up, lo, len(R), f))
rows.sort()
print('locality constant (lower, upper)   states   file')
for up, lo, n, f in rows: print(f'  [{lo:.5f}, {up:.5f}]   {n:4d}   {f}')
print('  [8.97984, 8.97984]     30   results/rule_min30.json  (reference)')
if rows:
    best = rows[0][3]; shutil.copy(best, 'results/rule_best_locality.json'); bp = best.replace('.json', '_base_paths.json')
    try: shutil.copy(bp, 'results/base_paths_best_locality.json')
    except OSError: pass
    print(f'\nbest: {best} -> results/rule_best_locality.json; verifying with both checkers')
    for cmd in (['03_verify_rule.py'], ['independent_check.py']):
        out = subprocess.run([sys.executable] + cmd + ['results/rule_best_locality.json'], capture_output=True, text=True).stdout.strip().splitlines()
        print('  ' + (out[-1] if out else 'no output'))
