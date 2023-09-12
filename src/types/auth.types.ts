export interface UserSignUpCredentials {
  username: string;
  email: string;
  password: string;
}

export type UserLoginCredentials = Omit<UserSignUpCredentials, "username">;
