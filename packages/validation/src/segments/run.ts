// Headless runner: one pme-validation/1 document → the scenario driven through Stage 6b's ScenarioDriver on a
// bare engine (no renderer), the series recorded, every target graded (R40). Commands the engine refuses because a
// later stage owns them ("arrives in Stage 7", "not implemented") make the document NOT MEASURABLE on this build
// (decision 8): it is listed, not graded, and does not gate.
import { createEngine, type Command, type EngineEvent } from '@pme/engine-core';
import { BUILTIN_SCENARIOS, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
import { gradeTarget } from './grade.ts';
import { SeriesStore } from './series.ts';
import type { TargetResult, Unsupported, ValidationDoc } from './types.ts';

/** The driver is polled every POLL_S of sim time (a 60 fps host polls every ≈ 17 ms; 100 ms keeps runs fast) [ENG]. */
export const POLL_S = 0.1;
export const LATER_STAGE = /arrives in Stage|not implemented/i;

export interface DocRun {
  doc: ValidationDoc;
  measurable: boolean;
  unsupported: Unsupported[];
  results: TargetResult[];
  store: SeriesStore;
  wallMs: number;
  notes: string[];
}

export async function runValidationDoc(doc: ValidationDoc): Promise<DocRun> {
  const t0 = performance.now();
  const raw = typeof doc.scenario === 'string' ? BUILTIN_SCENARIOS[doc.scenario] : doc.scenario;
  if (raw === undefined) throw new Error(`${doc.id}: no built-in scenario ${String(doc.scenario)}`);
  const v = validateScenario(raw);
  if (!v.ok) throw new Error(`${doc.id}: invalid scenario: ${v.errors.join('; ')}`);
  // The body (age, size, sex, age band, baseline) is fixed when the engine is created — a scenario's setup batch only
  // sends rhythm, targets and sensors (Stage 6b runner.start), so the host builds its engine from `patient` first
  // (measured while planning: without this a 4-year-old desaturated like a room-air adult, 47 s instead of ≈ 160 s).
  const p = v.doc.patient ?? {};
  const engine = createEngine({
    seed: doc.seed ?? 1,
    patient: { ...(p.ageY !== undefined ? { ageY: p.ageY } : {}), ...(p.weightKg !== undefined ? { weightKg: p.weightKg } : {}), ...(p.heightCm !== undefined ? { heightCm: p.heightCm } : {}), ...(p.sex ? { sex: p.sex } : {}), ...(p.baseline ? { baseline: p.baseline } : {}) },
    device: { ...(p.ageBand ? { ageBand: p.ageBand } : {}), ...(v.doc.device?.skin ? { skin: v.doc.device.skin } : {}) },
  });
  const store = new SeriesStore();
  const unsupported: Unsupported[] = [];
  const listeners = new Set<(e: EngineEvent) => void>();
  engine.on((e) => {
    store.onEvent(e);
    for (const l of listeners) l(e);
  });
  const dispatch = (c: Command) => {
    const r = engine.dispatch(c);
    if (!r.accepted && LATER_STAGE.test(r.reason ?? '')) unsupported.push({ t: engine.now().simT, type: c.type === 'applyEvent' ? `applyEvent ${(c.event as { kind: string }).kind}` : c.type, reason: r.reason ?? '' });
    return r;
  };
  const driver = new ScenarioDriver({
    target: {
      dispatch,
      snapshot: () => engine.snapshot(),
      restore: (s) => engine.restore(s),
      on: (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      now: () => engine.now(),
      time: () => {},
    },
    publish: (e) => store.onScenario(e.t, e.stateId),
  });
  const loaded = driver.load(v.doc);
  if (!loaded.ok) throw new Error(`${doc.id}: ${loaded.reason}`);
  const actions = [...(doc.actions ?? [])].sort((a, b) => a.t - b.t);
  let k = 0;
  const steps = Math.round(doc.durationS / POLL_S);
  for (let n = 1; n <= steps; n++) {
    const t = Math.round(n * POLL_S * 1000) / 1000;
    engine.advanceTo(t);
    while (k < actions.length && (actions[k] as { t: number }).t <= t + 1e-9) {
      const a = actions[k++] as NonNullable<ValidationDoc['actions']>[number];
      if (a.trigger) await driver.hook({ type: 'scenario', action: 'trigger', target: a.trigger, id: `val-${k}`, issuedBy: 'validation' } as never);
      if (a.command) driver.host.dispatch({ ...(a.command as object), id: `val-${k}`, issuedBy: 'validation' } as never);
    }
    driver.poll();
    if (unsupported.length > 0) break; // not measurable on this build: no point running on
    if (n % 600 === 0) await new Promise<void>((r) => setImmediate(r)); // yield once per sim-minute (CI rule)
  }
  driver.close();
  const segs = new Map(doc.segments.map((s) => [s.id, s]));
  const results: TargetResult[] = [];
  for (const s of doc.segments) {
    for (const tg of s.targets) {
      const measured = store.reduce(tg.series, tg.reduce, s.fromS, s.toS, tg.stateId, tg.threshold);
      const segValue = (id: string) => {
        const o = segs.get(id);
        if (!o) throw new Error(`${doc.id}: no segment ${id}`);
        return store.reduce(tg.series, tg.reduce, o.fromS, o.toS, tg.stateId, tg.threshold);
      };
      const span = s.toS - s.fromS;
      const firstMeasured = tg.type === 'TrendsTo' ? store.reduce(tg.series, 'mean', s.fromS, s.fromS + 0.1 * span) : undefined;
      const m = tg.type === 'TrendsTo' ? store.reduce(tg.series, 'mean', s.toS - 0.1 * span, s.toS) : measured;
      const g = gradeTarget(tg, m, { segValue, ...(firstMeasured !== undefined ? { firstMeasured } : {}) });
      results.push({ doc: doc.id, segment: s.id, target: tg.id, type: tg.type, series: tg.series, source: tg.source, measured: m, ...g });
    }
  }
  const measurable = unsupported.length === 0;
  return { doc, measurable, unsupported, results: measurable ? results : [], store, wallMs: performance.now() - t0, notes: [...driver.notes] };
}
