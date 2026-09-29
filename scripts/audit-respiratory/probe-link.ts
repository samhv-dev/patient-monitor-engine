// Probe: the engine's lungState for the ventilator link under bronchospasm (FU-6 Task 1; reconstruction).
const { createEngine } = (await import(process.env.PME_ENGINE as string)) as any;
const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' } });
let n = 0;
const ap = (event: Record<string, unknown>) => e.dispatch({ id: `p${++n}`, issuedBy: 'probe', type: 'applyEvent', event });
let last: any = null;
e.on((x: any) => { if (x.type === 'lungState') last = x; }, ['lungState']);
e.advanceTo(1);
ap({ kind: 'airwayDevice', device: 'ett' }); ap({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
ap({ kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' });
for (const [t, ev] of [[300, null], [600, { kind: 'lungCondition', id: 'bronchospasm', severity: 1 }], [900, null]] as const) {
  if (ev) ap(ev as never);
  e.advanceTo(t);
  console.log(`t ${t}: C ${last?.complianceMlPerCmH2O?.toFixed(1)} R ${last?.resistanceCmH2OPerLps?.toFixed(1)} Ppl ${last?.pleuralCmH2O?.toFixed?.(1)} VD ${last?.deadSpaceMl?.toFixed(0)} FRC ${last?.frcMl?.toFixed(0)}`);
}
