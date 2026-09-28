// Stage 7d: the brain's effects on the rest of the body (plan decision 4) — the Cushing surge and bradycardia, and
// ataxic breathing. MANUAL: L1 `coupled` sbp/dbp (+1.3/+0.85 × ΔMAP, the widened pulse pressure; MAP = dbp +
// (sbp − dbp)/3 rises by exactly ΔMAP) and an HR request on the instructor's rate. MODELED: 7a's `circ.ext.rSysF` /
// `hrF` (R48; on main since 7a), so the circulation and its baroreflex produce the response.
import { l1Target, type L1State } from '../../l1/state.ts';
import { cushingDMap, cushingHrFactor } from '../brain/cushing.ts';
import type { BrainState } from '../brain/model.ts';
import type { HemoState } from '../hemo/pipeline.ts';
import type { RespState } from '../resp/pipeline.ts';
import { circExt } from './inputs.ts';

export const SBP_SHARE = 1.3;
export const DBP_SHARE = 0.85;
/** MODELED: SVR × (1 + 1.2·drive) [ENG, prototype on 7a+7b+7g, TBI, massMl 28]: MAP 97 → 133 (+36) and HR 73 → 53
 *  (−27 %) from the baroreflex alone (tables: MAP +30–50, HR −20–40 %). Gain 0.8 gave +27; adding a direct HR factor
 *  (ext.hrF = 0.6) on top gave HR 40 and cancelled most of the rise (+11), so 7d leaves `ext.hrF` at 1. */
export const CUSH_SVR_GAIN = 1.2;

export interface EffectsState {
  dMap: number; // ΔMAP last written
  sbp: number | null; // the exact coupled values last written (idempotence against Stage 3's own writes)
  dbp: number | null;
  hrBase: number | null; // the instructor's rate when the surge began
}
export const createEffects = (): EffectsState => ({ dMap: 0, sbp: null, dbp: null, hrBase: null });

export interface EffectsCtx {
  l1: L1State;
  hemo: HemoState;
  resp: RespState;
  hrNow: (t: number) => number;
  setHr: (bpm: number, t: number) => void;
}

export function applyOrganEffects(e: EffectsState, b: BrainState, ctx: EffectsCtx, t: number): void {
  const drive = b.cush.drive;
  (ctx.resp.driver as { ataxia?: number }).ataxia = drive > 0.01 ? drive : 0; // Task 13 adds the field to DriverState
  const ext = circExt(ctx.hemo);
  if (ctx.l1.mode === 'modeled' && ext) {
    // R51 addendum 14: never test for the key — 7a's ext initialiser omits the optional keys
    ext.rSysF = 1 + CUSH_SVR_GAIN * drive; // the bradycardia is the baroreflex's own answer (Cushing's triad): no hrF
    ext.cbfRel = b.cbfRel; // FU-4 F1(b): brainstem perfusion — the vasomotor centre's own supply (E-FU3-10's signal)
    return;
  }
  if (ext && (ext.rSysF !== undefined || ext.hrF !== undefined)) {
    delete ext.rSysF; // back in MANUAL: the MODELED seam is neutral again
    delete ext.hrF;
  }
  const d = cushingDMap(b.cush);
  const c = (ctx.l1.coupled ??= {});
  const baseS = c.sbp !== undefined && c.sbp === e.sbp ? c.sbp - SBP_SHARE * e.dMap : c.sbp;
  const baseD = c.dbp !== undefined && c.dbp === e.dbp ? c.dbp - DBP_SHARE * e.dMap : c.dbp;
  if (d > 0.01) {
    c.sbp = (baseS ?? l1Target(ctx.l1, 'sbp', t)) + SBP_SHARE * d;
    c.dbp = (baseD ?? l1Target(ctx.l1, 'dbp', t)) + DBP_SHARE * d;
    e.sbp = c.sbp;
    e.dbp = c.dbp;
    e.dMap = d;
  } else if (e.dMap > 0) {
    if (baseS === undefined || baseS === l1Target(ctx.l1, 'sbp', t)) delete c.sbp;
    else c.sbp = baseS;
    if (baseD === undefined || baseD === l1Target(ctx.l1, 'dbp', t)) delete c.dbp;
    else c.dbp = baseD;
    e.sbp = null;
    e.dbp = null;
    e.dMap = 0;
  }
  const f = cushingHrFactor(b.cush);
  if (f < 0.995) {
    if (e.hrBase === null) e.hrBase = ctx.hrNow(t);
    const want = e.hrBase * f;
    if (Math.abs(ctx.hrNow(t) - want) > 0.5) ctx.setHr(want, t);
  } else if (e.hrBase !== null) {
    ctx.setHr(e.hrBase, t);
    e.hrBase = null;
  }
}
