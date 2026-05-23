#!/usr/bin/env bash
# Bash runner for delete-flow psql scripts.
# Requires environment variables: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
# Usage:
#   PGHOST=host PGUSER=user PGPASSWORD=pw PGDATABASE=db ./run_delete_flow_tests.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SCRIPTS=(
  "provider_cascade.sql"
  "place_cascade.sql"
  "review_set_null.sql"
)

if [ -z "${PGDATABASE:-}" ]; then
  echo "PGDATABASE not set"
  exit 1
fi

for s in "${SCRIPTS[@]}"; do
  if [ ! -f "$s" ]; then
    echo "Skipping missing $s"
    continue
  fi
  echo -e "\n==== Running: $s ===="
  psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-$(whoami)}" -d "$PGDATABASE" -f "$s"
done

echo "All scripts completed."
