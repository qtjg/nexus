// Configuration Paths — NEXUS
// Determines where NEXUS stores its files

import os from 'os';
import path from 'path';

export function getNexusDir(): string {
  const envOverride = process.env.NEXUS_DIR;
  if (envOverride) return envOverride;

  const home = os.homedir();
  return path.join(home, '.nexus');
}

export function getProjectDir(projectPath: string): string {
  return path.join(projectPath, '.forge');
}

export function getSessionsDir(projectPath?: string): string {
  if (projectPath) {
    return path.join(getProjectDir(projectPath), 'sessions');
  }
  return path.join(getNexusDir(), 'sessions');
}

export function getSkillsDir(projectPath?: string): string {
  if (projectPath) {
    return path.join(getProjectDir(projectPath), 'skills');
  }
  return path.join(getNexusDir(), 'skills');
}

export function getWorkflowsDir(projectPath?: string): string {
  if (projectPath) {
    return path.join(getProjectDir(projectPath), 'workflows');
  }
  return path.join(getNexusDir(), 'workflows');
}
