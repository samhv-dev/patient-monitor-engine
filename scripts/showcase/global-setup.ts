// Showcase proofs: serve the kit with its PERL server before the tests, stop it after.
//   default: the kit's own launcher (`Start Simulator.command`, PME_ONLY=perl, env -i PATH=/usr/bin:/bin)
//   SHOWCASE_PREFIX=/patient-monitor-engine/: the kit's app copied under that sub-path of a temp root and served by
//   server/serve.pl directly (the GitHub Pages layout: https://<user>.github.io/<repo>/)
import { spawn, type ChildProcess } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export default async function globalSetup(): Promise<() => Promise<void>> {
  const kit = resolve(process.env.SHOWCASE_KIT ?? join(import.meta.dirname, '../../pme-showcase'));
  if (!existsSync(join(kit, 'app/index.html'))) throw new Error(`no kit at ${kit} (set SHOWCASE_KIT)`);
  const prefix = (process.env.SHOWCASE_PREFIX ?? '').replace(/^\/?/, '/').replace(/\/?$/, '');
  const tmp = mkdtempSync(join(tmpdir(), 'pme-showcase-pw-'));
  let proc: ChildProcess;
  let port: number;
  if (prefix && prefix !== '/') {
    cpSync(join(kit, 'app'), join(tmp, 'root', prefix), { recursive: true });
    proc = spawn('/usr/bin/perl', [join(kit, 'server/serve.pl'), join(tmp, 'root'), '8700', join(tmp, 'port')], { stdio: 'ignore' });
    for (let i = 0; i < 100 && !existsSync(join(tmp, 'port')); i++) await new Promise((r) => setTimeout(r, 100));
    port = Number(readFileSync(join(tmp, 'port'), 'utf8'));
  } else {
    proc = spawn('/usr/bin/env', ['-i', 'PATH=/usr/bin:/bin', 'PME_ONLY=perl', 'PME_NO_OPEN=1', 'PME_PORT=8700', join(kit, 'Start Simulator.command')], { stdio: ['ignore', 'pipe', 'pipe'] });
    port = await new Promise<number>((ok, no) => {
      let out = '';
      const t = setTimeout(() => no(new Error(`launcher gave no address:\n${out}`)), 25_000);
      proc.stdout?.on('data', (b) => {
        out += b;
        const m = /ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\/[\s\S]*SERVER: perl/.exec(out);
        if (m) {
          clearTimeout(t);
          ok(Number(m[1]));
        }
      });
    });
  }
  process.env.SHOWCASE_BASE = `http://127.0.0.1:${port}${prefix === '/' ? '' : prefix}`;
  process.env.SHOWCASE_SERVER = prefix && prefix !== '/' ? `perl (serve.pl direct, sub-path ${prefix}/)` : 'perl (through the launcher)';
  console.log(`[showcase] kit ${kit} served at ${process.env.SHOWCASE_BASE}/ by ${process.env.SHOWCASE_SERVER}`);
  return async () => {
    proc.kill('SIGHUP');
    rmSync(tmp, { recursive: true, force: true });
  };
}
