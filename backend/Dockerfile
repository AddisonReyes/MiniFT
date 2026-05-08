## syntax=docker/dockerfile:1.7

FROM rust:1.89-bookworm AS chef

WORKDIR /app
RUN cargo install cargo-chef --locked

FROM chef AS planner

COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder

COPY --from=planner /app/recipe.json recipe.json

RUN cargo chef cook --locked --release --recipe-path recipe.json

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --locked --release --bin minift-backend \
    && cp /app/target/release/minift-backend /app/minift-backend

FROM debian:bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/minift-backend /app/minift-backend
COPY --from=builder /app/migrations ./migrations

ENV ROCKET_ADDRESS=0.0.0.0
ENV ROCKET_PORT=8000
ENV DATABASE_URL=""
ENV JWT_SECRET=""
ENV CORS_ALLOWED_ORIGINS="[\"*\"]"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -q --spider http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/minift-backend"]
