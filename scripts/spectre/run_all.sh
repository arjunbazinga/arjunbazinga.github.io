#!/bin/sh
# Reproduces everything. About 15 minutes on a laptop; level 8 in step 06 needs about 2 GB of memory; step 2 uses 8 threads.
set -e
mkdir -p results
python3 01_levels.py 5                        | tee results/01_levels.log
python3 02_find_rule.py results/rule_found.json | tee results/02_find_rule.log
python3 03_verify_rule.py results/rule_min30.json | tee results/03_verify.log
python3 03_verify_rule.py results/rule_found.json | tee -a results/03_verify.log
python3 03_verify_rule.py results/rule_sampled53.json | tee -a results/03_verify.log
python3 04_locality.py results/rule_min30.json 5 | tee results/04_locality.log
python3 render.py results/rule_min30.json results/spectre_curve.png
for r in rule_min30 rule_found rule_sampled53; do python3 independent_check.py results/$r.json; done | tee results/independent_check.log
python3 06_locality_limit.py results/rule_min30.json 8 | tee results/06_locality_limit.log
python3 07_whole_plane.py results/rule_min30.json | tee results/07_whole_plane.log
python3 08_locality_family.py results/rule_min30.json "D|(2)|0(5)" "41(2)" "440(2)" 40 | tee results/08_locality_family.log
python3 09_interior.py 6 6 | tee results/09_interior.log
(python3 10_locality_bound.py results/rule_min30.json 8.979841; python3 10_locality_bound.py results/rule_min30.json 8.97984 | tail -1) | tee results/10_locality_bound.log
python3 13_self_drawing.py | tee results/13_self_drawing.log
python3 14_markings.py | tee results/14_markings.log      # writes results/markings_found.json
python3 15_art_page.py                                   # rebuilds art/spectre-thread.html
python3 16_spectre_tree.py | tee results/16_spectre_tree.log
python3 17_drawing.py | tee results/17_drawing.log
# optional: ./search_parallel.sh 8 3600   (locality search, one process per core)
# optional: python3 05_locality_search.py 300
