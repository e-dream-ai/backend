/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataSource } from "typeorm";
import { APP_LOGGER } from "../shared/logger";

export class PostgresService {
  protected conn: any;

  get connection(): any {
    return this.conn;
  }

  async connect(): Promise<void> {
    this.conn = new DataSource({
      type: "postgres",
      host: process.env.TYPEORM_HOST || "localhost",
      port: Number(process.env.TYPEORM_PORT) || 5432,
      username: process.env.TYPEORM_USERNAME || "postgres",
      password: process.env.TYPEORM_PASSWORD || "postgres",
      database: process.env.TYPEORM_DATABASE || "postgres",
      entities: [__dirname + `${process.env.TYPEORM_ENTITIES}`],
    });

    this.conn.initialize().then(() => {
      console.log("Connected with postgres");
    })
      .catch((err: any) => {
        console.error("Error during postgres connection", err);
      });
  }

  async disconnect(): Promise<void> {
    if (this.conn.isInitialized) {
      this.conn.destroy();
      APP_LOGGER.info("Postgres disconnected");
    }
  }
}
