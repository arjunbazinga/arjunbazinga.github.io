#!/bin/sh
# Run the locality search on several cores at once, then rank and verify what they found.
# usage: ./search_parallel.sh [number of seeds = 8] [seconds per seed = 3600] [first seed = 101]
N=${1:-8}; SECS=${2:-3600}; FIRST=${3:-101}
mkdir -p results
i=0
while [ $i -lt $N ]; do
  seed=$((FIRST + i))
  python3 11_search.py $SECS $seed > results/search_seed$seed.log 2>&1 &
  i=$((i + 1))
done
echo "started $N searches of $SECS s each (seeds $FIRST..$((FIRST + N - 1))); progress: tail -f results/search_seed*.log"
wait
python3 12_pick_best.py
