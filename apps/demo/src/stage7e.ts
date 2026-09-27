// Stage 7e demo: MH crisis with dantrolene, hypothermia under GA with warming and cold fluid, sepsis warm → cold
// (MODELED circulation), diabetic hypoglycaemia under GA. The endo panel (instructor view) is fed by the 1 Hz `endo`
// event. Drugs and fluids are Stage 7g's and 7c's events; 7e owns `stimulus`, `thermal7e` and its conditions.
import type { Command, EngineEvent, EngineOptions } from '@pme/engine-core';
import { mountEndoPanel, mountMonitor, type MonitorHandle } from '@pme/renderer';

type Body = Record<string, unknown>;
type Endo = Extract<EngineEvent, { type: 'endo' }>;
type Scenario = 'mh' | 'hypo' | 'sepsis' | 'gluc';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let pm: MonitorHandle | null = null;
let panel: ReturnType<typeof mountEndoPanel> | null = null;
let tMon = 0;
let seq = 0;
let lastEndo: Endo | null = null;
const log: string[] = [];
const note = (s: string) => {
  log.push(`${Math.round(tMon)} s  ${s}`);
  $('log').textContent = log.slice(-14).join('\n');
};

/** Send at the monitor's clock + delayS (atTick: a script step lands at its simulated time whatever the speed). */
async function send(body: Body, delayS = 0): Promise<boolean> {
  if (!pm) return false;
  const r = await pm.dispatch({ id: `e${++seq}`, issuedBy: 'stage7e', ...body, atTick: Math.round((tMon + 0.3 + delayS) * 50) } as Command);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r.accepted;
}
const event = (e: Body, delayS = 0) => send({ type: 'applyEvent', event: e }, delayS);
const drug = (drugId: string, dose: number, unit: string) => event({ kind: 'drug', drugId, dose, unit, route: 'iv' });
const vent = (rr = 12) => event({ kind: 'ventilation', source: 'ventilator', rr, vtMl: 500, fio2: 0.5, peep: 5 });

function start(s: Scenario): void {
  pm?.destroy();
  panel?.destroy();
  $('monitor').innerHTML = '';
  tMon = 0;
  lastEndo = null;
  log.length = 0;
  const engine: EngineOptions = {
    seed: 7,
    ...(s === 'sepsis' ? { mode: 'modeled' as const } : {}),
    patient: {
      ageY: 40, sex: 'M', weightKg: 70, heightCm: 175,
      ...(s === 'gluc' ? { endo: { diabetes: 'type1' as const } } : {}),
      sensors: { abp: 'connected', spo2: 'on', co2: 'on', temp: 'on' },
    },
  };
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'], temp: true });
  panel = mountEndoPanel($('endo'), { instructor: true });
  pm.on((x) => {
    const t = (x as { t?: number }).t;
    if (typeof t === 'number' && t > tMon && x.type !== 'tone') tMon = Math.min(t, tMon + 5);
    if (x.type === 'endo') {
      lastEndo = x;
      panel?.update(x);
    }
  });
  pm.setTimeScale(Number($<HTMLSelectElement>('speed').value));
  if (s === 'mh') {
    void event({ kind: 'thermal', anaesthesia: 'general' });
    void vent();
    void event({ kind: 'condition', id: 'mh', severity: 1 }, 60);
    note('GA, ventilator 12 × 500 mL; MH trigger at 60 s — watch EtCO2, HR, temperature');
  } else if (s === 'hypo') {
    void event({ kind: 'thermal', anaesthesia: 'general' });
    void vent();
    void event({ kind: 'thermal7e', exposure: 'exposed' });
    void event({ kind: 'thermal7e', exposure: 'draped' }, 600);
    note('GA, exposed for 10 min then draped: redistribution, then the linear phase');
  } else if (s === 'sepsis') {
    void event({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 600 });
    void event({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'cold', rampS: 1200 }, 1800);
    note('septic shock: warm (vasodilated, high CO), cold from 30 min (low CO, high SVR)');
  } else {
    void event({ kind: 'thermal', anaesthesia: 'general' });
    void vent();
    void event({ kind: 'stimulus', intensity: 0.5 });
    void event({ kind: 'infusion', drugId: 'insulin', rate: 20, unit: 'units/h' }, 60);
    note('type 1 diabetic under GA; insulin 20 U/h from 60 s (the wrong infusion) — unexplained tachycardia?');
  }
}

$('mh').onclick = () => start('mh');
$('hypo').onclick = () => start('hypo');
$('sepsis').onclick = () => start('sepsis');
$('gluc').onclick = () => start('gluc');
$('dant').onclick = () => void drug('dantrolene', 2.5, 'mg/kg').then(() => note('dantrolene 2.5 mg/kg'));
$('mv').onclick = () => void vent(24).then(() => note('RR 24: doubling MV only slows the EtCO2 rise'));
$('warmOn').onclick = () => void event({ kind: 'thermal', warming: true }).then(() => note('forced air on (30 min warm-up)'));
$('warmOff').onclick = () => void event({ kind: 'thermal', warming: false });
$('cold').onclick = () => void event({ kind: 'fluid', fluid: 'balanced', volumeMl: 2000, overS: 1800 }).then(() => note('2 L at room temperature over 30 min'));
$('warmer').onclick = () => void event({ kind: 'thermal7e', fluidWarmer: true }).then(() => note('fluid warmer: IV at 37 °C'));
$('emerge').onclick = () => void event({ kind: 'thermal', anaesthesia: 'none' }).then(() => note('emergence: shivering once the threshold passes the core'));
$('d50').onclick = () => void drug('dextrose', 25, 'g').then(() => note('D50 25 g'));
$('insStop').onclick = () => void event({ kind: 'infusion', drugId: 'insulin', rate: 0, unit: 'units/h' });
$('speed').onchange = () => pm?.setTimeScale(Number($<HTMLSelectElement>('speed').value));

start('mh');
(window as unknown as { __pme7e: unknown }).__pme7e = {
  start, send, simT: () => tMon, endo: () => lastEndo, timeScale: (k: number) => pm?.setTimeScale(k), ready: true,
};
