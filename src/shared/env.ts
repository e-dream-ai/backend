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
   * SES
   */
  AWS_SES_EMAIL_IDENTITY: str(),

  /**
   * Heroku
   */
  HEROKU_API_URL: str(),
  VIDEO_SERVICE_APP_ID_OR_NAME: str(),

  /**
   * REDIS
   */
  // REDISCLOUD_URL is set by heroku automatically
  REDISCLOUD_URL: str(),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_PASSWORD: str(),

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
  TYPEORM_SSL: json(),

  /**
   * FRONTEND
   */
  FRONTEND_URL: url(),

  /**
   * API_KEYS
   */
  API_KEYS: json(),

  /**
   * VIDEO_INGESTION_API_KEY
   */
  VIDEO_INGESTION_API_KEY: str(),

  /**
   * SESSION_SECRET
   */
  SESSION_SECRET: str(),

  /**
   * CIPHER_KEY
   */
  CIPHER_KEY: str(),

  /**
   * HEROKU_APIKEY
   */
  HEROKU_APIKEY: str(),

  /**
   * WORKOS_CLIENT_ID
   */
  WORKOS_CLIENT_ID: str(),

  /**
   * WORKOS_API_KEY
   */
  WORKOS_API_KEY: str(),

  /**
   * WORKOS_CALLBACK_URL
   */
  WORKOS_CALLBACK_URL: str(),

  /**
   * WORKOS_COOKIE_PASSWORD
   */
  WORKOS_COOKIE_PASSWORD: str(),

  /**
   * WORKOS_AUTH_URL
   */
  WORKOS_AUTH_URL: str(),

  /**
   * BACKEND_DOMAIN
   */
  BACKEND_DOMAIN: str(),
});

export default env;
