import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function readJsonFile<T>(filePath: string): T {
  const content = fsSync.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export function writeJsonFile<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  fsSync.mkdirSync(dir, { recursive: true });
  fsSync.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function fileExists(filePath: string): boolean {
  try {
    fsSync.statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectProjectType(dir: string): Promise<{
  language?: string;
  framework?: string;
  hasGit: boolean;
  hasPackageJson?: boolean;
  hasPyproject?: boolean;
  hasCargoToml?: boolean;
  hasGoMod?: boolean;
  hasDockerfile?: boolean;
}> {
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const fileSet = new Set(files);

  return {
    language: detectLanguage(fileSet),
    framework: detectFramework(fileSet),
    hasGit: fileSet.has('.git'),
    hasPackageJson: fileSet.has('package.json'),
    hasPyproject: fileSet.has('pyproject.toml'),
    hasCargoToml: fileSet.has('Cargo.toml'),
    hasGoMod: fileSet.has('go.mod'),
    hasDockerfile: fileSet.has('Dockerfile') || fileSet.has('docker-compose.yml'),
  };
}

function detectLanguage(files: Set<string>): string | undefined {
  if (files.has('package.json')) return 'typescript';
  if (files.has('pyproject.toml') || files.has('requirements.txt')) return 'python';
  if (files.has('Cargo.toml')) return 'rust';
  if (files.has('go.mod')) return 'go';
  if (files.has('Gemfile')) return 'ruby';
  return undefined;
}

function detectFramework(files: Set<string>): string | undefined {
  if (files.has('package.json')) {
    try {
      const content = fsSync.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['next']) return 'nextjs';
      if (deps['react']) return 'react';
      if (deps['vue']) return 'vue';
      if (deps['svelte']) return 'svelte';
      if (deps['express']) return 'express';
      if (deps['fastify']) return 'fastify';
    } catch {
      // Ignore parse errors
    }
  }
  return undefined;
}
