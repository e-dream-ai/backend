import { Keyframe } from "entities";
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import appDataSource from "database/app-data-source";

const keyframeRepository = appDataSource.getRepository(Keyframe);

export const getKeyframeSelectedColumns = ({
  userEmail,
}: {
  userEmail?: boolean;
} = {}): FindOptionsSelect<Keyframe> => {
  return {
    id: true,
    uuid: true,
    name: true,
    image: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    user: getUserSelectedColumns({ userEmail }),
    dreamsStartingWith: true,
    dreamsEndingWith: true,
  };
};

export const getKeyframeFindOptionsRelations =
  (): FindOptionsRelations<Keyframe> => {
    return {
      playlistKeyframes: true,
      user: true,
      displayedOwner: true,
      dreamsEndingWith: {
        user: true,
        displayedOwner: true,
      },
      dreamsStartingWith: {
        user: true,
        displayedOwner: true,
      },
    };
  };

export const findOneKeyframe = async ({
  where,
  select,
}: {
  where: FindOptionsWhere<Keyframe> | FindOptionsWhere<Keyframe>[];
  select: FindOptionsSelect<Keyframe>;
}): Promise<Keyframe | null> => {
  const keyframe = await keyframeRepository.findOne({
    where: where,
    select: select,
    relations: getKeyframeFindOptionsRelations(),
  });

  return keyframe;
};
