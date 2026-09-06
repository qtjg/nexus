// Permission Store — NEXUS
// File-based permission persistence

import type { PermissionPolicy } from '../types/index.js';
import { readJsonFile, writeJsonFile } from '../utils/fs.js';
import { getNexusDir } from '../config/paths.js';
import path from 'path';

const PERMISSIONS_FILE = 'permissions.json';

import type { PermissionStore } from './engine.js';

export class FilePermissionStore implements PermissionStore {
  private filePath: string;
  private policies: PermissionPolicy[] = [];

  constructor() {
    this.filePath = path.join(getNexusDir(), PERMISSIONS_FILE);
    this.load();
  }

  getPolicy(category: string): PermissionPolicy | null {
    return this.policies.find((p) => p.category === category) ?? null;
  }

  setPolicy(policy: PermissionPolicy): void {
    const idx = this.policies.findIndex(
      (p) => p.category === policy.category && p.path === policy.path
    );
    if (idx >= 0) {
      this.policies[idx] = policy;
    } else {
      this.policies.push(policy);
    }
    this.save();
  }

  clearPolicy(category: string): void {
    this.policies = this.policies.filter((p) => p.category !== category);
    this.save();
  }

  listPolicies(): PermissionPolicy[] {
    return this.policies;
  }

  private load(): void {
    try {
      const data = readJsonFile<PermissionPolicy[]>(this.filePath);
      if (Array.isArray(data)) {
        this.policies = data;
      }
    } catch {
      this.policies = [];
    }
  }

  private save(): void {
    writeJsonFile(this.filePath, this.policies);
  }
}
