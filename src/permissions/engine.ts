// Permission Engine — NEXUS
// Manages permission policies and decisions

import type {
  PermissionRequest,
  PermissionPolicy,
  PermissionDecision,
  PermissionCategory,
  PermissionMode,
} from '../types/index.js';
import { PermissionDeniedError } from '../types/index.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('permissions');

export interface PermissionStore {
  getPolicy(category: PermissionCategory): PermissionPolicy | null;
  setPolicy(policy: PermissionPolicy): void;
  clearPolicy(category: PermissionCategory): void;
  listPolicies(): PermissionPolicy[];
}

export class PermissionEngine {
  private policies: Map<string, PermissionPolicy> = new Map();
  private sessionDecisions: Set<string> = new Set();
  private mode: PermissionMode = 'safe';
  private store?: PermissionStore;

  constructor(store?: PermissionStore, mode: PermissionMode = 'safe') {
    this.store = store;
    this.mode = mode;
    this.applyDefaults();
  }

  setMode(mode: PermissionMode): void {
    this.mode = mode;
    this.applyDefaults();
  }

  async decide(request: PermissionRequest): Promise<PermissionDecision> {
    const category = this.inferCategory(request.toolName, request.action);
    logger.debug(`Permission check: ${category} for ${request.toolName}`);

    // Check global store
    if (this.store) {
      const stored = this.store.getPolicy(category);
      if (stored) {
        return stored.decision;
      }
    }

    // Check in-memory policies
    const key = `${category}:${request.target}`;
    if (this.policies.has(key)) {
      const policy = this.policies.get(key)!;
      if (policy.decision === 'allow-always' || policy.decision === 'deny-always') {
        return policy.decision;
      }
    }

    // Check session decisions
    if (this.sessionDecisions.has(key)) {
      const existing = this.policies.get(key);
      if (existing) return existing.decision;
    }

    // Apply mode-based defaults
    const defaultDecision = this.getDefaultDecision(category);
    logger.debug(`Default decision for ${category}: ${defaultDecision}`);

    return defaultDecision;
  }

  recordDecision(request: PermissionRequest, decision: PermissionDecision): void {
    const category = this.inferCategory(request.toolName, request.action);
    const key = `${category}:${request.target}`;

    const policy: PermissionPolicy = {
      category,
      decision,
      scope: 'project',
      path: request.target,
      reason: request.description,
    };

    this.policies.set(key, policy);

    if (decision.startsWith('allow-session') || decision.startsWith('deny-session')) {
      this.sessionDecisions.add(key);
    }

    if (this.store) {
      this.store.setPolicy(policy);
    }

    logger.info(`Permission recorded: ${decision} for ${category}`);
  }

  allowAlways(category: PermissionCategory, path?: string): void {
    const policy: PermissionPolicy = {
      category,
      decision: 'allow-always',
      scope: 'global',
      path,
    };
    this.policies.set(`${category}:${path ?? '*'}`, policy);
    if (this.store) this.store.setPolicy(policy);
  }

  denyAlways(category: PermissionCategory, path?: string): void {
    const policy: PermissionPolicy = {
      category,
      decision: 'deny-always',
      scope: 'global',
      path,
    };
    this.policies.set(`${category}:${path ?? '*'}`, policy);
    if (this.store) this.store.setPolicy(policy);
  }

  clearSession(): void {
    this.sessionDecisions.clear();
  }

  listPolicies(): PermissionPolicy[] {
    return Array.from(this.policies.values());
  }

  private applyDefaults(): void {
    this.policies.clear();
    this.sessionDecisions.clear();

    if (this.mode === 'safe') {
      // Ask for everything
      for (const cat of this.getAllCategories()) {
        this.policies.set(`${cat}:*`, {
          category: cat,
          decision: 'allow-once',
          scope: 'global',
        });
      }
    } else if (this.mode === 'sandbox') {
      // Deny most things by default
      for (const cat of this.getAllCategories()) {
        if (cat.startsWith('filesystem.')) {
          this.policies.set(`${cat}:*`, { category: cat, decision: 'deny-always', scope: 'global' });
        }
        if (cat.startsWith('terminal.')) {
          this.policies.set(`${cat}:*`, { category: cat, decision: 'deny-always', scope: 'global' });
        }
      }
    } else if (this.mode === 'relaxed') {
      // Allow most things
      for (const cat of this.getAllCategories()) {
        this.policies.set(`${cat}:*`, { category: cat, decision: 'allow-always', scope: 'global' });
      }
    }
    // 'normal' — default allow-once for interactive approval
  }

  private getDefaultDecision(category: PermissionCategory): PermissionDecision {
    if (this.mode === 'safe') return 'allow-once';
    if (this.mode === 'sandbox') return 'deny-always';
    if (this.mode === 'relaxed') return 'allow-always';
    return 'allow-once';
  }

  private inferCategory(toolName: string, action: string): PermissionCategory {
    const mapping: Record<string, PermissionCategory> = {
      read_file: 'filesystem.read',
      write_file: 'filesystem.write',
      edit_file: 'filesystem.write',
      delete_file: 'filesystem.delete',
      list_dir: 'filesystem.read',
      search_files: 'filesystem.read',
      execute_command: 'terminal.execute',
      kill_process: 'terminal.process',
      web_fetch: 'network.request',
      git_status: 'git.read',
      git_diff: 'git.read',
      git_commit: 'git.commit',
      git_push: 'git.push',
      git_branch: 'git.write',
    };
    return mapping[toolName] ?? 'terminal.execute';
  }

  private getAllCategories(): PermissionCategory[] {
    return [
      'filesystem.read',
      'filesystem.write',
      'filesystem.delete',
      'terminal.execute',
      'terminal.process',
      'network.request',
      'git.read',
      'git.write',
      'git.commit',
      'git.push',
      'mcp.execute',
      'plugin.execute',
    ];
  }
}
