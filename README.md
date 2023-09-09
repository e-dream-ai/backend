### e-dream.ai backend

## How to run

- `npm ci` - To install all packagees based on the actual package-lock.json
- `npm run dev` - To run on dev mode

## Deployment process

- If you push something to stage branch, this will be deployed to staging environment
- If you create an tag, this one will be deployed to production

### Running it locally

- Run `cp .env.example .env`
- Install Docker
- Run `docker compose -f "docker-compose.yml" up -d --build`

## TypeORM commands

#### Create entity

You can create a new entity using

```
npm run entity:create --name=EntityName
```

#### Create a new migration

You can create a new migration using

```
npm run migration:create --name=MigrationName
```

#### Generate a migration

Automatic migration generation creates a new migration file and writes all sql queries that must be executed to update the database

```
npm run migration:generate --name=MigrationName
```

#### Run migrations

To execute all pending migrations use following command

```
npm run migration:run
```

#### Revert migrations

To revert the most recently executed migration use the following command

```
npm run migration:revert
```

#### Show migrations

To show all migrations and whether they've been run or not use following command

```
npm run migration:show
```
