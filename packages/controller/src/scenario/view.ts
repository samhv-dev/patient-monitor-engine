// What a controller knows about the host's scenario, rebuilt from the wire alone (no ajv, no runner): the doc from
// the `scenario load` commandApplied (sticky, so late joiners get it), the current state from `scenario` events,
// pause state from `scenario pause/resume`. ControllerSession owns one, so the panel and the remote share it.
import type { AppliedResolution, WireEvent } from '../protocol.ts';
import { describeTransition, manualLabel } from './describe.ts';
import type { ScenarioDoc, ScenarioState } from './types.ts';

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
  doc: ScenarioDoc | null = null;
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
      this.doc = c.doc as ScenarioDoc;
      this.docVersion++;
      this.stateId = this.doc.initialState;
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

  current(): ScenarioState | null {
    return this.doc?.states.find((s) => s.id === this.stateId) ?? null;
  }

  /** Scenario time spent in the current state (sim seconds, pauses excluded). */
  timeInState(simT: number): number {
    const end = this.paused && this.pausedAt !== null ? this.pausedAt : simT;
    return Math.max(0, end - this.enteredT - this.pausedTotal);
  }

  next(): NextTransition[] {
    return (this.current()?.transitions ?? []).map((t) => ({
      id: t.id, to: t.to, label: t.label ?? t.id, text: describeTransition(t), manual: manualLabel(t.when),
    }));
  }

  stateLabel(id: string | null = this.stateId): string {
    const s = this.doc?.states.find((x) => x.id === id);
    return s?.label ?? id ?? '—';
  }
}
