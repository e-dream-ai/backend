import "dotenv/config";
import { bool, cleanEnv, json, port, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  npm_package_version: str(),
  NODE_ENV: str(),
  PORT: port(),

  /**
   * AWS
   */
  AWS_REGION: str(),
  AWS_ACCESS_KEY_ID: str(),
  AWS_SECRET_ACCESS_KEY: str(),

  /**
   * Cognito
   */
  AWS_COGNITO_USER_POOL_ID: str(),
  AWS_COGNITO_APP_CLIENT_ID: str(),

  /**
   * S3
   */
  AWS_BUCKET_NAME: str(),
  AWS_BUCKET_URL: str(),

  /**
   * Currently unused
   * SQS
   */
  // AWS_SQS_URL: str(),

  /**
   * PROCESS VIDEO SERVER
   */
  PROCESS_VIDEO_SERVER_URL: str(),

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
