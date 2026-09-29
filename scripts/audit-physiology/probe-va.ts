const { createEngine } = await import(process.env.PME_ENGINE ?? new URL('../../packages/engine-core/src/index.ts', import.meta.url).href);
for (const vent of [null, { rr: 12, vtMl: 500 }, { rr: 14, vtMl: 500 }, { rr: 12, vtMl: 600 }]) {
  const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } as any });
  if (vent) {
    e.dispatch({ id: 'a', issuedBy: 'x', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
    e.dispatch({ id: 'b', issuedBy: 'x', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', peep: 5, fio2: 0.5, ...vent } });
  }
  const out: string[] = [];
  for (let t = 60; t <= 3600; t += 60) {
    e.advanceTo(t);
    if (t % 600 === 0) { const r = e.st.resp; out.push(`t${t} VA ${r.vaLpm.toFixed(2)} PaCO2 ${r.co2.pf.toFixed(1)} EtCO2 ${r.etco2.toFixed(1)} vdExtra ${r.co2.vdExtraMl?.toFixed(0)} T ${r.temp.tc.toFixed(2)} vo2F ${e.st.endo.core.out.vo2F}`); }
    await new Promise((r) => setImmediate(r));
  }
  console.log(JSON.stringify(vent), '\n ', out.join('\n  '));
}
