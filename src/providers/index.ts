// Provider Factory — NEXUS
// Creates the appropriate provider based on configuration

import type { Provider, ProviderConfig } from './base.js';
import { OpenRouterProvider } from './openrouter.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { LocalProvider } from './local.js';

export function createProvider(config: ProviderConfig): Provider {
  switch (config.type) {
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'ollama':
    case 'lmstudio':
    case 'custom':
      return new LocalProvider(config);
    case 'omniroute':
      // OmniRoute uses the OpenAI-compatible interface
      return new OpenRouterProvider(config);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

export { BaseProvider, type Provider, type ProviderConfig, type ProviderCapabilities, type ProviderRouter, type ChatResponse, type ChatOptions } from './base.js';
export { OpenRouterProvider } from './openrouter.js';
export { AnthropicProvider } from './anthropic.js';
export { OpenAIProvider } from './openai.js';
export { LocalProvider } from './local.js';
export type { LocalProviderOptions } from './local.js';
