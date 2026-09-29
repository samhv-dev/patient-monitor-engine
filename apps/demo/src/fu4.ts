// FU-4 evidence page (plan Task 23): seven scripted scenarios on the philips-like skin — the orchestrator inspects them
// before Ali tests again (R53). MODELED circulation, ETT + VCV 12 × 600 / PEEP 5 / FiO2 0.5 (the audit rig). The side
// panel shows TRUTH (rhythm, pulseless, MAP, coronary perfusion pressure CoPP, flow share kIsch) from the engine's
// `state` and `circ` events; the monitor shows what the patient's monitor would. The pulse-oximeter dropout at low
// perfusion is FU-5's. Pattern: stage7e.ts (mountMonitor, send() with atTick, a window hook).
import type { Command, EngineEvent, EngineOptions, PatientProfile } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';

type Body = Record<string, unknown>;
type Scenario = 'induction' | 'tamponade' | 'bleed' | 'ptx' | 'burns' | 'vf' | 'pe';
type Circ = Extract<EngineEvent, { type: 'circ' }>;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const ARREST = new Set(['asystole', 'vfCoarse', 'vfFine', 'agonal', 'pWaveAsystole']);

let pm: MonitorHandle | null = null;
let tMon = 0;
let seq = 0;
let rhythm = 'sinus';
let map = NaN;
let lastCirc: Circ | null = null;
let tArrest: number | null = null;
let noEject = 0; // consecutive `circ` events without ejection (the first second of a run has none yet)
const log: string[] = [];
const note = (s: string) => {
  log.push(`${Math.round(tMon)} s  ${s}`);
  $('log').textContent = log.slice(-16).join('\n');
};
/** Pulseless = a pulseless rhythm, or an organised rhythm that has ejected nothing for 5 consecutive `circ` events (a
 * 3-event run was a transient in the tension-pneumothorax course, not the arrest). */
const pulseless = () => ARREST.has(rhythm) || noEject >= 5;
const state = () => ({ rhythm, pulseless: pulseless(), map, cpp: lastCirc?.cpp ?? NaN, kIsch: lastCirc?.kIsch ?? NaN, co: lastCirc?.co ?? NaN, tArrest });

async function send(body: Body, delayS = 0): Promise<boolean> {
  if (!pm) return false;
  const r = await pm.dispatch({ id: `f${++seq}`, issuedBy: 'fu4', ...body, atTick: Math.round((tMon + 0.3 + delayS) * 50) } as Command);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r.accepted;
}
const event = (e: Body, delayS = 0) => send({ type: 'applyEvent', event: e }, delayS);
const drug = (drugId: string, dose: number, unit: string, delayS = 0) => event({ kind: 'drug', drugId, dose, unit, route: 'iv' }, delayS);

function start(s: Scenario): void {
  pm?.destroy();
  $('monitor').innerHTML = '';
  tMon = 0;
  rhythm = 'sinus';
  map = NaN;
  lastCirc = null;
  tArrest = null;
  noEject = 0;
  log.length = 0;
  const patient: PatientProfile = {
    ageY: 40, sex: 'M', weightKg: 70, heightCm: 175,
    ...(s === 'burns' ? { blood: { burns: 1 } } : {}),
    sensors: { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on' },
  };
  const engine: EngineOptions = { seed: 7, mode: 'modeled', patient };
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'] });
  pm.on((x) => {
    const t = (x as { t?: number }).t;
    if (typeof t === 'number' && t > tMon && x.type !== 'tone') tMon = Math.min(t, tMon + 5);
    if (x.type === 'state') {
      if (x.rhythm && x.rhythm.id !== rhythm) note(`rhythm → ${x.rhythm.id}`);
      if (x.rhythm) rhythm = x.rhythm.id;
      const { sbp, dbp } = x.values;
      if (sbp !== undefined && dbp !== undefined) map = dbp + (sbp - dbp) / 3;
    } else if (x.type === 'circ') {
      lastCirc = x;
      noEject = x.sv < 5 ? noEject + 1 : 0;
      if (tArrest === null && pulseless()) {
        tArrest = tMon;
        note(`PULSELESS (${rhythm}) — MAP ${map.toFixed(0)}`);
      } else if (tArrest !== null && !pulseless() && x.sv > 20) {
        note(`pulse back (SV ${x.sv.toFixed(0)} mL)`);
        tArrest = null;
      }
      const st = state();
      $('truth').textContent = `truth  ${st.rhythm}${st.pulseless ? ' (pulseless)' : ''}\nMAP ${st.map.toFixed(0)}  CO ${st.co.toFixed(2)} L/min\nCoPP ${st.cpp.toFixed(0)} mmHg  kIsch ${st.kIsch.toFixed(2)}`;
    }
  });
  pm.setTimeScale(Number($<HTMLSelectElement>('speed').value));
  void event({ kind: 'airwayDevice', device: 'ett' });
  void event({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  if (s === 'induction') {
    void drug('propofol', 2, 'mg/kg', 300);
    note('healthy 40 y: propofol 2 mg/kg at 300 s (Miller: MAP −25 to −40 %)');
  } else if (s === 'tamponade') {
    void event({ kind: 'condition', id: 'tamponade', severity: 1 }, 60);
    void drug('propofol', 2, 'mg/kg', 660);
    note("Ali's case: tamponade 1 at 60 s, propofol 2 mg/kg at 11 min");
  } else if (s === 'bleed') {
    void event({ kind: 'bleed', volumeMl: 2500, overS: 600 }, 60);
    note('class IV haemorrhage: 2.5 L over 10 min from 60 s — then "CPR + 2 L + adrenaline"');
  } else if (s === 'ptx') {
    void event({ kind: 'condition', id: 'tensionPtx', severity: 1 }, 60);
    note('tension pneumothorax (one command) at 60 s: the pleural pressure builds per breath');
  } else if (s === 'burns') {
    void drug('succinylcholine', 1.5, 'mg/kg', 300);
    note('burns patient: succinylcholine 1.5 mg/kg at 300 s — K rise, sine wave, VF');
  } else if (s === 'vf') {
    void send({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }, 60);
    void event({ kind: 'cpr', active: true, rate: 110, quality: 1 }, 90);
    note('VF at 60 s, CPR (quality 1) from 90 s — CoPP in the panel');
  } else {
    void event({ kind: 'condition', id: 'pe', severity: 1 }, 60);
    void drug('propofol', 2, 'mg/kg', 660);
    note('massive PE at 60 s, propofol 2 mg/kg at 11 min');
  }
}

const resus = async () => {
  await event({ kind: 'cpr', active: true, rate: 110, quality: 0.8 });
  await event({ kind: 'fluid', fluid: 'balanced', volumeMl: 2000, overS: 180 });
  await drug('epinephrine', 1, 'mg');
  note('CPR + 2 L balanced over 3 min + adrenaline 1 mg');
};
for (const s of ['induction', 'tamponade', 'bleed', 'ptx', 'burns', 'vf', 'pe'] as const) $(s).onclick = () => start(s);
$('resus').onclick = () => void resus();
$('cprOff').onclick = () => void event({ kind: 'cpr', active: false }).then(() => note('CPR stopped'));
$('speed').onchange = () => pm?.setTimeScale(Number($<HTMLSelectElement>('speed').value));

start('induction');
(window as unknown as { __pmeFu4: unknown }).__pmeFu4 = {
  start, send, resus, simT: () => tMon, state, log: () => log.slice(), timeScale: (k: number) => pm?.setTimeScale(k), ready: true,
};
