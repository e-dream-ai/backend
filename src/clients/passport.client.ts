import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { authenticateUser } from "utils/user.util";

export default function configurePassport() {
  passport.use(
    new LocalStrategy(
      { usernameField: "username", passwordField: "password" },
      async (username, password, done) => {
        try {
          const authResult = await authenticateUser({ username, password });
          const user = {
            username: username,
            tokens: authResult,
          };
          done(null, user);
        } catch (error) {
          done(null, false, { message: error.message });
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
