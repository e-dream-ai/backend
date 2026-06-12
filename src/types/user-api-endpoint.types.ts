export type EndpointProviderType = "openai" | "fal";

export interface EndpointCapabilities {
  textToImage: boolean;
  imageToImage: boolean;
  sizes: string[];
}

export interface CreateUserApiEndpointRequest {
  name: string;
  providerType: EndpointProviderType;
  presetId: string;
  endpointUrl: string;
  apiKey: string;
  modelId: string;
  capabilities: EndpointCapabilities;
}

export interface UpdateUserApiEndpointRequest {
  name?: string;
  endpointUrl?: string;
  apiKey?: string;
  modelId?: string;
  capabilities?: EndpointCapabilities;
}

export interface UserApiEndpointResponse {
  uuid: string;
  name: string;
  providerType: EndpointProviderType;
  presetId: string;
  endpointUrl: string;
  apiKeyLastFour: string;
  modelId: string;
  capabilities: EndpointCapabilities;
  createdAt: Date;
  updatedAt: Date;
}
