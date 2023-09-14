import {
  AWS_COGNITO_APP_CLIENT_ID,
  cognitoIdentityProviderClient,
} from "clients/cognito.client";
import { CognitoIPSExceptions } from "constants/aws/erros.constant";
import { UserAttributes } from "constants/aws/user.constant";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import httpStatus from "http-status";
import {
  UserLoginCredentials,
  UserSignUpCredentials,
  UserVerifyCredentials,
} from "types/auth.types";
import { jsonResponse } from "utils/responses.util";

import {
  CognitoIdentityProviderServiceException,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import type { Request, Response } from "express";
import type { RequestType } from "types/express.types";
/**
 * Handles the signup
 *
 * @param {Request} req - Request object
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
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
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
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
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
      default:
        message = AUTH_MESSAGES.UNEXPECTED_ERROR;
    }

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }
};

/**
 * Handles the logout
 *
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 *
 */
export const handleLogout = async (req: Request, res: Response) => {
  return res
    .status(httpStatus.OK)
    .json(jsonResponse({ success: true, message: "hello" }));
};

/**
 * Handles the refresh
 *
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 *
 */
export const handleRefresh = async (req: Request, res: Response) => {
  return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(req);
};
