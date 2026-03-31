type Item = {
  name: string;
  thumbnail: string;
  original_video: string;
  video: string;
  order: number;
  activityLevel: number;
  processedVideoFrames: number;
  processedVideoSize: number;
  processedVideoFPS: number;
  filmstrip: object[];
  md5: string;
};

export const PLAYLIST: Item[] = [];
