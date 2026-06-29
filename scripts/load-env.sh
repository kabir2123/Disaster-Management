#!/usr/bin/env bash
# Load .env into the current shell: source scripts/load-env.sh
set -a
if [ -f .env ]; then
  # shellcheck disable=SC1091
  source .env
else
  echo "No .env file found. Copy from .env.example if needed."
  return 1 2>/dev/null || exit 1
fi
set +a
echo "Loaded AWS_REGION=$AWS_REGION"
