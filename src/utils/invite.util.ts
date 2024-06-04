import appDataSource from "database/app-data-source";
import { Invite } from "entities";
import { Role } from "entities/Role.entity";
import { EntityManager, FindOptionsSelect } from "typeorm";
import { sendEmail } from "./ses.util";
import { ROLES } from "constants/role.constants";

/**
 * Repositories
 */
const inviteRepository = appDataSource.getRepository(Invite);

/**
 * generates a random alphanumeric code
 * @param length
 * @returns generated code
 */
export const generateRandomCode = (codeLength: number = 4): string => {
  // only use this characters to create code
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  return Array.from({ length: codeLength }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length)),
  ).join("");
};

/**
 * generates a invite
 * @param size
 * @returns generated invite
 */
export const generateInvite = async ({
  signupRole,
  size = 1,
  /**
   * default code lenght
   */
  codeLength = 4,
}: {
  signupRole: Role;
  size?: number;
  codeLength?: number;
}): Promise<Invite> => {
  const invite = new Invite();
  let code: string,
    codeExists = false;

  while (!codeExists) {
    code = generateRandomCode(codeLength);
    const foundInvite = await inviteRepository.findOne({ where: { code } });
    if (!foundInvite) {
      codeExists = true;
    }
  }
  invite.signupRole = signupRole;
  invite.code = code!;
  invite.size = size;
  const createdInvite = await inviteRepository.save(invite);

  return createdInvite;
};

/**
 * generates a invite
 * @param code
 * @param size
 * @returns generated invite, return undefined if invite with that code already exists
 */
export const createInviteFromCode = async ({
  signupRole,
  code,
  size = 1,
}: {
  signupRole: Role;
  code: string;
  size?: number;
}): Promise<Invite | undefined> => {
  const foundInvite = await inviteRepository.findOne({ where: { code } });

  if (foundInvite) {
    return undefined;
  }

  const invite = new Invite();
  invite.signupRole = signupRole;
  invite.code = code;
  invite.size = size;
  const createdInvite = await inviteRepository.save(invite);

  return createdInvite;
};

/**
 *
 * @param code
 * @returns
 */
export const validateAndUseCode = async (
  code: string,
): Promise<Invite | undefined> => {
  return await inviteRepository.manager.transaction(
    async (transactionalEntityManager: EntityManager) => {
      const inviteCode = await transactionalEntityManager.findOne(Invite, {
        where: {
          code,
        },
      });

      if (!inviteCode) {
        return undefined;
      }

      if (inviteCode.size <= 0) {
        return undefined;
      }

      // Decrement the size
      inviteCode.size -= 1;

      // Ensure size is not less than 0
      if (inviteCode.size < 0) {
        inviteCode.size = 0;
      }

      await transactionalEntityManager.save(inviteCode);

      return inviteCode;
    },
  );
};

/**
 *
 * @returns Invite selected columns object
 */
export const getInviteSelectedColumns = (): FindOptionsSelect<Invite> => {
  return {
    id: true,
    code: true,
    size: true,
    created_at: true,
    updated_at: true,
  };
};

/**
 *
 * @param code
 * @returns
 */
export const sendInviteEmail = async ({
  invite,
  emails,
}: {
  invite: Invite;
  emails?: string[];
}): Promise<void> => {
  if (!emails) {
    return;
  }

  const codeLink = `<a href="${invite.signupUrl}" target="__blank">${invite.code}</a>`;

  const INVITE_SUBJECT = "e-dream private alpha invitation";
  const USER_BODY = `We invite you to discover and experience the latest generative AI animations from the greatest artists! To accept, click ${codeLink}`;
  const CREATOR_BODY = `We invite you to discover and experience the latest generative AI animations from the greatest artists! You are pre-approved as a creator who can share their own work as well. To accept, click ${codeLink}`;

  const body =
    invite.signupRole?.name === ROLES.CREATOR_GROUP ? CREATOR_BODY : USER_BODY;

  await sendEmail({
    toAddresses: emails,
    subject: INVITE_SUBJECT,
    body: body,
    fromAddress: "",
  });
};
