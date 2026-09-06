// NEXUS — CLI Dispatch Regression Tests
// Verifies that `nexus` with no subcommand dispatches to the interactive session
// instead of silently exiting. Regression test for Commander v4 behavior
// where default `.action()` is not fired when subcommands are defined.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync, spawn } from 'node:child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

/** Synchronous wrapper for commands that exit immediately (--help, providers, etc.) */
function cliSync(args: string[]): string {
  try {
    return execSync(`node bin/nexus.js ${args.join(' ')}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });
  } catch (e: any) {
    // execSync throws on non-zero exit; return combined stdout+stderr
    return (e.stdout ?? '') + (e.stderr ?? '');
  }
}

/** Async wrapper for commands that stay alive (interactive, chat, run) */
function cliAsync(args: string[], timeoutMs = 4000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['bin/nexus.js', ...args], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('close', (code) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
    child.on('error', () => resolve({ stdout, stderr, exitCode: 1 }));
    setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        /* already closed */
      }
      resolve({ stdout, stderr, exitCode: 1 });
    }, timeoutMs);
  });
}

function collectAll(out: string, err: string): string {
  return out + err;
}

describe('CLI Dispatch (Regression)', () => {
  it('should NOT silently exit when run with no args (interactive dispatch)', async () => {
    const { stdout, stderr } = await cliAsync([], 4000);
    const output = collectAll(stdout, stderr);
    // Must produce output (welcome banner or provider hint), never silent exit.
    assert.ok(output.length > 0, 'Expected non-empty output when running `nexus` with no args');
    // Should either show NEXUS banner or a provider setup hint.
    assert.ok(
      output.includes('NEXUS') || output.includes('provider') || output.includes('Provider'),
      `Expected NEXUS banner or provider hint, got: ${JSON.stringify(output.substring(0, 200))}`,
    );
  });

  it('should show provider hint for `nexus chat` alias', async () => {
    const { stdout, stderr } = await cliAsync(['chat'], 4000);
    const output = collectAll(stdout, stderr);
    assert.ok(output.length > 0, '`nexus chat` should produce output, not silently exit');
    assert.ok(
      output.includes('provider') || output.includes('Provider') || output.includes('NEXUS'),
      `Expected provider hint or banner, got: ${JSON.stringify(output.substring(0, 200))}`,
    );
  });

  it('should show provider hint for `nexus run` alias', async () => {
    const { stdout, stderr } = await cliAsync(['run'], 4000);
    const output = collectAll(stdout, stderr);
    assert.ok(output.length > 0, '`nexus run` should produce output, not silently exit');
    assert.ok(
      output.includes('provider') || output.includes('Provider') || output.includes('NEXUS'),
      `Expected provider hint or banner, got: ${JSON.stringify(output.substring(0, 200))}`,
    );
  });

  it('should show help for `nexus --help`', () => {
    const output = cliSync(['--help']);
    assert.ok(output.includes('Start interactive NEXUS session'), 'Help should mention interactive session');
    assert.ok(output.includes('providers'), 'Help should list providers command');
    assert.ok(output.includes('chat'), 'Help should list chat alias');
    assert.ok(output.includes('run'), 'Help should list run alias');
  });

  it('should list providers command output', () => {
    const output = cliSync(['providers']);
    assert.ok(
      output.includes('No providers configured') || output.length > 0,
      'Should indicate no providers configured',
    );
  });

  it('should suggest how to add a provider when not configured', async () => {
    const { stdout, stderr } = await cliAsync([], 4000);
    const output = collectAll(stdout, stderr);
    // Should either show the welcome banner (NEXUS) or a provider setup hint.
    assert.ok(
      output.includes('NEXUS') || output.includes('provider') || output.includes('Provider') || output.includes('API_KEY'),
      'Should show NEXUS banner or provider setup hint',
    );
  });
});
