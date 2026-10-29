// Explicit local integration tooling, never called by npm test or CI.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export const cliVersion = '2.122.0';
export let api, mail;
let stackId, database;
export function cli(args, options = {}) {
  return execFileSync('npx', ['--yes', `supabase@${cliVersion}`, '--workdir', root, ...args], { cwd: root, encoding: 'utf8', ...options });
}
export function settings() {
  const status = JSON.parse(cli(['status', '--output-format', 'json'], { stdio: ['ignore', 'pipe', 'pipe'] }));
  if (status.runtime !== 'docker' || realpathSync(status.identity.project_root) !== realpathSync(root)) throw new Error('Not this isolated local Docker project');
  for (const endpoint of Object.values(status.endpoints)) if (endpoint.address !== '127.0.0.1') throw new Error('Non-loopback local endpoint');
  stackId = status.identity.id;
  api = status.env.API_URL; mail = status.env.MAILPIT_URL;
  if (![api, mail].every(url => new URL(url).hostname === '127.0.0.1')) throw new Error('Non-local service');
  database = execFileSync('docker', ['ps', '--filter', `label=com.supabase.stack=${stackId}`, '--filter', 'label=com.supabase.service=database', '--format', '{{.ID}}'], { encoding: 'utf8' }).trim();
  if (!/^[a-f0-9]{12,64}$/.test(database)) throw new Error('Expected one isolated database container');
  return { key: status.env.ANON_KEY ?? status.env.PUBLISHABLE_KEY };
}
export function sql(query) {
  if (!database) settings();
  // Only this worktree's synthetic container; no remote URL/env fallback.
  return execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], {
    input: query, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  }).trim();
}
function assertLoopback() {
  settings();
  const containers = execFileSync('docker', ['ps', '--filter', `label=com.supabase.stack=${stackId}`, '--format', '{{.ID}}'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const rows = JSON.parse(execFileSync('docker', ['inspect', ...containers], { encoding: 'utf8' }));
  for (const row of rows) for (const bindings of Object.values(row.NetworkSettings.Ports ?? {})) {
    for (const binding of bindings ?? []) if (binding.HostIp !== '127.0.0.1') throw new Error(`Non-loopback published port on ${row.Name}; stop this project`);
  }
  console.log(`Local stack: ${rows.length} running containers, published ports bound to loopback`);
}
function main(command) {
  if (!readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8').includes('stack = true')) throw new Error('Requires isolated experimental local stack');
  if (command === 'start') {
    // This pinned stack runtime binds Docker ports explicitly to loopback. Ports/project data
    // are isolated per worktree; never use the legacy CLI's all-interface port publishing.
    cli(['start', '--runtime', 'docker', '--frozen'], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 8 * 1024 * 1024 });
    assertLoopback();
  } else if (command === 'reset') {
    assertLoopback();
    cli(['db', 'reset', '--local', '--no-seed'], { stdio: ['ignore', 'pipe', 'inherit'] });
    console.log('Rebuilt this worktree synthetic database from migrations');
  } else if (command === 'status') {
    assertLoopback();
    console.log(`CLI ${cliVersion}; PostgreSQL ${sql('show server_version;')}; API ${api}; mail ${mail}`);
    console.log(execFileSync('docker', ['ps', '--filter', `label=com.supabase.stack=${stackId}`, '--format', '{{.Names}} {{.Image}}'], { encoding: 'utf8' }).trim());
  } else if (command === 'stop') {
    cli(['stop'], { stdio: ['ignore', 'pipe', 'inherit'] });
    console.log('Stopped this worktree project; local data retained');
  } else throw new Error('Usage: node scripts/sync-local.mjs start|reset|status|stop');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv[2]);
