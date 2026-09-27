// Gate 7c screenshots (headless system Chrome). Usage: (cd apps/demo && npx vite preview --port 4817 --strictPort &) then
//   node apps/demo/scripts/stage7c-shots.mjs http://localhost:4817 docs/gates/stage-7c
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4817', out = 'docs/gates/stage-7c'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1420, height: 760 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
const wait = (s) => p.waitForTimeout(s * 1000);
const shot = (name) => p.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 1420, height: 640 }, type: 'png' });
await p.goto(`${base}/stage7c.html`);
await wait(12);
await shot('baseline');
await p.click('#storyBleed'); // ×4: 30 sim-min ≈ 7.5 min wall
await wait(460);
await shot('haemorrhage-30min'); // live panel: lactate 3–5, BE falling; ABG sent
await wait(160);
await shot('haemorrhage-abg'); // ABG result panel filled
await p.goto(`${base}/stage7c.html?burns=1`);
await wait(12);
await p.click('#storySux');
await wait(240);
await shot('hyperk-sux'); // K ≈ 7.7, wide QRS / peaked T in II and V5
await wait(120);
await shot('hyperk-calcium'); // QRS narrower after CaCl2
await p.goto(`${base}/stage7c.html`);
await wait(12);
await p.selectOption('#fluid', 'saline');
await p.click('#storySaline');
await wait(900); // 60 sim-min at ×4
await shot('saline-2L'); // Cl ↑ BE ↓
if (errors.length) console.error('page errors:', errors);
await b.close();
