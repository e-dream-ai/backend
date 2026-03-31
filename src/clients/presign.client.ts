import env from "shared/env";

interface PresignServiceResponse {
  urls: Record<string, string>;
}

interface PresignServiceRequest {
  keys: string[];
}

class PresignServiceClient {
  private baseUrl: string;
  private apiKey: string;
  private readonly MAX_BATCH_SIZE = 500;

  constructor() {
    this.baseUrl = env.PRESIGN_SERVICE_URL;
    this.apiKey = env.PRESIGN_SERVICE_API_KEY;
  }

  async generatePresignedUrls(keys: string[]): Promise<Record<string, string>> {
    if (keys.length === 0) {
      return {};
    }

    const result: Record<string, string> = {};
    const batches = this.chunkArray(keys, this.MAX_BATCH_SIZE);

    for (const batch of batches) {
      try {
        const batchUrls = await this.fetchPresignedUrls(batch);
        Object.assign(result, batchUrls);
      } catch (error) {
        console.error(`Failed to generate presigned URLs for batch:`, error);
        throw error;
      }
    }

    return result;
  }

  private async fetchPresignedUrls(
    keys: string[],
  ): Promise<Record<string, string>> {
    const request: PresignServiceRequest = { keys };

    const response = await fetch(`${this.baseUrl}/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `Presign service error: ${response.status} ${response.statusText}`,
      );
    }

    const data: PresignServiceResponse = await response.json();
    return data.urls;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async generatePresignedUrl(key: string): Promise<string> {
    const urls = await this.generatePresignedUrls([key]);
    return urls[key];
  }
}

export const presignClient = new PresignServiceClient();
