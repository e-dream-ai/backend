import { Report } from "entities";
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from "typeorm";
import appDataSource from "database/app-data-source";

const reportRepository = appDataSource.getRepository(Report);

export const getReportSelectedColumns = (): FindOptionsSelect<Report> => {
  return {
    id: true,
    uuid: true,
    dream: {
      uuid: true,
      name: true,
    },
    reportedBy: {
      uuid: true,
      name: true,
      email: true,
    },
    comments: true,
    processed: true,
    link: true,
    processedBy: {
      uuid: true,
      name: true,
      email: true,
    },
    reportedAt: true,
    processedAt: true,
    created_at: true,
    updated_at: true,
  };
};

export const getReportFindOptionsRelations =
  (): FindOptionsRelations<Report> => {
    return {
      dream: true,
      reportedBy: true,
      processedBy: true,
    };
  };

export const findOneReport = async ({
  where,
  select,
}: {
  where: FindOptionsWhere<Report> | FindOptionsWhere<Report>[];
  select: FindOptionsSelect<Report>;
}): Promise<Report | null> => {
  const playlist = await reportRepository.findOne({
    where: where,
    select: select,
    relations: getReportFindOptionsRelations(),
  });

  return playlist;
};
