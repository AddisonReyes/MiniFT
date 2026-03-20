#!/bin/sh
set -eu

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings}"
export PORT="${PORT:-8000}"

python - <<'PY'
import os
import sys
import time

dsn = os.environ.get("DATABASE_URL")
if not dsn or not dsn.startswith(("postgres://", "postgresql://")):
    sys.exit(0)

try:
    import psycopg2  # type: ignore
except Exception:
    sys.exit(0)

for _ in range(45):
    try:
        conn = psycopg2.connect(dsn)
        conn.close()
        sys.exit(0)
    except Exception:
        time.sleep(1)

print("Database not ready after waiting", file=sys.stderr)
sys.exit(1)
PY

python minift/manage.py migrate --noinput
python minift/manage.py collectstatic --noinput

exec gunicorn config.wsgi:application \
  --chdir minift \
  --bind 0.0.0.0:"$PORT" \
  --workers "${GUNICORN_WORKERS:-2}" \
  --threads "${GUNICORN_THREADS:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-60}"
