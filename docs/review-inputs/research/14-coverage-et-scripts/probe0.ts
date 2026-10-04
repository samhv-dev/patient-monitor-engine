// Probe: state paths the ET runner reads (read-only).
const { createEngine } = (await import(process.env.PME_ENGINE!)) as any;
const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, sensors: { temp: 'on', spo2: 'on', co2: 'on', abp: 'connected' } } });
e.advanceTo(10);
const st = e.st;
console.log(Object.keys(st));
console.log('endo', Object.keys(st.endo), Object.keys(st.endo.core.out));
console.log('temp', Object.keys(st.resp.temp));
console.log('neuro', st.neuro && Object.keys(st.neuro));
console.log('pk', st.pk && Object.keys(st.pk), st.pk?.bus && Object.keys(st.pk.bus));
console.log('blood.o2', st.blood.core.o2, 'pat', st.resp.pat.vco2, st.resp.pat.vo2);
console.log('organs', st.organs && Object.keys(st.organs));
