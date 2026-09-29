// Probe: the capnogram (true EtCO2 channel peak per breath) against VT on the ventilated rig (FU-6 Task 1; reconstruction).
const { createEngine } = (await import(process.env.PME_ENGINE as string)) as any;
console.log(['VT set', 'VT cycle', 'PaCO2', 'CO2 wave peak'].join('\t'));
for (const vt of [80, 120, 160, 200, 300, 500]) {
  const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', sensors: { co2: 'on' } } });
  let n = 0;
  const ap = (event: Record<string, unknown>) => e.dispatch({ id: `p${++n}`, issuedBy: 'probe', type: 'applyEvent', event });
  e.advanceTo(1);
  ap({ kind: 'airwayDevice', device: 'ett' }); ap({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: vt, peep: 5, fio2: 0.5 });
  ap({ kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' }); ap({ kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
  let peak = 0;
  e.on((x: any) => { if (x.type === 'wave' && x.channel === 'co2') for (const v of x.samples ?? []) peak = Math.max(peak, v); }, ['wave']);
  e.advanceTo(170); peak = 0; e.advanceTo(180);
  const c = e.st.resp.driver.cycles.at(-1);
  console.log([vt, c?.vt?.toFixed(0), e.st.resp.co2.pf.toFixed(1), peak.toFixed(1)].join('\t'));
}
