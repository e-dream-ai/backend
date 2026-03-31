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
pnpm run migration:run      # Run pending migrations
pnpm run migration:generate # Generate migration from entity changes
pnpm run migration:revert   # Revert last migration
```

## Key Patterns

- REST API routes under `src/routes/`
- TypeORM entities define the database schema
- BullMQ queues dispatch GPU jobs to the worker service
- Socket.IO `/remote-control` namespace streams job progress and preview frames
- Swagger docs available via swagger-ui-express

## Deployment

Heroku — push to `stage` or `main` branch.
