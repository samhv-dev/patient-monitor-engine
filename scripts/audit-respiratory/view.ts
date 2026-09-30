// View saved scenario rows: node view.ts <name> <every s> <col,col,...> [t0] [t1]   (reads $RESULTS/<name>.json)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [name, every = '60', cols = 't,rhythm,hr,map,spo2,sao2,pao2,paco2,et,etD,ph', t0 = '0', t1 = '1e9'] = process.argv.slice(2);
const j = JSON.parse(readFileSync(join(process.env.RESULTS ?? 'results', `${name}.json`), 'utf8'));
const cs = cols.split(',');
const f = (v: unknown) => (typeof v === 'number' ? (Number.isFinite(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)) : '–') : String(v).slice(0, 9));
console.log(`# ${name}: ${j.scenario.title}`);
for (const l of j.log) if (!l.startsWith('1s')) console.log('#  ' + l.replace(/\{.*\}/, '').trim());
console.log(cs.join('\t'));
for (const r of j.rows) if (r.t >= +t0 && r.t <= +t1 && (Math.abs(r.t / +every - Math.round(r.t / +every)) < 1e-6)) console.log(cs.map((c) => f(r[c])).join('\t') + (r.noEject ? '\tNO-EJECT' : '') + (r.pulseless ? '\tPULSELESS' : ''));
if (j.alarms?.length) console.log('# alarms: ' + j.alarms.slice(0, 30).join(' '));
