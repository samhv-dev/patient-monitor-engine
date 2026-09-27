// Stage 7c demo: blood, acid–base, electrolytes and O2 delivery. Monitor + a live lab panel (`labs`, 1 Hz truth) and a
// "send ABG" result panel (`labResult`, 120 s turnaround); four scripted teaching stories (plan Task 24).
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountLabPanel, mountMonitor } from '@pme/renderer';

type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
const burns = params.get('burns') === '1';
const pm = mountMonitor($('monitor'), {
  skin: 'philips-like',
  engine: {
    seed: 7,
    patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', blood: burns ? { burns: 0.5 } : {}, sensors: { abp: 'connected', spo2: 'on', co2: 'on', temp: 'on' } },
  },
  lanes: ['ecgII', 'V5'],
  waves: ['abp', 'pleth', 'co2'],
  temp: true,
});
let n = 0;
const send = (c: CommandBody) =>
  pm.dispatch({ id: `demo-${++n}`, issuedBy: 'stage7c', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });
const ev = (event: Record<string, unknown>) => send({ type: 'applyEvent', event } as CommandBody);
const live = mountLabPanel($('labs'));
const abg = mountLabPanel($('abg'));
let simT = 0;
const log: string[] = [];
const note = (s: string) => {
  log.push(`${Math.round(simT)} s  ${s}`);
  $('log').textContent = log.slice(-12).join('\n');
};
pm.on((e: EngineEvent) => {
  if (e.type === 'labs') {
    simT = e.t;
    live(e.values, `Live chemistry (truth) — t ${Math.round(e.t)} s`);
  }
  if (e.type === 'labResult') abg(e.values, `${e.panel.toUpperCase()} drawn at ${Math.round(e.drawnAt)} s, resulted ${Math.round(e.t)} s`);
});
const at = (delayS: number, fn: () => void) => {
  const t0 = simT;
  const h = pm.on((e) => {
    if (e.type === 'labs' && e.t >= t0 + delayS) {
      h();
      fn();
    }
  });
};

// always-available actions
$('sendAbg').addEventListener('click', () => void ev({ kind: 'lab', panel: 'abg' }).then(() => note('ABG sent (result in 2 min)')));
$('speed').addEventListener('change', () => pm.setTimeScale(Number($<HTMLSelectElement>('speed').value)));
const vent = () => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 });
void ev({ kind: 'thermal', anaesthesia: 'general' });
void vent();

// 1. haemorrhage → transfusion → labs
$('storyBleed').addEventListener('click', () => {
  pm.setTimeScale(4);
  void ev({ kind: 'bleed', volumeMl: 1750, overS: 600 });
  note('class III haemorrhage: 1750 mL over 10 min');
  at(1800, () => {
    void ev({ kind: 'lab', panel: 'abg' });
    note('ABG at 30 min (lactate should be 3–5)');
  });
  at(2400, () => {
    void ev({ kind: 'transfusion', product: 'rbc', units: 4, overS: 1200 });
    void ev({ kind: 'fluid', fluid: 'rl', volumeMl: 1000, overS: 1200 });
    note('4 RBC (unwarmed) + 1 L Ringer’s lactate over 20 min');
  });
  at(6000, () => void ev({ kind: 'lab', panel: 'abg' }));
});
// 2. saline vs balanced
$('storySaline').addEventListener('click', () => {
  pm.setTimeScale(4);
  void ev({ kind: 'fluid', fluid: $<HTMLSelectElement>('fluid').value, volumeMl: 2000, overS: 1800 });
  note(`2 L ${$<HTMLSelectElement>('fluid').value} over 30 min — watch Cl and BE`);
  at(3600, () => void ev({ kind: 'lab', panel: 'abg' }));
});
// 3. hyperkalaemia after succinylcholine in a burned patient (reload with ?burns=1)
$('storySux').addEventListener('click', () => {
  if (!burns) {
    location.search = '?burns=1';
    return;
  }
  void ev({ kind: 'drug', drugId: 'succinylcholine', dose: 100, unit: 'mg', route: 'iv' });
  note('succinylcholine 100 mg (burns): watch the T waves and QRS in II/V5');
  at(240, () => {
    void ev({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' });
    note('CaCl2 1 g: the ECG narrows within 1–3 min; K unchanged');
  });
  at(420, () => {
    void ev({ kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units', route: 'iv' });
    note('insulin 10 U + dextrose: K falls over 30–60 min');
  });
});
// 4. bicarbonate EtCO2 transient
$('storyBicarb').addEventListener('click', () => {
  void ev({ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol', route: 'iv' });
  note('NaHCO3 50 mmol at fixed ventilation: EtCO2 rises ≈ 5 mmHg within 2 min');
});
