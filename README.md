# <div align="center"><h1>infinidream.ai backend </h1></div>

## Requeriments

- node 22.x.x
- npm 9.x.x
- [heroku-22 stack](https://devcenter.heroku.com/articles/heroku-22-stack) (only for deploys, not need to install locally)
- [heroku buildpack pnpm](https://github.com/unfold/heroku-buildpack-pnpm)

## Related repositories

This is the backend application server. It works with these other parts of the server:

- [frontend](https://github.com/e-dream-ai/frontend) Web UI
- [video](https://github.com/e-dream-ai/video) Video Ingestion with FFMPEG
- [presign-service](https://github.com/e-dream-ai/presign-service) small backend service for presigning URLs
- [cf-image-worker](https://github.com/e-dream-ai/cf-image-worker) edge worker for secure image access

And these client repos:

- [client](https://github.com/e-dream-ai/client) C++ client
- [python-api](https://github.com/e-dream-ai/python-api) API for writing your own clients
- [python-api](https://github.com/e-dream-ai/electric-sheep-engine) a client for managing the Electric Sheep in Infinidream

```
./src
├── clients/        # Clients services
├── constants/      # Constants
├── controllers/    # Route controllers
├── database/       # Database connection
├── entities/       # TypeORM entities
├── middlewares/    # Custom middlewares
├── migrations/     # DB Migrations
├── routes/         # Routes
├── schemas/        # Validation schemas
├── shared/         # Shared code
├── types/          # Types
├── utils/          # Utils
└── index.ts        # Express App
```

## Documentation

Served by swagger on [staging](https://e-dream-76c98b08cc5d.herokuapp.com/api/v1/api-docs).

## Run locally

Install pnpm, follow next [instructions](https://pnpm.io/installation). Using npm

```bash
npm install -g pnpm
```

Copy env file, replace data with correct environment info

```bash
cp .env.example .env
```

Install all packages

```bash
pnpm install
```

Install husky

```bash
pnpm run husky-install
```

Run on dev mode

```bash
pnpm run dev
```

### Test

We have unit tests, lint tests, and integration tests. Run them all:

```bash
cp .env.test .env
pnpm run test
```

Or run subsets

```bash
pnpm run test:ci
pnpm run test:unit
pnpm run test:integration
```

Or run other code checks:

```bash
pnpm run lint
pnpm run typecheck
```

### Run with docker

Copy env file

```bash
cp .env.example .env
```

Install Docker and run docker command

```bash
docker compose -f "docker-compose.yml" up -d --build
```

### Database

Database configurations to connect with a development instance or locally [here](src/database/README.md).
Test any non-trivial migrations on a development instance, before deploying to stage.

## Deployment process

### Stage

- When you merge a change from a branch feat/name or fix/name to stage, or push changes directly to stage a deploy is trigger automatically on heroku.
- As stage and development share database, you don't need to run migrations on this environment.

### Production

- Before push any change to production branch (**main**), you have to run migrations on this environment. Use `npm run migration:run` command using `env.production` file values on `.env` file. This process will be automated configured in the future.
- When you merge a change from a branch feat/name or fix/name to production, or push changes directly to production a deploy is trigger automatically on heroku.

## TypeORM commands

#### Create entity

You can create a new entity using

```bash
entity_name=EntityName pnpm run entity:create
```

#### Create a new migration

You can create a new migration using

```bash
migration_name=MigrationName pnpm run migration:create
```

#### Generate a migration

Automatic migration generation creates a new migration file and writes all sql queries that must be executed to update the database

```bash
migration_name=MigrationName pnpm run migration:generate
```

#### Run migrations

To execute all pending migrations use following command

```bash
pnpm run migration:run
```

#### Revert migrations

To revert the most recently executed migration use the following command

```bash
pnpm run migration:revert
```

#### Show migrations

To show all migrations and whether they've been run or not use following command

```bash
pnpm run migration:show
```

## Socket.io

### Remote control namespace

Logical grouping of sockets to partition the "`remote-control`" communication channel

### User remote control room

Provide a way to organize sockets into groups, allowing you to broadcast messages to multiple clients at once and direct it only for the user sessions. Room name "`USER:id`".

### Auth middleware

Verifies the identity of clients connecting to the server via sockets and adds user data to logic

### Autoscaling

> [!WARNING]  
> Consider this works only for [scaling](https://devcenter.heroku.com/articles/autoscaling), not vertical scale (change dyno type)

In order to enable autoscaling on Heroku, the project needs to handle websocket messages while having multiple NodeJS instances running.

When deploying multiple Socket.IO servers, there are two things to take care of:

- Enabling sticky session
- Using an redis adapter

To achieve this, it is necessary to follow next steps to fix multiple problems that scaling generates.

#### Sticky-sessions

[Using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/#using-nodejs-cluster) with Socket.IO will need to make sure that all requests associated with a particular session ID. Found this problem after scaling to 5 dynos.

> If you plan to distribute the load of connections among different processes or machines, you have to make sure that all requests associated with a particular session ID reach the process that originated them. Without enabling sticky-session, you will experience HTTP 400 errors due to "Session ID unknown"

Heroku provides [Session Affinity](https://devcenter.heroku.com/articles/session-affinity) feature to solve sticky-sessions problem.

Active http-session-affinity on stage:

```sh
heroku features:enable http-session-affinity -a e-dream
```

#### Redis Adapter

The [Redis Adapter](https://socket.io/docs/v4/redis-adapter/) is a server-side component which is responsible for broadcasting events to all or a subset of clients. When scaling to multiple Socket.IO servers, is needed to replace the default in-memory adapter by another implementation, so the events are properly routed to all clients (connected to one of the multiple server instances). Adapter is used on `src/server.ts` file.

> The Redis adapter relies on the Redis Pub/Sub mechanism.
> Every packet that is sent to multiple clients (e.g. io.to("room1").emit() or socket.broadcast.emit()) is:
>
> - sent to all matching clients connected to the current server
> - published in a Redis channel, and received by the other Socket.IO servers of the cluster
>
> ![image](https://socket.io/images/broadcasting-redis-dark.png)

## Authentication

Authentication is handled by [Passport](https://www.npmjs.com/package/passport). It provides various strategies that act as middleware to process and validate authentication requests. This application uses next strategies for authentication.

### BearerStrategy

Authenticates users using JWT issued by Amazon Cognito.

### HeaderAPIKeyStrategy

Authenticates users using an API key provided in the request header.

#### API KEY on env

Performs a search for the api key in the `API_KEYS` environment variable, if it exists, it allows the request to continue, the value of the `API_KEYS` environment variable is defined as follows.

```json
[{ "userId": 1, "apiKey": "API_KEY" }]
```

#### API KEY on db

Performs a search for the api key in the database, if it exists, it allows the request to continue. Definition of [ApiKey](src/entities/ApiKey.entity.ts) entity and its values on the entity file.

## Scripts

TS scripts to execute a process.

### Run a script

To run a TS script, use next command. Script should be located on script `folder`, for example `src/script/my_script.ts`

```bash
script=<SCRIPT_FILE_NAME>.ts pnpm run script
```

#### Process dream script

Takes a range of dates and find all dreams on that range, sends multiple requests to queue jobs to process video file for that dreams.

Update dates range values with desired values in format `YYYY-MM-DD`

```js
const startDate = new Date("2024-05-01");
const endDate = new Date("2024-05-31");
```

Update `PROCESS_VIDEO_SERVER_URL` .env value with the one you are targeting, with url of process video service setting stage or production value.

```bash
PROCESS_VIDEO_SERVER_URL=<URL_TO_PROCESS_VIDEO_SERVER>
```

Run the script

```bash
script=process-dream.ts pnpm run script
```

## Backups with Kopia on Cloudflare R2

This repository includes GitHub Actions workflows to create snapshot backups to Cloudflare R2 using Kopia, list available snapshots, and restore specific files/folders back into R2 (preview or in-place).

### Workflows

- **kopia-r2-incremental-alpha**
- **kopia-r2-incremental-staging**
- **kopia-list-snapshots**
- **kopia-restore**

### Buckets

- **Source buckets (data):**
  - Alpha: `edream-storage-dreams-alpha`
  - Staging: `edream-storage-dreams-staging`
- **Kopia repo buckets (destination for content-addressed repository):**
  - Alpha: `edream-storage-dreams-alpha-backup`
  - Staging: `edream-storage-dreams-staging-backup`

### 1. Incremental backups (automatic/manual)

Workflows: `kopia-r2-incremental-alpha`, `kopia-r2-incremental-staging`

**How to run**

- Automatic: workflows are set with a cron (daily at 06:00 UTC).
- Manual: Actions → select `kopia-r2-incremental-<env>` → Run workflow.

### 2. Listing snapshots

Workflow: `kopia-list-snapshots`

**How to run**

- Actions → `kopia-list-snapshots` → Run workflow → pick env (`alpha`/`staging`).

### 3. Restoring

Workflow: `kopia-restore`

**Inputs**

- **env**: `alpha` or `staging`
- **restore_prefix**: Path inside the snapshot to restore (relative to snapshot root).
  - Examples:
    - Single file at root: `c9ff5735-3119-47d2-899f-1feed193f3ef-_01_10_00033.mp4`
    - Nested: `035a9088-5533-4435-a39f-545253c22970/4e7838fc-7075-483a-8c71-3153d8894efe/…_processed.mp4`
    - Folder: `426ae4da-4bab-433d-ba72-a1806000aa86/`
- **snapshot_id** (optional):
  - Paste a specific snapshot ID to restore from.
  - Leave blank to restore from the latest snapshot by time.
- **restore_mode**: `preview` or `inplace`.

#### Preview vs inplace

- **preview**: Copies restored data to `restores/<UTC-timestamp>/<restore_prefix>/` inside the destination bucket. It lets you inspect the output without touching the original object paths.
- **inplace**: Copies restored data back to the original path given by `restore_prefix` in the destination bucket. This may overwrite existing objects with the same keys and is intended for actual recovery.
