export enum PromptHistorySort {
  RECENT = "recent",
  DATE = "date",
  NAME = "name",
}

export type GetPromptHistoryQuery = {
  search?: string;
  algorithm?: string;
  sort?: PromptHistorySort;
  distinct?: boolean;
  take?: number;
  skip?: number;
};
