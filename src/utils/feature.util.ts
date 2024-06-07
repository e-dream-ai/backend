import appDataSource from "database/app-data-source";
import { Feature } from "entities";
import { FeatureType } from "types/feature.types";

/**
 * Repositories
 */
const featureRepository = appDataSource.getRepository(Feature);

export const isFeatureActive = async (name: FeatureType): Promise<boolean> => {
  const featureFlag = await featureRepository.findOne({
    where: { name },
  });
  return featureFlag ? featureFlag.isActive : false;
};
