// Stage, then commit with one chosen transition (research/13-ui-simulator-benchmarks "Top 8" #1: Gaumard UNI's Apply
// panel, SimPad PLUS "Set transition time", Infirmary Integrated's Apply/Reset + auto-apply opt-out). Staged commands
// keep their control key (a later edit of the same control replaces the earlier one); Commit sends them as ONE stage
// group (Stage 6a StageBuffer: the host applies them on one tick) with the batch transition as the ramp of every
// target command. Urgent actions (shock, silence, bolus) never stage.
import { StageBuffer, type AckResult, type CommandInput } from '@pme/controller';

export class Staging {
  private readonly buf: StageBuffer;
  private readonly entries = new Map<string, { c: CommandInput; text: string }>();
  private readonly fns = new Set<() => void>();
  /** "Apply at once" (the opt-out): every submit goes straight to the host. */
  autoApply = false;
  /** Batch transition in seconds (0 = now). */
  transitionS = 0;

  private readonly sendNow: (c: CommandInput) => Promise<AckResult>;

  constructor(prefix: string, sendNow: (c: CommandInput) => Promise<AckResult>) {
    this.buf = new StageBuffer(prefix);
    this.sendNow = sendNow;
  }

  get size(): number {
    return this.entries.size;
  }
  has(key: string): boolean {
    return this.entries.has(key);
  }
  /** Human lines for the footer's list, in staging order. */
  get lines(): string[] {
    return [...this.entries.values()].map((e) => e.text);
  }

  onChange(fn: () => void): () => void {
    this.fns.add(fn);
    return () => void this.fns.delete(fn);
  }

  /** Stage (or, with auto-apply, send with the current transition). `text` is the glossary-worded line. */
  submit(c: CommandInput, key: string, text: string): void {
    if (this.autoApply) {
      void this.sendNow(this.withRamp(c)).catch(() => undefined);
      return;
    }
    this.entries.set(key, { c, text });
    this.buf.stage(c, key);
    this.changed();
  }

  commit(): Promise<AckResult[]> {
    const staged = [...this.buf.staged];
    this.buf.discard();
    for (const c of staged) this.buf.stage(this.withRamp(c), `${Math.random()}`);
    this.entries.clear();
    this.changed();
    return this.buf.commit((c) => this.sendNow(c));
  }

  discard(): void {
    this.buf.discard();
    this.entries.clear();
    this.changed();
  }

  withRamp(c: CommandInput): CommandInput {
    const rampable = c.type === 'setTarget' || c.type === 'pin' || c.type === 'release' || c.type === 'setFactor';
    return rampable && this.transitionS > 0 ? ({ ...c, ramp: { durationS: this.transitionS, curve: 'linear' } } as CommandInput) : c;
  }

  private changed(): void {
    for (const fn of this.fns) fn();
  }
}
