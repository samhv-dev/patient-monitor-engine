// Ventilatory-drive state-dependence probe (audit §2 I): hypercapnic and hypoxic ventilatory responses per drug state.
// Each state: SGA (no upper-airway obstruction), spontaneous, 20 min to settle, then
//   CO2 challenge (FiO2 0.5): +200 mL added dead space (poke `resp.co2.vdExtraMl`, the equivalent of a breathing tube),
//     15 min → slope ΔVE/ΔPaCO2 (L/min/mmHg);
//   O2 challenge (FiO2 0.21): instructor `shunt` target 0.3 (setTarget) → PaO2 falls; ΔVE and ΔRR at the new PaO2.
// VE = RR × VT of the MODELED drive (resp.spont). Audit seam: the dead-space poke is not engine behaviour.
// Run: PME_ENGINE=… node --import ./hooks.mjs probe-drive.ts > out/drive.txt
const { createEngine } = (await import(process.env.PME_ENGINE!)) as any;
const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event });
type Cmd = Record<string, unknown>;
const STATES: Array<[string, Cmd[]]> = [
  ['awake', []],
  ['remifentanil 0.05 µg/kg/min', [ev({ kind: 'infusion', drugId: 'remifentanil', rate: 0.05, unit: 'mcg/kg/min' })]],
  ['remifentanil 0.1 µg/kg/min', [ev({ kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' })]],
  ['propofol 50 µg/kg/min', [ev({ kind: 'infusion', drugId: 'propofol', rate: 50, unit: 'mcg/kg/min' })]],
  ['sevoflurane 1 % (≈ 0.5 MAC)', [ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1, fgfLpm: 6, n2oFrac: 0 })]],
  ['sevoflurane 2 % (≈ 1 MAC)', [ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 6, n2oFrac: 0 })]],
  ['remi 0.05 + sevo 1 %', [ev({ kind: 'infusion', drugId: 'remifentanil', rate: 0.05, unit: 'mcg/kg/min' }), ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1, fgfLpm: 6, n2oFrac: 0 })]],
];
const r = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
async function settle(e: any, t0: number, t1: number) {
  let n = 0, ve = 0, pa = 0, rr = 0, pao2 = 0;
  for (let t = t0 + 5; t <= t1; t += 5) {
    e.advanceTo(t);
    if (t > t1 - 120) { const s = e.st.resp.spont; ve += (s.rr * s.vt) / 1000; rr += s.rr; pa += e.st.resp.co2.pf; pao2 += e.st.resp.o2.pao2; n++; }
    if (t % 60 === 0) await new Promise((q) => setImmediate(q));
  }
  return { ve: ve / n, pa: pa / n, rr: rr / n, pao2: pao2 / n };
}
console.log('state | MAC / remi Ce / prop Ce | CO2: VE0 → VE1 L/min, PaCO2 0 → 1, slope L/min/mmHg (% of awake) | O2 (air, shunt 0.3): PaO2, VE, RR (ΔVE % of baseline VE) ');
let awakeSlope = NaN;
for (const [name, cmds] of STATES) {
  // CO2 arm
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
  let n = 0;
  const send = (b: Cmd) => { const x = e.dispatch({ id: `p${++n}`, issuedBy: 'probe', ...b }); if (!x.accepted) console.log('!!', x.reason); };
  e.advanceTo(1);
  send(ev({ kind: 'airwayDevice', device: 'sga' }));
  send(ev({ kind: 'ventilation', source: 'spontaneous', fio2: 0.5 }));
  for (const c of cmds) send(c);
  const a = await settle(e, 1, 1200);
  e.st.resp.co2.vdExtraMl += 200;
  const b = await settle(e, 1200, 2100);
  const slope = (b.ve - a.ve) / Math.max(0.1, b.pa - a.pa);
  if (name === 'awake') awakeSlope = slope;
  const cns = e.st.pk.bus.cns ?? {};
  // O2 arm
  const f = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
  let m = 0;
  const sendF = (bb: Cmd) => f.dispatch({ id: `q${++m}`, issuedBy: 'probe', ...bb });
  f.advanceTo(1);
  sendF(ev({ kind: 'airwayDevice', device: 'sga' }));
  for (const c of cmds) sendF(c);
  const c0 = await settle(f, 1, 1200);
  sendF({ type: 'setTarget', variable: 'shunt', value: 0.3 });
  const c1 = await settle(f, 1200, 2100);
  console.log(`${name} | ${r(cns.macBrain ?? 0, 2)} / ${r(cns.remiCe ?? cns.remifentanilCe ?? 0, 2)} / ${r(cns.propCe ?? 0, 2)} | ${r(a.ve)} → ${r(b.ve)}, ${r(a.pa)} → ${r(b.pa)}, ${r(slope, 2)} (${r((100 * slope) / awakeSlope, 0)} %) | PaO2 ${r(c0.pao2, 0)} → ${r(c1.pao2, 0)}, VE ${r(c0.ve)} → ${r(c1.ve)}, RR ${r(c0.rr)} → ${r(c1.rr)} (${r((100 * (c1.ve - c0.ve)) / c0.ve, 0)} %), PaCO2 ${r(c0.pa)} → ${r(c1.pa)}`);
}
