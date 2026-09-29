// What-if probes (NOT engine behaviour): the sympathetic reflex output removed through a state poke on the committed
// pipeline state (e.st.hemo.circ.prof.gSymp = 0: the arterial AND cardiopulmonary sympathetic limbs), to measure how
// much of each shock state's pressure is held up by reflex sympathetic tone — the quantity propofol's central
// sympatholysis removes clinically. Scratch-only; the engine source is untouched.
import { run, save, A, VENTED, type Scenario, type Step } from './runner.ts';
const noSymp = (t: number): Step => [t, (e: any) => { e.st.hemo.circ.prof.gSymp = 0; }, 'what-if: gSymp = 0'];
const prop = (t: number, mgkg: number): Step => [t, A.drug('propofol', mgkg, 'mg/kg'), `propofol ${mgkg} mg/kg`];
const S = (name: string, title: string, steps: Step[], tEnd: number): Scenario => ({ name, title, mode: 'modeled', steps: [...VENTED, ...steps], tEnd, printEvery: 60 });
const W: Scenario[] = [
  S('W1-healthy-nosymp', 'WHAT-IF healthy: sympathetic reflex output removed at 300 s', [noSymp(300)], 900),
  S('W2-tamp-nosymp', 'WHAT-IF tamponade 1: sympathetic reflex output removed at 660 s', [[60, A.cond('tamponade', 1), 'tamponade 1'], noSymp(660)], 1260),
  S('W3-tamp-nosymp-prop2', 'WHAT-IF tamponade 1: sympathetic removed + propofol 2 mg/kg at 660 s', [[60, A.cond('tamponade', 1), 'tamponade 1'], noSymp(660), prop(660, 2)], 1260),
  S('W4-bleed-nosymp-prop2', 'WHAT-IF bleed 1.5 L: sympathetic removed + propofol 2 mg/kg at 960 s', [[60, A.bleed(1500, 600), 'bleed 1.5 L'], noSymp(960), prop(960, 2)], 1560),
  S('W5-healthy-nosymp-prop2', 'WHAT-IF healthy: sympathetic removed + propofol 2 mg/kg at 300 s', [noSymp(300), prop(300, 2)], 900),
];
for (const sc of W) {
  const { rows, log } = await run(sc);
  save(sc, rows, log);
  const t0 = Math.max(...sc.steps.map((s) => s[0]));
  const pre = rows.filter((r) => r.t > t0 - 30 && r.t <= t0);
  const post = rows.filter((r) => r.t > t0 && r.t <= t0 + 600);
  const nad = post.reduce((a, b) => (b.map < a.map ? b : a));
  const mean = (w: any[], k: string) => (w.reduce((s, r) => s + r[k], 0) / w.length).toFixed(1);
  console.log(`${sc.name}: pre MAP ${mean(pre, 'map')} HR ${mean(pre, 'hr')} CO ${mean(pre, 'co')} → nadir MAP ${nad.map.toFixed(1)} (t+${nad.t - t0} s) HR ${nad.hr} CO ${nad.co.toFixed(2)} CPP ${nad.cpp.toFixed(0)} kIsch ${nad.kIsch.toFixed(2)} ${nad.rhythm}; end MAP ${mean(post.slice(-6), 'map')}`);
}
