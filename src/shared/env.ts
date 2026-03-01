import "dotenv/config";
import { bool, cleanEnv, json, port, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  npm_package_version: str(),
  NODE_ENV: str(),
  PORT: port(),
  LOGGING: bool(),
  LOGGING_LEVEL: str(),

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
   * Cloudflare R2 Storage
   */
  R2_REGION: str(),
  R2_ACCOUNT_ID: str(),
  R2_ACCESS_KEY_ID: str(),
  R2_SECRET_ACCESS_KEY: str(),
  R2_BUCKET_NAME: str(),
  R2_BUCKET_URL: str(),

  /**
   * SES
   */
  AWS_SES_EMAIL_IDENTITY: str(),

  /**
   * SES
   */
  OPS_EMAIL: str(),

  /**
   * Resend
   */
  RESEND_API_KEY: str(),

  /**
   * Marketing
   */
  EMAIL_SECRET: str(),
  MARKETING_UNSUBSCRIBE_SECRET: str(),

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
   * Presign Service
   */
  PRESIGN_SERVICE_URL: str(),
  PRESIGN_SERVICE_API_KEY: str(),

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
   * HEAP_SNAPSHOT_API_KEY
   * If not set, heap snapshot endpoint and scheduler are disabled
   */
  HEAP_SNAPSHOT_API_KEY: str({ default: "" }),

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
   * WORKOS_AUTH_URL
   */
  WORKOS_ORGANIZATION_ID: str(),

  /**
   * WORKOS_WEBHOOK_SECRET
   */
  WORKOS_WEBHOOK_SECRET: str(),

  /**
   * BACKEND_DOMAIN
   */
  BACKEND_DOMAIN: str(),

  /**
   * Google Analytics
   */
  GA_MEASUREMENT_ID: str(),
  GA_API_SECRET: str(),

  /**
   * Designed Playlist UUID
   */
  DESIGNED_PLAYLIST_UUID: str(),

  /**
   * SHEEP Invitation Playlist UUID
   */
  SHEEP_PLAYLIST_UUID: str(),

  /**
   * Routes to log
   */
  LOG_ROUTES: str(),
});

export default env;
