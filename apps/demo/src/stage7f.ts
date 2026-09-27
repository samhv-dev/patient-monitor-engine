// Stage 7f demo (R32 7f): TOF and depth tiles beside the monitor, the instructor "anaesthetic state" panel, and the
// scripted sequences of the plan: induction (fentanyl → propofol → rocuronium → laryngoscopy/intubation → sevoflurane
// on the ventilator), sugammadex / neostigmine reversal, remifentanil apnoea, residual block at extubation. Every drug
// and the vaporiser go through Stage 7g (R51 §3–4); 7f supplies the TOF/depth devices, the tiles' data and the panel.
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: new URLSearchParams(location.search).get('skin') ?? 'philips-like', // FU-3 item 11: ?skin=saadat-like for the tile shots
  engine: { seed: 17, patient: { ageY: 45, weightKg: 70, heightCm: 172, sex: 'M', sensors: { spo2: 'on', co2: 'on', abp: 'connected' } } },
  lanes: ['ecgII'],
  waves: ['abp', 'pleth', 'co2', 'resp'],
});
pm.setTimeScale(4);
let n = 0;
let simT = 0;
const send = (c: Body) =>
  pm.dispatch({ id: `7f-${++n}`, issuedBy: 'stage7f', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });
const ev = (event: Record<string, unknown>) => send({ type: 'applyEvent', event } as Body);
const drug = (drugId: string, dose: number, unit: string, infusion = false) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', infusion });
const dev = (action: Record<string, unknown>) => send({ type: 'device', action } as Body);
const log = (s: string) => {
  const el = $('log');
  el.textContent = `${fmt(simT)} ${s}\n${el.textContent ?? ''}`;
};
const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// Skin colours for the two tiles (decision 14: NMT and BFA colour keys; fall back when a skin has none)
const colors = (pm.skin?.skin.colors ?? {}) as Record<string, string>;
$('tofTile').style.color = colors.NMT ?? '#e0e0e0';
$('diTile').style.color = colors.BFA ?? '#9ad0ff';
$('aaTile').style.color = colors.AGENTS ?? '#f0c040';

// A tiny scheduler in SIM time (scripts survive speed changes)
const queue: { at: number; run: () => void }[] = [];
const at = (dt: number, run: () => void) => queue.push({ at: simT + dt, run });

pm.on((e: EngineEvent) => {
  if ('t' in e && typeof e.t === 'number') simT = Math.max(simT, e.t);
  (window as unknown as { __simT: number }).__simT = simT; // the screenshot script waits on sim time (Step 4)
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i];
    if (q && q.at <= simT) {
      queue.splice(i, 1);
      q.run();
    }
  }
  if (e.type === 'tof') {
    if (e.mode === 'ptc') {
      $('tofSub').textContent = `PTC ${e.ptc ?? '—'}`;
      return;
    }
    $('tofBig').textContent = e.count === 4 && e.ratio !== null ? `${Math.round(e.ratio * 100)}%` : `${e.count}/4`;
    $('tofSub').textContent = `TOF count ${e.count}${e.ratio !== null ? ` · ratio ${e.ratio.toFixed(2)}` : ''}`;
    $('tw').innerHTML = [0, 1, 2, 3].map((i) => `<span class="twitch" style="height:${Math.round(40 * (e.twitches[i] ?? 0))}px"></span>`).join('');
  } else if (e.type === 'measurement') {
    const v = e.values;
    if (v.di) $('diBig').textContent = v.di.value === null ? '--' : String(v.di.value);
    if (v.sr) $('diSub').textContent = `SR ${v.sr.value ?? '--'} %`;
    if (v.mac) $('macBig').textContent = `${v.mac.value?.toFixed(1)} MAC`;
    if (v.etAa) $('aaSub').textContent = `Et ${v.etAa.value?.toFixed(1)} %`;
  } else if (e.type === 'anaesthesia') {
    const ce = Object.entries(e.ce).map(([k, c]) => `${k} ${k === 'propofol' ? `${(c / 1000).toFixed(2)} µg/mL` : `${c.toFixed(2)} ng/mL`}`).join(' · ');
    $('panel').textContent =
      `t ${fmt(e.t)}  DI ${e.di}  SR ${e.sr}%  MAC end-tidal ${e.mac} · brain ${e.macBrain} (effective ${e.macEff})  ${e.conscious ? 'CONSCIOUS' : 'unconscious'}${e.awarenessRisk ? '  ⚠ AWARENESS RISK' : ''}\n` +
      `TOF ${e.tof.count}/4 ratio ${e.tof.ratio} PTC ${e.tof.ptc} · block thumb ${e.block.thumb} diaphragm ${e.block.dia}\n` +
      `drive: opioid ${e.drive.opioidDep} hypnotic ${e.drive.hypnoticDep} resting VE ×${e.drive.veRest}${e.drive.apnoea ? ' APNOEA' : ''} obstruction ${e.drive.obstruction}\n` +
      `stress ${e.stress}${e.movement ? ' MOVING' : ''} · antinociception ${e.outputs.antinoc.toFixed(2)} · thermoregulatory depth ${e.outputs.thermoDepth.toFixed(2)} · CMRO2 ×${e.outputs.cmro2Mult.toFixed(2)}\n` +
      `Ce: ${ce}`;
  } else if (e.type === 'neuroMark') log(e.kind);
});

$('speed').addEventListener('change', () => pm.setTimeScale(Number(($('speed') as HTMLSelectElement).value)));
$('tofStart').addEventListener('click', () => void dev({ device: 'tof', action: 'start', intervalS: 15 }));
$('ptc').addEventListener('click', () => void dev({ device: 'tof', action: 'ptc' }));
$('depthOn').addEventListener('click', () => void dev({ device: 'depth', action: 'on' }));
$('induction').addEventListener('click', () => {
  void dev({ device: 'tof', action: 'start', intervalS: 15 });
  void dev({ device: 'depth', action: 'on' });
  void ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 });
  void drug('fentanyl', 1.5, 'mcg/kg');
  log('fentanyl 1.5 µg/kg');
  at(120, () => { void drug('propofol', 2, 'mg/kg'); log('propofol 2 mg/kg'); });
  at(180, () => { void drug('rocuronium', 0.6, 'mg/kg'); log('rocuronium 0.6 mg/kg'); void ev({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 500, fio2: 1 }); });
  // `stimulus` is Stage 7e's event (intensity 0–2, held until the next one; 7f observes it: R51 addenda 12, 17)
  at(300, () => { void ev({ kind: 'stimulus', intensity: 1.5 }); log('laryngoscopy + intubation (stimulus 1.5)'); });
  at(330, () => {
    void ev({ kind: 'stimulus', intensity: 0 });
    void ev({ kind: 'airwayDevice', device: 'ett' });
    void ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 });
    void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 3, fgfLpm: 6 }); // 7g's vaporiser (R51 §4); over-pressure for the wash-in
    log('ventilator, sevoflurane dial 3 % (FGF 6 L/min)');
  });
  at(1200, () => { void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 }); void ev({ kind: 'stimulus', intensity: 1 }); log('incision (stimulus 1, held)'); });
});
$('reverse').addEventListener('click', () => { void drug('sugammadex', 2, 'mg/kg'); log('sugammadex 2 mg/kg'); });
$('neo').addEventListener('click', () => { void drug('neostigmine', 0.05, 'mg/kg'); log('neostigmine 0.05 mg/kg'); });
$('remi').addEventListener('click', () => {
  void ev({ kind: 'airwayDevice', device: 'none' });
  void drug('remifentanil', 1, 'mcg/kg');
  void drug('remifentanil', 0.3, 'mcg/kg/min', true);
  log('remifentanil 1 µg/kg + 0.3 µg/kg/min (spontaneous)');
  at(240, () => { void drug('remifentanil', 0, 'mcg/kg/min', true); log('remifentanil off'); });
});
$('residual').addEventListener('click', () => {
  // extubate at TOF 2–3 without reversal: TOFR < 0.9 → weak, obstructed breathing
  void dev({ device: 'tof', action: 'start', intervalS: 15 });
  void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 0, fgfLpm: 6 });
  void ev({ kind: 'airwayDevice', device: 'none' });
  void ev({ kind: 'ventilation', source: 'spontaneous' });
  log('extubated without reversal (residual block)');
});
