import "reflect-metadata";
import { Between } from "typeorm";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import { processDreamFilmstripRequest } from "utils/dream.util";
import { DreamStatusType } from "types/dream.types";
import { updateVideoServiceWorker } from "utils/job.util";
import { TURN_ON_QUANTITY } from "constants/job.constants";

const main = async () => {
  // Initialize the data source
  await appDataSource.initialize();
  // Initialize dream repository
  const dreamRepository = appDataSource.getRepository(Dream);

  // date range in format YYYY-MM-DD
  const startDate = new Date("2023-01-01");
  const endDate = new Date("2024-12-31");

  const dreams = await dreamRepository.find({
    where: {
      created_at: Between(startDate, endDate),
      status: DreamStatusType.PROCESSED,
    },
    relations: {
      user: true,
    },
  });

  if (dreams.length) {
    await updateVideoServiceWorker(TURN_ON_QUANTITY);
  }

  const promises = dreams.map(async (dream) => {
    return processDreamFilmstripRequest(dream);
  });

  const results = await Promise.allSettled(promises);
  const queuedDreams: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result?.value?.id) {
      console.log(`Dream process filmstrip request promise ${index} fulfilled:`);
      queuedDreams.push(dreams?.[index]?.uuid);
    } else {
      console.error(`Dream process filmstrip request promise ${index} rejected:`);
    }
  });

  console.log(
    `Dreams added to queue to process filmstrip: [${queuedDreams
      ?.map((uuid) => JSON.stringify(uuid))
      .join(", ")}]`,
  );

  process.exit(0);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
