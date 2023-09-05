require("dotenv/config");
import { DataSource } from "typeorm";

const appDataSource = new DataSource({
  type: "postgres",
  host: process.env.TYPEORM_HOST || "localhost",
  port: Number(process.env.TYPEORM_PORT) || 5432,
  username: process.env.TYPEORM_USERNAME || "postgres",
  password: process.env.TYPEORM_PASSWORD || "postgres",
  database: process.env.TYPEORM_DATABASE || "postgres",
  migrationsTableName: "migrations",
  entities: ["src/entity/**/*.{ts,js}"],
  migrations: ["src/migrations/**/*.{ts,js}"],
  ssl: {
    rejectUnauthorized: false,
  },
});

export default appDataSource;
