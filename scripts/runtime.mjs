import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const runtimeEnv = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` };

export function requireNode() {
  if (process.versions.node.split('.')[0] !== '24') {
    throw new Error(`Node 24 required; running ${process.version} at ${process.execPath}. Select Node 24 before running setup or checks.`);
  }
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: runtimeEnv, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} failed (${signal || code})`)));
  });
}
