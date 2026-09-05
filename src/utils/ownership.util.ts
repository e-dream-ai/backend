import type { User } from "entities/User.entity";
import { userRepository } from "database/repositories";

export const getOwnerId = (entity: {
  userId?: number | null;
  user?: Pick<User, "id"> | null;
}): number => {
  const ownerId = entity.userId ?? entity.user?.id;
  if (ownerId == null) throw new Error("Missing resource owner");
  return ownerId;
};

export const getRetainedOwner = async (entity: {
  userId?: number | null;
  user?: User | null;
}): Promise<User> => {
  if (entity.user) return entity.user;
  return userRepository.findOneOrFail({
    where: { id: getOwnerId(entity) },
    withDeleted: true,
    select: { id: true, uuid: true, cognitoId: true, nsfw: true },
  });
};
