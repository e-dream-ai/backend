import axios from "axios";
import type { EndpointProviderType } from "../types/user-api-endpoint.types";
import { APP_LOGGER } from "shared/logger";

interface TestResult {
  success: boolean;
  error?: string;
}

export async function testEndpointConnection(
  providerType: EndpointProviderType,
  endpointUrl: string,
  apiKey: string,
): Promise<TestResult> {
  try {
    if (providerType === "openai") {
      return await testOpenAiEndpoint(endpointUrl, apiKey);
    } else if (providerType === "fal") {
      return await testFalEndpoint(endpointUrl, apiKey);
    }
    return { success: false, error: `Unknown provider type: ${providerType}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    APP_LOGGER.error(`Endpoint test failed: ${message}`);
    return { success: false, error: message };
  }
}

async function testOpenAiEndpoint(
  endpointUrl: string,
  apiKey: string,
): Promise<TestResult> {
  try {
    const response = await axios.get(`${endpointUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 15000,
    });
    if (response.status === 200) return { success: true };
    return { success: false, error: `Unexpected status: ${response.status}` };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401)
        return { success: false, error: "Invalid API key" };
      if (err.response?.status === 403)
        return {
          success: false,
          error: "API key lacks required permissions",
        };
      return {
        success: false,
        error: `Connection failed: ${err.response?.status ?? err.message}`,
      };
    }
    throw err;
  }
}

async function testFalEndpoint(
  endpointUrl: string,
  apiKey: string,
): Promise<TestResult> {
  try {
    const response = await axios.post(
      endpointUrl,
      { prompt: "test", image_size: "square", num_images: 1 },
      {
        headers: { Authorization: `Key ${apiKey}` },
        timeout: 15000,
      },
    );
    if (response.status >= 200 && response.status < 300)
      return { success: true };
    return { success: false, error: `Unexpected status: ${response.status}` };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401)
        return { success: false, error: "Invalid API key" };
      if (err.response?.status === 403)
        return {
          success: false,
          error: "API key lacks required permissions",
        };
      if (err.response?.status === 422) return { success: true }; // bad params but auth passed
      return {
        success: false,
        error: `Connection failed: ${err.response?.status ?? err.message}`,
      };
    }
    throw err;
  }
}
