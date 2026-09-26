// Stage 7b demo: two lungs (R43) under a built-in ventilator; condition picker over the 32-row catalogue; per-lung
// icons from lungState; five scripted demonstrations. Stage V's combined page (vent-link.html) shows the same lungs
// with the full ventilator once both are merged.
import { LUNG_CONDITIONS, type Command, type EngineEvent } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
type LS = Extract<EngineEvent, { type: 'lungState' }>;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: 'philips-like',
  engine: { seed: 7, patient: { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M', sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } },
  lanes: ['ecgII'],
  waves: ['abp', 'pleth', 'co2'],
});
let n = 0;
const send = (c: CommandBody) => pm.dispatch({ id: `s7b-${++n}`, issuedBy: 'stage7b', ...c } as Command);
const ev = (event: Record<string, unknown>) => send({ type: 'applyEvent', event } as CommandBody);
const num = (id: string) => Number($<HTMLInputElement>(id).value);
const vent = () => ev({ kind: 'ventilation', source: 'ventilator', rr: num('rr'), vtMl: num('vt'), peep: num('peep'), fio2: num('fio2'), ie: num('ie') });
const setVent = (o: Partial<Record<'rr' | 'vt' | 'peep' | 'fio2' | 'ie', number>>) => {
  for (const [k, v] of Object.entries(o)) $<HTMLInputElement>(k).value = String(v);
  return vent();
};

for (const c of LUNG_CONDITIONS) $<HTMLSelectElement>('cond').add(new Option(`${c.section}. ${c.label}`, c.id));
$('sev').addEventListener('input', () => ($('sevv').textContent = $<HTMLInputElement>('sev').value));
const active: string[] = [];
$('add').addEventListener('click', () => {
  const id = $<HTMLSelectElement>('cond').value;
  const side = $<HTMLSelectElement>('side').value;
  const rf = $<HTMLInputElement>('rf').value;
  active.push(id);
  void ev({ kind: 'lungCondition', id, severity: num('sev'), ...(side ? { side } : {}), ...(rf ? { recruitFrac: Number(rf) } : {}) });
});
$('clear').addEventListener('click', () => {
  for (const id of active.splice(0)) for (const side of [undefined, 'L', 'R']) void ev({ kind: 'lungCondition', id, severity: 0, ...(side ? { side } : {}) });
});
$('apply').addEventListener('click', () => void vent());
$('rm').addEventListener('click', () => void ev({ kind: 'recruit', pressureCmH2O: 40, durationS: 30 }));
$('mainstem').addEventListener('change', () => void ev({ kind: 'mainstem', ventilated: $<HTMLSelectElement>('mainstem').value }));
$('speed').addEventListener('change', () => pm.setTimeScale(Number($<HTMLSelectElement>('speed').value)));
pm.setTimeScale(4);
void vent();

// lungs canvas (per-lung compliance/resistance/shunt from lungState)
let last: LS | null = null;
let simT = 0;
const cv = $<HTMLCanvasElement>('lungs');
const g = cv.getContext('2d') as CanvasRenderingContext2D;
function draw(): void {
  g.clearRect(0, 0, cv.width, cv.height);
  const lungs = last?.lungs ?? [];
  lungs.forEach((l, i) => {
    const x = i === 0 ? 110 : 310; // the patient's left lung on the viewer's right, as on a chest film
    const cx = i === 0 ? 310 : 110;
    const r = 30 + 45 * l.aerated;
    g.fillStyle = !l.ventilated ? '#444' : `hsl(${Math.round(120 * (1 - Math.min(1, l.shunt * 2.5)))}, 60%, 40%)`;
    g.beginPath();
    g.ellipse(cx, 95, r * 0.7, r, 0, 0, 2 * Math.PI);
    g.fill();
    g.fillStyle = '#ccc';
    g.font = '12px ui-monospace, monospace';
    g.fillText(`${l.side}${l.ventilated ? '' : ' (blocked)'}`, cx - 30, 190);
    g.fillText(`C ${l.complianceMlPerCmH2O}  R ${l.resistanceCmH2OPerLps}`, cx - 60, 206);
    g.fillText(`τ ${l.tauS} s  shunt ${(l.shunt * 100).toFixed(0)} %`, cx - 60, 222);
    g.fillText(`flow ${(l.perfusionFrac * 100).toFixed(0)} %  aer ${(l.aerated * 100).toFixed(0)} %`, cx - 60, 238);
    void x;
  });
  if (last) g.fillText(`Crs ${last.complianceMlPerCmH2O}  R ${last.resistanceCmH2OPerLps}  autoPEEP ${last.autoPeepCmH2O ?? 0}  shunt ${last.shunt}`, 10, 16);
}
pm.on((e) => {
  if ('t' in e) simT = Math.max(simT, e.t);
  if (e.type === 'lungState') {
    last = e;
    draw();
  }
  if (e.type === 'measurement' && e.values.spo2) $('diag').textContent = `t ${simT.toFixed(0)} s   SpO2 ${e.values.spo2.value ?? '--'}   EtCO2 ${e.values.etco2?.value ?? '--'}`;
});

// demonstrations (sim-time waits via the event clock)
const until = (dt: number) => new Promise<void>((res) => { const t0 = simT; const off = pm.on(() => { if (simT >= t0 + dt) { off(); res(); } }); });
const demos: Record<string, () => Promise<void>> = {
  async copd() { await ev({ kind: 'lungCondition', id: 'copd', severity: 0.75 }); active.push('copd'); for (const rr of [10, 14, 20, 26]) { await setVent({ rr, vt: 560, ie: 2 }); await until(60); } },
  async ards() { await ev({ kind: 'lungCondition', id: 'ards', severity: 0.67, recruitFrac: 0.5 }); active.push('ards'); await setVent({ rr: 20, vt: 420, peep: 5, fio2: 0.6 }); await until(120); await setVent({ peep: 15 }); await until(120); await ev({ kind: 'recruit', pressureCmH2O: 40, durationS: 30 }); await until(90); await setVent({ peep: 5 }); },
  async olv() { await setVent({ fio2: 0.5, vt: 490 }); await until(60); await ev({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'L' }); active.push('olv'); await setVent({ vt: 350 }); },
  async endo() { await setVent({ fio2: 0.5 }); await ev({ kind: 'airway', state: 'endobronchial' }); await until(600); await ev({ kind: 'airway', state: 'patent' }); await until(120); await ev({ kind: 'recruit', pressureCmH2O: 40, durationS: 10 }); },
  async absorb() { await ev({ kind: 'thermal', anaesthesia: 'general' }); await setVent({ fio2: 1, peep: 0 }); await ev({ kind: 'recruit', pressureCmH2O: 40, durationS: 10 }); },
};
for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-demo]')) b.addEventListener('click', () => void demos[b.dataset.demo as string]?.());
