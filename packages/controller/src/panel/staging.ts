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

  /** Send every staged command with one new stageGroup, in staging order. */
  commit(send: (c: CommandInput) => Promise<AckResult>): Promise<AckResult[]> {
    const group = `${this.prefix}-sg${++this.n}`;
    const batch = this.items.map((c) => ({ ...c, stageGroup: group }) as CommandInput);
    this.discard();
    return Promise.all(batch.map(send));
  }
}
