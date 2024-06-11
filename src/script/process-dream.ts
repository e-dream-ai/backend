import "reflect-metadata";
import { Between } from "typeorm";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import { processDreamRequest } from "utils/dream.util";

const main = async () => {
  // Initialize the data source
  await appDataSource.initialize();
  // Initialize dream repository
  const dreamRepository = appDataSource.getRepository(Dream);

  const startDate = new Date("2024-05-01");
  const endDate = new Date("2024-05-31");

  const dreams = await dreamRepository.find({
    where: {
      created_at: Between(startDate, endDate),
    },
  });

  const promises = dreams.map((dream) => processDreamRequest(dream));

  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`Dream request promise ${index} fulfilled:`, result.value);
    } else if (result.status === "rejected") {
      console.error(`Dream request promise ${index} rejected:`, result.reason);
    }
  });

  process.exit(0);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
