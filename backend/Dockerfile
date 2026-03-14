# ── Stage 1: deps ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime ───────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /install /usr/local
COPY . .

EXPOSE 8000

CMD python manage.py collectstatic --noinput && \
    python manage.py migrate --noinput && \
    gunicorn minift.wsgi \
        --bind 0.0.0.0:$PORT \
        --workers 2 \
        --threads 2 \
        --timeout 60 \
        --log-file -
