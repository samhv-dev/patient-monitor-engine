// Kit round A: serve the BUILT kit with its own "Start Classroom.command" (the relay on Node >= 22, `--static app`), the
// launcher the presenter double-clicks on the day; stop it after. PME_NO_OPEN=1 (no browser), PME_PORT=8760 (8650 is the
// kit's default; a different first port keeps a presenter's own classroom free on this Mac).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export default async function globalSetup(): Promise<() => Promise<void>> {
  const kit = resolve(process.env.SHOWCASE_KIT ?? '');
  if (!existsSync(join(kit, 'app/index.html'))) throw new Error(`no kit at ${kit} (set SHOWCASE_KIT)`);
  // FINDING KR-A1 (kit round A): the kit's bundled server/relay.mjs dies on the first client WebSocket frame of 32 bytes
  // or more ("TypeError: bufferUtil$1.unmask is not a function": Vite bundled ws's optional `bufferutil` as an empty stub,
  // so ws's try/require never falls back). WS_NO_BUFFER_UTIL=1 makes ws use its own JavaScript unmasking, which is what the
  // source relay (packages/controller/relay, no bufferutil installed) runs. The measurements need it; the kit as built
  // does not set it. KITROUND_WS_WORKAROUND=0 runs the kit exactly as built (the relay then dies at the instructor's hello).
  const ws = process.env.KITROUND_WS_WORKAROUND === '0' ? {} : { WS_NO_BUFFER_UTIL: '1' };
  const env = { PATH: '/usr/bin:/bin:/opt/homebrew/bin:/usr/local/bin', TMPDIR: process.env.TMPDIR ?? '/tmp', PME_NO_OPEN: '1', PME_PORT: process.env.KITROUND_PORT ?? '8760', ...ws };
  const proc = spawn('/bin/bash', [join(kit, 'Start Classroom.command')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  const out: string[] = [];
  const port = await new Promise<number>((ok, no) => {
    const t = setTimeout(() => no(new Error(`Start Classroom gave no address:\n${out.join('')}`)), 30_000);
    proc.stdout?.on('data', (b) => {
      out.push(String(b));
      const m = /ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\/\?relay/.exec(out.join(''));
      if (m) {
        clearTimeout(t);
        ok(Number(m[1]));
      }
    });
    proc.on('exit', (c) => no(new Error(`Start Classroom exited ${c}:\n${out.join('')}`)));
  });
  process.env.SHOWCASE_BASE = `http://127.0.0.1:${port}`;
  process.env.SHOWCASE_SERVER = `Start Classroom.command (relay + static app, ${/SERVER: ([^\n]*)/.exec(out.join(''))?.[1] ?? 'node'}${'WS_NO_BUFFER_UTIL' in ws ? ', WS_NO_BUFFER_UTIL=1 (finding KR-A1)' : ', as built'})`;
  console.log(`[kit-round] kit ${kit} served at ${process.env.SHOWCASE_BASE}/?relay by ${process.env.SHOWCASE_SERVER}`);
  return async () => {
    proc.kill('SIGHUP');
  };
}
