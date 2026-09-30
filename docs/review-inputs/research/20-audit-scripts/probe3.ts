import { A, VENTED, runArm } from './runner.ts';
const show = async (name: string, a: any) => { const R = await runArm({ dt: 5, ...a }); const tA = R.rows.find((r) => r.arrest !== ''); console.log(name, R.rejected, 'arrest', tA?.t, tA?.arrest, R.rhythms.map(([t, id]) => `${t}:${id}`).join(' ')); return R; };
await show('tamp', { steps: [...VENTED, [60, A.cond('tamponade', 1)], [300, A.drug('propofol', 2, 'mg/kg')]], tEnd: 900 });
const cold = await show('cold', { steps: [...VENTED], tEnd: 600, patient: { baseline: { tempCore: 28.5 } } });
console.log('cold temp', cold.rows.slice(0, 5).map((r) => (r.temp as number).toFixed(1)).join(' '), 'hr', cold.rows[50]?.hr);
const cold2 = await show('coldMan', { steps: [...VENTED, [30, A.target('tempCore', 28.5)]], tEnd: 600 });
console.log('cold2 temp', cold2.rows.filter((_, i) => i % 20 === 0).map((r) => (r.temp as number).toFixed(1)).join(' '));
const hyp = await show('asphyx', { steps: [[1, A.thermal({ anaesthesia: 'general' })], [60, A.drug('propofol', 2, 'mg/kg')], [60, A.drug('rocuronium', 0.6, 'mg/kg')], [60, A.none()]], tEnd: 1200 });
console.log(hyp.rows.filter((_, i) => i % 12 === 0).map((r) => `${r.t}:${Math.round(r.spo2True as number)}/${Math.round(r.hr as number)}/${r.rhythm}${r.pulselessOpt ? 'P' : ''}`).join(' '));
