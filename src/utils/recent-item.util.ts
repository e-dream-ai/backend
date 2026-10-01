import { RECENT_ITEMS } from "constants/recent-item.constants";
import {
  dreamRepository,
  userRecentItemRepository,
} from "database/repositories";
import { Dream, User, UserRecentItem } from "entities";
import { RecentItemResponse, RecentItemType } from "types/recent-item.types";
import { isAdmin } from "utils/user.util";

const canTrackDream = (
  dream: Pick<Dream, "userId" | "hidden">,
  user: User,
  type: RecentItemType,
): boolean => {
  if (dream.userId === user.id) return true;
  if (type === RecentItemType.PROMPT) return false;
  return isAdmin(user) || !dream.hidden;
};

const pruneRecentItems = (userId: number, type: RecentItemType) => {
  const overflow = userRecentItemRepository
    .createQueryBuilder("item")
    .select("item.id")
    .where("item.userId = :userId", { userId })
    .andWhere("item.type = :type", { type })
    .orderBy("item.lastUsedAt", "DESC")
    .offset(RECENT_ITEMS.MAX_PER_TYPE);

  return userRecentItemRepository
    .createQueryBuilder()
    .delete()
    .where(`id IN (${overflow.getQuery()})`)
    .setParameters(overflow.getParameters())
    .execute();
};

export const getRecentItems = ({
  user,
  type,
  take,
}: {
  user: User;
  type: RecentItemType;
  take: number;
}): Promise<RecentItemResponse[]> =>
  userRecentItemRepository
    .createQueryBuilder("item")
    .innerJoin("item.dream", "dream")
    .select("dream.uuid", "dreamUuid")
    .addSelect("item.lastUsedAt", "lastUsedAt")
    .where("item.userId = :userId", { userId: user.id })
    .andWhere("item.type = :type", { type })
    .andWhere("(dream.userId = :userId OR dream.hidden = false)")
    .orderBy("item.lastUsedAt", "DESC")
    .limit(take)
    .getRawMany<RecentItemResponse>();

export const touchRecentItem = async ({
  user,
  type,
  dreamUuid,
}: {
  user: User;
  type: RecentItemType;
  dreamUuid: string;
}): Promise<RecentItemResponse | null> => {
  const dream = await dreamRepository.findOne({
    where: { uuid: dreamUuid },
    select: { id: true, uuid: true, userId: true, hidden: true },
  });

  if (!dream || !canTrackDream(dream, user, type)) return null;

  const { raw } = await userRecentItemRepository
    .createQueryBuilder()
    .insert()
    .into(UserRecentItem)
    .values({
      userId: user.id,
      type,
      dreamId: dream.id,
      lastUsedAt: () => "now()",
    })
    .orUpdate(["lastUsedAt"], ["userId", "type", "dreamId"])
    .returning(["lastUsedAt"])
    .execute();

  await pruneRecentItems(user.id, type);

  return { dreamUuid: dream.uuid, lastUsedAt: raw[0].lastUsedAt };
};
