// Tool Executor — NEXUS
// Executes tool calls and returns results

import type { ToolDefinition, ToolCall, ToolResult } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function executeToolCall(
  tool: ToolDefinition,
  toolCall: ToolCall
): Promise<ToolResult> {
  const start = Date.now();

  try {
    const result = await executeTool(tool.name, toolCall.arguments);
    return {
      callId: toolCall.id,
      content: result,
      isError: false,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    return {
      callId: toolCall.id,
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      isError: true,
      durationMs: Date.now() - start,
    };
  }
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'read_file':
      return readFile(args);
    case 'write_file':
      return writeFile(args);
    case 'edit_file':
      return editFile(args);
    case 'list_dir':
      return listDir(args);
    case 'search_files':
      return searchFiles(args);
    case 'execute_command':
      return executeCommand(args);
    case 'git_status':
      return gitStatus(args);
    case 'git_diff':
      return gitDiff(args);
    case 'git_log':
      return gitLog(args);
    case 'git_branch':
      return gitBranch(args);
    case 'file_info':
      return fileInfo(args);
    default:
      return `Unknown tool: ${name}`;
  }
}

async function readFile(args: Record<string, unknown>): Promise<string> {
  const filePath = args.path as string;
  if (!filePath) throw new Error('read_file requires a "path" argument');

  const absPath = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(absPath, 'utf-8');
  const lines = content.split('\n');
  const maxLines = (args.maxLines as number) ?? 200;

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n') + `\n... (truncated, ${lines.length - maxLines} more lines)`;
  }
  return content;
}

async function writeFile(args: Record<string, unknown>): Promise<string> {
  const filePath = args.path as string;
  const content = args.content as string;
  if (!filePath || content === undefined) throw new Error('write_file requires "path" and "content"');

  const absPath = path.resolve(process.cwd(), filePath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf-8');
  return `Written ${content.length} characters to ${filePath}`;
}

async function editFile(args: Record<string, unknown>): Promise<string> {
  const filePath = args.path as string;
  const oldString = args.old_string as string;
  const newString = args.new_string as string;

  if (!filePath || !oldString) throw new Error('edit_file requires "path" and "old_string"');

  const absPath = path.resolve(process.cwd(), filePath);
  let content = await fs.readFile(absPath, 'utf-8');

  if (!content.includes(oldString)) {
    throw new Error(`String not found in ${filePath}`);
  }

  const updatedContent = content.replace(oldString, newString);
  await fs.writeFile(absPath, updatedContent, 'utf-8');
  return `Edited ${filePath}: replaced 1 occurrence`;
}

async function listDir(args: Record<string, unknown>): Promise<string> {
  const dirPath = (args.path as string) ?? '.';
  const absPath = path.resolve(process.cwd(), dirPath);
  const entries = await fs.readdir(absPath, { withFileTypes: true });

  const lines = entries.map((e) => {
    const icon = e.isDirectory() ? '📁' : e.isFile() ? '📄' : '🔗';
    const size = e.isFile() ? ` (${(e.name.length > 0 ? 0 : 0).toLocaleString()} bytes)` : '';
    return `${icon} ${e.name}${size}`;
  });

  return lines.join('\n');
}

async function searchFiles(args: Record<string, unknown>): Promise<string> {
  const pattern = args.pattern as string;
  const dir = (args.path as string) ?? '.';
  const absPath = path.resolve(process.cwd(), dir);

  if (!pattern) throw new Error('search_files requires a "pattern" argument');

  const results: string[] = [];
  await walkDir(absPath, pattern, results, 0, 100);
  return results.length > 0 ? results.join('\n') : `No matches for "${pattern}" in ${dir}`;
}

async function walkDir(
  dir: string,
  pattern: string,
  results: string[],
  depth: number,
  maxDepth: number
): Promise<void> {
  if (depth > maxDepth) return;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
          await walkDir(fullPath, pattern, results, depth + 1, maxDepth);
        }
      } else if (entry.name.includes(pattern) || entry.name.endsWith(`.${pattern}`)) {
        const relPath = path.relative(process.cwd(), fullPath);
        results.push(relPath);
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

async function executeCommand(args: Record<string, unknown>): Promise<string> {
  const command = args.command as string;
  const cwd = (args.cwd as string) ?? process.cwd();
  const timeout = (args.timeout as number) ?? 30000;

  if (!command) throw new Error('execute_command requires a "command" argument');

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024 * 10,
    });
    const parts = [stdout];
    if (stderr) parts.push(`\n[stderr]\n${stderr}`);
    return parts.join('');
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; code?: number };
    return `[exit code ${err.code}] ${err.stderr || 'command failed'}`;
  }
}

async function gitStatus(_args: Record<string, unknown>): Promise<string> {
  try {
    const { stdout } = await execAsync('git status --short --branch', {
      cwd: process.cwd(),
      timeout: 10000,
    });
    return stdout.trim() || 'No changes';
  } catch {
    return 'Not a git repository';
  }
}

async function gitDiff(_args: Record<string, unknown>): Promise<string> {
  try {
    const { stdout } = await execAsync('git diff', {
      cwd: process.cwd(),
      timeout: 10000,
    });
    return stdout.trim() || 'No diff';
  } catch {
    return 'Not a git repository';
  }
}

async function gitLog(args: Record<string, unknown>): Promise<string> {
  const maxCount = (args.maxCount as number) ?? 20;
  try {
    const { stdout } = await execAsync(
      `git log --oneline -n ${maxCount}`,
      { cwd: process.cwd(), timeout: 10000 }
    );
    return stdout.trim() || 'No commits';
  } catch {
    return 'Not a git repository';
  }
}

async function gitBranch(_args: Record<string, unknown>): Promise<string> {
  try {
    const { stdout } = await execAsync('git branch -a', {
      cwd: process.cwd(),
      timeout: 10000,
    });
    return stdout.trim() || 'No branches';
  } catch {
    return 'Not a git repository';
  }
}

async function fileInfo(args: Record<string, unknown>): Promise<string> {
  const filePath = args.path as string;
  if (!filePath) throw new Error('file_info requires a "path" argument');

  const absPath = path.resolve(process.cwd(), filePath);
  const stat = await fs.stat(absPath);
  const relativePath = path.relative(process.cwd(), absPath);

  return [
    `Path: ${relativePath}`,
    `Size: ${stat.size.toLocaleString()} bytes`,
    `Created: ${stat.birthtime.toISOString()}`,
    `Modified: ${stat.mtime.toISOString()}`,
    `Permissions: ${stat.mode.toString(8).slice(-3)}`,
    `IsDirectory: ${stat.isDirectory()}`,
  ].join('\n');
}
