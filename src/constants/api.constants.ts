export enum ContentType {
  json = "json",
  none = "none",
}

export const CONTENT_TYPES = {
  [ContentType.json]: "application/json; charset=UTF-8",
  [ContentType.none]: "",
};

export const getRequestHeaders = ({
  contentType = ContentType.none,
}: {
  contentType?: ContentType;
}) => {
  let contentTypeHeader = {};

  if (contentType !== ContentType.none) {
    contentTypeHeader = { "Content-type": CONTENT_TYPES[contentType] };
  }
  return {
    ...contentTypeHeader,
    "Access-Control-Allow-Origin": "*",
  };
};
