import { Report } from "entities";
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from "typeorm";
import appDataSource from "database/app-data-source";
import env from "shared/env";
import { sendEmail } from "./ses.util";
import { getEmailPrefix } from "./email.util";

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

/**
 *
 * @param code
 * @returns
 */
export const sendReportEmail = async (report: Report): Promise<void> => {
  const dreamUUID = report.dream.uuid;
  const dreamName = report.dream.name ?? "-";
  const reportType = report.type.description;
  const reportedBy =
    report.reportedBy.name ?? report.reportedBy.email ?? report.reportedBy.uuid;
  const reportComments = report.comments ?? "-";

  const dreamLink = `<a href="${env.FRONTEND_URL}/dream/${dreamUUID}" target="_blank"><b>${dreamUUID}</b></a>`;

  const EMAIL_PREFIX = getEmailPrefix();
  const EMAIL_SUBJECT = `${EMAIL_PREFIX}Dream Video Reported - [Report ${report.uuid}]`;
  const REPORT_BODY = `
    <html>
      <body>
        <p>Hi ops,</p>
        <p>A dream video has been reported, requires your attention. Please review the following details and take appropriate action.</p>
        <p></p>
        <p>
          <b>
            Report Details
          </b>
        </p>
        <ul>
          <li>
            <b>Report UUID:</b>
            ${report.uuid}
          </li>
          <li>
            <b>Dream UUID:</b>
            ${dreamLink}
          </li>
          <li>
            <b>Dream name:</b>
            ${dreamName}
          </li>
          <li>
            <b>Reason:</b>
            ${reportType}
          </li>
          <li>
            <b>Reported by:</b>
            ${reportedBy}
          </li>
          <li>
            <b>Comments:</b>
            ${reportComments}
          </li>
        </ul>
      </body>
    </html>
  `;

  await sendEmail({
    toAddresses: [env.OPS_EMAIL],
    subject: EMAIL_SUBJECT,
    bodyHtml: REPORT_BODY,
    fromAddress: env.AWS_SES_EMAIL_IDENTITY,
  });
};
