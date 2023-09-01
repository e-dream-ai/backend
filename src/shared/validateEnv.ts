import { cleanEnv, port, str, json, bool, url } from "envalid";

const validateEnv = () => {
  cleanEnv(process.env, {
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
    FRONTEND_URL: url(),
  }
  );
};

export { validateEnv };