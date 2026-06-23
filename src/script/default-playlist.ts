import appDataSource from "database/app-data-source";
import { computeAllUsersDefaultPlaylist } from "utils/default-playlist.util";
import { refillProviderCredits, setDailyUsersQuota } from "utils/user.util";

const main = async () => {
  // Initialize the data source
  await appDataSource.initialize();
  await computeAllUsersDefaultPlaylist();
  await setDailyUsersQuota();
  await refillProviderCredits();
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
