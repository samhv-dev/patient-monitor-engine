// Performance gate page (BUILD-PLAN Stage 8 "Performance"): an 8-lane monitor (ECG II, V5, aVR, ABP, pleth, CVP, CO2,
// resp) with a ventilated patient. Query: ?fps=60|30, ?worker=off (main-thread engine: its heap is then the page's,
// which the soak measures), ?scale=1. Exposes window.__pmePerf: rAF frame intervals, alarm log, sim time. The same
// page is the manual iPad check (open it on the iPad, read the stats line after 2 min).
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

const q = new URLSearchParams(location.search);
const fps = q.get('fps') === '30' ? 30 : 60;
const pm = mountMonitor(document.getElementById('monitor') as HTMLElement, {
  engine: { seed: 11, patient: { baseline: { hr: 78, sbp: 124, dbp: 72 }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on', nibp: 'on' } } },
  lanes: ['ecgII', 'V5', 'aVR'],
  waves: ['abp', 'pleth', 'cvp', 'co2', 'resp'],
  nibp: true,
  temp: true,
  fps,
  worker: q.get('worker') === 'off' ? 'off' : 'auto',
});
const cmds: Array<Record<string, unknown>> = [
  { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } },
  { type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 3 } },
];
cmds.forEach((c, i) => void pm.dispatch({ id: `perf-${i}`, issuedBy: 'perf', ...c } as Command));
if (q.get('scale')) pm.setTimeScale(Number(q.get('scale')));

const frames: number[] = [];
const alarms: Array<{ t: number; id: string; state: string }> = [];
let simT = 0;
pm.on((e: EngineEvent) => {
  if ('t' in e) simT = Math.max(simT, e.t);
  if (e.type === 'alarm') alarms.push({ t: e.t, id: e.id, state: e.state });
});
let last = performance.now();
const tick = (now: number) => {
  frames.push(now - last);
  last = now;
  if (frames.length > 200_000) frames.splice(0, 100_000);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const stats = document.getElementById('stats') as HTMLElement;
setInterval(() => {
  const f = frames.slice(-600).sort((a, b) => a - b);
  const p = (x: number) => (f[Math.floor(x * (f.length - 1))] ?? 0).toFixed(1);
  void pm.renderPath.then((rp) => {
    stats.textContent = `path ${rp} · target ${fps} fps · frame ms p50 ${p(0.5)} p95 ${p(0.95)} p99 ${p(0.99)} · sim ${simT.toFixed(0)} s · alarms ${alarms.filter((a) => a.state === 'raised').length}`;
  });
}, 1000);
(window as unknown as { __pmePerf: unknown }).__pmePerf = { frames, alarms, get simT() { return simT; }, fps, renderPath: pm.renderPath };
