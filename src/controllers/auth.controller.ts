import {
  AWS_COGNITO_APP_CLIENT_ID,
  cognitoIdentityProviderClient,
} from "clients/cognito.client";
import { CognitoIPSExceptions } from "constants/aws/erros.constant";
import { UserAttributes } from "constants/aws/user.constant";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import httpStatus from "http-status";
import {
  MiddlewareUser,
  RefreshTokenCredentials,
  RevokeTokenCredentials,
  UserChangePasswordCredentials,
  UserConfirmForgotPasswordCredentials,
  UserForgotPasswordCredentials,
  UserLoginCredentials,
  UserSignUpCredentials,
  UserVerifyCredentials,
} from "types/auth.types";
import { jsonResponse } from "utils/responses.util";

import {
  ChangePasswordCommand,
  CognitoIdentityProviderServiceException,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  GetUserCommand,
  InitiateAuthCommand,
  RevokeTokenCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import type { Response } from "express";
import type { RequestType, ResponseType } from "types/express.types";

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
    const { email, password } = req.body;

    const command = new SignUpCommand({
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: UserAttributes.EMAIL, Value: email }],
    });

    await cognitoIdentityProviderClient.send(command);
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        message: AUTH_MESSAGES.USER_CREATED,
      }),
    );
  } catch (error) {
    const awsError = error as CognitoIdentityProviderServiceException;

    let message: string;
    switch (awsError.name) {
      case CognitoIPSExceptions.USERNAME_EXISTS_EXCEPTION:
        message = AUTH_MESSAGES.USER_ALREADY_EXISTS;
        break;
      case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_PARAMETERS;
        break;
      case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
        message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
        break;
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles the verify
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
    const awsError = error as CognitoIdentityProviderServiceException;

    let message: string;
    switch (awsError.name) {
      case CognitoIPSExceptions.CODE_MISMATCH_EXCEPTION:
        message = AUTH_MESSAGES.CODE_MISMATCH;
        break;
      case CognitoIPSExceptions.EXPIRED_CODE_EXCEPTION:
        message = AUTH_MESSAGES.EXPIRED_CODE;
        break;
      case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_PARAMETERS;
        break;
      case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
        message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
        break;
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

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

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: AWS_COGNITO_APP_CLIENT_ID,
      AuthParameters: {
        USERNAME: username!,
        PASSWORD: password!,
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
    const awsError = error as CognitoIdentityProviderServiceException;

    let message: string;
    switch (awsError.name) {
      case CognitoIPSExceptions.NOT_AUTHORIZED_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_CREDENTIALS;
        break;
      case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_PARAMETERS;
        break;
      case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
        message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
        break;
      case CognitoIPSExceptions.PASSWORD_RESET_REQUIRED_EXCEPTION:
        message = AUTH_MESSAGES.PASSWORD_RESET_REQUIRED;
        break;
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Fetch user from aws cognito
 *
 * @param {string} access_token - user access token
 *
 * @returns {MiddlewareUser} Returns middleware user
 *
 */
export const fetchAwsUser = async (accessToken: string) => {
  const command = new GetUserCommand({
    AccessToken: accessToken,
  });
  const commandResponse = await cognitoIdentityProviderClient.send(command);
  const email = commandResponse.UserAttributes?.find(
    (userAttribute) => userAttribute.Name === UserAttributes.EMAIL,
  )?.Value;
  return { id: commandResponse.Username, email: email } as MiddlewareUser;
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
    const awsError = error as CognitoIdentityProviderServiceException;

    let message: string;
    switch (awsError.name) {
      case CognitoIPSExceptions.NOT_AUTHORIZED_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_CREDENTIALS;
        break;
      case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_PARAMETERS;
        break;
      case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
        message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
        break;
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles the refresh
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
      AuthFlow: "REFRESH_TOKEN",
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
    const awsError = error as CognitoIdentityProviderServiceException;

    let message: string;
    switch (awsError.name) {
      case CognitoIPSExceptions.NOT_AUTHORIZED_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_CREDENTIALS;
        break;
      case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_PARAMETERS;
        break;
      case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
        message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
        break;
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

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
    const awsError = error as CognitoIdentityProviderServiceException;

    let message: string;
    switch (awsError.name) {
      case CognitoIPSExceptions.NOT_AUTHORIZED_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_CREDENTIALS;
        break;
      case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_PARAMETERS;
        break;
      case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
        message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
        break;
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

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
    const awsError = error as CognitoIdentityProviderServiceException;

    let message: string;
    switch (awsError.name) {
      case CognitoIPSExceptions.NOT_AUTHORIZED_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_CREDENTIALS;
        break;
      case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_PARAMETERS;
        break;
      case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
        message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
        break;
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

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
    const awsError = error as CognitoIdentityProviderServiceException;
    let message: string;
    switch (awsError.name) {
      case CognitoIPSExceptions.EXPIRED_CODE_EXCEPTION:
        message = AUTH_MESSAGES.EXPIRED_CODE;
        break;
      case CognitoIPSExceptions.NOT_AUTHORIZED_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_CREDENTIALS;
        break;
      case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
        message = AUTH_MESSAGES.INVALID_PARAMETERS;
        break;
      case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
        message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
        break;
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};
