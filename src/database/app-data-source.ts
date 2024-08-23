import path from "path";
import { DataSource } from "typeorm";
import env from "shared/env";
import { PlaylistItemSubscriber } from "entities";

const subscribers = [PlaylistItemSubscriber];

const appDataSource = new DataSource({
  type: "postgres",
  host: env.TYPEORM_HOST || "localhost",
  port: Number(env.TYPEORM_PORT) || 5432,
  username: env.TYPEORM_USERNAME || "postgres",
  password: env.TYPEORM_PASSWORD || "postgres",
  database: env.TYPEORM_DATABASE || "postgres",
  migrationsTableName: "migrations",
  entities: [path.join(__dirname, "..", "entities/**/*.{ts,js}")],
  migrations: [path.join(__dirname, "..", "migrations/**/*.{ts,js}")],
  migrationsRun: env.TYPEORM_MIGRATIONS_RUN || false,
  logging: env.TYPEORM_LOGGING || false,
  synchronize: env.TYPEORM_SYNCHRONIZE || false,
  ssl: env.TYPEORM_SSL ?? {
    rejectUnauthorized: false,
  },
  subscribers: subscribers,
});

export default appDataSource;
