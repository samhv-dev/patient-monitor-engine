// apps/demo/scripts/stage7d-shots.mjs — Gate 7d screenshots: runs the stage7d e2e spec with PME_SHOTS=1 on headless
// system Chrome (a hidden desktop pane throttles rAF — Gate 1 lesson); the spec writes the PNGs to docs/gates/stage-7d/.
// Usage (repo root): node apps/demo/scripts/stage7d-shots.mjs
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['-y', 'pnpm@9.15.9', 'exec', 'playwright', 'test', 'apps/demo/e2e/stage7d.e2e.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PW_SYSTEM_CHROME: '1', PME_SHOTS: '1' },
});
process.exit(r.status ?? 1);
