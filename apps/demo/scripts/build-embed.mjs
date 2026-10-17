// Writes dist/embed/ventilator-monitor.html (Stage 8b): vent-hamilton.html's markup and CSS, the monitor on the
// right half, and two classic scripts instead of the Vite module entry, so the folder opens from file:// with no
// server. Copies the release IIFE (with its source map, so its sourceMappingURL resolves) beside it, and LICENSE,
// NOTICES.md and LICENSES/ into the folder, so every copy of the embed carries its licence texts (8b review ruling 1).
// Every anchor must match exactly once, or the build fails.
import { copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const here = import.meta.dirname;
const out = resolve(here, '../dist/embed');
let html = readFileSync(resolve(here, '../vent-hamilton.html'), 'utf8');
const swap = (find, repl) => {
  const n = html.split(find).length - 1;
  if (n !== 1) throw new Error(`build-embed: anchor found ${n} times: ${find}`);
  html = html.replace(find, repl);
};
swap(/<title>[^<]*<\/title>/.exec(html)?.[0] ?? '<title>', '<title>Ventilator + patient monitor (file:// embed)</title>');
swap('</style>', `/* embed: ventilator on the left half, monitor on the right */
#screen{right:50%}
#sheet,.scrim{right:50%}
#pme-monitor{position:fixed;top:0;right:0;bottom:0;left:50%;background:#000;border-left:1px solid #1d3f7c}
</style>`);
swap('<script type="module" src="./src/vent/hamilton-page.ts"></script>', `<div id="pme-monitor"></div>
<script src="./patient-monitor.iife.js"></script>
<script src="./pme-ventilator-embed.iife.js"></script>
<script>
  // profile from ?profile=<lung-pathology id>; window.__embed is the page's handle (e2e hook)
  var q = new URLSearchParams(location.search);
  window.__embed = PmeVentilatorEmbed.mountEmbed({ monitor: document.getElementById('pme-monitor'), profile: q.get('profile') || 'normal' });
</script>`);
writeFileSync(resolve(out, 'ventilator-monitor.html'), html);
const repo = resolve(here, '../../..');
for (const f of ['patient-monitor.iife.js', 'patient-monitor.iife.js.map']) copyFileSync(resolve(repo, 'packages/renderer/dist', f), resolve(out, f));
for (const f of ['LICENSE', 'NOTICES.md']) copyFileSync(resolve(repo, f), resolve(out, f));
cpSync(resolve(repo, 'LICENSES'), resolve(out, 'LICENSES'), { recursive: true });
console.log('build-embed: dist/embed/ventilator-monitor.html + patient-monitor.iife.js(.map) + LICENSE, NOTICES.md, LICENSES/');
