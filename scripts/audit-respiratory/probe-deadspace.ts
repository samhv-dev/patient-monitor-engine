// Dead-space bookkeeping probe (audit §2 A): what the engine's MANUAL etco2 calibration (run at t = 0 in BOTH modes)
// adds as `vdExtraMl`, per patient, and the resulting dead space / steady PaCO2 on a ventilator. Steady PaCO2 is
// computed from the engine's own relation PaCO2 = 0.863·VCO2 / VA (gas/params.ts K_CO2) with VA = RR·(VT − VD) —
// the MEASURED value after 60 min is printed next to it for the 70 kg case.
// Run: PME_ENGINE=… node --import ./hooks.mjs probe-deadspace.ts > out/deadspace.txt
const { createEngine } = (await import(process.env.PME_ENGINE!)) as any;
const PROFILES: Array<[string, Record<string, unknown>]> = [
  ['male 40 y 70 kg 175 cm', { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }],
  ['female 40 y 60 kg 165 cm', { ageY: 40, sex: 'F', weightKg: 60, heightCm: 165 }],
  ['female 30 y 70 kg 165 cm, pregnancy 1', { ageY: 30, sex: 'F', weightKg: 70, heightCm: 165, lungConditions: [{ id: 'pregnancy', severity: 1 }] }],
  ['male 45 y 127 kg 175 cm', { ageY: 45, sex: 'M', weightKg: 127, heightCm: 175 }],
  ['male 80 y 70 kg 170 cm', { ageY: 80, sex: 'M', weightKg: 70, heightCm: 170 }],
  ['child 4 y 16 kg', { ageY: 4, weightKg: 16, heightCm: 102 }],
];
const r = (x: number) => Math.round(x);
console.log('profile | IBW | VCO2 awake | default RR×VT | anat VD | vdExtra (calibration) | spont VD/VT | vent VD (anat+app+extra) | PaCO2 12×500 awake-VCO2 / GA-VCO2 | PaCO2 12×7 mL/kg IBW (GA) | same with ETT-bypass VD (1 mL/kg + app)');
for (const [name, p] of PROFILES) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: p });
  e.advanceTo(2);
  const rs = e.st.resp;
  const pat = rs.pat;
  const extra = rs.co2.vdExtraMl;
  const rr0 = 15, vt0 = 500; // the L1 defaults (l1/state.ts) every profile starts from
  const app = Math.min(50, 1.5 * pat.weightKg);
  const vdVent = pat.deadSpaceMl + app + extra;
  const pa = (vco2: number, rr: number, vt: number, vd: number) => (0.863 * vco2) / Math.max(0.05, (rr * (vt - vd)) / 1000);
  const vt7 = 7 * pat.ibwKg;
  const vdEtt = 1.0 * pat.ibwKg + app; // the extrathoracic ~1.2 mL/kg is bypassed by the tube (Nunn): ≈ 1 mL/kg left + apparatus
  console.log(`${name} | ${r(pat.ibwKg)} | ${r(pat.vco2)} | ${rr0}×${vt0} | ${r(pat.deadSpaceMl)} | ${r(extra)} | ${((pat.deadSpaceMl + extra) / vt0).toFixed(2)} | ${r(vdVent)} | ${r(pa(pat.vco2, 12, 500, vdVent))} / ${r(pa(pat.vco2 * 0.85, 12, 500, vdVent))} | ${r(pa(pat.vco2 * 0.85, 12, vt7, vdVent))} (VT ${r(vt7)}) | ${r(pa(pat.vco2 * 0.85, 12, vt7, vdEtt))} (VD ${r(vdEtt)})`);
}
