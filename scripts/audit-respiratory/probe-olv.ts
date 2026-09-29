// Probe: one-lung ventilation PaO2/shunt with and without sevoflurane (HPV) (FU-6 Task 1; reconstruction).
const { createEngine } = (await import(process.env.PME_ENGINE as string)) as any;
for (const sevo of [0, 2]) {
  const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' } });
  let n = 0;
  const ap = (event: Record<string, unknown>) => e.dispatch({ id: `p${++n}`, issuedBy: 'probe', type: 'applyEvent', event });
  e.advanceTo(1);
  ap({ kind: 'airwayDevice', device: 'ett' }); ap({ kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 350, peep: 5, fio2: 1 });
  ap({ kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' }); ap({ kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
  e.advanceTo(300); ap({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'L' });
  if (sevo) ap({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: sevo, fgfLpm: 4, n2oFrac: 0 });
  for (let t = 600; t <= 1800; t += 300) { e.advanceTo(t); console.log(`sevo ${sevo} % t ${t}: PaO2 ${e.st.resp.o2.pao2.toFixed(0)} MAC ${(e.st.pk.bus.cns?.macBrain ?? 0).toFixed(2)} hpvInhibit ${(e.st.pk.bus.hpvInhibit ?? 0).toFixed(3)}`); }
}
