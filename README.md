# <div align="center"><h1>e-dream.ai backend </h1></div>

## Requeriments

- node 20.x.x
- npm 9.x.x
- [heroku-22 stack](https://devcenter.heroku.com/articles/heroku-22-stack) (only for deploys, not need to install locally)
- [heroku buildpack pnpm](https://github.com/unfold/heroku-buildpack-pnpm)

## Project structure

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

Database configurations to connect with a snapshot instance or locally [here](src/database/README.md).

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

Provide a way to organize sockets into groups, allowing you to broadcast messages to multiple clients at once and direct it only for the user sessions. Room name "`user-cognito-uuid`".

### Auth middleware

Verifies the identity of clients connecting to the server via sockets and adds user data to logic
