import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { HeaderAPIKeyStrategy } from "passport-headerapikey";
import { authenticateUser } from "utils/user.util";
import { validateApiKey, validateCognitoJWT } from "utils/auth.util";
import {
  fetchUserByCognitoId,
  fetchUserById,
} from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { JsonWebTokenError } from "jsonwebtoken";
import { getErrorMessage } from "utils/aws/auth-errors";
import { User } from "entities";

export default function configurePassport() {
  passport.use(
    new LocalStrategy(
      { usernameField: "username", passwordField: "password" },
      async (username, password, done) => {
        try {
          const authResult = await authenticateUser({ username, password });
          const user = {
            ...authResult.user,
            token: authResult.token,
          };
          done(null, user);
        } catch (error) {
          done(null, false, { message: AUTH_MESSAGES.INVALID_CREDENTIALS });
        }
      },
    ),
  );

  passport.use(
    new BearerStrategy(async (token, done) => {
      try {
        const jwtPayload = await validateCognitoJWT(token);
        const cognitoId = jwtPayload.username;
        const user = await fetchUserByCognitoId(cognitoId);

        if (user) {
          done(null, user);
        } else {
          done(
            {
              message: AUTH_MESSAGES.INVALID_CREDENTIALS,
            },
            false,
          );
        }
      } catch (error) {
        APP_LOGGER.error(error);
        const jwtError = error as JsonWebTokenError;
        const message: string = getErrorMessage(jwtError.name);
        done({ message: message ?? AUTH_MESSAGES.INVALID_CREDENTIALS }, false);
      }
    }),
  );

  passport.use(
    new HeaderAPIKeyStrategy(
      { header: "Authorization", prefix: "Api-Key " },
      false,
      async (apikey, done) => {
        try {
          const userId = await validateApiKey(apikey);
          let user: User | null = null;

          if (userId) {
            user = await fetchUserById(userId);
          }

          if (user) {
            done(null, user);
          } else {
            done(
              {
                message: AUTH_MESSAGES.INVALID_CREDENTIALS,
                name: "ApiKeyError",
              },
              false,
            );
          }
        } catch (error) {
          APP_LOGGER.error(error);
          const jwtError = error as JsonWebTokenError;
          const message: string = getErrorMessage(jwtError.name);
          done(
            {
              message: message ?? AUTH_MESSAGES.INVALID_CREDENTIALS,
              name: "ApiKeyError",
            },
            false,
          );
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });
}
