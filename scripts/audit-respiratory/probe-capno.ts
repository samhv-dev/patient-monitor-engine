// Capnogram fidelity probe (audit §2 H): runs each configuration to a steady state, reads the DISPLAYED co2 channel
// (62.5 Hz, sidestream) over the last 3 breaths and reports EtCO2, inspired baseline, phase II 10–90 % rise time,
// phase III slope (mmHg/s over the middle half of the plateau), plateau ripple (cardiogenic/CPR oscillation p-p after
// detrending), cleft depth, and a coarse shape (one value per 0.25 s). Also PaCO2 truth → Pa–Et gap.
// Run: PME_ENGINE=… node --import ./hooks.mjs probe-capno.ts > out/capno.txt
const { createEngine } = (await import(process.env.PME_ENGINE!)) as any;
const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event });
const SENS = { abp: 'connected', spo2: 'on', co2: 'on' };
type Cmd = [number, Record<string, unknown>];
const rig = (o: Record<string, unknown> = {}): Cmd[] => [
  [1, ev({ kind: 'airwayDevice', device: 'ett' })], [1, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...o })],
  [1, ev({ kind: 'thermal', anaesthesia: 'general' })], [1, ev({ kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' })],
  [1, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' })],
];
const CASES: Array<{ name: string; cmds: Cmd[]; at: number; win?: number; mode?: string }> = [
  { name: 'normal VCV 12 × 500', cmds: rig(), at: 600 },
  { name: 'spontaneous awake', cmds: [], at: 600 },
  { name: 'airway bronchospasm 0.5', cmds: [...rig(), [300, ev({ kind: 'airway', state: 'bronchospasm', severity: 0.5 })]], at: 600 },
  { name: 'airway bronchospasm 1', cmds: [...rig(), [300, ev({ kind: 'airway', state: 'bronchospasm', severity: 1 })]], at: 600 },
  { name: 'lung bronchospasm 1 (7b)', cmds: [...rig(), [300, ev({ kind: 'lungCondition', id: 'bronchospasm', severity: 1 })]], at: 600 },
  { name: 'lung copd 1 (7b)', cmds: [...rig({ rr: 10 }), [60, ev({ kind: 'lungCondition', id: 'copd', severity: 1 })]], at: 600 },
  { name: 'lung asthma 1 (7b)', cmds: [...rig(), [60, ev({ kind: 'lungCondition', id: 'asthma', severity: 1 })]], at: 600 },
  { name: 'curare cleft (roc wearing off, t 1800)', cmds: rig(), at: 1800 },
  { name: 'rebreathing FiCO2 5 mmHg (ventilation.fico2)', cmds: [...rig(), [300, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, fico2: 5 })]], at: 900 },
  { name: 'low RR 6 (cardiogenic oscillations)', cmds: rig({ rr: 6, vtMl: 700 }), at: 600, win: 30 },
  { name: 'endobronchial (bifid)', cmds: [...rig(), [300, ev({ kind: 'airway', state: 'endobronchial' })]], at: 600 },
  { name: 'massive PE (lung pe 1)', cmds: [...rig(), [300, ev({ kind: 'lungCondition', id: 'pe', severity: 1 })]], at: 600 },
  { name: 'VF + CPR quality 1 (from 300 s), ventilator on', cmds: [...rig(), [290, { type: 'setRhythm', rhythm: 'vfCoarse' }], [300, ev({ kind: 'cpr', active: true, rate: 110, quality: 1 })]], at: 500 },
  { name: 'VF + CPR quality 0.4', cmds: [...rig(), [290, { type: 'setRhythm', rhythm: 'vfCoarse' }], [300, ev({ kind: 'cpr', active: true, rate: 110, quality: 0.4 })]], at: 500 },
  { name: 'oesophageal intubation (first 12 s)', cmds: [...rig(), [300, ev({ kind: 'airway', state: 'oesophageal' })]], at: 312, win: 12 },
  { name: 'oesophageal intubation (at 60 s)', cmds: [...rig(), [300, ev({ kind: 'airway', state: 'oesophageal' })]], at: 360, win: 12 },
];
const r1 = (x: number) => Math.round(x * 10) / 10;
for (const c of CASES) {
  const e = createEngine({ seed: 7, mode: c.mode ?? 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: SENS } });
  let n = 0;
  for (const [t, body] of [...c.cmds].sort((a, b) => a[0] - b[0])) {
    e.advanceTo(t);
    const r = e.dispatch({ id: `c${++n}`, issuedBy: 'probe', ...body });
    if (!r.accepted) console.log('!! rejected', JSON.stringify(body), r.reason);
  }
  for (let t = 60; t < c.at; t += 60) { e.advanceTo(t); await new Promise((r) => setImmediate(r)); }
  e.advanceTo(c.at);
  const win = c.win ?? 15;
  const fs = 62.5;
  const end = e.latestSampleIndex('co2');
  const nS = Math.round(win * fs);
  const buf = new Float32Array(nS);
  e.readSamples('co2', end - nS + 1, buf);
  const y = Array.from(buf);
  const max = Math.max(...y);
  const min = Math.min(...y);
  // breaths: rising crossings of 50 % of max
  const half = min + 0.5 * (max - min);
  const ups: number[] = [];
  for (let i = 1; i < y.length; i++) if ((y[i - 1] as number) < half && (y[i] as number) >= half) ups.push(i);
  let rise = NaN, slope = NaN, ripple = NaN, cleft = NaN, etB = NaN;
  if (ups.length >= 2) {
    const i0 = ups[ups.length - 2] as number;
    const i1 = ups[ups.length - 1] as number;
    // breath segment i0 … next downstroke
    let j = i0;
    while (j < i1 && (y[j] as number) >= half) j++;
    const seg = y.slice(i0 - 40 > 0 ? i0 - 40 : 0, j);
    const b = Math.min(...seg);
    const top = Math.max(...y.slice(i0, j));
    etB = top;
    const lo = b + 0.1 * (top - b), hi = b + 0.9 * (top - b);
    let a = i0; while (a > 0 && (y[a] as number) > lo) a--;
    let z = i0; while (z < j && (y[z] as number) < hi) z++;
    rise = (z - a) / fs;
    const p0 = z, p1 = j;
    const m0 = Math.round(p0 + 0.25 * (p1 - p0)), m1 = Math.round(p0 + 0.75 * (p1 - p0));
    if (m1 > m0 + 5) {
      slope = ((y[m1] as number) - (y[m0] as number)) / ((m1 - m0) / fs);
      let mx = -1e9, mn = 1e9;
      for (let k = m0; k <= m1; k++) { const d = (y[k] as number) - ((y[m0] as number) + slope * (k - m0) / fs); mx = Math.max(mx, d); mn = Math.min(mn, d); }
      ripple = mx - mn;
      // cleft: deepest dip below the running max on the plateau
      let run = -1e9, dip = 0;
      for (let k = z; k < j; k++) { run = Math.max(run, y[k] as number); dip = Math.max(dip, run - (y[k] as number)); }
      cleft = dip;
    }
  }
  const st = e.st;
  const coarse: string[] = [];
  const last = Math.min(y.length, Math.round(10 * fs));
  for (let k = y.length - last; k < y.length; k += Math.round(0.25 * fs)) coarse.push(String(Math.round(y[k] as number)));
  console.log(`\n## ${c.name}`);
  console.log(`  EtCO2 display max ${r1(max)}, last-breath peak ${r1(etB)}, baseline ${r1(min)}, breaths in ${win} s: ${ups.length}; phase II 10–90 % ${r1(rise * 1000)} ms; phase III slope ${r1(slope)} mmHg/s; plateau ripple ${r1(ripple)} mmHg; largest plateau dip ${r1(cleft)} mmHg`);
  console.log(`  truth: PaCO2 ${r1(st.resp.co2.pf)}, EtCO2 true ${r1(st.resp.etco2)}, Pa−Et ${r1(st.resp.co2.pf - st.resp.etco2)}, CO ${r1(st.hemo.circ.qFwd * 0.06)} L/min, g ${Math.round(st.resp.lung.co2.g * 1000) / 1000}`);
  console.log(`  shape (0.25 s, last 10 s): ${coarse.join(' ')}`);
}
// response times: VCV 12 → 24/min step at 600 s; displayed EtCO2 numeric every 5 s
{
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: SENS } });
  let et = NaN;
  e.on((x: any) => { if (x.type === 'measurement' && x.values.etco2) et = x.values.etco2.value; }, ['measurement']);
  let n = 0;
  for (const [t, body] of rig()) { e.advanceTo(t); e.dispatch({ id: `r${++n}`, issuedBy: 'p', ...body }); }
  const out: string[] = [];
  for (let t = 5; t <= 1800; t += 5) {
    if (t === 605) e.dispatch({ id: 'rr', issuedBy: 'p', ...ev({ kind: 'ventilation', source: 'ventilator', rr: 24, vtMl: 500, peep: 5, fio2: 0.5 }) });
    e.advanceTo(t);
    if (t >= 590 && (t < 700 || t % 120 === 0)) out.push(`${t}:${et}/${r1(e.st.resp.co2.pf)}`);
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  console.log('\n## EtCO2 response to RR 12 → 24 at 605 s (displayed EtCO2 / PaCO2):\n  ' + out.join('  '));
}
