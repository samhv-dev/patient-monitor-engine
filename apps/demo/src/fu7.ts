// FU-7 evidence page (plan Task 20 Step 2): four panels, each one gate screenshot, drawn from the engine. Panel 1 plots
// the onset shapes 7g evaluates (gammaShape vs gammaConc's transit chain at each row's own tp/t10); panels 2–4 run the
// engine headless (MODELED, seed 7, the drug audit's adult 40 y / 70 kg) and sample the committed state read-only
// through snapshot() every 5 s (the stage7g.ts pattern). Hook: window.__pme7 { ready, done }.
import { createEngine, DRUGS, gammaConc, gammaN, gammaShape, shockStateFactor, type Command, type EngineEvent, type MonitorEngine, type PatientProfile } from '@pme/engine-core';

type Body = Record<string, unknown>;
type Pt = [number, number];
interface Series { label: string; color: string; pts: Pt[]; dash?: boolean }
interface Box { x: number; y: number; w: number; h: number; title: string; xr: [number, number]; yr: [number, number]; xl: string; yl: string; marks?: { x: number; color: string; label: string }[] }

const ADULT: PatientProfile = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 };
const C = { grid: '#2a2a2a', axis: '#777', text: '#bbb', a: '#4fc3f7', b: '#ffb74d', c: '#81c784', d: '#e57373', e: '#ce93d8', f: '#fff176' };

// ---- drawing ---------------------------------------------------------------------------------------------------------
function plot(ctx: CanvasRenderingContext2D, b: Box, series: Series[]): void {
  const px = (v: number) => b.x + ((v - b.xr[0]) / (b.xr[1] - b.xr[0])) * b.w;
  const py = (v: number) => b.y + b.h - ((Math.min(b.yr[1], Math.max(b.yr[0], v)) - b.yr[0]) / (b.yr[1] - b.yr[0])) * b.h;
  ctx.font = '12px system-ui, sans-serif';
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.grid;
  ctx.fillStyle = C.text;
  for (let i = 0; i <= 4; i++) {
    const yv = b.yr[0] + ((b.yr[1] - b.yr[0]) * i) / 4;
    const xv = b.xr[0] + ((b.xr[1] - b.xr[0]) * i) / 4;
    ctx.beginPath(); ctx.moveTo(b.x, py(yv)); ctx.lineTo(b.x + b.w, py(yv)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(xv), b.y); ctx.lineTo(px(xv), b.y + b.h); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText(String(+yv.toFixed(2)), b.x - 4, py(yv) + 4);
    ctx.textAlign = 'center'; ctx.fillText(String(+xv.toFixed(1)), px(xv), b.y + b.h + 14);
  }
  ctx.strokeStyle = C.axis;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.textAlign = 'left'; ctx.fillStyle = '#eee'; ctx.fillText(b.title, b.x, b.y - 6);
  ctx.fillStyle = C.text; ctx.textAlign = 'center'; ctx.fillText(b.xl, b.x + b.w / 2, b.y + b.h + 28);
  ctx.save(); ctx.translate(b.x - 34, b.y + b.h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(b.yl, 0, 0); ctx.restore();
  for (const m of b.marks ?? []) {
    ctx.strokeStyle = m.color; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(px(m.x), b.y); ctx.lineTo(px(m.x), b.y + b.h); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = m.color; ctx.textAlign = 'left'; ctx.fillText(m.label, px(m.x) + 3, b.y + 12);
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); // the series stay inside the box
  for (const s of series) {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.setLineDash(s.dash ? [6, 4] : []);
    ctx.beginPath();
    s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
    ctx.stroke();
  }
  ctx.restore();
  ctx.setLineDash([]);
  let ly = b.y + 14;
  for (const s of series) { ctx.fillStyle = s.color; ctx.textAlign = 'right'; ctx.fillText(s.label, b.x + b.w - 6, (ly += 14)); }
}
const canvas = (id: string) => (document.querySelector(`#${id} canvas`) as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;

// ---- headless engine runs -----------------------------------------------------------------------------------------------
interface Row { t: number; map: number; hr: number; di: number; conscious: boolean; rr: number; propEq: number; betaOcc: number }
let n = 0;
async function run(steps: [number, Body][], tEnd: number, patient: PatientProfile = ADULT, vent = true): Promise<Row[]> {
  const e: MonitorEngine = createEngine({ seed: 7, mode: 'modeled', patient: { ...patient, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } });
  const an: { di: number; conscious: boolean } = { di: Number.NaN, conscious: true };
  e.on((m: EngineEvent) => { if (m.type === 'anaesthesia') { an.di = m.di; an.conscious = m.conscious; } }, ['anaesthesia']);
  const send = (body: Body) => e.dispatch({ id: `f7-${++n}`, issuedBy: 'fu7', ...body } as Command);
  const ev = (event: Body): Body => ({ type: 'applyEvent', event });
  const q: [number, Body][] = [...(vent ? [[1, ev({ kind: 'airwayDevice', device: 'ett' })], [1, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 })]] as [number, Body][] : []), ...steps.map(([t, b]) => [t, ev(b)] as [number, Body])];
  const rows: Row[] = [];
  for (let t = 5; t <= tEnd; t += 5) {
    while (q.length && q[0]![0] < t) { const [ts, b] = q.shift()!; e.advanceTo(Math.max(e.now().simT, ts)); send(b); }
    e.advanceTo(t);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- read-only access to the committed state (stage7g.ts pattern)
    const st = (e.snapshot().state as { st: any }).st;
    const bs = st.hemo.circ.beats.filter((x: { t: number }) => x.t > t - 6);
    rows.push({
      t, map: bs.length ? bs.reduce((a: number, x: { map: number }) => a + x.map, 0) / bs.length : st.hemo.circ.s[0], hr: st.hemo.circ.hrModel,
      di: an.di, conscious: an.conscious, rr: st.resp.spont?.rr ?? Number.NaN, propEq: st.pk.bus.cns.hypPropEq ?? 0,
      betaOcc: 1 - (1 - (st.pk.betaBlockAdd ?? 0)) * (1 - (st.hemo.circ.prof.betaOcc ?? 0)),
    });
    if (t % 60 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return rows;
}
const series = (rows: Row[], k: keyof Row, t0 = 0, f = (v: number) => v): Pt[] => rows.map((r) => [(r.t - t0) / 60, f(r[k] as number)]);
const delta = (i: Row[], c: Row[], k: 'map' | 'hr', t0: number): Pt[] => i.map((r, j) => [(r.t - t0) / 60, r[k] - (c[j]?.[k] ?? r[k])]);
const status = (s: string) => { (document.getElementById('status') as HTMLElement).textContent = s; };

// ---- panels -------------------------------------------------------------------------------------------------------------
function panel1(): void {
  const ctx = canvas('p1');
  const ids = ['naloxone', 'atropine', 'midazolam', 'ketamine'];
  ids.forEach((id, i) => {
    const pk = (DRUGS as Record<string, { pk: { tpS: number; t10S: number } }>)[id]!.pk;
    const nn = gammaN(pk.tpS, pk.t10S);
    const ts = Array.from({ length: 601 }, (_, k) => k);
    const before: Pt[] = ts.map((t) => [t / 60, gammaShape(t, pk.tpS, nn)]);
    const after: Pt[] = ts.map((t) => [t / 60, gammaConc([{ t: 0, scale: 1 }], t, pk.tpS, nn, pk.t10S)]);
    const x = 60 + (i % 2) * 610;
    const y = 30 + Math.floor(i / 2) * 290;
    plot(ctx, { x, y, w: 540, h: 220, title: `${id} — peak ${pk.tpS} s; 10 % at ${(pk.t10S / 60).toFixed(0)} min${pk.t10S > 600 ? ' (beyond the axis)' : ''}; gamma n ${nn.toFixed(2)}`, xr: [0, 10], yr: [0, 1.05], xl: 'min after the bolus', yl: 'effect / peak',
      marks: [{ x: pk.tpS / 60, color: C.f, label: 'peak' }, ...(pk.t10S <= 600 ? [{ x: pk.t10S / 60, color: C.e, label: '10 %' }] : [])] },
    [{ label: 'gamma (before)', color: C.b, pts: before, dash: true }, { label: 'chain (after)', color: C.a, pts: after }]);
  });
}

async function panel2(): Promise<void> {
  const r = await run([[1, { kind: 'ventilation', source: 'spontaneous', fio2: 1 }], [300, { kind: 'drug', drugId: 'thiopental', dose: 4, unit: 'mg/kg', route: 'iv' }]], 1500, ADULT, false);
  const ctx = canvas('p2');
  const T = 300;
  const loc = r.find((x) => x.t > T && !x.conscious)?.t;
  const wake = r.find((x) => loc !== undefined && x.t > loc && x.conscious)?.t;
  const marks = [...(loc ? [{ x: (loc - T) / 60, color: C.d, label: `LOC +${loc - T} s` }] : []), ...(wake ? [{ x: (wake - T) / 60, color: C.c, label: `awake +${wake - T} s` }] : [])];
  plot(ctx, { x: 60, y: 30, w: 540, h: 220, title: 'propofol-equivalent Ce (µg/mL)', xr: [0, 20], yr: [0, 8], xl: 'min after the bolus', yl: 'µg/mL', marks }, [{ label: 'Ce prop-eq', color: C.a, pts: series(r, 'propEq', T) }]);
  plot(ctx, { x: 670, y: 30, w: 540, h: 220, title: 'depth index', xr: [0, 20], yr: [0, 100], xl: 'min after the bolus', yl: 'DI', marks }, [{ label: 'DI', color: C.b, pts: series(r, 'di', T) }]);
  plot(ctx, { x: 60, y: 320, w: 540, h: 220, title: 'consciousness (1 = conscious)', xr: [0, 20], yr: [0, 1.05], xl: 'min after the bolus', yl: '', marks }, [{ label: 'conscious', color: C.c, pts: r.map((x) => [(x.t - T) / 60, x.conscious ? 1 : 0]) }]);
  plot(ctx, { x: 670, y: 320, w: 540, h: 220, title: 'spontaneous rate (/min)', xr: [0, 20], yr: [0, 25], xl: 'min after the bolus', yl: '/min', marks }, [{ label: 'RR', color: C.e, pts: series(r, 'rr', T) }]);
}

async function panel3(): Promise<void> {
  const BB: PatientProfile = { ...ADULT, conditions: [{ id: 'betaBlocked' }] } as PatientProfile;
  const T = 300;
  const d = (drugId: string, dose: number, unit: string): [number, Body] => [T, { kind: 'drug', drugId, dose, unit, route: 'iv' }];
  const ctl = await run([], T + 600);
  const ctlB = await run([], T + 600, BB);
  const eph = await run([d('ephedrine', 10, 'mg')], T + 600);
  const ephB = await run([d('ephedrine', 10, 'mg')], T + 600, BB);
  const adr = await run([d('epinephrine', 100, 'mcg')], T + 600);
  const adrB = await run([d('epinephrine', 100, 'mcg')], T + 600, BB);
  const ctx = canvas('p3');
  const box = (x: number, y: number, title: string, yl: string, yr: [number, number]): Box => ({ x, y, w: 360, h: 220, title, xr: [0, 10], yr, xl: 'min after the dose', yl });
  plot(ctx, box(60, 30, 'ephedrine 10 mg: ΔMAP (mmHg)', 'mmHg', [-5, 30]), [{ label: 'healthy', color: C.a, pts: delta(eph, ctl, 'map', T) }, { label: 'β-blocked', color: C.d, pts: delta(ephB, ctlB, 'map', T) }]);
  plot(ctx, box(470, 30, 'ephedrine 10 mg: ΔHR (bpm)', 'bpm', [-5, 20]), [{ label: 'healthy', color: C.a, pts: delta(eph, ctl, 'hr', T) }, { label: 'β-blocked', color: C.d, pts: delta(ephB, ctlB, 'hr', T) }]);
  plot(ctx, box(880, 30, 'β-receptor occupancy (profile ∪ drugs)', '', [0, 1]), [{ label: 'healthy', color: C.a, pts: series(eph, 'betaOcc', T) }, { label: 'β-blocked', color: C.d, pts: series(ephB, 'betaOcc', T) }]);
  plot(ctx, box(60, 320, 'adrenaline 100 µg: ΔMAP (mmHg)', 'mmHg', [-10, 80]), [{ label: 'healthy', color: C.a, pts: delta(adr, ctl, 'map', T) }, { label: 'β-blocked (β1-selective)', color: C.d, pts: delta(adrB, ctlB, 'map', T) }]);
  plot(ctx, box(470, 320, 'adrenaline 100 µg: ΔHR (bpm)', 'bpm', [-10, 40]), [{ label: 'healthy', color: C.a, pts: delta(adr, ctl, 'hr', T) }, { label: 'β-blocked', color: C.d, pts: delta(adrB, ctlB, 'hr', T) }]);
}

async function panel4(): Promise<void> {
  const S = 300;
  const stim = (intensity: number): Body => ({ kind: 'stimulus', intensity });
  const prop: [number, Body] = [240, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }];
  const lab: [number, Body] = [180, { kind: 'drug', drugId: 'labetalol', dose: 10, unit: 'mg', route: 'iv' }];
  const lar: [number, Body][] = [[S, stim(1.5)], [S + 60, stim(0)]];
  const c = await run([prop], S + 600);
  const i = await run([prop, ...lar], S + 600);
  const cl = await run([lab, prop], S + 600);
  const il = await run([lab, prop, ...lar], S + 600);
  const ctx = canvas('p4');
  const box = (x: number, title: string, yl: string, yr: [number, number]): Box => ({ x, y: 30, w: 540, h: 220, title, xr: [0, 10], yr, xl: 'min after laryngoscopy (1 min, intensity 1.5)', yl });
  plot(ctx, box(60, 'laryngoscopy after propofol 2 mg/kg: ΔMAP (mmHg)', 'mmHg', [-5, 35]), [{ label: 'propofol', color: C.a, pts: delta(i, c, 'map', S) }, { label: '+ labetalol 10 mg', color: C.d, pts: delta(il, cl, 'map', S) }]);
  plot(ctx, box(670, '… ΔHR (bpm)', 'bpm', [-5, 35]), [{ label: 'propofol', color: C.a, pts: delta(i, c, 'hr', S) }, { label: '+ labetalol 10 mg', color: C.d, pts: delta(il, cl, 'hr', S) }]);
  const base = { cls: 'vf', synced: false, energyJ: 200, defaultJ: 200, vfDurationS: 600, onTPeak: false } as Parameters<typeof shockStateFactor>[0];
  const k: Pt[] = Array.from({ length: 61 }, (_, j) => { const v = 4 + j * 0.1; return [v, shockStateFactor({ ...base, kEcg: v })]; });
  const ph: Pt[] = Array.from({ length: 61 }, (_, j) => { const v = 6.7 + j * 0.01; return [v, shockStateFactor({ ...base, ph: v })]; });
  const cpp: Pt[] = Array.from({ length: 61 }, (_, j) => { const v = j; return [v, shockStateFactor({ ...base, cppMmHg: v })]; });
  const aa: Pt[] = Array.from({ length: 21 }, (_, j) => { const v = j / 20; return [v, shockStateFactor({ ...base, antiarrhythmicU: v })]; });
  const sb = (x: number, title: string, xl: string, xr: [number, number]): Box => ({ x, y: 330, w: 250, h: 210, title, xr, yr: [0, 1.6], xl, yl: '× ROSC share' });
  plot(ctx, sb(60, 'K⁺ (ECG), mmol/L', 'mmol/L', [4, 10]), [{ label: 'factor', color: C.b, pts: k }]);
  plot(ctx, sb(370, 'arterial pH', 'pH', [6.7, 7.3]), [{ label: 'factor', color: C.e, pts: ph }]);
  plot(ctx, sb(680, 'CPP (circulatory phase, VF 10 min)', 'mmHg', [0, 60]), [{ label: 'factor', color: C.c, pts: cpp }]);
  plot(ctx, sb(990, 'antiarrhythmic occupancy', 'u', [0, 1]), [{ label: 'factor', color: C.a, pts: aa }]);
}

const hook = { ready: false, done: false, error: '' };
(window as unknown as { __pme7: typeof hook }).__pme7 = hook;
hook.ready = true;
(async () => {
  panel1();
  status('panel 2…'); await panel2();
  status('panel 3…'); await panel3();
  status('panel 4…'); await panel4();
  status('done');
  hook.done = true;
})().catch((e: unknown) => { hook.error = String(e); status(`error: ${String(e)}`); });
