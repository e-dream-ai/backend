import { JwtHeader, JwtPayload } from "jsonwebtoken";

export type DecodedToken = {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
};

export type JwtPayloadType = JwtPayload & {
  username: string;
};

export type UserSignUpCredentials = {
  email: string;
  password: string;
  code: string;
};

export type UserVerifyCredentials = {
  username: string;
  code: string;
};

export type UserLoginCredentials = {
  username: string;
  password: string;
};

export type UserChangePasswordCredentials = {
  previousPassword: string;
  proposedPassword: string;
};

export type UserForgotPasswordCredentials = {
  username: string;
};

export type UserConfirmForgotPasswordCredentials = {
  username: string;
  code: string;
  password: string;
};

export type RefreshTokenCredentials = {
  refreshToken: string;
};

export type RevokeTokenCredentials = {
  refreshToken: string;
};

export type MiddlewareUser = {
  id?: string;
  email?: string;
};

export type UserLoginWithCodeCredentials = {
  username: string;
};

export type ConfirmUserLoginWithCodeCredentials = {
  username: string;
  code: string;
  session: string;
};
