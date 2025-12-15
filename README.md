## Orders API

Tiny Orders API demonstrating idempotent create, optimistic locking, keyset pagination, and a transactional outbox.

### Stack
- NestJS + TypeORM (PostgreSQL)
- Redis for idempotency keys (TTL 1h)
- Pulsar publisher stub (real client configured; can be ignored if broker down)
- Jest + Supertest (tests WIP)

### Quick start
```bash
pnpm install
docker-compose up -d
pnpm run migration:run
pnpm run start:dev
```

Swagger is available at `/api`. Base path for APIs is `/api/v1`.

### Tests
Integration tests spin up disposable Postgres + Redis containers via Testcontainers:
```bash
pnpm test:e2e
```

### Environment
| var | default |
| --- | --- |
| DB_HOST | localhost |
| DB_PORT | 5432 |
| DB_USER | orders |
| DB_PASSWORD | orders |
| DB_NAME | orders |
| REDIS_HOST | localhost |
| REDIS_PORT | 6379 |

### cURL happy path
```bash
# create draft (idempotent)
curl -i -X POST http://localhost:3000/api/v1/orders \
  -H 'X-Tenant-Id: demo' \
  -H 'Idempotency-Key: k1'

# confirm with optimistic lock
curl -i -X PATCH http://localhost:3000/api/v1/orders/<id>/confirm \
  -H 'X-Tenant-Id: demo' \
  -H 'If-Match: "1"' \
  -H 'Content-Type: application/json' \
  -d '{"totalCents":1234}'

# close (transactional outbox)
curl -i -X POST http://localhost:3000/api/v1/orders/<id>/close \
  -H 'X-Tenant-Id: demo'

# list with keyset pagination
curl -s 'http://localhost:3000/api/v1/orders?limit=10' -H 'X-Tenant-Id: demo'
```

### Notes
- Tenant scoping is via `X-Tenant-Id` header (simple for the exercise).
- Idempotency keys are stored in Redis with the request body hash and cached response; mismatched body returns 409.
- Redis TTL for idempotency entries defaults to 1h (configurable via `REDIS_PORT`/`REDIS_HOST` vars and `redis.ttlSeconds` Config).
- `If-Match` drives optimistic locking on confirm. Close increments the version and writes a single outbox row transactionally.
- Errors follow `{ error: { code, message, timestamp, path, details } }`.
- Liveness: `/health/liveness`, Readiness: `/health/readiness`.

