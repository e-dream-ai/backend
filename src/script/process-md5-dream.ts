import "reflect-metadata";
import { Between, IsNull } from "typeorm";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import { processDreamMd5Request } from "utils/dream.util";
import { DreamStatusType } from "types/dream.types";

const main = async () => {
  // Initialize the data source
  await appDataSource.initialize();
  // Initialize dream repository
  const dreamRepository = appDataSource.getRepository(Dream);

  // date range in format YYYY-MM-DD
  const startDate = new Date("2023-01-01");
  const endDate = new Date("2023-12-31");

  const dreams = await dreamRepository.find({
    where: {
      created_at: Between(startDate, endDate),
      md5: IsNull(),
      status: DreamStatusType.PROCESSED,
    },
    relations: {
      user: true,
    },
  });

  const promises = dreams.map(async (dream) => {
    return processDreamMd5Request(dream);
  });

  const results = await Promise.allSettled(promises);
  const queuedDreams: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result?.value?.id) {
      console.log(`Dream process md5 request promise ${index} fulfilled:`);
      queuedDreams.push(dreams?.[index]?.uuid);
    } else {
      console.error(`Dream process md5 request promise ${index} rejected:`);
    }
  });

  console.log(
    `Dreams added to queue to process md5: [${queuedDreams
      ?.map((uuid) => JSON.stringify(uuid))
      .join(", ")}]`,
  );

  process.exit(0);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
