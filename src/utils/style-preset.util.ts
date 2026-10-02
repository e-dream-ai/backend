import { DEFAULT_STYLE_PRESET_MODEL } from "constants/style-preset.constants";
import { playlistItemRepository } from "database/repositories";
import { Dream, User } from "entities";
import env from "shared/env";
import { DreamMediaType, DreamStatusType } from "types/dream.types";
import { PlaylistItemType } from "types/playlist.types";
import { StylePresetResponse } from "types/style-preset.types";
import { parsePromptJson } from "utils/prompt.util";
import { transformDreamsWithSignedUrls } from "utils/transform.util";
import { isAdmin } from "utils/user.util";

const asText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const stylePresetPlaylistFor = (model?: string): string | undefined =>
  (model ? env.STYLE_PRESET_PLAYLISTS[model] : undefined) ??
  env.STYLE_PRESET_PLAYLISTS[DEFAULT_STYLE_PRESET_MODEL];

const toStylePreset = (dream: Dream): StylePresetResponse | undefined => {
  const prompt = parsePromptJson(dream);
  const stylePrompt = asText(prompt?.style_prompt);
  if (!stylePrompt || !dream.thumbnail) return undefined;
  return {
    uuid: dream.uuid,
    name: dream.name ?? "",
    section: asText(prompt?.section),
    stylePrompt,
    thumbnail: dream.thumbnail,
    width: dream.processedMediaWidth ?? undefined,
    height: dream.processedMediaHeight ?? undefined,
  };
};

export const getStylePresets = async ({
  user,
  model,
}: {
  user: User;
  model?: string;
}): Promise<StylePresetResponse[]> => {
  const playlistUuid = stylePresetPlaylistFor(model);
  if (!playlistUuid) return [];

  const query = playlistItemRepository
    .createQueryBuilder("item")
    .innerJoin("item.playlist", "playlist")
    .innerJoin("item.dreamItem", "dream")
    .select([
      "item.id",
      "item.order",
      "dream.id",
      "dream.uuid",
      "dream.name",
      "dream.thumbnail",
      "dream.prompt",
      "dream.processedMediaWidth",
      "dream.processedMediaHeight",
    ])
    .where("playlist.uuid = :playlistUuid", { playlistUuid })
    .andWhere("item.type = :type", { type: PlaylistItemType.DREAM })
    .andWhere("dream.status = :status", { status: DreamStatusType.PROCESSED })
    .andWhere("dream.mediaType = :mediaType", {
      mediaType: DreamMediaType.IMAGE,
    })
    .orderBy("item.order", "ASC")
    .addOrderBy("item.id", "ASC");

  if (!isAdmin(user)) {
    query.andWhere("(dream.hidden = false OR dream.userId = :userId)", {
      userId: user.id,
    });
  }
  if (!user.nsfw) {
    query.andWhere("dream.nsfw = false");
  }

  const items = await query.getMany();
  const dreams = await transformDreamsWithSignedUrls(
    items
      .map((item) => item.dreamItem)
      .filter((dream): dream is Dream => Boolean(dream)),
  );

  return dreams.flatMap((dream) => {
    const preset = toStylePreset(dream);
    return preset ? [preset] : [];
  });
};
