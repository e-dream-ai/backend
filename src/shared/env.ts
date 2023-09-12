import { bool, cleanEnv, json, port, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  npm_package_version: str(),
  PORT: port(),

  /**
   * TYPEORM
   */
  TYPEORM_CONNECTION: str(),
  TYPEORM_DATABASE: str(),
  TYPEORM_DRIVER_EXTRA: json(),
  TYPEORM_ENTITIES: str(),
  TYPEORM_HOST: str(),
  TYPEORM_LOGGING: bool(),
  TYPEORM_MIGRATIONS: str(),
  TYPEORM_MIGRATIONS_RUN: bool(),
  TYPEORM_PASSWORD: str(),
  TYPEORM_PORT: port(),
  TYPEORM_SYNCHRONIZE: bool(),
  TYPEORM_USERNAME: str(),

  /**
   * FRONTEND
   */
  FRONTEND_URL: url(),
});

export default env;
