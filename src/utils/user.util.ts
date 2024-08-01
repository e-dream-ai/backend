import { FindOptionsRelations, FindOptionsSelect, LessThan } from "typeorm";
import {
  AWS_COGNITO_APP_CLIENT_ID,
  cognitoIdentityProviderClient,
} from "clients/cognito.client";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { User } from "entities";
import { Role } from "entities/Role.entity";
import {
  DAILY_USER_DEFAULT_QUOTA,
  MIN_USER_QUOTA,
} from "constants/user.constants";
import {
  AuthFlowType,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { fetchCognitoUser } from "controllers/auth.controller";

/**
 * Repositories
 */
const userRepository = appDataSource.getRepository(User);

export const authenticateUser = async ({
  username,
  password,
}: {
  username?: string;
  password?: string;
}) => {
  const command = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: AWS_COGNITO_APP_CLIENT_ID,
    AuthParameters: {
      USERNAME: username!,
      PASSWORD: password!,
    },
  });

  const commandResponse = await cognitoIdentityProviderClient.send(command);
  const accessToken = commandResponse.AuthenticationResult?.AccessToken;
  const cognitoUser = await fetchCognitoUser(accessToken!);

  const user = await userRepository.findOne({
    where: { cognitoId: cognitoUser.id },
    relations: { role: true },
  });

  const token = commandResponse.AuthenticationResult;

  return { user, token };
};

export const getRoleSelectedColumns = (): FindOptionsSelect<Role> => {
  return {
    id: true,
    name: true,
    created_at: true,
    updated_at: true,
  };
};

export const getUserSelectedColumns = ({
  userEmail,
}: {
  userEmail?: boolean;
} = {}): FindOptionsSelect<User> => {
  return {
    id: true,
    cognitoId: true,
    name: true,
    description: true,
    avatar: true,
    nsfw: true,
    enableMarketingEmails: true,
    quota: true,
    last_login_at: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    email: userEmail,
  };
};

export const getUserFindOptionsRelations = (): FindOptionsRelations<User> => {
  return {
    role: true,
    currentDream: true,
    currentPlaylist: true,
    signupInvite: true,
  };
};

/**
 * Checks if the given user is an admin.
 * @param user The user object to check.
 * @returns True if the user is an admin, false otherwise.
 */
export const isAdmin = (user?: User): boolean =>
  user?.role?.name === ROLES.ADMIN_GROUP;

/**
 * Updates default user daily quota if is below it
 * @returns void
 */
export const setDailyUsersQuota = async () => {
  const users = await userRepository.find({
    where: { quota: LessThan(DAILY_USER_DEFAULT_QUOTA) },
  });

  for (const user of users) {
    await userRepository.update(user.id, { quota: DAILY_USER_DEFAULT_QUOTA });
  }
};

/**
 * Reduces the quota of a user by a given amount
 * @param user user whose quota is to be reduced
 * @param quotaToReduce amount by which to reduce the user's quota
 * @returns void
 */

export const reduceUserQuota = async (user: User, quotaToReduce: number) => {
  // ensures that the user's quota can't be negative
  const newQuota = Math.max(
    MIN_USER_QUOTA,
    (user.quota ?? MIN_USER_QUOTA) - quotaToReduce,
  );

  await userRepository.update(user.id, { quota: newQuota });
};
