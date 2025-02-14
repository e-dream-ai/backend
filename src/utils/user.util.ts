import { FindOptionsRelations, FindOptionsSelect, LessThan } from "typeorm";
import {
  AWS_COGNITO_APP_CLIENT_ID,
  cognitoIdentityProviderClient,
} from "clients/cognito.client";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { Invite, User } from "entities";
import type { User as WorkOSUser } from "@workos-inc/node";
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
import { AUTH_MESSAGES } from "constants/messages/auth.constant";

/**
 * Repositories
 */
const userRepository = appDataSource.getRepository(User);
const roleRepository = appDataSource.getRepository(Role);

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

  if (!user || !token) {
    throw new Error(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

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
    uuid: true,
    cognitoId: true,
    workOSId: true,
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
 * Retrieves user identifier for s3 resources handling purposes
 * @param user - database user
 * @returns user identifier
 */
export const getUserIdentifier = (user: User) => {
  return user.cognitoId ?? user.uuid;
};

/**
 * Checks if the given user is an admin.
 * @param user The user object to check.
 * @returns True if the user is an admin, false otherwise.
 */
export const isAdmin = (user?: User): boolean =>
  user?.role?.name === ROLES.ADMIN_GROUP;

/**
 * This function checks if a user with the same email as the provided `workOSUser` already exists in the database.
 * @param workOSUser - WorkOS user object to be synchronized.
 * @param roleSlug - (Optional) Slug of the role to be assigned to the new user.
 * @returns A Promise that resolves to the synchronized user.
 */
export const syncWorkOSUser = async (
  workOSUser: WorkOSUser,
  opts?: {
    invite?: Invite;
  },
) => {
  let user = await userRepository.findOne({
    where: {
      email: workOSUser.email,
    },
    relations: {
      role: true,
      currentPlaylist: { user: true, displayedOwner: true },
      currentDream: {
        user: true,
        displayedOwner: true,
        endKeyframe: true,
        startKeyframe: true,
      },
    },
  });

  /**
   * Get user group role
   */
  const role = await roleRepository.findOneBy({ name: ROLES.USER_GROUP });
  const userRole = opts?.invite?.signupRole || role!;

  // If the user exists and does not have a workOSId, update it
  if (user && !user.workOSId) {
    /**
     * Update user on database and for response
     */
    await userRepository.update(user.id, {
      workOSId: workOSUser.id,
      role: userRole,
      signupInvite: opts?.invite,
      name: workOSUser.firstName,
      lastName: workOSUser.lastName,
    });
    user.workOSId = workOSUser.id;
    return user;
  }

  // If the user exists, return the existing user
  if (user) {
    return user;
  }

  // If the user does not exist, create a new user
  user = new User();
  user.workOSId = workOSUser.id;
  user.email = workOSUser.email;
  user.signupInvite = opts?.invite;
  user.role = userRole;
  user.name = workOSUser.firstName;
  user.lastName = workOSUser.lastName;

  const newUser = await userRepository.save(user);
  return newUser;
};

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

export const setUserLastClientPingAt = async (user: User) => {
  await userRepository.update(user.id, { last_client_ping_at: new Date() });
};

export const resetUserLastClientPingAt = async (user: User) => {
  await userRepository.update(user.id, { last_client_ping_at: null });
};

export const setUserLastLoginAt = async (user: User) => {
  await userRepository.update(user.id, {
    last_login_at: new Date(),
    verified: true,
  });
};
