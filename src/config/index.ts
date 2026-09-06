// Configuration Manager — NEXUS
// Loads, validates, and persists NEXUS configuration

import type { NexusConfig, ProviderConfig, Model, PermissionMode } from '../types/index.js';
import { readJsonFile, writeJsonFile } from '../utils/fs.js';
import * as fsSync from 'fs';
import { getNexusDir, getProjectDir } from './paths.js';
import path from 'path';
import { Logger } from '../utils/logger.js';

const logger = new Logger('config');

const DEFAULT_CONFIG: NexusConfig = {
  version: '0.1.0',
  permissionMode: 'safe',
  streaming: true,
  context: {
    maxTokens: 100_000,
    includeGitStatus: true,
    includeProjectFiles: true,
    includeToolResults: true,
    includeSessionHistory: true,
    includeSkillInstructions: false,
    includeMcpResources: false,
    strategy: 'truncate',
  },
  agents: {},
  providers: [],
  models: [],
  permissions: [],
  tools: [],
  workflows: [],
  telemetry: false,
};

export class ConfigManager {
  private globalConfigPath: string;
  private projectConfigPath?: string;
  private config: NexusConfig;

  constructor(projectPath?: string) {
    this.globalConfigPath = path.join(getNexusDir(), 'config.json');
    if (projectPath) {
      this.projectConfigPath = path.join(getProjectDir(projectPath), 'config.json');
    }
    this.config = this.load();
  }

  get(): NexusConfig {
    return this.config;
  }

  getProvider(id: string): ProviderConfig | null {
    return this.config.providers.find((p) => p.id === id) ?? null;
  }

  getModel(id: string): Model | null {
    return this.config.models.find((m) => m.id === id || m.aliases.includes(id)) ?? null;
  }

  getModelForProvider(providerId: string): Model | null {
    return this.config.models.find((m) => m.provider === providerId) ?? null;
  }

  getAllModels(): Model[] {
    return this.config.models;
  }

  getAllProviders(): ProviderConfig[] {
    return this.config.providers;
  }

  setDefaultModel(modelId: string): void {
    this.config.defaultModel = modelId;
    this.save();
  }

  setDefaultProvider(providerId: string): void {
    this.config.defaultProvider = providerId;
    this.save();
  }

  setPermissionMode(mode: PermissionMode): void {
    this.config.permissionMode = mode;
    this.save();
  }

  addProvider(config: ProviderConfig): void {
    const idx = this.config.providers.findIndex((p) => p.id === config.id);
    if (idx >= 0) {
      this.config.providers[idx] = config;
    } else {
      this.config.providers.push(config);
    }
    this.save();
  }

  removeProvider(id: string): boolean {
    const idx = this.config.providers.findIndex((p) => p.id === id);
    if (idx >= 0) {
      this.config.providers.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  addModel(model: Model): void {
    const idx = this.config.models.findIndex((m) => m.id === model.id);
    if (idx >= 0) {
      this.config.models[idx] = model;
    } else {
      this.config.models.push(model);
    }
    this.save();
  }

  removeModel(id: string): boolean {
    const idx = this.config.models.findIndex((m) => m.id === id);
    if (idx >= 0) {
      this.config.models.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  addTool(tool: import('../types/index.js').ToolDefinition): void {
    const idx = this.config.tools.findIndex((t) => t.id === tool.id);
    if (idx >= 0) {
      this.config.tools[idx] = tool;
    } else {
      this.config.tools.push(tool);
    }
    this.save();
  }

  private load(): NexusConfig {
    let config: NexusConfig = {
      ...DEFAULT_CONFIG,
      providers: [...DEFAULT_CONFIG.providers],
      models: [...DEFAULT_CONFIG.models],
      permissions: [...DEFAULT_CONFIG.permissions],
      tools: [...DEFAULT_CONFIG.tools],
      workflows: [...DEFAULT_CONFIG.workflows],
    };

    // Load global config
    try {
      const global = readJsonFile<NexusConfig>(this.globalConfigPath);
      if (global) {
        config = { ...config, ...global };
      }
    } catch {
      logger.debug('No global config found, using defaults');
    }

    // Load project config (overrides global)
    if (this.projectConfigPath) {
      try {
        const project = readJsonFile<NexusConfig>(this.projectConfigPath);
        if (project) {
          config = { ...config, ...project };
        }
      } catch {
        // No project config
      }
    }

    return config;
  }

  private save(): void {
    try {
      fsSync.mkdirSync(path.dirname(this.globalConfigPath), { recursive: true });
      writeJsonFile(this.globalConfigPath, this.config);
      logger.debug('Config saved to global');
    } catch (error) {
      logger.warn('Failed to save global config', error);
    }

    if (this.projectConfigPath) {
      try {
        fsSync.mkdirSync(path.dirname(this.projectConfigPath), { recursive: true });
        writeJsonFile(this.projectConfigPath, this.config);
        logger.debug('Config saved to project');
      } catch (error) {
        logger.warn('Failed to save project config', error);
      }
    }
  }
}

export function createConfig(projectPath?: string): ConfigManager {
  return new ConfigManager(projectPath);
}
