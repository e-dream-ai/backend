# AGENT.md — backend

## Overview

Main API server for infinidream.ai. Handles authentication, dream CRUD, job orchestration, real-time updates, and playlist management.

## Stack

- **Runtime:** Node 22.x, TypeScript
- **Framework:** Express
- **Database:** PostgreSQL via TypeORM (entities in `src/entities/`, migrations in `src/migrations/`)
- **Queue:** BullMQ + Redis (via ioredis)
- **Auth:** WorkOS (session cookies + Bearer tokens), Passport.js (API key strategy)
- **Real-time:** Socket.IO with Redis adapter
- **Storage:** AWS S3 + Cloudflare R2 (via @aws-sdk)
- **Monitoring:** Bugsnag
- **Package manager:** pnpm

## Project Structure

```
src/
  controllers/    # Route handlers
  entities/       # TypeORM entity definitions
  migrations/     # Database migrations
  routes/         # Express route definitions
  services/       # Business logic
  socket/         # Socket.IO namespaces & handlers
  middlewares/     # Auth, error handling, etc.
  schemas/        # Request validation schemas
  clients/        # External service clients (R2, Redis, WorkOS, etc.)
  shared/         # Shared types and utilities
  __tests__/      # Test files
```

## Commands

```bash
pnpm run dev                # Dev server with hot reload
pnpm run build              # Compile TypeScript
pnpm run test               # All tests (Jest)
pnpm run test:unit          # Unit tests only
pnpm run test:integration   # Integration tests only
pnpm run lint:fix           # Auto-fix ESLint issues
pnpm run typecheck          # TypeScript type checking
pnpm run migration:show     # List migrations: [X] applied, [ ] pending
pnpm run migration:run      # Apply pending migrations — SEE WARNING BELOW
pnpm run migration:generate # Generate migration from entity changes
pnpm run migration:revert   # Revert last migration
```

## Local Dev Connects to Shared Staging

`.env` here points at the **staging** RDS (`edream-postgres-db-staging...`), not a
local Postgres. Everything you do locally reads and writes the database that other
developers and the deployed stage frontend are using.

**So do not run `migration:run` as a reflex after `git pull`.** This service deploys
to Heroku on push to `stage`, which applies migrations there. A migration file
arriving in your working tree is therefore almost always one that staging _already
has_ — you pulled the source, not a pending change. `TYPEORM_MIGRATIONS_RUN=false`
and `TYPEORM_SYNCHRONIZE=false`, so the dev server won't apply anything on startup
either.

Check before acting: `pnpm run migration:show`. Run `migration:run` only against a
genuine `[ ]`, normally a migration you just generated yourself.

Note that `src/migrations/` is the authority on schema, not `src/entities/` alone:
some indexes are marked `{ synchronize: false }` (e.g. `IDX_USER_EMAIL_LOWER`, a
functional index on `lower(email)`) and exist only because a migration created them.

## Key Patterns

- REST API routes under `src/routes/`
- TypeORM entities define the database schema
- BullMQ queues dispatch GPU jobs to the worker service
- Socket.IO `/remote-control` namespace streams job progress and preview frames
- Swagger docs available via swagger-ui-express

## Deployment

Heroku — push to `stage` or `main` branch.
