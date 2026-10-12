#!/usr/bin/env bash
# Regenerates outputs/ from the running API (start it first: python app.py).
# Usage: scripts/run_public.sh [input.json ...]   (default: the sample and the minute-150 update)
set -euo pipefail
cd "$(dirname "$0")/.."
API=${API:-http://127.0.0.1:8000/api/roster}
inputs=("$@")
if [ ${#inputs[@]} -eq 0 ]; then
  inputs=("../Problem Statement/sample_input.json")
  [ -f "../Problem Statement/update_150.json" ] && inputs+=("../Problem Statement/update_150.json")
fi
mkdir -p outputs
for f in "${inputs[@]}"; do
  name=$(basename "$f" .json)
  curl -sS -X POST "$API" -H 'content-type: application/json' --data-binary @"$f" \
    | python3 -m json.tool > "outputs/$name.output.json"
  echo "outputs/$name.output.json  $(python3 -c "import json;d=json.load(open('outputs/$name.output.json'));print(d['status'],'value',d.get('total_value'),'fuel',d.get('total_fuel_litres'))")"
done
