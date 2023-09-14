import { JwtHeader, JwtPayload } from "jsonwebtoken";

export type DecodedToken = {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
};
export interface UserSignUpCredentials {
  username: string;
  email: string;
  password: string;
}

export interface UserVerifyCredentials {
  username: string;
  code: string;
}

export type UserLoginCredentials = Omit<UserSignUpCredentials, "email">;
