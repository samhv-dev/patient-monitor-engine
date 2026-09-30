// FU-6 evidence page: five respiratory demonstrations on the Philips-like monitor (MODELED, ×4). The ground truth the
// screenshots show is printed under the monitor from the lungState/measurement events. Hook: window.__pme6.
import type { Command, EngineEvent, EngineOptions, PatientProfile } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';

type Body = Record<string, unknown>;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let pm: MonitorHandle | null = null;
let seq = 0;
let simT = 0;
const shown: Record<string, number | null> = {};
let lung: Extract<EngineEvent, { type: 'lungState' }> | null = null;

async function send(body: Body): Promise<{ accepted: boolean; reason?: string }> {
  if (!pm) return { accepted: false, reason: 'not started' };
  const r = await pm.dispatch({ id: `f6-${++seq}`, issuedBy: 'fu6', ...body } as Command);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r;
}
const ev = (event: Body) => send({ type: 'applyEvent', event });
const drug = (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' });
const vcv = (o: Body = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...o });
const later = (simS: number, fn: () => void) => { const t0 = simT; const id = setInterval(() => { if (simT >= t0 + simS) { clearInterval(id); fn(); } }, 200); };

function start(patient: PatientProfile = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }): void {
  pm?.destroy();
  $('monitor').innerHTML = '';
  simT = 0;
  lung = null;
  const engine: EngineOptions = { seed: 7, patient: { ...patient, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } };
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'] });
  pm.on((e) => {
    if ('t' in e && typeof e.t === 'number') simT = Math.max(simT, e.t); // toneCancel carries no t (stage5.ts pattern)
    if (e.type === 'lungState') lung = e;
    if (e.type === 'measurement') for (const k of ['hr', 'spo2', 'etco2', 'awrr'] as const) if (e.values[k]) shown[k] = e.values[k]!.value;
  });
  void send({ type: 'setMode', mode: 'modeled' });
  pm.setTimeScale(4);
}
const ventRig = async () => {
  await ev({ kind: 'airwayDevice', device: 'ett' });
  await vcv();
  await ev({ kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
  await drug('rocuronium', 1.2, 'mg/kg');
};

const DEMOS: Record<string, () => Promise<void>> = {
  async bronchospasm() { start(); await ventRig(); later(120, () => void ev({ kind: 'airway', state: 'bronchospasm', severity: 1 })); later(420, () => void drug('salbutamol', 250, 'mcg')); },
  async induction() { start(); await ev({ kind: 'airwayDevice', device: 'sga' }); await drug('fentanyl', 2, 'mcg/kg'); later(120, () => void drug('propofol', 2, 'mg/kg')); },
  async laryngospasm() { start(); await drug('propofol', 1, 'mg/kg'); later(90, () => void ev({ kind: 'airway', state: 'obstructed' })); later(270, () => void ev({ kind: 'airway', state: 'patent' })); },
  async kink() { start(); await ventRig(); later(120, () => void ev({ kind: 'airway', state: 'obstructed' })); },
  async anaemia() { start({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, blood: { hb: 5 } }); },
};
for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-demo]')) b.addEventListener('click', () => void DEMOS[b.dataset.demo as string]?.());
setInterval(() => {
  $('diag').textContent = `t ${simT.toFixed(0)} s  HR ${shown.hr ?? '–'}  SpO2 ${shown.spo2 ?? '–'}  EtCO2 ${shown.etco2 ?? '–'}  awRR ${shown.awrr ?? '–'}` +
    (lung ? `\nlungState: C ${lung.complianceMlPerCmH2O.toFixed(0)} mL/cmH2O  R ${lung.resistanceCmH2OPerLps.toFixed(0)} cmH2O/L/s  auto-PEEP ${(lung.autoPeepCmH2O ?? 0).toFixed(1)}  shunt ${lung.shunt.toFixed(2)}` : '');
}, 500);
start();
(window as unknown as { __pme6: unknown }).__pme6 = { demo: (n: string) => DEMOS[n]?.(), simT: () => simT, timeScale: (k: number) => pm?.setTimeScale(k), ready: true };
