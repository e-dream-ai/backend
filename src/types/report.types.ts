export type GetReportQuery = {
  take?: number;
  skip?: number;
};

export type ReportParamsRequest = {
  uuid: string;
};

export type CreateReportRequest = {
  typeId: number;
  dreamUUID: string;
  comments?: string;
  link?: string;
};

export type UpdateReportRequest = {
  name?: string;
  reportedBy?: number;
  processedBy?: number;
};

export type CreateMultipartUploadFileRequest = {
  extension: string;
};
