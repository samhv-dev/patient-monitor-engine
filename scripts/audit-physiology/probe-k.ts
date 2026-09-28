const { createEngine } = await import(process.env.PME_ENGINE ?? new URL('../../packages/engine-core/src/index.ts', import.meta.url).href);
for (const k of [4.2, 8.5, 9.5]) {
  const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, blood: { k } } as any });
  e.advanceTo(120);
  console.log(`profile K ${k}: blood.out.k ${e.st.blood.out.k.toFixed(2)} kEcg ${e.st.blood.out.kEcg.toFixed(2)} mods.k ${e.st.mods.k} set.k ${e.st.blood.core.so.set?.k} kChem ${e.st.hemo.circ.ext.kChem}`);
}
// burns + sux
const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, blood: { burns: 1 } } as any });
e.advanceTo(60);
e.dispatch({ id: 'a', issuedBy: 'x', type: 'applyEvent', event: { kind: 'drug', drugId: 'succinylcholine', dose: 1.5, unit: 'mg/kg', route: 'iv' } });
for (const t of [120, 240, 360]) { e.advanceTo(t); console.log(`sux burns t${t}: K ${e.st.blood.out.k.toFixed(2)} mods.k ${e.st.mods.k.toFixed(2)} rhythm ${e.st.rhythm.id} kChem ${e.st.hemo.circ.ext.kChem.toFixed(2)}`); }
