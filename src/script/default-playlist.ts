import appDataSource from "database/app-data-source";
import { computeAllUsersDefaultPlaylist } from "utils/default-playlist.util";
import { setDailyUsersQuota } from "utils/user.util";

const main = async () => {
  // Initialize the data source
  await appDataSource.initialize();
  await computeAllUsersDefaultPlaylist();
  await setDailyUsersQuota();
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
