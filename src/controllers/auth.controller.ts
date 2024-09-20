import {
  AWS_COGNITO_APP_CLIENT_ID,
  AWS_COGNITO_USER_POOL_ID,
  cognitoIdentityProviderClient,
} from "clients/cognito.client";
import {
  AUTH_CUSTOM_CHALLENGE,
  UserAttributes,
} from "constants/aws/cognito.constant";
import passport from "passport";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import httpStatus from "http-status";
import {
  ConfirmUserLoginWithCodeCredentials,
  MiddlewareUser,
  RefreshTokenCredentials,
  RevokeTokenCredentials,
  UserCallbackV2,
  UserChangePasswordCredentials,
  UserConfirmForgotPasswordCredentials,
  UserForgotPasswordCredentials,
  UserLoginCredentials,
  UserLoginCredentialsV2,
  UserLoginWithCodeCredentials,
  UserMagicLoginCredentialsV2,
  UserSignUpCredentials,
  UserSignUpCredentialsV2,
  UserVerifyCredentials,
} from "types/auth.types";
import {
  handleInternalServerError,
  handleNotFound,
  jsonResponse,
} from "utils/responses.util";
import {
  AuthFlowType,
  ChangePasswordCommand,
  CognitoIdentityProviderServiceException,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  GetUserCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  RevokeTokenCommand,
  SignUpCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { User } from "entities";
import { Role } from "entities/Role.entity";
import type { NextFunction, Response } from "express";
import { APP_LOGGER } from "shared/logger";
import type { RequestType, ResponseType } from "types/express.types";
import { getErrorMessage } from "utils/aws/auth-errors";
import { CognitoIPSExceptions } from "constants/aws/erros.constant";
import { validateAndUseCode } from "utils/invite.util";
import { isFeatureActive } from "utils/feature.util";
import { FEATURES } from "constants/feature.constants";
import {
  authenticateUser,
  setUserLastLoginAt,
  syncWorkOSUser,
} from "utils/user.util";
import { workos, workOSCookieConfig } from "utils/workos.util";
import env from "shared/env";
import {
  RefreshAndSealSessionDataFailureReason,
  OauthException,
  GenericServerException,
} from "@workos-inc/node";

/**
 * Repositories
 */
const roleRepository = appDataSource.getRepository(Role);
const userRepository = appDataSource.getRepository(User);

export const handleLoginWithCode = async (
  req: RequestType<UserLoginWithCodeCredentials>,
  res: Response,
) => {
  try {
    const { username } = req.body;

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.CUSTOM_AUTH,
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      AuthParameters: {
        USERNAME: username!,
        CHALLENGE_NAME: AUTH_CUSTOM_CHALLENGE,
      },
    });

    const commandResponse = await cognitoIdentityProviderClient.send(command);
    const session = commandResponse?.Session;

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { session } }));
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

export const handleConfirmLoginWithCode = async (
  req: RequestType<ConfirmUserLoginWithCodeCredentials>,
  res: Response,
) => {
  try {
    const { username, code, session } = req.body;
    const command = new RespondToAuthChallengeCommand({
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      ChallengeName: AUTH_CUSTOM_CHALLENGE,
      Session: session!,
      ChallengeResponses: {
        ANSWER: code!,
        USERNAME: username!,
      },
    });

    const commandResponse = await cognitoIdentityProviderClient.send(command);
    const accessToken = commandResponse.AuthenticationResult?.AccessToken;
    const user = await fetchCognitoUser(accessToken!);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_LOGGED_IN,
        data: { token: commandResponse.AuthenticationResult, ...user },
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles the signup
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user created
 * BAD_REQUEST 400 - error creating user
 *
 */
export const handleSignUp = async (
  req: RequestType<UserSignUpCredentials>,
  res: Response,
) => {
  try {
    const isSignupCodeActive = await isFeatureActive(FEATURES.SIGNUP_WITH_CODE);
    const { email, password, code } = req.body;

    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: AWS_COGNITO_USER_POOL_ID,
      Username: email,
    });

    try {
      await cognitoIdentityProviderClient.send(getUserCommand);

      // Handle user already exists
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.USER_ALREADY_EXISTS,
        }),
      );
    } catch (error) {
      const awsError = error as CognitoIdentityProviderServiceException;
      if (awsError.name !== CognitoIPSExceptions.USER_NOT_FOUND_EXCEPTION) {
        throw error; // Unexpected error, rethrow
      }
      // User does not exist, continue to sign up
    }

    const invite = await validateAndUseCode(code!);

    if (isSignupCodeActive && !invite) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.INVALID_INVITE,
        }),
      );
    }

    const command = new SignUpCommand({
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: UserAttributes.EMAIL, Value: email }],
    });

    const cognitoResponse = await cognitoIdentityProviderClient.send(command);

    /**
     * get user group role
     */
    const role = await roleRepository.findOneBy({ name: ROLES.USER_GROUP });

    const user = new User();
    user.cognitoId = cognitoResponse.UserSub!;
    user.email = email!;
    user.signupInvite = invite;
    user.role = invite?.signupRole || role!;
    await userRepository.save(user);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_CREATED,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles verify email
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user verified
 * BAD_REQUEST 400 - error verifying user
 *
 */
export const handleVerifyCode = async (
  req: RequestType<UserVerifyCredentials>,
  res: Response,
) => {
  try {
    const { username, code } = req.body;

    const command = new ConfirmSignUpCommand({
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      Username: username,
      ConfirmationCode: code,
    });

    await cognitoIdentityProviderClient.send(command);
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_VERIFIED,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles the login
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user logged in
 * BAD_REQUEST 400 - error logging in user
 *
 */
export const handleLogin = async (
  req: RequestType<UserLoginCredentials>,
  res: Response,
) => {
  try {
    const { username, password } = req.body;

    const { user, token } = await authenticateUser({ username, password });

    if (!user) {
      return handleNotFound(req, res);
    }

    /**
     * save last login date
     */
    await setUserLastLoginAt(user);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_LOGGED_IN,
        data: { ...user, token },
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles the login
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user logged in
 * BAD_REQUEST 400 - error logging in user
 *
 */
export const handlePassportLogin = async (
  req: RequestType<UserLoginCredentials>,
  res: Response,
  next: NextFunction,
) => {
  return passport.authenticate(
    "local",
    (
      err: Error,
      user: Express.User | false | null | undefined,
      // _: object | string | Array<string | undefined> | undefined,
    ) => {
      if (err) {
        return handleInternalServerError(err, req, res);
      }
      if (!user) {
        return handleNotFound(req, res);
      }
      req.logIn(user, (err) => {
        if (err) {
          return handleInternalServerError(err, req, res);
        }
        return res.status(httpStatus.OK).json(
          jsonResponse({
            success: true,
            message: AUTH_MESSAGES.USER_LOGGED_IN,
            data: user,
          }),
        );
      });
    },
  )(req, res, next);
};

/**
 * Fetch user from aws cognito
 *
 * @param {string} access_token - user access token
 *
 * @returns {MiddlewareUser} Returns middleware user
 *
 */
export const fetchCognitoUser = async (accessToken: string) => {
  const command = new GetUserCommand({
    AccessToken: accessToken,
  });
  const commandResponse = await cognitoIdentityProviderClient.send(command);
  const email = commandResponse.UserAttributes?.find(
    (userAttribute) => userAttribute.Name === UserAttributes.EMAIL,
  )?.Value;

  return {
    id: commandResponse.Username,
    email: email,
    username: email,
  } as MiddlewareUser;
};

/**
 * Fetch user by cognito id
 *
 * @param {string} cognitoId - cognitoId
 *
 * @returns {User} Returns user
 *
 */
export const fetchUserByCognitoId = async (cognitoId: string) => {
  const user = await userRepository.findOne({
    where: { cognitoId },
    relations: { role: true, currentPlaylist: true, currentDream: true },
  });
  return user;
};

/**
 * Fetch user by id
 *
 * @param {string} id - user id
 *
 * @returns {User} Returns user
 *
 */
export const fetchUserById = async (id: number) => {
  const user = await userRepository.findOne({
    where: { id },
    relations: { role: true, currentPlaylist: true, currentDream: true },
  });
  return user;
};

/**
 * Handles current user
 *
 * @param {RequestType} req - Request object
 * @param {ResponseType} res - Response object
 *
 * @returns {Response} Returns response with user data
 * OK 200 - user fetched
 * BAD_REQUEST 400 - error fetching user
 *
 */
export const handleUser = async (
  req: RequestType<UserLoginCredentials>,
  res: ResponseType,
) => {
  return res
    .status(httpStatus.OK)
    .json(jsonResponse({ success: true, data: { user: res.locals.user } }));
};

/**
 * Handles the logout
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user logged out
 * BAD_REQUEST 400 - error logging out user
 *
 */
export const handleLogout = async (
  req: RequestType<RevokeTokenCredentials>,
  res: Response,
) => {
  try {
    const { refreshToken } = req.body;

    const command = new RevokeTokenCommand({
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      Token: refreshToken,
    });

    await cognitoIdentityProviderClient.send(command);
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_LOGGED_OUT,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles token refresh
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - token refreshed
 * BAD_REQUEST 400 - error refreshing token
 *
 */
export const handleRefresh = async (
  req: RequestType<RefreshTokenCredentials>,
  res: Response,
) => {
  try {
    const { refreshToken } = req.body;

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.REFRESH_TOKEN,
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken!,
      },
    });

    const commandResponse = await cognitoIdentityProviderClient.send(command);
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_LOGGED_IN,
        data: commandResponse.AuthenticationResult,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles change password
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - password changed
 * BAD_REQUEST 400 - error changing password
 *
 */
export const handleChangePassword = async (
  req: RequestType<UserChangePasswordCredentials>,
  res: ResponseType,
) => {
  const { accessToken } = res.locals;
  const { previousPassword, proposedPassword } = req.body;

  try {
    const command = new ChangePasswordCommand({
      AccessToken: accessToken!,
      PreviousPassword: previousPassword,
      ProposedPassword: proposedPassword,
    });

    await cognitoIdentityProviderClient.send(command);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_PASSWORD_CHANGED,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles forgot password
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - forgot password request
 * BAD_REQUEST 400 - error request forgot password
 *
 */
export const handleForgotPassword = async (
  req: RequestType<UserForgotPasswordCredentials>,
  res: ResponseType,
) => {
  const { username } = req.body;

  try {
    const command = new ForgotPasswordCommand({
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      Username: username,
    });

    await cognitoIdentityProviderClient.send(command);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.FORGOT_PASSWORD_REQUEST,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles confirm forgot password
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - confirm forgot password
 * BAD_REQUEST 400 - error confirming forgot password
 *
 */
export const handleConfirmForgotPassword = async (
  req: RequestType<UserConfirmForgotPasswordCredentials>,
  res: ResponseType,
) => {
  const { username, code, password } = req.body;
  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      Username: username,
      ConfirmationCode: code,
      Password: password,
    });

    await cognitoIdentityProviderClient.send(command);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_PASSWORD_CHANGED,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const awsError = error as CognitoIdentityProviderServiceException;
    const message: string = getErrorMessage(awsError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles callbacks from WorkOS authkit
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 *
 */
export const handleWorkOSCallback = async (
  req: RequestType<unknown, UserCallbackV2>,
  res: ResponseType,
) => {
  const code = req.query.code!;
  try {
    const { user: workOSUser, sealedSession } =
      await workos.userManagement.authenticateWithCode({
        code: code,
        clientId: env.WORKOS_CLIENT_ID,
        session: {
          sealSession: true,
          cookiePassword: env.WORKOS_COOKIE_PASSWORD,
        },
      });

    if (!workOSUser) {
      return handleNotFound(req as RequestType, res);
    }

    res.cookie("wos-session", sealedSession, workOSCookieConfig);

    const user = await syncWorkOSUser(workOSUser);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_LOGGED_IN,
        data: {
          ...user,
          sealedSession,
        },
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const message =
      (error as OauthException)?.errorDescription ??
      (error as GenericServerException)?.message;
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles login with email and password
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user logged in
 * BAD_REQUEST 400 - error logging in user
 *
 */
export const loginWithPassword = async (
  req: RequestType<UserLoginCredentialsV2>,
  res: ResponseType,
) => {
  const email = req.body.email!;
  const password = req.body.password!;
  try {
    const { user: workOSUser, sealedSession } =
      await workos.userManagement.authenticateWithPassword({
        clientId: env.WORKOS_CLIENT_ID,
        email: email,
        password: password,
        session: {
          sealSession: true,
          cookiePassword: env.WORKOS_COOKIE_PASSWORD,
        },
      });

    if (!workOSUser) {
      return handleNotFound(req, res);
    }

    res.cookie("wos-session", sealedSession, workOSCookieConfig);

    const user = await syncWorkOSUser(workOSUser);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_LOGGED_IN,
        data: {
          ...user,
          sealedSession,
        },
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const message =
      (error as OauthException)?.errorDescription ??
      (error as GenericServerException)?.message;

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles login with email and code sent to email.
 * If no code is provided, an email is sent with a new code.
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user logged in
 * BAD_REQUEST 400 - error logging in user
 *
 */
export const loginWithMagicAuth = async (
  req: RequestType<UserMagicLoginCredentialsV2>,
  res: ResponseType,
) => {
  const email = req.body.email!;
  const code = req.body.code;
  try {
    if (code) {
      // Authenticate using the code
      const { user: workOSUser, sealedSession } =
        await workos.userManagement.authenticateWithMagicAuth({
          clientId: env.WORKOS_CLIENT_ID,
          code: code,
          email: email,
          session: {
            sealSession: true,
            cookiePassword: env.WORKOS_COOKIE_PASSWORD,
          },
        });

      if (!workOSUser) {
        return handleNotFound(req, res);
      }

      res.cookie("wos-session", sealedSession, workOSCookieConfig);

      const user = await syncWorkOSUser(workOSUser);

      return res.status(httpStatus.OK).json(
        jsonResponse({
          success: true,
          message: AUTH_MESSAGES.USER_LOGGED_IN,
          data: {
            user,
            sealedSession,
          },
        }),
      );
    } else {
      // request a code to be sent to the email
      await workos.userManagement.createMagicAuth({
        email,
      });

      return res.status(httpStatus.OK).json(
        jsonResponse({
          success: true,
          message: AUTH_MESSAGES.SENT_CODE_TO_EMAIL,
        }),
      );
    }
  } catch (error) {
    APP_LOGGER.error(error);
    const message =
      (error as OauthException)?.errorDescription ??
      (error as GenericServerException)?.message;

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles logout
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user logged out
 * BAD_REQUEST 400 - error logging out user
 *
 */
export const logout = async (req: RequestType, res: ResponseType) => {
  const authHeader = req.headers.authorization?.split("Wos-Api-Key ")[1];
  const authToken = authHeader || req.cookies["wos-session"];
  res.clearCookie("wos-session", workOSCookieConfig);

  try {
    if (authToken) {
      const logoutUrl =
        await workos.userManagement.getLogoutUrlFromSessionCookie({
          sessionData: authToken,
          cookiePassword: env.WORKOS_COOKIE_PASSWORD,
        });

      await fetch(logoutUrl);

      return res.status(httpStatus.OK).json(
        jsonResponse({
          success: true,
          message: AUTH_MESSAGES.USER_LOGGED_OUT,
        }),
      );
    } else {
      return res.status(httpStatus.OK).json(
        jsonResponse({
          success: true,
          message: AUTH_MESSAGES.USER_LOGGED_OUT,
        }),
      );
    }
  } catch (error) {
    APP_LOGGER.error(error);
    const message =
      (error as OauthException)?.errorDescription ??
      (error as GenericServerException)?.message;

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles token refresh
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - token was successfully refreshed
 * BAD_REQUEST 400 - error refreshing token
 *
 */
export const refreshWorkOS = async (req: RequestType, res: ResponseType) => {
  const authHeader = req.headers.authorization?.split("Wos-Api-Key ")[1];
  const authToken = authHeader || req.cookies["wos-session"];

  try {
    const refreshAndSealResponse =
      await workos.userManagement.refreshAndSealSessionData({
        sessionData: authToken,
        cookiePassword: env.WORKOS_COOKIE_PASSWORD,
      });

    const authenticated = refreshAndSealResponse.authenticated;

    if (authenticated && refreshAndSealResponse?.sealedSession) {
      const { sealedSession } = refreshAndSealResponse;

      // Set the sealed session in a cookie
      res.cookie("wos-session", sealedSession, workOSCookieConfig);

      return res.status(httpStatus.OK).json(
        jsonResponse({
          success: true,
          message: AUTH_MESSAGES.USER_LOGGED_IN,
          data: {
            sealedSession,
          },
        }),
      );
    } else if (!authenticated && refreshAndSealResponse?.reason) {
      const reason = refreshAndSealResponse?.reason ?? "";

      let message = AUTH_MESSAGES.EXPIRED_TOKEN;
      if (
        message ===
        RefreshAndSealSessionDataFailureReason.NO_SESSION_COOKIE_PROVIDED
      ) {
        message = AUTH_MESSAGES.INVALID_TOKEN;
      }

      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: reason,
        }),
      );
    }

    return res.status(httpStatus.BAD_REQUEST).json(
      jsonResponse({
        success: false,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const message =
      (error as OauthException)?.errorDescription ??
      (error as GenericServerException)?.message;

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles the signup
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user created
 * BAD_REQUEST 400 - error creating user
 *
 */
export const handleSignUpV2 = async (
  req: RequestType<UserSignUpCredentialsV2>,
  res: ResponseType,
) => {
  try {
    const { email, password, firstname, lastname, code } = req.body;
    const invite = await validateAndUseCode(code!);

    const isSignupCodeActive = await isFeatureActive(FEATURES.SIGNUP_WITH_CODE);

    if (isSignupCodeActive && !invite) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.INVALID_INVITE,
        }),
      );
    }

    const users = await workos.userManagement.listUsers({
      email,
    });

    if (users.data.length > 0) {
      // Handle user already exists
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.USER_ALREADY_EXISTS,
        }),
      );
    }

    // create workos user
    const workOSUser = await workos.userManagement.createUser({
      email: email!,
      password: password!,
      firstName: firstname!,
      lastName: lastname!,
    });

    /**
     * get user group role
     */
    const role = await roleRepository.findOneBy({ name: ROLES.USER_GROUP });

    const userRole = invite?.signupRole || role!;

    // send invitation email to bind user to org with a role
    await workos.userManagement.sendInvitation({
      email: email!,
      organizationId: env.WORKOS_ORGANIZATION_ID,
      roleSlug: userRole.name,
    });

    const user = new User();
    user.workOSId = workOSUser.id;
    user.email = email!;
    user.signupInvite = invite;
    user.role = userRole;
    user.name = firstname;
    user.lastName = lastname;
    await userRepository.save(user);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_CREATED,
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    const message =
      (error as OauthException)?.errorDescription ??
      (error as GenericServerException)?.message;

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};
