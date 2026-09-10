import appDataSource from "database/app-data-source";
import { Dream, Playlist, PlaylistItem, User } from "entities";
import { In } from "typeorm";
import { DreamStatusType } from "types/dream.types";
import { AddPlaylistItemRequest, PlaylistItemType } from "types/playlist.types";
import { isAdmin } from "./user.util";

export type AddPlaylistItemsResult =
  | { status: "created"; playlist: Playlist; items: PlaylistItem[] }
  | { status: "not-found" | "forbidden" | "conflict" };

export const addPlaylistItems = (
  uuid: string,
  requestedItems: AddPlaylistItemRequest[],
  user: User,
): Promise<AddPlaylistItemsResult> =>
  appDataSource.transaction(async (manager) => {
    const requests = requestedItems.map((item) => ({
      ...item,
      uuid: item.uuid.toLowerCase(),
    }));
    const playlist = await manager.findOne(Playlist, {
      where: { uuid },
      lock: { mode: "pessimistic_write" },
    });
    if (!playlist) return { status: "not-found" };
    if (playlist.userId !== user.id && !isAdmin(user))
      return { status: "forbidden" };
    if (
      requests.some(
        (item) =>
          item.type === PlaylistItemType.PLAYLIST &&
          item.uuid === playlist.uuid,
      )
    ) {
      return { status: "forbidden" };
    }
    const keys = new Set(requests.map((item) => `${item.type}:${item.uuid}`));
    if (keys.size !== requests.length) return { status: "conflict" };

    const dreamUuids = requests
      .filter((item) => item.type === PlaylistItemType.DREAM)
      .map((item) => item.uuid);
    const playlistUuids = requests
      .filter((item) => item.type === PlaylistItemType.PLAYLIST)
      .map((item) => item.uuid);
    const dreams = dreamUuids.length
      ? await manager.findBy(Dream, { uuid: In(dreamUuids) })
      : [];
    const playlists = playlistUuids.length
      ? await manager.findBy(Playlist, { uuid: In(playlistUuids) })
      : [];
    if (
      dreams.length !== dreamUuids.length ||
      playlists.length !== playlistUuids.length
    ) {
      return { status: "not-found" };
    }
    const dreamByUuid = new Map(dreams.map((dream) => [dream.uuid, dream]));
    const playlistByUuid = new Map(playlists.map((item) => [item.uuid, item]));
    const existing = await manager
      .createQueryBuilder(PlaylistItem, "item")
      .select("item.id")
      .leftJoin("item.dreamItem", "dream")
      .leftJoin("item.playlistItem", "nested")
      .where("item.playlistId = :playlistId", { playlistId: playlist.id })
      .andWhere(
        "((item.type = :dreamType AND dream.uuid IN (:...dreamUuids)) OR (item.type = :playlistType AND nested.uuid IN (:...playlistUuids)))",
        {
          dreamType: PlaylistItemType.DREAM,
          playlistType: PlaylistItemType.PLAYLIST,
          dreamUuids: dreamUuids.length ? dreamUuids : [null],
          playlistUuids: playlistUuids.length ? playlistUuids : [null],
        },
      )
      .getOne();
    if (existing) return { status: "conflict" };
    const last = await manager.findOne(PlaylistItem, {
      where: { playlist: { id: playlist.id } },
      order: { order: "DESC" },
      select: { id: true, order: true },
    });
    const firstOrder = last ? last.order + 1 : 0;
    if (playlist.userId !== null)
      playlist.user = manager.create(User, { id: playlist.userId });
    const items = manager.create(
      PlaylistItem,
      requests.map((item, index) => ({
        playlist,
        type: item.type,
        dreamItem:
          item.type === PlaylistItemType.DREAM
            ? dreamByUuid.get(item.uuid)!
            : null,
        playlistItem:
          item.type === PlaylistItemType.PLAYLIST
            ? playlistByUuid.get(item.uuid)!
            : null,
        order: firstOrder + index,
      })),
    );
    const saved = await manager.save(PlaylistItem, items);
    if (dreams.some((dream) => dream.status === DreamStatusType.PROCESSED)) {
      await manager.update(Playlist, playlist.id, { updated_at: new Date() });
    }
    return { status: "created", playlist, items: saved };
  });
