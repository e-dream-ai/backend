import "reflect-metadata";
import appDataSource from "database/app-data-source";
import { Dream, Playlist, PlaylistItem } from "entities";
import { DreamStatusType } from "types/dream.types";
import { PLAYLIST } from "./data/playlist";
import { PlaylistItemType } from "types/playlist.types";

const main = async () => {
  // Initialize the data source
  await appDataSource.initialize();
  // Initialize dream repository
  const dreamRepository = appDataSource.getRepository(Dream);
  const playlistRepository = appDataSource.getRepository(Playlist);
  const playlistItemRepository = appDataSource.getRepository(PlaylistItem);
  const PLAYLIST_OWNER_ID = 1;

  const playlist = playlistRepository.create({
    name: "Electric Sheep Generation 248",
    nsfw: false,
    user: {
      id: PLAYLIST_OWNER_ID,
    },
  });

  const savedPlaylist = await playlistRepository.save(playlist);
  const createdDreams: string[] = [];

  const promises = PLAYLIST.map(async (_, i) => {
    const dream = dreamRepository.create({
      name: PLAYLIST[i].name,
      // thumbnail: PLAYLIST[i].thumbnail,
      original_video: PLAYLIST[i].original_video,
      video: PLAYLIST[i].video,
      status: DreamStatusType.PROCESSED,
      activityLevel: PLAYLIST[i].activityLevel,
      processedVideoFrames: PLAYLIST[i].processedVideoFrames,
      processedVideoSize: PLAYLIST[i].processedVideoSize,
      processedVideoFPS: PLAYLIST[i].processedVideoFPS,
      filmstrip: PLAYLIST[i].filmstrip,
      md5: PLAYLIST[i].md5,
      user: {
        id: PLAYLIST_OWNER_ID,
      },
    });
    const savedDream = await dreamRepository.save(dream);
    createdDreams.push(savedDream.uuid);

    const playlistItem = playlistItemRepository.create({
      playlist: savedPlaylist,
      dreamItem: savedDream,
      order: PLAYLIST[i].order,
      type: PlaylistItemType.DREAM,
    });

    await playlistItemRepository.save(playlistItem);

    return dream;
  });

  const results = await Promise.allSettled(promises);
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result?.value?.id) {
      console.log(`Playlist process promise ${index} fulfilled:`);
    } else {
      console.error(`Playlist process promise ${index} rejected:`);
    }
  });

  console.log(
    `Dreams created: [${createdDreams
      ?.map((uuid) => JSON.stringify(uuid))
      .join(", ")}]`,
  );

  process.exit(0);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
