// StageBuffer.commit with and without the staged-delivery batch stamp (Instructor v2, IP1).
import { describe, expect, it } from 'vitest';
import { StageBuffer } from '../../src/panel/staging.ts';
import type { AckResult, CommandInput } from '../../src/protocol.ts';

const ok = async (c: CommandInput): Promise<AckResult> => ({ accepted: true, tick: 1, commandId: c.id ?? 'x', rttMs: 1 });
const bolus: CommandInput = { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 0.01, unit: 'mg', route: 'iv' } };
const fluid: CommandInput = { type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 250, overS: 60 } };
const vent: CommandInput = { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 450 } };

function staged(): StageBuffer {
  const b = new StageBuffer('p1');
  b.stage(bolus, 'drug');
  b.stage(fluid, 'fluid');
  b.stage(vent, 'vent');
  return b;
}

describe('StageBuffer batch', () => {
  it('a batch commit stamps every item with the stageGroup and batch {id: stageGroup, n}', async () => {
    const b = staged();
    const sent: CommandInput[] = [];
    await b.commit((c) => (sent.push(c), ok(c)), { batch: true });
    expect(sent.map((c) => c.stageGroup)).toEqual(['p1-sg1', 'p1-sg1', 'p1-sg1']);
    expect(sent.map((c) => c.batch)).toEqual([{ id: 'p1-sg1', n: 3 }, { id: 'p1-sg1', n: 3 }, { id: 'p1-sg1', n: 3 }]);
    expect(sent.map((c) => (c as { event: { kind: string } }).event.kind)).toEqual(['drug', 'fluid', 'ventilation']); // staging order
    expect(b.size).toBe(0);
    b.stage(bolus, 'drug');
    const next: CommandInput[] = [];
    await b.commit((c) => (next.push(c), ok(c)), { batch: true });
    expect(next[0]?.batch).toEqual({ id: 'p1-sg2', n: 1 }); // a new delivery, a new id
  });

  it('a commit without batch is unchanged: the stageGroup only, no batch key', async () => {
    const b = staged();
    const sent: CommandInput[] = [];
    await b.commit((c) => (sent.push(c), ok(c)));
    expect(sent.map((c) => c.stageGroup)).toEqual(['p1-sg1', 'p1-sg1', 'p1-sg1']);
    expect(sent.every((c) => !('batch' in c))).toBe(true);
    expect(sent).toEqual([bolus, fluid, vent].map((c) => ({ ...c, stageGroup: 'p1-sg1' })));
  });
});
