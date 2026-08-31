#!/bin/sh
set -e

echo "Applying database migrations..."
node_modules/.bin/prisma migrate deploy

if [ "$RUN_SEED_ON_START" = "true" ]; then
  echo "Seeding database (RUN_SEED_ON_START=true)..."
  node_modules/.bin/tsx prisma/seed.ts
fi

exec "$@"
