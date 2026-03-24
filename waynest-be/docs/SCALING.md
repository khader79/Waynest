# Scaling notes

## Socket.IO / chat (horizontal scale)

- A single NestJS instance works with the default in-memory Socket.IO adapter.
- For **multiple Node instances** behind a load balancer, set **`REDIS_URL`** (for example `redis://localhost:6379`). The app enables the **Redis adapter** for Socket.IO in `src/main.ts`, so pub/sub stays consistent across instances.
- Clients must connect with sticky sessions **or** rely on Redis broadcast only; most setups still use **sticky cookies** for the HTTP upgrade path on the same host.

## Database

- Keep **`DB_SYNC=false`** (or unset) in production and apply SQL under `db/migrations/` in order. TypeORM `synchronize` is intended for development only (`src/app.module.ts`).
