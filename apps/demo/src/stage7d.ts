// Stage 7d demo: the monitor with the ICP lane, an organ side panel (ICP/CPP, PbtO2, UOP tiles from the renderer's
// formatters, the organs truth line, a 30 min trend) and the brain/kidney actions. Drugs are 7g events (7d owns none).
import type { Command, EngineEvent, EngineOptions, Measured } from '@pme/engine-core';
import { formatIcp, formatPbto2, formatUop, mountMonitor, type MonitorHandle } from '@pme/renderer';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Body = Record<string, unknown>;
type OrgansEv = Extract<EngineEvent, { type: 'organs' }>;
const KG = 70;
const TBI = [{ id: 'tbi', severity: 1 }];

let pm: MonitorHandle | null = null;
let seq = 0;
let simT = 0;
let last: OrgansEv | null = null;
const meas: Partial<Record<'icpMean' | 'cpp' | 'pbto2' | 'uop', Measured>> = {};
const trend: Array<[number, number, number, number]> = []; // t, ICP, CPP, UOP mL/kg/h

async function send(body: Body): Promise<{ accepted: boolean; reason?: string }> {
  if (!pm) return { accepted: false, reason: 'not started' };
  const r = await pm.dispatch({ id: `d${++seq}`, issuedBy: 'stage7d', ...body } as Command);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r;
}
const ev = (event: Body) => send({ type: 'applyEvent', event });
const drug = (drugId: string, dose: number, unit: string, extra: Body = {}) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...extra });
const target = (variable: string, value: number, durationS: number) => send({ type: 'setTarget', variable, value, ramp: { durationS } });
const vent = (rr: number) => ev({ kind: 'ventilation', source: 'ventilator', rr, vtMl: 500, fio2: 0.4, peep: 5 }); // RR 18 ≈ PaCO2 40

function start(conditions: { id: string; severity: number }[]): void {
  pm?.destroy();
  $('monitor').innerHTML = '';
  simT = 0;
  last = null;
  trend.length = 0;
  const engine: EngineOptions = { seed: 7, patient: { weightKg: KG, baseline: { sbp: 110, dbp: 72, hr: 80 }, conditions, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } };
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'icp', 'pleth', 'co2'] });
  pm.on((e) => {
    if (e.type === 'organs') {
      last = e;
      simT = e.t;
      trend.push([e.t, e.brain.icp, e.brain.cpp, e.kidney.uopMlKgH]);
      while (trend.length && (trend[0] as [number, number, number, number])[0] < e.t - 1800) trend.shift();
    } else if (e.type === 'measurement') {
      for (const k of ['icpMean', 'cpp', 'pbto2', 'uop'] as const) if (e.values[k]) meas[k] = e.values[k];
    }
  });
  void vent(18);
  void send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
  void send({ type: 'attachSensor', sensor: 'pbto2', state: 'on' });
  void send({ type: 'attachSensor', sensor: 'urometer', state: 'on' });
  for (const id of ['sIcp', 'sPbto2', 'sUro']) $(id).setAttribute('aria-pressed', 'true');
}

const toggle = (id: string, on: (pressed: boolean) => void) =>
  $(id).addEventListener('click', () => {
    const p = $(id).getAttribute('aria-pressed') !== 'true';
    $(id).setAttribute('aria-pressed', String(p));
    on(p);
  });
const click = (id: string, f: () => unknown) => $(id).addEventListener('click', () => void f());

// Brain
click('restartTbi', () => start(TBI));
click('restartAdult', () => start([]));
click('bleed1', () => ev({ kind: 'brain', massRateMlPerMin: 1 }));
click('bleed0', () => ev({ kind: 'brain', massRateMlPerMin: 0 }));
click('mass15', () => ev({ kind: 'brain', massMl: 15 }));
click('mass28', () => ev({ kind: 'brain', massMl: 28 }));
click('mannitol', () => drug('mannitol', 1, 'g/kg'));
click('hts', () => drug('hypertonicSaline', 250, 'mL', { concentrationPct: 3 }));
click('hyper', () => vent(30));
click('normo', () => vent(18));
click('headUp', () => ev({ kind: 'position', headUpDeg: 30 }));
click('flat', () => ev({ kind: 'position', headUpDeg: 0 }));
$('anaes').addEventListener('change', () => {
  const v = $<HTMLSelectElement>('anaes').value;
  void ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: v === 'propofol' ? 3 : 0 });
  void ev({ kind: 'vaporiser', agent: v === 'iso' ? 'isoflurane' : 'sevoflurane', dialPct: v === 'sevo' ? 2.7 : v === 'iso' ? 1.75 : 0, fgfLpm: 2 });
  if (v === 'ketamine') void drug('ketamine', 1.5, 'mg/kg');
});
toggle('sIcp', (p) => void send({ type: 'attachSensor', sensor: 'icp', state: p ? 'on' : 'off' }));
toggle('sPbto2', (p) => void send({ type: 'attachSensor', sensor: 'pbto2', state: p ? 'on' : 'off' }));
click('check19', () => {
  start(TBI);
  pm?.setTimeScale(4);
  $<HTMLSelectElement>('speed').value = '4';
  return ev({ kind: 'brain', massRateMlPerMin: 1 });
});

// Kidney
click('bleed', async () => {
  await target('volumeStatus', 0.2, 60);
  await target('sbp', 85, 60);
  await target('dbp', 50, 60);
  await target('hr', 125, 60);
});
click('fluids', async () => {
  await target('volumeStatus', 0.95, 300);
  await target('sbp', 118, 300);
  await target('dbp', 72, 300);
  await target('hr', 85, 300);
});
click('furo', () => drug('furosemide', 40, 'mg'));
click('ne', () => ev({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' }));
click('neOff', () => ev({ kind: 'infusion', drugId: 'norepinephrine', rate: 0, unit: 'mcg/kg/min' }));
click('map70', async () => {
  await target('sbp', 95, 60);
  await target('dbp', 58, 60);
});
click('emptyBag', () => ev({ kind: 'renal', emptyBag: true }));
toggle('kdigo', (p) => void ev({ kind: 'renal', timeScale: p ? 12 : 1 }));
toggle('sUro', (p) => void send({ type: 'attachSensor', sensor: 'urometer', state: p ? 'on' : 'off' }));
$('speed').addEventListener('change', () => pm?.setTimeScale(Number($<HTMLSelectElement>('speed').value)));

// Panel
function tile(id: string, f: { main: string; sub?: string; status: string }): void {
  const el = $(id);
  (el.querySelector('b') as HTMLElement).textContent = f.main;
  const sub = el.querySelector('span');
  if (sub) sub.textContent = f.sub ?? '';
  (el.querySelector('em') as HTMLElement).textContent = f.status;
}
const ctx = $<HTMLCanvasElement>('trend').getContext('2d') as CanvasRenderingContext2D;
function drawTrend(): void {
  const W = 360;
  const H = 110;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);
  const x = (t: number) => W - ((simT - t) / 1800) * W;
  const y = (v: number) => H - (Math.max(0, Math.min(100, v)) / 100) * H; // 0–100 scale
  const line = (i: 1 | 2 | 3, color: string, k = 1) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    trend.forEach((p, n) => (n === 0 ? ctx.moveTo(x(p[0]), y(p[i] * k)) : ctx.lineTo(x(p[0]), y(p[i] * k))));
    ctx.stroke();
  };
  line(1, '#fff');
  line(2, '#3c3');
  line(3, '#ff3', 20);
}
setInterval(() => {
  tile('tIcp', formatIcp(meas.icpMean, meas.cpp));
  tile('tPbto2', formatPbto2(meas.pbto2));
  tile('tUop', formatUop(meas.uop, last?.kidney.cumMl, KG));
  drawTrend();
  if (last) {
    const b = last.brain;
    const k = last.kidney;
    $('organs').textContent =
      `t ${last.t.toFixed(0)} s  brain ${b.state}  Cushing ${b.cushing.toFixed(2)}\n` +
      `ICP ${b.icp.toFixed(1)}  CPP ${b.cpp.toFixed(0)}  MAP(head) ${b.mapHead.toFixed(0)}  PaCO2 ${b.paco2.toFixed(1)}\n` +
      `CBF ${(100 * b.cbf).toFixed(0)} %  CMRO2 ${(100 * b.cmro2).toFixed(0)} %  SjvO2 ${(100 * b.sjvo2).toFixed(0)} %  E ${b.elastance.toFixed(2)} mmHg/mL\n` +
      `GFR ${k.gfr.toFixed(0)} mL/min  RBF ${k.rbf.toFixed(0)}  UOP ${k.uopMlKgH.toFixed(2)} mL/kg/h (1 h ${k.uop1hMlKgH.toFixed(2)})\n` +
      `urine Σ ${k.cumMl.toFixed(0)} mL  bag ${k.bagMl.toFixed(0)}  AKI ${k.akiStage}${k.oliguria ? '  OLIGURIA' : ''}\n` +
      `lactate ${last.liver.lactate.toFixed(2)}  kLac ${last.liver.kLacPerH.toFixed(2)}/h  HBF ${(100 * last.liver.hbfRel).toFixed(0)} %`;
  }
}, 500);

start(TBI);
(window as unknown as { __pme7d: unknown }).__pme7d = {
  send, restart: (tbi = true) => start(tbi ? TBI : []), simT: () => simT, organs: () => last, timeScale: (k: number) => pm?.setTimeScale(k), ready: true,
};
