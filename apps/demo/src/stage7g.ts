// Stage 7g demo: the monitor plus the drug panel (Cp/Ce, pump/TCI, decrement time, volatile line) and a depth tile
// that shows 7g's summaries until 7f's depth index exists. The shadow engine is deterministic, so it IS the
// monitor's patient (7a's pattern).
import { createEngine, type Command, type EngineEvent, type EngineOptions, type MonitorEngine } from '@pme/engine-core';
import { createDrugPanel, mountMonitor, type DrugPanel, type MonitorHandle } from '@pme/renderer';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Body = Record<string, unknown>;
type DrugsEv = Extract<EngineEvent, { type: 'drugs' }>;

let pm: MonitorHandle | null = null;
let shadow: MonitorEngine | null = null;
let panel: DrugPanel | null = null;
let tMon = 0;
let lastDrugs: DrugsEv | null = null;
let seq = 0;

/** Send to the monitor and the shadow at the same tick (0.3 s ahead of the monitor's clock, + delayS). */
async function send(body: Body, delayS = 0): Promise<{ accepted: boolean; reason?: string }> {
  if (!pm || !shadow) return { accepted: false, reason: 'not started' };
  const atTick = Math.round((tMon + 0.3 + delayS) * 50);
  const cmd = { id: `g${++seq}`, issuedBy: 'stage7g', ...body, atTick } as Command;
  shadow.dispatch({ ...cmd, id: `${cmd.id}s` } as Command);
  const r = await pm.dispatch(cmd);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r;
}
const drug = (drugId: string, dose: number, unit: string, delayS = 0) => send({ type: 'applyEvent', event: { kind: 'drug', drugId, dose, unit, route: 'iv' } }, delayS);
const event = (e: Body) => send({ type: 'applyEvent', event: e });

function start(): void {
  pm?.destroy();
  panel?.destroy();
  $('monitor').innerHTML = '';
  tMon = 0;
  lastDrugs = null;
  const engine: EngineOptions = {
    seed: 7,
    mode: 'modeled',
    patient: { ageY: 45, sex: 'M', weightKg: 80, heightCm: 178, sensors: { abp: 'connected', spo2: 'on', co2: 'on', nibp: 'on' } },
  };
  shadow = createEngine(engine);
  panel = createDrugPanel($('drugs'));
  shadow.on((x) => {
    if (x.type !== 'drugs') return;
    lastDrugs = x;
    panel?.update(x);
  }, ['drugs']);
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'], nibp: true });
  pm.on((x) => {
    const t = (x as { t?: number }).t;
    if (typeof t === 'number' && t > tMon && x.type !== 'tone') tMon = Math.min(t, tMon + 5);
  });
  void event({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 550, peep: 5 });
}

$('restart').onclick = start;
$('tci').onclick = () => {
  void event({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 4, model: 'eleveld' });
  void event({ kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 });
  void drug('rocuronium', 0.6, 'mg/kg', 180);
};
$('phe').onclick = () => void drug('phenylephrine', 100, 'mcg');
$('ne').onclick = () => void event({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' });
$('neStop').onclick = () => void event({ kind: 'infusion', drugId: 'norepinephrine', rate: 0, unit: 'mcg/kg/min' });
$('sevo2').onclick = () => void event({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 });
$('sevoLow').onclick = () => void event({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 0.5 });
$('vapOff').onclick = () => void event({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 0 });
$('svt').onclick = () => {
  void send({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } });
  void drug('adenosine', 6, 'mg', 20);
};
$('last').onclick = () => void drug('bupivacaine', 225, 'mg');
$('lipid').onclick = () => {
  void drug('lipidEmulsion', 1.5, 'mL/kg');
  void event({ kind: 'infusion', drugId: 'lipidEmulsion', rate: 0.25, unit: 'mL/kg/min' });
};
$('sgx').onclick = () => void drug('sugammadex', 2, 'mg/kg');
$('nal').onclick = () => void drug('naloxone', 0.1, 'mg');

/** The depth tile: 7f's depth index when 7f publishes it on the 1 Hz state event, else 7g's own summaries. */
function depthText(): string {
  if (!shadow) return '';
  const st = (shadow.snapshot().state as { st: { pk?: { bus: { cns: { uSurface: number; macBrain: number; propCe: number; opioidCeRemiEq: number; seizure: boolean } } }; neuro?: { out?: { depthIndex?: number } } } }).st;
  const di = st.neuro?.out?.depthIndex;
  const c = st.pk?.bus.cns;
  if (!c) return '';
  return (di !== undefined ? `depth index ${di.toFixed(0)} (7f)\n` : 'depth index: 7f pending\n') +
    `U surface ${c.uSurface.toFixed(2)}  MAC ${c.macBrain.toFixed(2)}\npropofol Ce ${c.propCe.toFixed(2)} µg/mL  opioid ${c.opioidCeRemiEq.toFixed(2)} ng/mL remi-eq` +
    (c.seizure ? '\nLAST: SEIZURE' : '');
}
setInterval(() => {
  if (shadow && tMon > 0) shadow.advanceTo(tMon);
}, 100);
setInterval(() => {
  $('depth').textContent = depthText();
}, 1000);

start();
(window as unknown as { __pme7g: unknown }).__pme7g = {
  send, restart: start, simT: () => tMon, timeScale: (k: number) => pm?.setTimeScale(k), drugs: () => lastDrugs, ready: true,
};
