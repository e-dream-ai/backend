# <div align="center"><h1>e-dream.ai backend </h1></div>

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

## Run locally

Install all packagees based on the actual

```bash
npm ci
```

Run on dev mode

```bash
npm run dev
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

## Deployment process

- If you push something to stage branch, this will be deployed to staging environment
- If you create an tag, this one will be deployed to production

## TypeORM commands

#### Create entity

You can create a new entity using

```bash
npm run entity:create --name=EntityName
```

#### Create a new migration

You can create a new migration using

```bash
npm run migration:create --name=MigrationName
```

#### Generate a migration

Automatic migration generation creates a new migration file and writes all sql queries that must be executed to update the database

```bash
npm run migration:generate --name=MigrationName
```

#### Run migrations

To execute all pending migrations use following command

```bash
npm run migration:run
```

#### Revert migrations

To revert the most recently executed migration use the following command

```bash
npm run migration:revert
```

#### Show migrations

To show all migrations and whether they've been run or not use following command

```bash
npm run migration:show
```
