#!/usr/bin/env bash
# Runs all tests from the repo root. Needs: python3, playwright + chromium (see test_pages.py).
#   bash tests/run_all.sh            full run before every push (the page tests run in parallel shards, see HEINZ_SHARDS)
#   bash tests/run_all.sh <word>     only tests whose name contains <word> (while working, for example: update, mode, speed)
# HEINZ_SHARDS=<n> sets the number of parallel shards for the page tests (default: number of processor cores, at most 4).
cd "$(dirname "$0")/.."

if [ -n "$1" ]; then
    python3 -m unittest discover -s tests -p "test_*.py" -k "$1"
    exit $?
fi

SHARDS="${HEINZ_SHARDS:-$(nproc 2>/dev/null || echo 2)}"
[ "$SHARDS" -gt 4 ] && SHARDS=4
[ "$SHARDS" -lt 1 ] && SHARDS=1
LOG="$(mktemp -d)"
pids=(); names=()
start() { name="$1"; shift; ( "$@" > "$LOG/$name.log" 2>&1 ) & pids+=($!); names+=("$name"); }

for f in test_server test_capabilities test_rules test_store; do start "$f" python3 "tests/$f.py"; done
for i in $(seq 0 $((SHARDS - 1))); do HEINZ_SHARD="$i/$SHARDS" start "test_pages-$((i + 1))-of-$SHARDS" python3 tests/test_pages.py; done

fail=0
for k in "${!pids[@]}"; do
    if wait "${pids[$k]}"; then
        echo "OK     ${names[$k]}: $(grep -E '^Ran ' "$LOG/${names[$k]}.log" | tail -1)"
    else
        fail=1
        echo "FAILED ${names[$k]}"; grep -E '^(FAIL|ERROR):|Error' "$LOG/${names[$k]}.log" | head -40
    fi
done
[ "$fail" -eq 0 ] && echo "ALL OK (logs: $LOG)" || { echo "SOME TESTS FAILED (logs: $LOG)"; exit 1; }
