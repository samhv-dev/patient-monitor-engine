// Instructor v2, the staged-delivery cache (design §4.1, §4.2, board "Proposal v11"; plan IP7; answer 11). ONE cache for
// the view, shared by every sheet: a drug, a fluid and a ventilator change can sit in it together, each under its
// control's key (a later edit of the same control replaces the earlier one, as today's staging). Nothing delivers by
// itself, and closing a sheet keeps it. Deliver sends everything through `Link.sendBatch`: one stageGroup and one batch
// id (StageBuffer.commit with `batch`), so the host applies the items on one tick, and one clinical-log line names
// each. Card steps never enter it (answer 11): they are given from ACTION.
//
// It is a `Staging` (staging.ts) so today's tab bodies, mounted unmodified in the other sheets with their own PanelCtx
// (answer 14), stage into it with their own Stage buttons: `submit`, `has` and `drop` are all they call.
import type { AckResult, CommandInput } from '@pme/controller';
import type { Link } from '../link.ts';
import { Staging } from '../staging.ts';
import { toast } from '../ui.ts';

export interface CacheItem {
  key: string;
  cmd: CommandInput;
  text: string;
}

export class Cache extends Staging {
  private readonly link: Link;
  private readonly held = new Map<string, CacheItem>();
  private readonly subs = new Set<() => void>();
  private delivering = false;

  constructor(link: Link) {
    super('ip2', (c) => link.send(c));
    this.link = link;
  }

  override get size(): number {
    return this.held.size;
  }
  override has(key: string): boolean {
    return this.held.has(key);
  }
  override get lines(): string[] {
    return [...this.held.values()].map((x) => x.text);
  }
  /** The staged items in staging order (a replaced item keeps its place). */
  get items(): readonly CacheItem[] {
    return [...this.held.values()];
  }

  override onChange(fn: () => void): () => void {
    this.subs.add(fn);
    return () => void this.subs.delete(fn);
  }

  /** Stage `cmd` under its control's `key` (never sent here, whatever `autoApply` says: the cache has no opt-out). */
  override submit(cmd: CommandInput, key: string, text: string): void {
    if (cmd.type === 'scenario') return; // answer 11: a card step is given from ACTION, never staged
    this.held.set(key, { key, cmd, text });
    this.notify();
  }

  override drop(key: string): void {
    if (this.held.delete(key)) this.notify();
  }

  override discard(): void {
    if (!this.held.size) return;
    this.held.clear();
    this.notify();
  }

  /** Deliver the staged cache: every item at one engine instant, one log line; empty, nothing is sent. */
  override async commit(): Promise<AckResult[]> {
    const items = this.items;
    if (!items.length || this.delivering) return [];
    this.delivering = true;
    this.held.clear();
    this.notify();
    try {
      const rs = await this.link.sendBatch(items.map((x) => x.cmd));
      const refused = rs.filter((r) => !r.accepted).length;
      const n = items.length;
      toast(refused ? `${n - refused} of ${n} staged items delivered; ${refused} refused (see the Log)` : `Staged cache delivered: ${n === 1 ? '1 item' : `${n} items`} at one instant`, refused ? 'alert' : 'info');
      return rs;
    } finally {
      this.delivering = false;
    }
  }

  private notify(): void {
    for (const fn of [...this.subs]) fn();
  }
}
