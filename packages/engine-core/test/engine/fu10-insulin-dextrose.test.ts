// FU-10 Task A4 (E8; research/14 ET-31) and the insulin nadir (E12a; research/14 ET-20a — Task A5 dropped by ruling
// R-1, so the nadir is held here as an `it.fails`). Awake, spontaneous, room air; 70 kg; seed 7.
import { describe, expect, it } from 'vitest';
import { drug, rows, st } from '../helpers/fu10.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({ glu: st(e).endo.core.out.glucoseMmol as number, k: st(e).blood.out.k as number });
const arm = (doses: [number, Record<string, unknown>][]) => rows(doses, 300 + 3 * 3600, 60, read);
type Rows = Awaited<ReturnType<typeof arm>>;
// the combined-row arm and its control run once per file (two tests read them)
let comboP: Promise<{ c: Rows; ctl: Rows }> | null = null;
const combo = () => (comboP ??= (async () => ({ c: await arm([[300, drug('insulinDextrose', 10, 'units')]]), ctl: await arm([]) }))());
const k60 = (c: Rows, ctl: Rows) => c.find((x) => x.t === 300 + 3600)!.k - ctl.find((x) => x.t === 300 + 3600)!.k;

describe('FU-10 E8/E12a: insulin–dextrose and the insulin nadir', { timeout: 900_000 }, () => {
  it('the combined row: glucose rises, then falls below baseline (as its two parts do)', async () => {
    const { c, ctl } = await combo();
    const g0 = ctl.find((x) => x.t === 300)!.glu;
    console.log(`FU-10 E8: combined row glucose max +${(Math.max(...c.map((x) => x.glu)) - g0).toFixed(2)}, min ${(Math.min(...c.map((x) => x.glu)) - g0).toFixed(2)} mmol/L; K⁺ ${k60(c, ctl).toFixed(2)} at 60 min`);
    expect(Math.max(...c.map((x) => x.glu)) - g0).toBeGreaterThan(3);
    expect(Math.min(...c.map((x) => x.glu)) - g0).toBeLessThan(-1);
  });
  // R45 (declared exception E-FU10-12): the K⁺ band was met (−0.93) only through an artefact the final review found —
  // the hypoglycaemia after the bolus suppressed the pancreas and the insulinopenia term then moved K⁺ OUT (review I1,
  // fixed: only a patient without β-cell reserve is insulinopenic). The fall beyond −1.0 is two pre-existing K⁺ sources,
  // 7c's insulin–dextrose curve plus the insulin secreted for the row's 25 g dextrose (D6; Ali Q4). Not tuned (R44).
  it.fails('the combined row: K⁺ −0.6 to −1.0 at 60 min (tables §5b.2) — measured −1.15', async () => {
    const { c, ctl } = await combo();
    expect(k60(c, ctl)).toBeLessThanOrEqual(-0.6);
    expect(k60(c, ctl)).toBeGreaterThanOrEqual(-1.0);
  });
  // R45 / ruling R-1 (A5 dropped): the remote-insulin lag cannot move without breaking the sourced 75 g OGTT band
  // (`glucose.test.ts` < 140 mg/dL at 2 h); the nadir waits for the insulin's own disposition (Requests → FU-8 Part B).
  it.fails('insulin 10 units IV, awake: nadir at 20–30 min (insulin-tolerance test) — measured 13.3 min', async () => {
    const r = await arm([[300, drug('insulin', 10, 'units')]]);
    const n = r.filter((x) => x.t >= 300 && x.t <= 300 + 3600).reduce((b, x) => (x.glu < b.glu ? x : b));
    expect((n.t - 300) / 60).toBeGreaterThanOrEqual(20);
    expect((n.t - 300) / 60).toBeLessThanOrEqual(30);
  });
});
