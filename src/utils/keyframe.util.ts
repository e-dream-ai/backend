import { Keyframe } from "entities";
import { FindOptionsSelect, FindOptionsWhere } from "typeorm";
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
    created_at: true,
    updated_at: true,
    deleted_at: true,
    user: getUserSelectedColumns({ userEmail }),
  };
};

export const findOneKeyframe = async ({
  where,
  select,
}: {
  where: FindOptionsWhere<Keyframe> | FindOptionsWhere<Keyframe>[];
  select: FindOptionsSelect<Keyframe>;
  filter?: {
    nsfw?: boolean;
    onlyProcessedDreams?: boolean;
  };
}): Promise<Keyframe | null> => {
  const playlist = await keyframeRepository.findOne({
    where: where,
    select: select,
  });

  return playlist;
};
