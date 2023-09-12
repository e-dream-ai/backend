import * as entities from "entities";
import path from "path";
import env from "shared/env";
import { DataSource } from "typeorm";

const appDataSource = new DataSource({
  type: "postgres",
  host: env.TYPEORM_HOST || "localhost",
  port: Number(env.TYPEORM_PORT) || 5432,
  username: env.TYPEORM_USERNAME || "postgres",
  password: env.TYPEORM_PASSWORD || "postgres",
  database: env.TYPEORM_DATABASE || "postgres",
  migrationsTableName: "migrations",
  entities: [...Object.values(entities)],
  migrations: [path.join(__dirname, "..", "migrations/**/*.{ts,js}")],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default appDataSource;
