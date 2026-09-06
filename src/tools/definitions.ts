// Built-in Tool Definitions — NEXUS

import type { ToolDefinition } from '../types/index.js';

export const BUILTIN_TOOLS: ToolDefinition[] = [
  {
    id: 'read_file',
    name: 'read_file',
    description: 'Read the contents of a file at the given path',
    kind: 'core',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file to read', required: true },
      { name: 'maxLines', type: 'number', description: 'Maximum number of lines to read', required: false },
    ],
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to file' },
        maxLines: { type: 'number', description: 'Max lines to read' },
      },
      required: ['path'],
    },
    permission: 'filesystem.read',
    enabled: true,
  },
  {
    id: 'write_file',
    name: 'write_file',
    description: 'Write content to a file at the given path. Creates parent directories if needed.',
    kind: 'core',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to write the file', required: true },
      { name: 'content', type: 'string', description: 'Content to write', required: true },
    ],
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['path', 'content'],
    },
    permission: 'filesystem.write',
    enabled: true,
  },
  {
    id: 'edit_file',
    name: 'edit_file',
    description: 'Edit a file by replacing a specific string with a new string',
    kind: 'core',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file', required: true },
      { name: 'old_string', type: 'string', description: 'String to replace', required: true },
      { name: 'new_string', type: 'string', description: 'Replacement string', required: true },
    ],
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        old_string: { type: 'string', description: 'Old string' },
        new_string: { type: 'string', description: 'New string' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
    permission: 'filesystem.write',
    enabled: true,
  },
  {
    id: 'list_dir',
    name: 'list_dir',
    description: 'List files and directories in the given path',
    kind: 'core',
    parameters: [
      { name: 'path', type: 'string', description: 'Directory path to list', required: false },
    ],
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path' },
      },
    },
    permission: 'filesystem.read',
    enabled: true,
  },
  {
    id: 'search_files',
    name: 'search_files',
    description: 'Search for files matching a pattern in the given directory',
    kind: 'core',
    parameters: [
      { name: 'pattern', type: 'string', description: 'Search pattern (filename or extension)', required: true },
      { name: 'path', type: 'string', description: 'Directory to search in', required: false },
    ],
    schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern' },
        path: { type: 'string', description: 'Search directory' },
      },
      required: ['pattern'],
    },
    permission: 'filesystem.read',
    enabled: true,
  },
  {
    id: 'execute_command',
    name: 'execute_command',
    description: 'Execute a shell command and return its output',
    kind: 'core',
    parameters: [
      { name: 'command', type: 'string', description: 'Shell command to execute', required: true },
      { name: 'cwd', type: 'string', description: 'Working directory', required: false },
      { name: 'timeout', type: 'number', description: 'Timeout in milliseconds', required: false },
    ],
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command' },
        cwd: { type: 'string', description: 'Working directory' },
        timeout: { type: 'number', description: 'Timeout ms' },
      },
      required: ['command'],
    },
    permission: 'terminal.execute',
    enabled: true,
  },
  {
    id: 'git_status',
    name: 'git_status',
    description: 'Get the current git status of the repository',
    kind: 'core',
    permission: 'git.read',
    enabled: true,
  },
  {
    id: 'git_diff',
    name: 'git_diff',
    description: 'Show changes in the working tree compared to the last commit',
    kind: 'core',
    permission: 'git.read',
    enabled: true,
  },
  {
    id: 'git_log',
    name: 'git_log',
    description: 'Show recent git commits',
    kind: 'core',
    parameters: [
      { name: 'maxCount', type: 'number', description: 'Number of commits to show', required: false },
    ],
    schema: {
      type: 'object',
      properties: {
        maxCount: { type: 'number', description: 'Max commits' },
      },
    },
    permission: 'git.read',
    enabled: true,
  },
  {
    id: 'git_branch',
    name: 'git_branch',
    description: 'List git branches',
    kind: 'core',
    permission: 'git.read',
    enabled: true,
  },
  {
    id: 'file_info',
    name: 'file_info',
    description: 'Get metadata about a file (size, dates, permissions)',
    kind: 'core',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file', required: true },
    ],
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
      },
      required: ['path'],
    },
    permission: 'filesystem.read',
    enabled: true,
  },
];
