export const MYME_TYPES = {
  MP4: "video/mp4",
  JPG: "image/jpeg",
  JPEG: "image/jpeg",
  PNG: "image/png",
};

export const FILE_EXTENSIONS = {
  MP4: "mp4",
  JPG: "jpg",
  JPEG: "jpeg",
  PNG: "png",
};

export const ALLOWED_VIDEO_TYPES = [
  "mp4",
  "avi",
  "mov",
  "wmv",
  "mkv",
  "flv",
  "mpeg",
  "webm",
  "ogv",
  "3gp",
  "3g2",
  "h264",
  "hevc",
  "divx",
  "xvid",
  "avchd",
];

export const ALLOWED_IMAGE_TYPES = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "webp",
  "tiff",
  "svg",
  "ico",
  "heif",
  "heic",
];

export const MYME_TYPES_EXTENSIONS = {
  [MYME_TYPES.MP4]: FILE_EXTENSIONS.MP4,
  [MYME_TYPES.JPG]: FILE_EXTENSIONS.JPG,
  [MYME_TYPES.JPEG]: FILE_EXTENSIONS.JPEG,
  [MYME_TYPES.PNG]: FILE_EXTENSIONS.PNG,
};

/**
 * Comprehensive MIME type mapping for file extensions
 */
export const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  // Video formats
  mp4: "video/mp4",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  wmv: "video/x-ms-wmv",
  mkv: "video/x-matroska",
  flv: "video/x-flv",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  webm: "video/webm",
  ogv: "video/ogg",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  h264: "video/h264",
  hevc: "video/hevc",
  divx: "video/divx",
  xvid: "video/xvid",
  avchd: "video/avchd",

  // Image formats
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  tiff: "image/tiff",
  tif: "image/tiff",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  heif: "image/heif",
  heic: "image/heic",

  // Audio formats
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  wma: "audio/x-ms-wma",
};

/**
 * Gets the MIME type for a given file extension
 * @param extension - File extension (with or without leading dot)
 * @returns MIME type string or 'application/octet-stream' as fallback
 */
export const getMimeTypeFromExtension = (extension: string): string => {
  const cleanExtension = extension.toLowerCase().replace(/^\./, "");
  return EXTENSION_TO_MIME_TYPE[cleanExtension] || "application/octet-stream";
};
