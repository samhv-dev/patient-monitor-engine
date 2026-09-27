// Stage 7a demo: the circulation with a profile picker, lesions, drugs, events, CPR, IABP/LVAD, a PV-loop view and a
// chamber-pressure view. The monitor is mounted exactly as stage2.ts does. The teaching views read a SHADOW engine
// in this thread (same options, same commands at the same ticks, advanced to the monitor's clock): the engine is
// deterministic, so the shadow is the monitor's patient without a sample channel through the worker protocol.
import { createEngine, type ChannelId, type Command, type EngineEvent, type EngineOptions, type MonitorEngine, type PatientProfile } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const PRESETS: Record<string, PatientProfile> = {
  adult: { ageY: 40, sex: 'M', weightKg: 70 },
  elderly: { ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }] },
  ascad: { ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] },
  hfref: { ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }] },
  child: { ageY: 6, sex: 'M', weightKg: 20 },
  bb: { ageY: 40, sex: 'M', weightKg: 70, conditions: [{ id: 'betaBlocked' }] },
};

function profile(): PatientProfile {
  const p = structuredClone(PRESETS[$<HTMLSelectElement>('preset').value] ?? PRESETS.adult!);
  const cs = [...(p.conditions ?? [])];
  for (const id of ['as', 'mr', 'ar', 'cad'] as const) {
    const g = $<HTMLSelectElement>(id).value;
    if (g) cs.push({ id, grade: g });
  }
  const hf = Number($<HTMLInputElement>('hf').value);
  if (hf > 0) cs.push({ id: 'hfref', severity: hf });
  return { ...p, conditions: cs, sensors: { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', nibp: 'on' } };
}

let pm: MonitorHandle | null = null;
let shadow: MonitorEngine | null = null;
let tMon = 0; // the monitor's sim time, from its events
let lastCirc: Extract<EngineEvent, { type: 'circ' }> | null = null;
const events: EngineEvent[] = []; // for the e2e hook (circ and state only)
let seq = 0;
type Body = Record<string, unknown>;

/** Send to the monitor and the shadow at the same tick (0.3 s ahead of the monitor's clock). */
async function send(body: Body): Promise<{ accepted: boolean; reason?: string }> {
  if (!pm || !shadow) return { accepted: false, reason: 'not started' };
  const atTick = Math.round((tMon + 0.3) * 50);
  const cmd = { id: `d${++seq}`, issuedBy: 'stage7a', ...body, atTick } as Command;
  shadow.dispatch({ ...cmd, id: `${cmd.id}s` } as Command);
  const r = await pm.dispatch(cmd);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r;
}

function start(): void {
  pm?.destroy();
  $('monitor').innerHTML = '';
  tMon = 0;
  lastCirc = null;
  events.length = 0;
  const engine: EngineOptions = { seed: 7, mode: $<HTMLSelectElement>('mode').value as 'manual' | 'modeled', patient: profile() };
  shadow = createEngine(engine);
  shadow.on((x) => {
    if (x.type === 'circ') lastCirc = x;
  }, ['circ']);
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'pap', 'cvp', 'pleth'], nibp: true });
  pm.on((x) => {
    const t = (x as { t?: number }).t;
    if (typeof t === 'number' && t > tMon && x.type !== 'tone') tMon = Math.min(t, tMon + 5);
    if (x.type === 'circ' || x.type === 'state') events.push(x);
  });
  void send({ type: 'attachSensor', sensor: 'pv', state: 'on' });
  void send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } });
}

let peep = 5;
let cpr = false;
let iabp = 0;
let lvad = false;
$('restart').onclick = start;
document.querySelectorAll<HTMLButtonElement>('[data-drug]').forEach((b) => {
  b.onclick = () => {
    const [drugId, dose, unit] = (b.dataset.drug as string).split(',');
    void send({ type: 'applyEvent', event: { kind: 'drug', drugId, dose: Number(dose), unit, route: 'iv' } });
  };
});
document.querySelectorAll<HTMLButtonElement>('[data-cond]').forEach((b) => {
  b.onclick = () => void send({ type: 'applyEvent', event: { kind: 'condition', id: b.dataset.cond, severity: 0.8 } });
});
$('bleed').onclick = () => void send({ type: 'applyEvent', event: { kind: 'bleed', volumeMl: 1000, overS: 600 } });
$('fluid').onclick = () => void send({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 } });
$('cpr').onclick = () => void send({ type: 'applyEvent', event: { kind: 'cpr', active: (cpr = !cpr), rate: 110, quality: 0.8 } });
$('vf').onclick = () => void send({ type: 'setRhythm', rhythm: 'vfCoarse' });
$('sinus').onclick = () => void send({ type: 'setRhythm', rhythm: 'sinus' });
$('peep').onclick = () => void send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: (peep = peep === 5 ? 15 : 5) } });
$('iabp').onclick = () => {
  iabp = (iabp + 1) % 3;
  void send({ type: 'device', action: iabp === 0 ? { device: 'iabp', action: 'stop' } : { device: 'iabp', action: 'start', ratio: iabp as 1 | 2 } });
};
$('lvad').onclick = () => void send({ type: 'device', action: { device: 'lvad', action: (lvad = !lvad) ? 'start' : 'stop', rpm: 5400 } });

// --- teaching views (shadow engine) -----------------------------------------------------------------------------
const N = 375; // 3 s at 125 Hz
const buf = new Map<ChannelId, Float32Array>();
function last(ch: ChannelId): Float32Array | null {
  if (!shadow) return null;
  const end = shadow.latestSampleIndex(ch);
  if (end < N) return null;
  const a = buf.get(ch) ?? new Float32Array(N);
  buf.set(ch, a);
  shadow.readSamples(ch, end - N + 1, a);
  return a;
}
function frame(g: CanvasRenderingContext2D, w: number, h: number, title: string): void {
  g.fillStyle = '#080808';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#333';
  g.strokeRect(34, 8, w - 42, h - 30);
  g.fillStyle = '#999';
  g.font = '11px system-ui';
  g.fillText(title, 40, 20);
}
const pv = $<HTMLCanvasElement>('pv').getContext('2d') as CanvasRenderingContext2D;
const ch = $<HTMLCanvasElement>('ch').getContext('2d') as CanvasRenderingContext2D;
function draw(): void {
  const W = 330;
  const H = 220;
  const p = last('lvp');
  const v = last('lvv');
  frame(pv, W, H, 'LV pressure–volume loop (3 s)');
  pv.fillStyle = '#777';
  pv.fillText('LVV 0–250 mL', 140, H - 6);
  pv.fillText('200', 6, 14);
  pv.fillText('0', 20, H - 22);
  if (p && v) {
    pv.strokeStyle = '#ff5050';
    pv.lineWidth = 1.5;
    pv.beginPath();
    for (let i = 0; i < N; i++) {
      const x = 34 + ((W - 42) * (v[i] as number)) / 250;
      const y = H - 22 - ((H - 30) * (p[i] as number)) / 200;
      if (i === 0) pv.moveTo(x, y);
      else pv.lineTo(x, y);
    }
    pv.stroke();
  }
  frame(ch, W, H, 'chamber pressures (3 s, mmHg 0–200)');
  const lanes: [ChannelId, string][] = [['lvp', '#ff5050'], ['lap', '#ffb040'], ['pat', '#e0e060'], ['rvp', '#50a0ff'], ['rap', '#60e0e0']];
  lanes.forEach(([c, color], k) => {
    const a = last(c);
    ch.fillStyle = color;
    ch.fillText(c.toUpperCase(), 40 + k * 48, H - 6);
    if (!a) return;
    ch.strokeStyle = color;
    ch.lineWidth = 1.2;
    ch.beginPath();
    for (let i = 0; i < N; i++) {
      const x = 34 + ((W - 42) * i) / (N - 1);
      const y = H - 22 - ((H - 30) * Math.max(0, a[i] as number)) / 200;
      if (i === 0) ch.moveTo(x, y);
      else ch.lineTo(x, y);
    }
    ch.stroke();
  });
  const c = lastCirc;
  $('diag').textContent = c
    ? `CO ${c.co.toFixed(1)} L/min  SV ${c.sv.toFixed(0)}  EF ${(c.ef * 100).toFixed(0)} %\nLVEDV ${c.lvedv.toFixed(0)}  LVEDP ${c.lvedp.toFixed(0)}  LVSP ${c.lvsp.toFixed(0)}\n` +
      `Pmsf ${c.pmsf.toFixed(1)}  SVR ${c.svr.toFixed(2)}  PVR ${c.pvr.toFixed(2)}\nCPP ${c.cpp.toFixed(0)}  S/D ${c.supplyDemand.toFixed(2)}  kIsch ${c.kIsch.toFixed(2)}` +
      (c.lvad ? `\nLVAD ${c.lvad.rpm} rpm ${c.lvad.flowLpm.toFixed(1)} L/min PI ${c.lvad.pi.toFixed(1)}${c.lvad.suction ? ' SUCTION' : ''}` : '') +
      (c.iabp ? `\nIABP 1:${c.iabp.ratio} peak ${c.iabp.augmentation.toFixed(0)}` : '')
    : '';
}
setInterval(() => {
  if (shadow && tMon > 0) shadow.advanceTo(tMon);
  draw();
}, 100);

start();
(window as unknown as { __pme7a: unknown }).__pme7a = { send, events, restart: start, simT: () => tMon, timeScale: (k: number) => pm?.setTimeScale(k), ready: true };
