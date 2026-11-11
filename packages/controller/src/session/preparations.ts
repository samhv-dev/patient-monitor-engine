// Plan learner-action-remote.md L4 (§4 D3, D7, D8; §7.1; LQ3, LQ4, LQ7–LQ9): the host's table of the preparations its
// learner remotes staged, and the translation of a remote's `prep deliver`, `prep infuse` and `infusion set` into the
// engine events the instructor's own panel sends. Nothing the device sends is trusted as a quantity: it names products,
// amounts of them, a diluent volume and the volume it pushes or the pump's mL/h; the concentration, the findings, the
// ready time and the fraction still intact (r) are the formulary's (prepare.ts, remaining.ts), computed here on the host.
// The delivered amount is `volume × concentration × r(age)` (§7.1), r read at the delivery's sim time. Pure: no clock,
// no I/O; the host session (host-session.ts) owns when each step runs and what it sends.
import type { WireCommand } from '../protocol.ts';
import { prepare, type Active, type Preparation, type PrepComponent as BenchComponent } from '../formulary/prepare.ts';
import { remaining, type Remaining } from '../formulary/remaining.ts';
import type { Formulary, Stability } from '../formulary/types.ts';
import type { Finding } from '../formulary/findings.ts';
import type { PrepRecord, StagedPrep } from '../scenario/types-v2.ts';

/**
 * The temperature the room keeps a preparation at, °C: which of the source's stability rows applies (remaining.ts matches
 * the row's temperature exactly) [ENG: scenario; the case is set in an air-conditioned theatre at controlled room
 * temperature, and 25 °C is the condition the formulary's room-temperature rows were measured at (USP <659>, 20–25 °C)].
 */
export const PREP_TEMP_C = 25;
/**
 * The most preparations one remote keeps at a time; one more is refused until it discards one [ENG: network; a bound on
 * the host's memory against a looping device: a tray of 4 (§4 D2) eight times over].
 */
export const PREPS_PER_DEVICE = 32;
/** The containers a preparation may name: the formulary's stability containers (types.ts `Stability['container']`). */
export const PREP_CONTAINERS: ReadonlySet<string> = new Set<Stability['container']>(['vial', 'syringe-pp', 'bag-pvc', 'bag-polyolefin']);
/** The engine's units for a dose (engine-core types-pk.ts DoseUnit) that a formulary strength can be in. */
const DOSE_UNITS: ReadonlySet<string> = new Set(['mcg', 'mg', 'g', 'mEq', 'mmol', 'units']);
/** The engine's units for a syringe concentration (types-pk.ts `infusion.concentration.unit`). */
const SYRINGE_UNITS: ReadonlySet<string> = new Set(['mg', 'mcg', 'units', 'g']);
/** A volume compared after arithmetic: below this the remainder is empty, mL [ENG: numerics]. */
const EPS_ML = 1e-9;

/** One preparation the host made for a learner's device (keyed by the device key `by` and the device's own `id`). */
export interface HostPrep {
  id: string;
  /** The device key of the remote that staged it (its hello's `device`). */
  by: string;
  /** The peer id of the socket that staged it (the `prep` events' `to`). */
  from: string;
  /** Sim time it was staged, s. */
  t: number;
  /** The first product of each drug, as the device named it. */
  products: Record<string, string>;
  prep: Preparation;
  /** What is left in the syringe or bag, mL (a bolus takes from it; an infusion's volume is the pump's, not counted). */
  leftMl: number;
  /** LQ3: when the instructor showed the incompatibility notice (L9 sets it; null until then). */
  notice: { shownAt: number } | null;
  /** L9: sim time of the first delivery or infusion from it (null: not given), for the instructor's card. */
  givenAt: number | null;
  /** The figures of each drug's last give from it, read by the scenario driver's record (driver.ts `preparation`). */
  gives: Record<string, { remaining: number; activeAmount: number; unit: string }>;
}

/** A running infusion as the host applied it: its rate and unit, its syringe concentration (absent: the row's own), who set it. */
export interface Running {
  rate: number;
  unit: string;
  concentration?: { amount: number; unit: string; perMl: number };
  by: string;
}

export type Translated = { ok: true; cmds: WireCommand[]; volumeMl: number } | { ok: false; why: string };

const no = (why: string) => ({ ok: false as const, why });
/** "1:10" for 70 s: the time left before a preparation is ready (rounded up: never "0:00" while it is not). */
export const mmss = (s: number): string => {
  const n = Math.ceil(s);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

/** The drug a product belongs to (the wire names only the product), or why it cannot be named. */
function drugOfProduct(f: Formulary, productId: string): string | { why: string } {
  const owners = Object.values(f.drugs).filter((d) => d.products.some((p) => p.id === productId)).map((d) => d.drugId);
  if (owners.length === 1) return owners[0] as string;
  return { why: owners.length === 0 ? `the formulary has no product "${productId}"` : `"${productId}" is a product of ${owners.join(' and ')}` };
}

/**
 * Make the preparation a remote asked for (`prep stage`), or say why not. Every number is the formulary's; the device's
 * components are only its choice of products and amounts.
 */
export function stagePrep(
  f: Formulary, cmd: Extract<WireCommand, { type: 'prep'; action: 'stage' }>, by: string, from: string, simT: number,
): { ok: true; prep: HostPrep } | { ok: false; why: string } {
  const p = cmd.prep;
  if (p.container !== undefined && !PREP_CONTAINERS.has(p.container)) return no(`a preparation is in a ${[...PREP_CONTAINERS].join(', ')}, not "${p.container}"`);
  const components: BenchComponent[] = [];
  const products: Record<string, string> = {};
  for (const c of p.components) {
    const drugId = drugOfProduct(f, c.productId);
    if (typeof drugId !== 'string') return no(drugId.why);
    components.push({ drugId, productId: c.productId, amount: c.amount, unit: c.unit });
    products[drugId] ??= c.productId;
  }
  const made = prepare(components, p.diluent, f, simT, p.container as Stability['container'] | undefined);
  if (!made.ok) return no(made.why);
  return { ok: true, prep: { id: p.id, by, from, t: simT, products, prep: made, leftMl: made.volumeMl, notice: null, givenAt: null, gives: {} } };
}

/** r for one drug of a preparation at sim time `simT` (§7.1): the source's points, LQ8 where it is incompatible with no figure. */
export function remainingOf(f: Formulary, h: HostPrep, drugId: string, simT: number): Remaining {
  const entry = f.drugs[drugId];
  const incompatible = h.prep.findings.some((x) => x.kind === 'incompatible' && (x.drugId === drugId || x.other === drugId));
  if (!entry) return { r: 1, basis: 'none', beyondData: false, note: 'loss not known', deliverable: true, src: null };
  // no diluent or no container: no stability row can apply (remaining() matches both exactly), so r is LQ8's or 1
  return remaining(entry, h.prep.diluent?.id ?? '', h.prep.container as Stability['container'], PREP_TEMP_C, Math.max(0, simT - h.t), { incompatible });
}

/** Why a preparation cannot be used now (not ready, or LQ8 C), else null. */
function notUsable(f: Formulary, h: HostPrep, simT: number): string | null {
  if (simT < h.prep.ready.atS) return `not ready yet (${mmss(h.prep.ready.atS - simT)})`;
  const stop = h.prep.actives.find((a) => !remainingOf(f, h, a.drugId, simT).deliverable);
  return stop ? `${stop.drugId} in this preparation cannot be given (${remainingOf(f, h, stop.drugId, simT).note})` : null;
}

/** The commands a delivery or infusion of several drugs becomes: the first keeps the remote's id, the others `<id>.<n>`, one stage group. */
function spread(base: WireCommand, actives: Active[], event: (a: Active) => Record<string, unknown> | string): Translated | { ok: true; cmds: WireCommand[] } {
  const cmds: WireCommand[] = [];
  const group = actives.length > 1 ? (base.stageGroup ?? `prep-${base.id}`) : base.stageGroup;
  for (const [k, a] of actives.entries()) {
    const ev = event(a);
    if (typeof ev === 'string') return no(ev);
    cmds.push({ ...base, id: k === 0 ? base.id : `${base.id}.${k + 1}`, type: 'applyEvent', event: ev, ...(group !== undefined ? { stageGroup: group } : {}) } as unknown as WireCommand);
  }
  return { ok: true, cmds };
}

/**
 * `prep deliver` → one bolus `applyEvent drug` per drug in the preparation, each dose = volume × that drug's concentration
 * × its r at `simT`, through the instructor's own path (the drug lock, staged delivery, the engine's validation). `base`
 * carries the command's id, `issuedBy`, `by`, `prepId`, `stageGroup` and `batch` as the host files them.
 */
export function deliverPrep(
  f: Formulary, h: HostPrep, cmd: Extract<WireCommand, { type: 'prep'; action: 'deliver' }>, base: WireCommand, simT: number,
): Translated {
  const why = notUsable(f, h, simT);
  if (why) return no(why);
  if (h.leftMl <= EPS_ML) return no('the preparation is empty');
  const volumeMl = cmd.volumeMl === 'all' ? h.leftMl : cmd.volumeMl;
  if (volumeMl > h.leftMl + EPS_ML) return no(`only ${+h.leftMl.toFixed(2)} mL is left in the preparation`);
  // a tray's items are counted one per preparation (`batch.n`): a preparation of two drugs is delivered on its own
  if (h.prep.actives.length > 1 && cmd.batch && cmd.batch.n > 1) return no('a preparation of two drugs is delivered on its own, not in a tray');
  const out = spread(base, h.prep.actives, (a) => {
    if (!DOSE_UNITS.has(a.unit)) return `the monitor takes no ${a.drugId} dose in ${a.unit}`;
    const r = remainingOf(f, h, a.drugId, simT).r;
    const dose = volumeMl * a.perMl * r;
    h.gives[a.drugId] = { remaining: r, activeAmount: dose, unit: a.unit };
    return { kind: 'drug', drugId: a.drugId, dose, unit: a.unit, route: cmd.route, ...(cmd.overS !== undefined ? { overS: cmd.overS } : {}) };
  });
  return out.ok ? { ok: true, cmds: out.cmds, volumeMl } : out;
}

/**
 * `prep infuse` → one `applyEvent infusion` per drug at the pump's mL/h, with that drug's concentration × its r at the
 * start (§7.1: the concentration is fixed at its start value; L12, conditional, would make it fall with age). `running`
 * gives the rate each replaces (LQ4).
 */
export function infusePrep(
  f: Formulary, h: HostPrep, cmd: Extract<WireCommand, { type: 'prep'; action: 'infuse' }>, base: WireCommand, simT: number, running: ReadonlyMap<string, Running>,
): Translated {
  const why = notUsable(f, h, simT);
  if (why) return no(why);
  const out = spread(base, h.prep.actives, (a) => {
    if (!SYRINGE_UNITS.has(a.unit)) return `the pump takes no ${a.drugId} syringe in ${a.unit}`;
    const r = remainingOf(f, h, a.drugId, simT).r;
    h.gives[a.drugId] = { remaining: r, activeAmount: a.perMl * r, unit: `${a.unit}/mL` }; // an infusion's: per mL of the syringe
    return { kind: 'infusion', drugId: a.drugId, rate: cmd.rateMlH, unit: 'mL/h', concentration: { amount: a.perMl * r, unit: a.unit, perMl: 1 } };
  });
  if (!out.ok) return out;
  for (const c of out.cmds) {
    const was = running.get((c as { event: { drugId: string } }).event.drugId);
    if (was) Object.assign(c, { replaced: { rate: was.rate, rateUnit: was.unit, by: was.by } });
  }
  return { ok: true, cmds: out.cmds, volumeMl: 0 };
}

/**
 * `infusion set` (LQ4, option B): change, or at 0 stop, the running infusion of `drugId` whoever started it, at the pump's
 * mL/h with THAT infusion's own syringe (its concentration, or none: the engine's row syringe, as the instructor's rate
 * gave it), recording the rate it replaced and who had set it.
 */
export function setInfusion(cmd: Extract<WireCommand, { type: 'infusion' }>, base: WireCommand, running: ReadonlyMap<string, Running>): Translated {
  const was = running.get(cmd.drugId);
  if (!was) return no(`no ${cmd.drugId} infusion is running`);
  const event = { kind: 'infusion', drugId: cmd.drugId, rate: cmd.rateMlH, unit: 'mL/h', ...(was.concentration ? { concentration: was.concentration } : {}) };
  return { ok: true, cmds: [{ ...base, type: 'applyEvent', event, replaced: { rate: was.rate, rateUnit: was.unit, by: was.by } } as unknown as WireCommand], volumeMl: 0 };
}

/** The scenario driver's record of a preparation for one of its drugs at its last give (types-v2.ts PrepRecord), or undefined. */
export function prepRecord(h: HostPrep, drugId?: string): PrepRecord | undefined {
  const a = h.prep.actives.find((x) => drugId === undefined || x.drugId === drugId);
  if (!a) return undefined;
  const g = h.gives[a.drugId];
  return {
    id: h.id, drugId: a.drugId, productId: h.products[a.drugId] as string, ...(h.prep.diluent ? { diluent: h.prep.diluent.id } : {}),
    concentration: { amount: a.amount, unit: a.unit, perMl: a.perMl }, volumeMl: h.prep.volumeMl, findings: h.prep.findings, notice: h.notice,
    remaining: g?.remaining ?? 1, activeAmount: g?.activeAmount ?? 0, unit: g?.unit ?? a.unit,
  };
}

/** The preparation as staged, for the scenario driver's record (driver.ts recordPreparation): its first drug, every finding. */
export function stagedOf(h: HostPrep): StagedPrep {
  const { remaining: _r, activeAmount: _a, unit: _u, ...rest } = prepRecord(h) as PrepRecord;
  return { ...rest, by: h.by, t: h.t };
}

/** What a `prep` event says happened to the preparation (§4 D7); `notice` (L7, LQ3): the instructor showed its finding. */
export type PrepNewsKind = 'made' | 'delivered' | 'infusing' | 'discarded' | 'notice';
/** The `prep` event's body to the remote that staged it (`to` its peer id): L7's tray reads this. */
export interface LearnerPrepNews { news: PrepNewsKind; prep: LearnerPrepView }
/** The `prep` event's body to the host's own screens and granted instructors (`to` the host's peer id): L9's card reads this. */
export interface InstructorPrepNews { news: PrepNewsKind; prep: InstructorPrepView }
export interface LearnerPrepView {
  id: string;
  actives: Active[];
  volumeMl: number;
  leftMl: number;
  diluent: Preparation['diluent'];
  container: Preparation['container'];
  ready: { atS: number; gap: 'LQ7' | null };
  /**
   * LQ3 (§4 D7): present only once the instructor has shown the incompatibility notice: when, and the preparation's
   * findings with their sources, which the remote then shows inside the preparation. Absent until then: the remote
   * knows nothing of a finding before the instructor decides.
   */
  notice?: { shownAt: number; findings: Finding[] };
}
export interface InstructorPrepView extends Omit<LearnerPrepView, 'ready' | 'notice'> {
  by: string;
  /** L9: the name Room setup gave the device (absent: none given), for the instructor's card. */
  name?: string;
  t: number;
  findings: Finding[];
  notice: HostPrep['notice'];
  /** L9: when it was first given from (null: not yet): "given at mm:ss, notice not shown" on the card. */
  givenAt: number | null;
  ready: Preparation['ready'];
}

/** What the remote that staged it is told (§4 D7): the findings only once the instructor has shown the notice (LQ3). */
export function learnerView(h: HostPrep): LearnerPrepView {
  return {
    id: h.id, actives: h.prep.actives, volumeMl: h.prep.volumeMl, leftMl: h.leftMl, diluent: h.prep.diluent, container: h.prep.container,
    ready: { atS: h.prep.ready.atS, gap: h.prep.ready.gap },
    ...(h.notice ? { notice: { shownAt: h.notice.shownAt, findings: h.prep.findings } } : {}),
  };
}
/** What the instructor's screens are told (§4 D7): the whole preparation, its findings and the device that staged it. */
export function instructorView(h: HostPrep): InstructorPrepView {
  const { notice: _n, ...view } = learnerView(h);
  return { ...view, by: h.by, t: h.t, findings: h.prep.findings, notice: h.notice, givenAt: h.givenAt, ready: h.prep.ready };
}
