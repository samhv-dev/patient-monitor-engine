#!/usr/bin/env node
// Last-resort videos: record the five Showcase cases (Chromium, 1280×800, ×4) with the rehearsal itself, then convert
// each recording to H.264 .mp4 (plays in QuickTime) into KIT/videos/. Needs ffmpeg on PATH (never installed here).
//   node scripts/showcase/make-videos.mjs [KIT_DIR] [--convert-only]   (default ./pme-showcase; --convert-only reuses
//   the last recordings in test-results/showcase-video)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const convertOnly = process.argv.includes('--convert-only');
const kit = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'pme-showcase');
if (!existsSync(join(kit, 'app/index.html'))) throw new Error(`no kit at ${kit}`);
if (spawnSync('ffmpeg', ['-version']).status !== 0) {
  console.log('ffmpeg is not installed: no videos made (it is not installed by this script).');
  process.exit(2);
}
const results = join(repo, 'test-results/showcase-video');
if (!convertOnly) {
  rmSync(results, { recursive: true, force: true });
  const pw = spawnSync('npx', ['playwright', 'test', '-c', 'scripts/showcase/playwright.showcase.config.ts', 'rehearsal', '--project', 'video', '-g', 'Healthy induction|Anaphylaxis|bronchospasm|tamponade|haemorrhage'], {
    cwd: repo, stdio: 'inherit', env: { ...process.env, SHOWCASE_KIT: kit, SHOWCASE_VIDEO: '1', SHOWCASE_WORKERS: '1' },
  });
  console.log(`rehearsal for video exited ${pw.status}`);
}

// [a word that identifies the case in Playwright's (possibly truncated) result folder name, the file name]
const ORDER = [['healthy-induction', '1-healthy-induction'], ['anaphylaxis', '2-anaphylaxis'], ['bronchospasm', '3-bronchospasm'], ['resuscitation', '4-haemorrhage-cpr'], ['tamponade', '5-tamponade']];
const outDir = join(kit, 'videos');
mkdirSync(outDir, { recursive: true });
const dirs = existsSync(results) ? readdirSync(results) : [];
// replace the previous set only when this run recorded all five: remove every .mp4 written before (old and new names)
const found = ORDER.filter(([key]) => dirs.some((x) => x.toLowerCase().includes(key)));
if (found.length === ORDER.length) for (const f of readdirSync(outDir)) if (f.endsWith('.mp4')) rmSync(join(outDir, f));
else console.log(`only ${found.length} of ${ORDER.length} recordings: the previous videos are kept, new ones written beside them`);
let made = 0;
ORDER.forEach(([key, name]) => {
  const d = dirs.find((x) => x.toLowerCase().includes(key));
  const webm = d && readdirSync(join(results, d)).find((f) => f.endsWith('.webm'));
  if (!webm) return console.log(`no recording for ${name}`);
  const mp4 = join(outDir, `${name}.mp4`);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(results, d, webm), '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
  if (r.status === 0) {
    made++;
    console.log(`${mp4}  ${(statSync(mp4).size / 1e6).toFixed(1)} MB`);
  }
});
console.log(`${made} of ${ORDER.length} videos in ${outDir}`);
process.exit(made === ORDER.length ? 0 : 1);
