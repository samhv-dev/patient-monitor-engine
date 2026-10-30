// What a controller knows about the host's scenario, rebuilt from the wire alone (no ajv, no runner): the doc from
// the `scenario load` commandApplied (sticky, so late joiners get it), the current state from `scenario` events,
// pause state from `scenario pause/resume`. ControllerSession owns one, so the panel and the remote share it.
// A pme-scenario/2 card's phases travel on the same `scenario` events (stateId = the phase id, Q20): the view reads the
// phase's label for followers and the Remote, and `ended()` answers for both formats (plan F2).
import type { AppliedResolution, WireEvent } from '../protocol.ts';
import { describeTransition, manualLabel, type Labeller } from './describe.ts';
import { asV1, isV2, type AnyScenarioDoc, type ScenarioState } from './types.ts';
import type { Phase } from './types-v2.ts';

export interface NextTransition {
  id: string;
  to: string;
  label: string;
  text: string;
  /** The manual button's label, or null (the panel then offers "Force"). */
  manual: string | null;
}

const TICK_S = 0.02;

export class ScenarioView {
  /** Either format. A `pme-scenario/2` doc has no states, so `current()`, `next()` and `stateLabel()` give it the /1
   *  readers' empty answer (F1); its phase is `phase()`, and `label()` prints a stage's label in either format. */
  doc: AnyScenarioDoc | null = null;
  /** Bumped when the doc changes (the panel rebuilds its lists only then). */
  docVersion = 0;
  stateId: string | null = null;
  enteredT = 0;
  paused = false;
  history: Array<{ t: number; stateId: string; transitionId?: string }> = [];
  private pausedAt: number | null = null;
  private pausedTotal = 0;

  /** Returns true when something the UI shows changed. */
  onEvent(e: WireEvent): boolean {
    if (e.type === 'scenario') {
      if (e.stateId !== this.stateId || e.transitionId === undefined) {
        this.stateId = e.stateId;
        this.enteredT = e.t;
        this.pausedTotal = 0;
        this.pausedAt = this.paused ? e.t : null;
      }
      this.history = [...this.history.slice(-199), { t: e.t, stateId: e.stateId, ...(e.transitionId ? { transitionId: e.transitionId } : {}) }];
      return true;
    }
    if (e.type !== 'commandApplied') return false;
    const c = (e.resolved as AppliedResolution | undefined)?.command;
    if (c?.type !== 'scenario') return false;
    const t = e.tick * TICK_S;
    if (c.action === 'load' && c.doc && typeof c.doc === 'object') {
      this.doc = c.doc as AnyScenarioDoc;
      this.docVersion++;
      this.stateId = isV2(this.doc) ? ((this.doc.phases.find((p) => p.initial) ?? this.doc.phases[0])?.id ?? null) : this.doc.initialState;
      this.enteredT = t;
      this.paused = false;
      this.pausedAt = null;
      this.pausedTotal = 0;
      this.history = [];
      return true;
    }
    if (c.action === 'pause' && !this.paused) {
      this.paused = true;
      this.pausedAt = t;
      return true;
    }
    if (c.action === 'resume' && this.paused) {
      this.paused = false;
      if (this.pausedAt !== null) this.pausedTotal += Math.max(0, t - this.pausedAt);
      this.pausedAt = null;
      return true;
    }
    return false;
  }

  /** A new timeline (the host's engine was replaced): no scenario runs until the next `load`. */
  reset(): void {
    if (this.doc) this.docVersion++;
    this.doc = null;
    this.stateId = null;
    this.enteredT = 0;
    this.paused = false;
    this.pausedAt = null;
    this.pausedTotal = 0;
    this.history = [];
  }

  current(): ScenarioState | null {
    return this.states().find((s) => s.id === this.stateId) ?? null;
  }

  /** The current phase of a `pme-scenario/2` card (null for a /1 card or none). */
  phase(): Phase | null {
    return this.phases().find((p) => p.id === this.stateId) ?? null;
  }

  /**
   * Has the run reached its end? /1: the current state has no transitions (today's rule). /2: the current phase has no
   * `next`. False with no scenario or an unknown state.
   */
  ended(): boolean {
    if (this.doc && isV2(this.doc)) {
      const p = this.phase();
      return p !== null && !p.next?.length;
    }
    const s = this.current();
    return s !== null && !s.transitions?.length;
  }

  /** Scenario time spent in the current state (sim seconds, pauses excluded). */
  timeInState(simT: number): number {
    const end = this.paused && this.pausedAt !== null ? this.pausedAt : simT;
    return Math.max(0, end - this.enteredT - this.pausedTotal);
  }

  /** `lx` prints clinical words for engine ids (the host's glossary); states default to their labels. */
  next(lx: Labeller = {}): NextTransition[] {
    const state = lx.state ?? ((id: string) => this.stateLabel(id));
    return (this.current()?.transitions ?? []).map((t) => ({
      id: t.id, to: t.to, label: t.label ?? t.id, text: describeTransition(t, { ...lx, state }), manual: manualLabel(t.when),
    }));
  }

  stateLabel(id: string | null = this.stateId): string {
    const s = this.states().find((x) => x.id === id);
    return s?.label ?? id ?? '—';
  }

  /** The label of a stage in either format: a /1 state's (as `stateLabel`) or a /2 phase's; its id when unknown. The
   *  controller's Remote and Scenario tab print it; the app's readers move to it with F6. */
  label(id: string | null = this.stateId): string {
    const p = this.phases().find((x) => x.id === id);
    return p ? p.label : this.stateLabel(id);
  }

  private states(): ScenarioState[] {
    return asV1(this.doc)?.states ?? [];
  }

  private phases(): Phase[] {
    return this.doc && isV2(this.doc) ? this.doc.phases : [];
  }
}
