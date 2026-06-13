import appDataSource from "database/app-data-source";
import { UserApiEndpoint } from "entities/UserApiEndpoint.entity";
import { encrypt, decrypt } from "utils/crypto.util";
import { APP_LOGGER } from "shared/logger";
import {
  CreateUserApiEndpointRequest,
  UpdateUserApiEndpointRequest,
  UserApiEndpointResponse,
} from "types/user-api-endpoint.types";
import { testEndpointConnection } from "./endpoint-tester.service";

const endpointRepository = appDataSource.getRepository(UserApiEndpoint);

function lastFour(apiKey: string): string {
  return apiKey.slice(-4);
}

function toResponse(entity: UserApiEndpoint): UserApiEndpointResponse {
  return {
    uuid: entity.uuid,
    name: entity.name,
    providerType: entity.providerType,
    presetId: entity.presetId,
    endpointUrl: entity.endpointUrl,
    apiKeyLastFour: entity.apiKeyLastFour,
    modelId: entity.modelId,
    capabilities: entity.capabilities,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

export async function list(userId: number): Promise<UserApiEndpointResponse[]> {
  const endpoints = await endpointRepository.find({
    where: { userId },
    order: { created_at: "DESC" },
  });
  return endpoints.map(toResponse);
}

export async function create(
  userId: number,
  data: CreateUserApiEndpointRequest,
): Promise<{
  success: boolean;
  endpoint?: UserApiEndpointResponse;
  error?: string;
}> {
  const testResult = await testEndpointConnection(
    data.providerType,
    data.endpointUrl,
    data.apiKey,
  );

  if (!testResult.success) {
    return { success: false, error: testResult.error };
  }

  const encrypted = encrypt(data.apiKey);

  const endpoint = endpointRepository.create({
    userId,
    name: data.name,
    providerType: data.providerType,
    presetId: data.presetId,
    endpointUrl: data.endpointUrl,
    apiKeyEncrypted: encrypted.content,
    apiKeyIv: encrypted.iv,
    apiKeyLastFour: lastFour(data.apiKey),
    modelId: data.modelId,
    capabilities: data.capabilities,
  });

  await endpointRepository.save(endpoint);

  return { success: true, endpoint: toResponse(endpoint) };
}

export async function update(
  uuid: string,
  userId: number,
  data: UpdateUserApiEndpointRequest,
): Promise<{
  success: boolean;
  endpoint?: UserApiEndpointResponse;
  error?: string;
}> {
  const endpoint = await endpointRepository.findOne({
    where: { uuid, userId },
  });

  if (!endpoint) {
    return { success: false, error: "Endpoint not found" };
  }

  if (data.apiKey) {
    const testResult = await testEndpointConnection(
      endpoint.providerType,
      data.endpointUrl ?? endpoint.endpointUrl,
      data.apiKey,
    );

    if (!testResult.success) {
      return { success: false, error: testResult.error };
    }

    const encrypted = encrypt(data.apiKey);
    endpoint.apiKeyEncrypted = encrypted.content;
    endpoint.apiKeyIv = encrypted.iv;
    endpoint.apiKeyLastFour = lastFour(data.apiKey);
  }

  if (data.name !== undefined) endpoint.name = data.name;
  if (data.endpointUrl !== undefined) endpoint.endpointUrl = data.endpointUrl;
  if (data.modelId !== undefined) endpoint.modelId = data.modelId;
  if (data.capabilities !== undefined)
    endpoint.capabilities = data.capabilities;

  await endpointRepository.save(endpoint);

  return { success: true, endpoint: toResponse(endpoint) };
}

export async function remove(
  uuid: string,
  userId: number,
): Promise<{ success: boolean; error?: string }> {
  const endpoint = await endpointRepository.findOne({
    where: { uuid, userId },
  });

  if (!endpoint) {
    return { success: false, error: "Endpoint not found" };
  }

  await endpointRepository.delete({ id: endpoint.id });

  return { success: true };
}

export async function test(
  uuid: string,
  userId: number,
): Promise<{ success: boolean; error?: string }> {
  const endpoint = await endpointRepository.findOne({
    where: { uuid, userId },
  });

  if (!endpoint) {
    return { success: false, error: "Endpoint not found" };
  }

  try {
    const apiKey = decrypt({
      iv: endpoint.apiKeyIv,
      content: endpoint.apiKeyEncrypted,
    });
    return await testEndpointConnection(
      endpoint.providerType,
      endpoint.endpointUrl,
      apiKey,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    APP_LOGGER.error(`Failed to test endpoint ${uuid}: ${message}`);
    return { success: false, error: message };
  }
}

export async function decryptKey(
  uuid: string,
  userId: number,
): Promise<string | null> {
  const endpoint = await endpointRepository.findOne({
    where: { uuid, userId },
  });

  if (!endpoint) {
    return null;
  }

  try {
    return decrypt({
      iv: endpoint.apiKeyIv,
      content: endpoint.apiKeyEncrypted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    APP_LOGGER.error(`Failed to decrypt key for endpoint ${uuid}: ${message}`);
    return null;
  }
}
