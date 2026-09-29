// Ventilator link vs the engine's own ventilator (audit §2 I): the SAME patient (link profile 'normal', 55 y 70 kg)
// on VC 12 × 500, PEEP 5, FiO2 0.5 — (L) through the R27 in-process link (@pme/ventilator createLinkedSim, which sends
// the thermal GA event itself) in MANUAL (the link default) and MODELED, and (E) the engine's internal ventilator with
// the same settings + thermal GA. At 20 min both get airway `bronchospasm` 1. Reports gas exchange and the airway
// pressures each side computes (the ventilator's measured PIP/PLAT/autoPEEP vs the engine lung's own).
// Run: PME_VENT=<wt>/packages/ventilator/src/index.ts PME_ENGINE=… node --import ./hooks.mjs probe-link.ts
const V = (await import(process.env.PME_VENT!)) as any;
const { createEngine } = (await import(process.env.PME_ENGINE!)) as any;
const r = (x: number, d = 1) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : NaN);
const patient = V.PROFILES.normal.patient;
const lastMeas = (ev: any[], id: string) => { for (let i = ev.length - 1; i >= 0; i--) { const x = ev[i]; if (x.type === 'measurement' && x.values[id]?.value != null) return x.values[id].value; } return NaN; };
function row(tag: string, t: number, e: any, meas: (id: string) => number, vent?: any) {
  const rs = e.st.resp;
  const m = vent?.p.measured;
  const d = rs.driver;
  const mech = d.source !== 'spontaneous' && d.source !== 'none';
  const vd = rs.pat.deadSpaceMl + (mech ? Math.min(50, 1.5 * rs.pat.weightKg) : 0) + rs.co2.vdExtraMl;
  return `${tag} t${t}: src ${d.source}, VD ${r(vd, 0)} (extra ${r(rs.co2.vdExtraMl, 0)}), PaCO2 ${r(rs.co2.pf)}, EtCO2 disp ${meas('etco2')}, SpO2 ${meas('spo2')}, PaO2 ${r(rs.o2.pao2, 0)}, shunt ${r(rs.shunt, 2)}; engine lung Pplat~${r(rs.lung.pInsp)} PEEPtot ${r(rs.lung.peepTot)}` + (m ? `; VENT PIP ${r(m.PIP)} PLAT ${r(m.PLAT)} autoPEEP ${r(m.autoPEEP)} VTE ${r(m.VTE, 0)} (vent C ${vent.cfg.compliance} R ${vent.cfg.resistance})` : '');
}
for (const mode of ['manual', 'modeled']) {
  const s = V.createLinkedSim({ profile: 'normal', vent: { rate: 12, vt: 500, peep: 5, fio2: 50 } });
  if (mode === 'modeled') s.send({ type: 'setMode', mode: 'modeled' });
  const out: string[] = [];
  for (let t = 60; t <= 2400; t += 60) {
    if (t === 1260) s.send({ type: 'applyEvent', event: { kind: 'airway', state: 'bronchospasm', severity: 1 } });
    s.advanceTo(t);
    if ([600, 1200, 1500, 2400].includes(t)) out.push(row(`LINK ${mode}`, t, s.engine as any, (id) => lastMeas(s.events, id), s.vs));
    await new Promise((q) => setImmediate(q));
  }
  console.log(out.join('\n'));
}
{
  const e = createEngine({ seed: 7, mode: 'modeled', patient });
  const ev: any[] = [];
  e.on((x: any) => ev.push(x), ['measurement']);
  let n = 0;
  const send = (b: any) => e.dispatch({ id: `e${++n}`, issuedBy: 'p', ...b });
  send({ type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
  send({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } });
  const out: string[] = [];
  let pk = 0;
  for (let t = 1; t <= 2400; t += 1) {
    if (t === 1260) send({ type: 'applyEvent', event: { kind: 'airway', state: 'bronchospasm', severity: 1 } });
    for (let u = 0; u < 10; u++) { e.advanceTo(t - 1 + (u + 1) / 10); pk = Math.max(pk, e.st.resp.lung.mech.paw); }
    if ([600, 1200, 1500, 2400].includes(t)) { out.push(row('ENGINE vent (modeled)', t, e, (id) => lastMeas(ev, id)) + `; engine Ppeak(last 60 s) ${r(pk)}`); }
    if (t % 60 === 0) { pk = 0; ev.splice(0, Math.max(0, ev.length - 50)); await new Promise((q) => setImmediate(q)); }
  }
  console.log(out.join('\n'));
}
