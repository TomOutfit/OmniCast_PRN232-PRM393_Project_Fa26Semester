// ============================================================
// OmniCast - Audit Logger Microservice: README
// ============================================================

# OmniCast Audit Logger (gRPC Microservice)

Standalone gRPC microservice that persists OmniCast's immutable audit trail. The main NestJS HTTP API (in `backend/`) writes via Prisma directly, and can **additionally** forward events to this service over gRPC for retry-safe ingestion — useful in regions with flaky connectivity or for off-loading the audit pipeline behind a queue.

## Architecture

```
┌──────────────┐    gRPC     ┌────────────────────┐    Prisma    ┌────────────┐
│ Main HTTP    │────────────▶│ Audit Logger       │─────────────▶│ Postgres   │
│ API          │  port 50051 │ Microservice       │              │ Supabase   │
│ (NestJS)     │             │ (this repo)        │              │            │
└──────────────┘             └────────────────────┘              └────────────┘
                                      │
                                      │  HTTP /health
                                      ▼
                                 Render probe
```

The HTTP API falls back to in-process Prisma writes if gRPC is unreachable, so deploys of **only** this service will not break audit logging — events degrade gracefully to the original path.

## Local development

```bash
pnpm install
cp .env.example .env
pnpm start:dev   # tsx watch, port 3100 (HTTP /health) + 50051 (gRPC)
```

## Docker

```bash
docker compose up --build
```

## Deploy to Render

Push to a repo with `render.yaml` at the root, or set the root directory in the Render dashboard to `backend/microservices/audit-logger` and pick the **Docker** runtime.

## API

| RPC       | Type               | Purpose                              |
|-----------|--------------------|--------------------------------------|
| `Write`   | Unary              | Persist one audit entry (idempotent) |
| `Stream`  | Server streaming   | Subscribe to live audit tail         |

See `protos/audit_logger.proto` for the full schema.

## Tests

```bash
pnpm test
```
