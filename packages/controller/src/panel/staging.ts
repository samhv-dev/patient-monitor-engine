// Stage-then-commit (REALITi, research 01 §4 item 6; brief §4.9): staged commands are sent together with one
// stageGroup, and the host applies them on one tick.
import type { AckResult, CommandInput } from '../protocol.ts';

export class StageBuffer {
  private items: CommandInput[] = [];
  private keys: string[] = [];
  private n = 0;
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  get size(): number {
    return this.items.length;
  }
  get staged(): readonly CommandInput[] {
    return this.items;
  }

  /** Stage a command; a later command for the same control replaces the earlier one. */
  stage(c: CommandInput, key: string): void {
    const i = this.keys.indexOf(key);
    if (i >= 0) {
      this.items[i] = c;
      return;
    }
    this.items.push(c);
    this.keys.push(key);
  }

  discard(): void {
    this.items = [];
    this.keys = [];
  }

  /**
   * Send every staged command with one new stageGroup, in staging order. `batch: true` (a staged delivery, Instructor
   * v2) also stamps each item with `batch: {id: <the stageGroup>, n}`, so the controller logs the delivery as one line.
   */
  commit(send: (c: CommandInput) => Promise<AckResult>, opts: { batch?: true } = {}): Promise<AckResult[]> {
    const group = `${this.prefix}-sg${++this.n}`;
    const n = this.items.length;
    const batch = this.items.map((c) => ({ ...c, stageGroup: group, ...(opts.batch ? { batch: { id: group, n } } : {}) }) as CommandInput);
    this.discard();
    return Promise.all(batch.map(send));
  }
}
