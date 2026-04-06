#!/usr/bin/env bash
# Run TypeORM migrations using npm script
set -euo pipefail
echo "Running TypeORM migrations..."
npm run migration:run
