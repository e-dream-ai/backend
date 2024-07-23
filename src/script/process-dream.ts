import "reflect-metadata";
import { Between } from "typeorm";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import { processDreamRequest } from "utils/dream.util";
import { DreamStatusType } from "types/dream.types";

const main = async () => {
  // Initialize the data source
  await appDataSource.initialize();
  // Initialize dream repository
  const dreamRepository = appDataSource.getRepository(Dream);

  // date range in format YYYY-MM-DD
  const startDate = new Date("2024-05-01");
  const endDate = new Date("2024-05-31");

  const dreams = await dreamRepository.find({
    where: {
      created_at: Between(startDate, endDate),
    },
    relations: {
      user: true,
    },
  });

  const promises = dreams.map(async (dream) => {
    /**
     * set dream status to queue
     */
    await dreamRepository.update(dream.id, {
      status: DreamStatusType.QUEUE,
    });

    return processDreamRequest(dream);
  });

  const results = await Promise.allSettled(promises);
  const queuedDreams: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result?.value?.id) {
      console.log(`Dream request promise ${index} fulfilled:`);
      queuedDreams.push(dreams?.[index]?.uuid);
    } else {
      console.error(`Dream request promise ${index} rejected:`);
    }
  });

  console.log(
    `Dreams added to queue: [${queuedDreams
      ?.map((uuid) => JSON.stringify(uuid))
      .join(", ")}]`,
  );

  process.exit(0);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
