#!/usr/bin/env bash
set -euo pipefail

# Check for service account JSON in multiple locations
if [ -f "service_account.json" ]; then
  echo "Using local service_account.json"
  export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service_account.json"
elif [ -n "${SERVICE_ACCOUNT_JSON:-}" ]; then
  echo "Writing service account JSON to /tmp/service_account.json"
  printf "%s" "$SERVICE_ACCOUNT_JSON" > /tmp/service_account.json
  chmod 600 /tmp/service_account.json
  export GOOGLE_APPLICATION_CREDENTIALS=/tmp/service_account.json
fi

# Export FCM_PROJECT_ID if provided via env
if [ -n "${FCM_PROJECT_ID:-}" ]; then
  echo "Using FCM_PROJECT_ID=${FCM_PROJECT_ID}"
fi

echo "Starting backend..."
exec python3 start.py
