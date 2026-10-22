// Photo | build side by side, a 50 % overlay below (the rc.3 review's composite layout), drawn on a canvas in Chromium.
// usage: node compose.mjs <worktree> photo.png build.png out.png "build label"
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const [wt, photo, build, out, label] = process.argv.slice(2);
const req = createRequire(join(resolve(wt), 'package.json'));
const pwm = await import(req.resolve('@playwright/test'));
const pw = pwm.chromium ? pwm : pwm.default;
const url = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
const browser = await pw.chromium.launch();
try {
  const page = await browser.newPage();
  const b64 = await page.evaluate(async ({ p, b, label }) => {
    const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
    const [P, B] = await Promise.all([load(p), load(b)]);
    const c = document.createElement('canvas');
    c.width = 2560; c.height = 1660;
    const x = c.getContext('2d');
    x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(P, 0, 0, 1280, 800); x.drawImage(B, 1280, 0, 1280, 800);
    x.drawImage(P, 640, 830, 1280, 800); x.globalAlpha = 0.5; x.drawImage(B, 640, 830, 1280, 800); x.globalAlpha = 1;
    x.fillStyle = '#fff'; x.font = '18px Arial'; x.textBaseline = 'top';
    x.fillText('PHOTO IMG_8113 (rectified)', 8, 806); x.fillText(label, 1288, 806); x.fillText('OVERLAY 50 % (photo + build)', 648, 1636);
    return c.toDataURL('image/png').split(',')[1];
  }, { p: url(photo), b: url(build), label });
  writeFileSync(out, Buffer.from(b64, 'base64'));
} finally {
  await browser.close();
}
