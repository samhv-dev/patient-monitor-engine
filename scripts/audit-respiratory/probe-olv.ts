// OLV perfusion probe (audit §2 F3): per-side flow fraction, collapsed-part shunt, HPV activation, aeration and PVR
// multiplier of the lung module before and after lung `olv` (right lung isolated) at FiO2 1.0, VT 350 × 16, with GA.
// Run: PME_ENGINE=… node --import ./hooks.mjs probe-olv.ts > out/olv.txt
const { createEngine } = await import(process.env.PME_ENGINE!);
const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } as any });
const ev = (event: any) => ({ type: 'applyEvent', event });
let n = 0; const send = (b: any) => e.dispatch({ id: `x${++n}`, issuedBy: 'p', ...b });
e.advanceTo(1);
for (const b of [ev({ kind: 'airwayDevice', device: 'ett' }), ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 1 }), ev({ kind: 'thermal', anaesthesia: 'general' }), ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg' })]) send(b);
for (const t of [600, 660, 900, 1200, 1800, 2400, 3000]) {
  if (t === 660) { send(ev({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'R' })); send(ev({ kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 350, peep: 5, fio2: 1 })); }
  e.advanceTo(t);
  const L = e.st.resp.lung;
  console.log(t, 'f', L.perf.f.map((x: number) => x.toFixed(2)), 'sideShunt', L.perf.shunt.map((x: number) => x.toFixed(2)), 'hpv a1', L.hpv.a1.map((x: number) => x.toFixed(2)), 'aer', L.aer.map((x: number) => x.toFixed(2)), 'pvrMult', L.perf.pvrMult.map((x: number) => x.toFixed(2)), 'PaO2', e.st.resp.o2.pao2.toFixed(0), 'PaCO2', e.st.resp.co2.pf.toFixed(1), 'blocked', L.mp.blocked, 'lp.extraShunt', L.lp.extraShunt);
}
