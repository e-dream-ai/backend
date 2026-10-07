export type ImagePresetName = "dream" | "thumbnail" | "avatar";

export interface ImageInfo {
  type: string;
  width: number;
  height: number;
  orientation?: number;
}

export interface ImageDigest {
  md5: string;
  size: number;
  header: Buffer;
}

export interface PreparedImageUpload {
  buffer: Buffer;
  contentType: string;
  extension: string;
  needsNormalization: boolean;
}

export interface ImageNormalizeJobData {
  object_key: string;
  preset: ImagePresetName;
  cache_control?: string;
}
