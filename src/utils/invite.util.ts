import { Invite } from "entities";
import { FindOptionsSelect } from "typeorm";

/**
 * generates a random alphanumeric code
 * @param length
 * @returns generated code
 */
export const generateRandomCode = (length: number = 4): string => {
  // only use this characters to create code
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length)),
  ).join("");
};

export const getInviteSelectedColumns = (): FindOptionsSelect<Invite> => {
  return {
    id: true,
    code: true,
    size: true,
    created_at: true,
    updated_at: true,
  };
};
